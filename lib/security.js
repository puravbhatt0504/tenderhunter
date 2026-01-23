/**
 * ===========================================
 * PRODUCTION SECURITY MODULE
 * DDoS Protection, Rate Limiting, and Security Utilities
 * ===========================================
 */

// ============================================
// SECURITY CONFIGURATION
// ============================================
export const SECURITY_CONFIG = {
    // Rate Limiting (per IP)
    RATE_LIMIT: {
        WINDOW_MS: 60 * 1000,           // 1 minute window
        MAX_REQUESTS: 30,                // Max requests per window
        BURST_LIMIT: 10,                 // Max burst requests in 5 seconds
        BURST_WINDOW_MS: 5 * 1000,       // Burst window
        BLOCK_DURATION_MS: 5 * 60 * 1000 // 5 minute block for violators
    },

    // Request Validation
    VALIDATION: {
        MAX_BODY_SIZE: 10 * 1024,        // 10KB max request body
        MAX_URL_LENGTH: 2048,            // Max URL length
        MAX_HEADERS_SIZE: 8 * 1024,      // 8KB max headers
        ALLOWED_METHODS: ['GET', 'POST', 'OPTIONS'],
        TIMEOUT_MS: 30000                // 30 second request timeout
    },

    // Security Headers
    HEADERS: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https: blob:",
            "connect-src 'self' https://generativelanguage.googleapis.com https://*.googleapis.com",
            "frame-ancestors 'none'"
        ].join('; ')
    },

    // IP Blacklist/Whitelist
    BLOCKED_IPS: new Set(),
    ALLOWED_IPS: new Set(), // Empty means all IPs allowed (except blocked)

    // Bot Detection
    BOT_DETECTION: {
        ENABLED: true,
        SUSPICIOUS_PATTERNS: [
            /curl/i,
            /wget/i,
            /python-requests/i,
            /scrapy/i,
            /bot(?!.*google|.*bing|.*yahoo)/i
        ]
    }
}

// ============================================
// IN-MEMORY RATE LIMITER STORE
// For production, use Redis or similar
// ============================================
class RateLimitStore {
    constructor() {
        this.requests = new Map()
        this.burstRequests = new Map()
        this.blockedIPs = new Map()

        // Cleanup old entries every minute
        if (typeof setInterval !== 'undefined') {
            setInterval(() => this.cleanup(), 60000)
        }
    }

    cleanup() {
        const now = Date.now()

        // Clean up request counts
        for (const [ip, data] of this.requests.entries()) {
            if (now - data.windowStart > SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS * 2) {
                this.requests.delete(ip)
            }
        }

        // Clean up burst counts
        for (const [ip, data] of this.burstRequests.entries()) {
            if (now - data.windowStart > SECURITY_CONFIG.RATE_LIMIT.BURST_WINDOW_MS * 2) {
                this.burstRequests.delete(ip)
            }
        }

        // Clean up expired blocks
        for (const [ip, expiry] of this.blockedIPs.entries()) {
            if (now > expiry) {
                this.blockedIPs.delete(ip)
                console.log(`[Security] Unblocked IP: ${ip}`)
            }
        }
    }

    isBlocked(ip) {
        const expiry = this.blockedIPs.get(ip)
        if (expiry && Date.now() < expiry) {
            return true
        }
        this.blockedIPs.delete(ip)
        return false
    }

    blockIP(ip, durationMs = SECURITY_CONFIG.RATE_LIMIT.BLOCK_DURATION_MS) {
        this.blockedIPs.set(ip, Date.now() + durationMs)
        console.log(`[Security] Blocked IP: ${ip} for ${durationMs / 1000}s`)
    }

    recordRequest(ip) {
        const now = Date.now()

        // Regular rate limiting
        let data = this.requests.get(ip)
        if (!data || now - data.windowStart > SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS) {
            data = { count: 0, windowStart: now }
        }
        data.count++
        this.requests.set(ip, data)

        // Burst detection
        let burstData = this.burstRequests.get(ip)
        if (!burstData || now - burstData.windowStart > SECURITY_CONFIG.RATE_LIMIT.BURST_WINDOW_MS) {
            burstData = { count: 0, windowStart: now }
        }
        burstData.count++
        this.burstRequests.set(ip, burstData)

        return {
            count: data.count,
            burstCount: burstData.count,
            remaining: SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS - data.count,
            resetAt: data.windowStart + SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS
        }
    }

    getStats() {
        return {
            activeIPs: this.requests.size,
            blockedIPs: this.blockedIPs.size,
            blockedList: Array.from(this.blockedIPs.keys())
        }
    }
}

// Singleton instance
const rateLimitStore = new RateLimitStore()

// ============================================
// IP EXTRACTION HELPER
// ============================================
export function getClientIP(request) {
    // Check various headers for real IP (when behind proxy/CDN)
    const forwardedFor = request.headers?.get?.('x-forwarded-for') ||
        request.headers?.['x-forwarded-for']
    if (forwardedFor) {
        // Take the first IP in the chain (client IP)
        return forwardedFor.split(',')[0].trim()
    }

    const realIP = request.headers?.get?.('x-real-ip') ||
        request.headers?.['x-real-ip']
    if (realIP) {
        return realIP
    }

    const cfConnectingIP = request.headers?.get?.('cf-connecting-ip') ||
        request.headers?.['cf-connecting-ip']
    if (cfConnectingIP) {
        return cfConnectingIP
    }

    // Fallback to connection info
    return request.ip || request.socket?.remoteAddress || 'unknown'
}

// ============================================
// REQUEST VALIDATION
// ============================================
export function validateRequest(request) {
    const errors = []

    // Check HTTP method
    const method = request.method?.toUpperCase()
    if (!SECURITY_CONFIG.VALIDATION.ALLOWED_METHODS.includes(method)) {
        errors.push(`Method ${method} not allowed`)
    }

    // Check URL length
    const url = request.url || ''
    if (url.length > SECURITY_CONFIG.VALIDATION.MAX_URL_LENGTH) {
        errors.push('URL too long')
    }

    // Check for suspicious patterns in URL
    const suspiciousPatterns = [
        /\.\./,           // Path traversal
        /<script/i,       // XSS attempt
        /javascript:/i,   // XSS attempt
        /\bor\b.*=/i,     // SQL injection
        /\bunion\b.*\bselect/i, // SQL injection
        /;.*--/,          // SQL injection
        /\$\{.*\}/,       // Template injection
    ]

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(url)) {
            errors.push('Suspicious pattern detected in URL')
            break
        }
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

// ============================================
// BOT DETECTION
// ============================================
export function detectBot(userAgent) {
    if (!SECURITY_CONFIG.BOT_DETECTION.ENABLED || !userAgent) {
        return { isBot: false, reason: null }
    }

    for (const pattern of SECURITY_CONFIG.BOT_DETECTION.SUSPICIOUS_PATTERNS) {
        if (pattern.test(userAgent)) {
            return {
                isBot: true,
                reason: `Matched pattern: ${pattern.toString()}`
            }
        }
    }

    // Check for empty or very short user agents
    if (userAgent.length < 10) {
        return { isBot: true, reason: 'Suspiciously short user agent' }
    }

    return { isBot: false, reason: null }
}

// ============================================
// RATE LIMIT CHECKER
// ============================================
export function checkRateLimit(ip) {
    // Check if IP is permanently blocked
    if (SECURITY_CONFIG.BLOCKED_IPS.has(ip)) {
        return {
            allowed: false,
            reason: 'IP permanently blocked',
            retryAfter: null
        }
    }

    // Check if IP is temporarily blocked
    if (rateLimitStore.isBlocked(ip)) {
        return {
            allowed: false,
            reason: 'IP temporarily blocked due to rate limit violation',
            retryAfter: SECURITY_CONFIG.RATE_LIMIT.BLOCK_DURATION_MS / 1000
        }
    }

    // Record and check request counts
    const stats = rateLimitStore.recordRequest(ip)

    // Check burst limit (DDoS protection)
    if (stats.burstCount > SECURITY_CONFIG.RATE_LIMIT.BURST_LIMIT) {
        rateLimitStore.blockIP(ip)
        return {
            allowed: false,
            reason: 'Burst rate limit exceeded - potential DDoS detected',
            retryAfter: SECURITY_CONFIG.RATE_LIMIT.BLOCK_DURATION_MS / 1000
        }
    }

    // Check regular rate limit
    if (stats.count > SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS) {
        return {
            allowed: false,
            reason: 'Rate limit exceeded',
            retryAfter: Math.ceil((stats.resetAt - Date.now()) / 1000),
            remaining: 0
        }
    }

    return {
        allowed: true,
        remaining: stats.remaining,
        resetAt: stats.resetAt
    }
}

// ============================================
// MAIN SECURITY MIDDLEWARE
// ============================================
export async function securityMiddleware(request) {
    const startTime = Date.now()
    const ip = getClientIP(request)
    const userAgent = request.headers?.get?.('user-agent') ||
        request.headers?.['user-agent'] || ''

    // 1. Request Validation
    const validation = validateRequest(request)
    if (!validation.valid) {
        console.log(`[Security] Invalid request from ${ip}: ${validation.errors.join(', ')}`)
        return {
            blocked: true,
            status: 400,
            message: 'Bad Request',
            errors: validation.errors
        }
    }

    // 2. Bot Detection
    const botCheck = detectBot(userAgent)
    if (botCheck.isBot) {
        console.log(`[Security] Bot detected from ${ip}: ${botCheck.reason}`)
        // Don't block, but flag for monitoring
        // You can change this to block if needed
    }

    // 3. Rate Limiting
    const rateLimit = checkRateLimit(ip)
    if (!rateLimit.allowed) {
        console.log(`[Security] Rate limit violation from ${ip}: ${rateLimit.reason}`)
        return {
            blocked: true,
            status: 429,
            message: 'Too Many Requests',
            retryAfter: rateLimit.retryAfter,
            headers: {
                'Retry-After': String(rateLimit.retryAfter || 60),
                'X-RateLimit-Remaining': '0'
            }
        }
    }

    // Request allowed
    return {
        blocked: false,
        ip,
        userAgent,
        isBot: botCheck.isBot,
        rateLimit: {
            remaining: rateLimit.remaining,
            resetAt: rateLimit.resetAt
        },
        processingTime: Date.now() - startTime
    }
}

// ============================================
// SECURITY HEADERS HELPER
// ============================================
export function getSecurityHeaders() {
    return { ...SECURITY_CONFIG.HEADERS }
}

// ============================================
// INPUT SANITIZATION
// ============================================
export function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return input
    }

    return input
        // Remove null bytes
        .replace(/\0/g, '')
        // Escape HTML entities
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        // Remove script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Limit length
        .slice(0, 10000)
}

// ============================================
// ADMIN FUNCTIONS
// ============================================
export function getSecurityStats() {
    return rateLimitStore.getStats()
}

export function blockIPManually(ip) {
    SECURITY_CONFIG.BLOCKED_IPS.add(ip)
    console.log(`[Security] IP permanently blocked: ${ip}`)
}

export function unblockIPManually(ip) {
    SECURITY_CONFIG.BLOCKED_IPS.delete(ip)
    rateLimitStore.blockedIPs.delete(ip)
    console.log(`[Security] IP unblocked: ${ip}`)
}
