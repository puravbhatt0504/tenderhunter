/**
 * ===========================================
 * NEXT.JS EDGE MIDDLEWARE
 * Applies security at the edge for all routes
 * ===========================================
 */

import { NextResponse } from 'next/server'

// ============================================
// CONFIGURATION
// ============================================
const SECURITY_CONFIG = {
    // Rate limiting (simplified for edge - use Redis for production)
    RATE_LIMIT: {
        MAX_API_REQUESTS: 30,
        WINDOW_MS: 60000
    },

    // Paths to protect with stricter rate limiting
    PROTECTED_PATHS: ['/api/'],

    // Paths to skip (static assets)
    SKIP_PATHS: ['/_next/', '/favicon.ico', '/static/'],

    // Security headers applied to all responses
    HEADERS: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    }
}

// In-memory store for edge (use KV store for production)
const requestCounts = new Map()

// ============================================
// HELPER FUNCTIONS
// ============================================
function getClientIP(request) {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') ||
        request.ip ||
        'unknown'
}

function shouldSkip(pathname) {
    return SECURITY_CONFIG.SKIP_PATHS.some(path => pathname.startsWith(path))
}

function isProtectedPath(pathname) {
    return SECURITY_CONFIG.PROTECTED_PATHS.some(path => pathname.startsWith(path))
}

function checkRateLimit(ip, isApiRoute) {
    const now = Date.now()
    const key = `${ip}:${isApiRoute ? 'api' : 'page'}`

    let data = requestCounts.get(key)

    if (!data || now - data.start > SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS) {
        data = { count: 0, start: now }
    }

    data.count++
    requestCounts.set(key, data)

    // Cleanup old entries periodically
    if (requestCounts.size > 10000) {
        const cutoff = now - SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS * 2
        for (const [k, v] of requestCounts.entries()) {
            if (v.start < cutoff) {
                requestCounts.delete(k)
            }
        }
    }

    const limit = isApiRoute
        ? SECURITY_CONFIG.RATE_LIMIT.MAX_API_REQUESTS
        : SECURITY_CONFIG.RATE_LIMIT.MAX_API_REQUESTS * 3

    return {
        allowed: data.count <= limit,
        remaining: Math.max(0, limit - data.count),
        reset: data.start + SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS
    }
}

// ============================================
// MIDDLEWARE FUNCTION
// ============================================
export function middleware(request) {
    const { pathname } = request.nextUrl

    // Skip static assets
    if (shouldSkip(pathname)) {
        return NextResponse.next()
    }

    const ip = getClientIP(request)
    const isApiRoute = isProtectedPath(pathname)

    // Check rate limit
    const rateLimit = checkRateLimit(ip, isApiRoute)

    if (!rateLimit.allowed) {
        console.log(`[Middleware] Rate limit exceeded for ${ip} on ${pathname}`)

        return new NextResponse(
            JSON.stringify({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded. Please slow down.',
                retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000)
            }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': String(Math.ceil((rateLimit.reset - Date.now()) / 1000)),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(rateLimit.reset),
                    ...SECURITY_CONFIG.HEADERS
                }
            }
        )
    }

    // Get response and add security headers
    const response = NextResponse.next()

    // Add security headers to all responses
    Object.entries(SECURITY_CONFIG.HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value)
    })

    // Add rate limit headers
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining))
    response.headers.set('X-RateLimit-Reset', String(rateLimit.reset))

    return response
}

// ============================================
// ROUTE MATCHER CONFIGURATION
// ============================================
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
