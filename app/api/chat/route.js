/**
 * ===========================================
 * SECURE API ROUTE HANDLER
 * Server-side Gemini API with DDoS Protection
 * ===========================================
 */

import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
    securityMiddleware,
    getSecurityHeaders,
    sanitizeInput
} from '@/lib/security'

// Server-side API key (never exposed to client)
const API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''

// Request timeout
const REQUEST_TIMEOUT = 30000 // 30 seconds

// ============================================
// CORS CONFIGURATION
// ============================================
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    // Add your production domains here
    process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean)

function getCORSHeaders(origin) {
    const headers = {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
    }

    // Check if origin is allowed
    if (origin && ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
        headers['Access-Control-Allow-Origin'] = origin
    }

    return headers
}

// ============================================
// OPTIONS HANDLER (CORS Preflight)
// ============================================
export async function OPTIONS(request) {
    const origin = request.headers.get('origin')

    return new NextResponse(null, {
        status: 200,
        headers: {
            ...getCORSHeaders(origin),
            ...getSecurityHeaders()
        }
    })
}

// ============================================
// POST HANDLER (Main API)
// ============================================
export async function POST(request) {
    const origin = request.headers.get('origin')
    const responseHeaders = {
        ...getCORSHeaders(origin),
        ...getSecurityHeaders(),
        'Content-Type': 'application/json'
    }

    try {
        // 1. Security Middleware Check
        const securityResult = await securityMiddleware(request)

        if (securityResult.blocked) {
            return NextResponse.json(
                {
                    error: securityResult.message,
                    retryAfter: securityResult.retryAfter
                },
                {
                    status: securityResult.status,
                    headers: {
                        ...responseHeaders,
                        ...securityResult.headers
                    }
                }
            )
        }

        // Add rate limit headers
        responseHeaders['X-RateLimit-Remaining'] = String(securityResult.rateLimit?.remaining || 0)
        responseHeaders['X-RateLimit-Reset'] = String(securityResult.rateLimit?.resetAt || 0)

        // 2. Parse and validate request body
        let body
        try {
            body = await request.json()
        } catch (e) {
            return NextResponse.json(
                { error: 'Invalid JSON body' },
                { status: 400, headers: responseHeaders }
            )
        }

        // 3. Validate required fields
        const { prompt, model, tools, generationConfig } = body

        if (!prompt && !body.contents) {
            return NextResponse.json(
                { error: 'Prompt or contents required' },
                { status: 400, headers: responseHeaders }
            )
        }

        // 4. Sanitize input
        const sanitizedPrompt = prompt ? sanitizeInput(prompt) : null

        // 5. Check if API key exists
        if (!API_KEY) {
            console.error('[API] No API key configured')
            return NextResponse.json(
                { error: 'API not configured' },
                { status: 500, headers: responseHeaders }
            )
        }

        // 6. Execute API call with timeout
        const genAI = new GoogleGenerativeAI(API_KEY)
        const modelName = model || 'gemini-2.5-flash'
        const modelConfig = { model: modelName }

        if (tools) {
            modelConfig.tools = tools
        }

        const geminiModel = genAI.getGenerativeModel(modelConfig)

        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
        })

        // Execute with timeout
        const content = sanitizedPrompt || body.contents

        let resultPromise
        if (generationConfig) {
            const modelWithConfig = genAI.getGenerativeModel({
                ...modelConfig,
                generationConfig
            })
            resultPromise = modelWithConfig.generateContent(content)
        } else {
            resultPromise = geminiModel.generateContent(content)
        }

        const result = await Promise.race([resultPromise, timeoutPromise])
        const response = await result.response
        const text = response.text()

        // 7. Return successful response
        return NextResponse.json(
            {
                success: true,
                data: text,
                metadata: {
                    model: modelName,
                    timestamp: new Date().toISOString()
                }
            },
            { status: 200, headers: responseHeaders }
        )

    } catch (error) {
        console.error('[API] Error:', error.message)

        // Handle specific error types
        if (error.message?.includes('429') || error.message?.includes('quota')) {
            return NextResponse.json(
                {
                    error: 'API rate limit exceeded. Please try again later.',
                    retryAfter: 60
                },
                {
                    status: 429,
                    headers: {
                        ...responseHeaders,
                        'Retry-After': '60'
                    }
                }
            )
        }

        if (error.message === 'Request timeout') {
            return NextResponse.json(
                { error: 'Request timed out. Please try again.' },
                { status: 504, headers: responseHeaders }
            )
        }

        // Generic error response (don't expose internal details)
        return NextResponse.json(
            { error: 'An error occurred processing your request.' },
            { status: 500, headers: responseHeaders }
        )
    }
}

// ============================================
// GET HANDLER (Health Check)
// ============================================
export async function GET(request) {
    const responseHeaders = {
        ...getSecurityHeaders(),
        'Content-Type': 'application/json'
    }

    // Security check
    const securityResult = await securityMiddleware(request)

    if (securityResult.blocked) {
        return NextResponse.json(
            { error: securityResult.message },
            { status: securityResult.status, headers: responseHeaders }
        )
    }

    return NextResponse.json(
        {
            status: 'healthy',
            timestamp: new Date().toISOString()
        },
        { status: 200, headers: responseHeaders }
    )
}
