/**
 * ===========================================
 * SECURE CLIENT API
 * Client-side wrapper for secure API calls
 * Uses server-side API route for actual Gemini calls
 * ===========================================
 */

// ============================================
// CONFIGURATION
// ============================================
const CLIENT_CONFIG = {
    API_ENDPOINT: '/api/chat',
    MAX_RETRIES: 3,
    BASE_DELAY: 1000,
    MAX_DELAY: 10000,
    REQUEST_TIMEOUT: 30000,

    // Client-side rate limiting (backup protection)
    RATE_LIMIT: {
        MAX_REQUESTS_PER_MINUTE: 20,
        COOLDOWN_MS: 60000
    }
}

// ============================================
// CLIENT-SIDE RATE LIMITER
// ============================================
class ClientRateLimiter {
    constructor() {
        this.requests = []
        this.isBlocked = false
        this.blockExpiry = null
    }

    canRequest() {
        const now = Date.now()

        // Check if blocked
        if (this.isBlocked) {
            if (now < this.blockExpiry) {
                return {
                    allowed: false,
                    retryAfter: Math.ceil((this.blockExpiry - now) / 1000)
                }
            }
            this.isBlocked = false
            this.blockExpiry = null
        }

        // Clean old requests
        const windowStart = now - CLIENT_CONFIG.RATE_LIMIT.COOLDOWN_MS
        this.requests = this.requests.filter(time => time > windowStart)

        // Check rate limit
        if (this.requests.length >= CLIENT_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
            return {
                allowed: false,
                retryAfter: Math.ceil((this.requests[0] + CLIENT_CONFIG.RATE_LIMIT.COOLDOWN_MS - now) / 1000)
            }
        }

        return { allowed: true }
    }

    recordRequest() {
        this.requests.push(Date.now())
    }

    setBlocked(durationMs) {
        this.isBlocked = true
        this.blockExpiry = Date.now() + durationMs
    }

    getStatus() {
        const check = this.canRequest()
        return {
            canRequest: check.allowed,
            requestsInWindow: this.requests.length,
            maxRequests: CLIENT_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE,
            retryAfter: check.retryAfter || 0
        }
    }
}

const clientRateLimiter = new ClientRateLimiter()

// ============================================
// SECURE FETCH WITH RETRY
// ============================================
async function secureFetch(url, options, retryCount = 0) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CLIENT_CONFIG.REQUEST_TIMEOUT)

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            credentials: 'same-origin', // Important for CSRF protection
        })

        clearTimeout(timeoutId)

        // Handle rate limit responses
        if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '60')
            clientRateLimiter.setBlocked(retryAfter * 1000)

            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `Rate limited. Retry after ${retryAfter} seconds.`)
        }

        // Handle server errors with retry
        if (response.status >= 500 && retryCount < CLIENT_CONFIG.MAX_RETRIES) {
            const delay = Math.min(
                CLIENT_CONFIG.BASE_DELAY * Math.pow(2, retryCount) + Math.random() * 1000,
                CLIENT_CONFIG.MAX_DELAY
            )
            console.log(`[SecureAPI] Server error, retrying in ${Math.round(delay)}ms...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            return secureFetch(url, options, retryCount + 1)
        }

        return response
    } catch (error) {
        clearTimeout(timeoutId)

        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.')
        }

        // Retry on network errors
        if (retryCount < CLIENT_CONFIG.MAX_RETRIES &&
            (error.message.includes('network') || error.message.includes('fetch'))) {
            const delay = CLIENT_CONFIG.BASE_DELAY * Math.pow(2, retryCount)
            await new Promise(resolve => setTimeout(resolve, delay))
            return secureFetch(url, options, retryCount + 1)
        }

        throw error
    }
}

// ============================================
// MAIN API CALL FUNCTION
// ============================================
export async function callSecureAPI(options) {
    // 1. Check client-side rate limit
    const rateLimitCheck = clientRateLimiter.canRequest()
    if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded. Please wait ${rateLimitCheck.retryAfter} seconds.`)
    }

    // 2. Validate input
    if (!options.prompt && !options.contents) {
        throw new Error('Prompt or contents required')
    }

    // 3. Prepare request
    const requestBody = {
        prompt: options.prompt,
        model: options.model,
        tools: options.tools,
        generationConfig: options.generationConfig,
        contents: options.contents
    }

    // 4. Record request
    clientRateLimiter.recordRequest()

    // 5. Make secure API call
    const response = await secureFetch(CLIENT_CONFIG.API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    })

    // 6. Parse response
    const data = await response.json()

    if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.status}`)
    }

    if (!data.success) {
        throw new Error(data.error || 'Unknown API error')
    }

    return data.data
}

// ============================================
// LEGACY COMPATIBILITY WRAPPER
// Allows gradual migration from old api.js
// ============================================
export async function callGeminiApiSecure(options, useCache = true) {
    // Cache is now handled server-side, but we keep the parameter for compatibility
    return callSecureAPI(options)
}

// ============================================
// UTILITY EXPORTS
// ============================================
export function getClientAPIStatus() {
    return clientRateLimiter.getStatus()
}

// Debounce utility
export function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

// Throttle utility
export function throttle(func, limit) {
    let inThrottle
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args)
            inThrottle = true
            setTimeout(() => inThrottle = false, limit)
        }
    }
}
