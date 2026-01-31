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

// Request timeout (longer when Google Search grounding is used)
const REQUEST_TIMEOUT = 60000 // 60 seconds for search grounding

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
        const { prompt, model, tools, generationConfig, useGoogleSearch } = body

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
        const modelName = model || 'gemini-2.5-flash'
        const content = sanitizedPrompt || body.contents

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
        })

        let text

        // When useGoogleSearch is true, use direct REST so we can send google_search (required for Gemini 2.5)
        if (useGoogleSearch === true) {
            const restBody = {
                contents: [{ parts: [{ text: typeof content === 'string' ? content : (content?.parts?.[0]?.text || '') }] }],
                tools: [{ google_search: {} }],
                generationConfig: generationConfig || {}
            }
            const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`
            const restPromise = fetch(restUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(restBody)
            }).then(async (res) => {
                if (!res.ok) {
                    const errBody = await res.text()
                    throw new Error(`API ${res.status}: ${errBody}`)
                }
                const data = await res.json()
                const candidate = data.candidates?.[0]
                if (!candidate?.content?.parts?.length) {
                    throw new Error('No response content from API')
                }
                return candidate.content.parts.map(p => p.text || '').join('')
            })
            text = await Promise.race([restPromise, timeoutPromise])
        } else {
            const genAI = new GoogleGenerativeAI(API_KEY)
            const modelConfig = { model: modelName }
            if (tools !== undefined && tools !== null && Array.isArray(tools) && tools.length > 0) {
                modelConfig.tools = tools.map(tool => {
                    if (tool?.google_search !== undefined) return { googleSearch: tool.google_search }
                    return tool
                }).filter(Boolean)
            }
            let finalModelConfig = { ...modelConfig }
            if (generationConfig) finalModelConfig.generationConfig = generationConfig
            const geminiModel = genAI.getGenerativeModel(finalModelConfig)
            const result = await Promise.race([geminiModel.generateContent(content), timeoutPromise])
            const response = await result.response
            try {
                text = response.text()
            } catch (textError) {
                if (response.candidates?.[0]?.content?.parts?.length) {
                    text = response.candidates[0].content.parts.map(p => p.text || '').join('')
                } else {
                    throw new Error('Unable to extract text from API response')
                }
            }
        }

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
        console.error('[API] Error stack:', error.stack)
        console.error('[API] Error details:', {
            name: error.name,
            message: error.message,
            status: error.status,
            code: error.code
        })

        // Handle specific error types
        if (error.message?.includes('429') || error.message?.includes('quota') || error.status === 429 || error.code === 429) {
            return NextResponse.json(
                {
                    success: false,
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

        if (error.message === 'Request timeout' || error.name === 'AbortError') {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Request timed out. Please try again.' 
                },
                { status: 504, headers: responseHeaders }
            )
        }

        // Handle API key errors
        if (error.message?.includes('API key') || error.message?.includes('authentication') || error.status === 401 || error.code === 401) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'API authentication failed. Please check your API key configuration.' 
                },
                { status: 401, headers: responseHeaders }
            )
        }

        // Handle invalid request errors
        if (error.message?.includes('invalid') || error.status === 400 || error.code === 400) {
            return NextResponse.json(
                { 
                    success: false,
                    error: `Invalid request: ${error.message || 'Please check your input and try again.'}` 
                },
                { status: 400, headers: responseHeaders }
            )
        }

        // Generic error response with more details in development
        const errorMessage = process.env.NODE_ENV === 'development' 
            ? error.message || 'An error occurred processing your request.'
            : 'An error occurred processing your request. Please try again.'
            
        return NextResponse.json(
            { 
                success: false,
                error: errorMessage 
            },
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
