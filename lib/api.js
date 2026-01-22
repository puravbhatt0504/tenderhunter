import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''

// ============================================
// API PROTECTION CONFIGURATION
// ============================================
const CONFIG = {
    // Rate Limiting
    MAX_REQUESTS_PER_MINUTE: 15,
    MAX_REQUESTS_PER_DAY: 1000,

    // Circuit Breaker
    FAILURE_THRESHOLD: 5,
    CIRCUIT_RESET_TIME: 60000, // 1 minute

    // Request Queue
    MAX_QUEUE_SIZE: 50,
    QUEUE_TIMEOUT: 30000, // 30 seconds

    // Cache
    CACHE_TTL: 300000, // 5 minutes
    MAX_CACHE_SIZE: 100,

    // Retry
    MAX_RETRIES: 3,
    BASE_DELAY: 1000,
    MAX_DELAY: 30000,
}

// ============================================
// RATE LIMITER - Token Bucket Algorithm
// ============================================
class RateLimiter {
    constructor(maxTokens, refillRate) {
        this.maxTokens = maxTokens
        this.tokens = maxTokens
        this.refillRate = refillRate // tokens per second
        this.lastRefill = Date.now()
        this.dailyCount = 0
        this.dailyReset = this.getNextMidnight()
    }

    getNextMidnight() {
        const now = new Date()
        const midnight = new Date(now)
        midnight.setHours(24, 0, 0, 0)
        return midnight.getTime()
    }

    refill() {
        const now = Date.now()
        const timePassed = (now - this.lastRefill) / 1000
        this.tokens = Math.min(this.maxTokens, this.tokens + timePassed * this.refillRate)
        this.lastRefill = now

        // Reset daily counter at midnight
        if (now > this.dailyReset) {
            this.dailyCount = 0
            this.dailyReset = this.getNextMidnight()
        }
    }

    async acquire() {
        this.refill()

        // Check daily limit
        if (this.dailyCount >= CONFIG.MAX_REQUESTS_PER_DAY) {
            throw new Error('Daily API limit reached. Please try again tomorrow.')
        }

        if (this.tokens < 1) {
            const waitTime = Math.ceil((1 - this.tokens) / this.refillRate * 1000)
            console.log(`[RateLimiter] Waiting ${waitTime}ms for token...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
            this.refill()
        }

        this.tokens -= 1
        this.dailyCount += 1
        return true
    }

    getStatus() {
        this.refill()
        return {
            availableTokens: Math.floor(this.tokens),
            dailyRemaining: CONFIG.MAX_REQUESTS_PER_DAY - this.dailyCount,
            nextReset: new Date(this.dailyReset).toLocaleString()
        }
    }
}

// ============================================
// CIRCUIT BREAKER - Prevents cascade failures
// ============================================
class CircuitBreaker {
    constructor() {
        this.failures = 0
        this.lastFailure = null
        this.state = 'CLOSED' // CLOSED, OPEN, HALF_OPEN
        this.successCount = 0
    }

    recordSuccess() {
        this.failures = 0
        this.successCount++
        if (this.state === 'HALF_OPEN') {
            this.state = 'CLOSED'
            console.log('[CircuitBreaker] Circuit CLOSED - Service recovered')
        }
    }

    recordFailure() {
        this.failures++
        this.lastFailure = Date.now()
        this.successCount = 0

        if (this.failures >= CONFIG.FAILURE_THRESHOLD) {
            this.state = 'OPEN'
            console.log('[CircuitBreaker] Circuit OPEN - Too many failures')
        }
    }

    canRequest() {
        if (this.state === 'CLOSED') return true

        if (this.state === 'OPEN') {
            const timeSinceFailure = Date.now() - this.lastFailure
            if (timeSinceFailure >= CONFIG.CIRCUIT_RESET_TIME) {
                this.state = 'HALF_OPEN'
                console.log('[CircuitBreaker] Circuit HALF_OPEN - Testing service')
                return true
            }
            return false
        }

        return this.state === 'HALF_OPEN'
    }

    getState() {
        return {
            state: this.state,
            failures: this.failures,
            timeSinceLastFailure: this.lastFailure ? Date.now() - this.lastFailure : null
        }
    }
}

// ============================================
// REQUEST CACHE - LRU Cache with TTL
// ============================================
class RequestCache {
    constructor(maxSize, ttl) {
        this.cache = new Map()
        this.maxSize = maxSize
        this.ttl = ttl
    }

    generateKey(options) {
        const keyData = {
            prompt: options.prompt || '',
            model: options.model || '',
            tools: options.tools ? JSON.stringify(options.tools) : ''
        }
        return JSON.stringify(keyData)
    }

    get(options) {
        const key = this.generateKey(options)
        const entry = this.cache.get(key)

        if (!entry) return null

        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key)
            return null
        }

        // Move to end (LRU)
        this.cache.delete(key)
        this.cache.set(key, entry)

        console.log('[Cache] Cache HIT')
        return entry.value
    }

    set(options, value) {
        const key = this.generateKey(options)

        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value
            this.cache.delete(firstKey)
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now()
        })
        console.log('[Cache] Cached response')
    }

    clear() {
        this.cache.clear()
    }

    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize
        }
    }
}

// ============================================
// REQUEST QUEUE - Serializes concurrent requests
// ============================================
class RequestQueue {
    constructor() {
        this.queue = []
        this.processing = false
        this.activeRequests = 0
        this.maxConcurrent = 3
    }

    async add(requestFn) {
        return new Promise((resolve, reject) => {
            if (this.queue.length >= CONFIG.MAX_QUEUE_SIZE) {
                reject(new Error('Request queue is full. Please try again later.'))
                return
            }

            const timeoutId = setTimeout(() => {
                const index = this.queue.findIndex(item => item.id === id)
                if (index !== -1) {
                    this.queue.splice(index, 1)
                    reject(new Error('Request timed out in queue'))
                }
            }, CONFIG.QUEUE_TIMEOUT)

            const id = Date.now() + Math.random()

            this.queue.push({
                id,
                requestFn,
                resolve,
                reject,
                timeoutId,
                addedAt: Date.now()
            })

            this.process()
        })
    }

    async process() {
        if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
            return
        }

        const item = this.queue.shift()
        if (!item) return

        clearTimeout(item.timeoutId)
        this.activeRequests++

        try {
            const result = await item.requestFn()
            item.resolve(result)
        } catch (error) {
            item.reject(error)
        } finally {
            this.activeRequests--
            this.process() // Process next in queue
        }
    }

    getStatus() {
        return {
            queueLength: this.queue.length,
            activeRequests: this.activeRequests
        }
    }
}

// ============================================
// SINGLETON INSTANCES
// ============================================
const rateLimiter = new RateLimiter(CONFIG.MAX_REQUESTS_PER_MINUTE, CONFIG.MAX_REQUESTS_PER_MINUTE / 60)
const circuitBreaker = new CircuitBreaker()
const requestCache = new RequestCache(CONFIG.MAX_CACHE_SIZE, CONFIG.CACHE_TTL)
const requestQueue = new RequestQueue()

// ============================================
// MAIN API FUNCTION WITH ALL PROTECTIONS
// ============================================
async function executeApiCall(options) {
    const genAI = new GoogleGenerativeAI(API_KEY)
    const modelName = options.model || 'gemini-2.5-flash-preview-09-2025'
    const modelConfig = { model: modelName }

    if (options.tools) {
        modelConfig.tools = options.tools
    }

    const model = genAI.getGenerativeModel(modelConfig)

    let content
    if (options.prompt) {
        content = options.prompt
    } else if (options.contents) {
        content = options.contents
    } else {
        throw new Error('No prompt or contents provided')
    }

    let result
    if (options.generationConfig) {
        try {
            result = await model.generateContent(content, { generationConfig: options.generationConfig })
        } catch (e) {
            const modelWithConfig = genAI.getGenerativeModel({
                ...modelConfig,
                generationConfig: options.generationConfig
            })
            result = await modelWithConfig.generateContent(content)
        }
    } else {
        result = await model.generateContent(content)
    }

    const response = await result.response
    return response.text()
}

export async function callGeminiApi(options, useCache = true) {
    // 1. Check Circuit Breaker
    if (!circuitBreaker.canRequest()) {
        const state = circuitBreaker.getState()
        const waitTime = Math.ceil((CONFIG.CIRCUIT_RESET_TIME - state.timeSinceLastFailure) / 1000)
        throw new Error(`Service temporarily unavailable. Please try again in ${waitTime} seconds.`)
    }

    // 2. Check Cache (skip for search operations with tools as they need fresh data)
    if (useCache && !options.tools) {
        const cachedResult = requestCache.get(options)
        if (cachedResult) {
            return cachedResult
        }
    }

    // 3. Queue the request with rate limiting and retries
    return requestQueue.add(async () => {
        let lastError = null

        for (let attempt = 0; attempt < CONFIG.MAX_RETRIES; attempt++) {
            try {
                // Acquire rate limit token
                await rateLimiter.acquire()

                // Execute the API call
                const result = await executeApiCall(options)

                // Success - record and cache
                circuitBreaker.recordSuccess()

                if (useCache && !options.tools) {
                    requestCache.set(options, result)
                }

                return result

            } catch (error) {
                lastError = error
                const isLastAttempt = attempt === CONFIG.MAX_RETRIES - 1
                const isThrottleError = error.status === 429 ||
                    error.message?.includes('429') ||
                    error.code === 429 ||
                    error.message?.includes('quota') ||
                    error.message?.includes('rate limit')

                console.log(`[API] Attempt ${attempt + 1} failed:`, error.message)

                if (isThrottleError) {
                    circuitBreaker.recordFailure()

                    if (!isLastAttempt) {
                        // Exponential backoff with jitter
                        const backoffDelay = Math.min(
                            CONFIG.BASE_DELAY * Math.pow(2, attempt) + Math.random() * 1000,
                            CONFIG.MAX_DELAY
                        )
                        console.log(`[API] Rate limited. Waiting ${Math.round(backoffDelay)}ms before retry...`)
                        await new Promise(resolve => setTimeout(resolve, backoffDelay))
                    }
                } else if (!isLastAttempt) {
                    // Non-throttle error, shorter delay
                    await new Promise(resolve => setTimeout(resolve, CONFIG.BASE_DELAY))
                }

                if (isLastAttempt) {
                    circuitBreaker.recordFailure()
                }
            }
        }

        throw new Error(lastError?.message || 'API request failed after all retries')
    })
}

// ============================================
// UTILITY EXPORTS
// ============================================
export function getApiStatus() {
    return {
        rateLimiter: rateLimiter.getStatus(),
        circuitBreaker: circuitBreaker.getState(),
        cache: requestCache.getStats(),
        queue: requestQueue.getStatus()
    }
}

export function clearApiCache() {
    requestCache.clear()
    console.log('[API] Cache cleared')
}

// ============================================
// DEBOUNCE UTILITY FOR UI
// ============================================
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

// ============================================
// THROTTLE UTILITY FOR UI
// ============================================
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
