import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY

// Rate limiting cache (in production, use Redis)
const rateLimitCache = new Map()
const analysisCache = new Map()

// Rate limiting configuration
const RATE_LIMIT = {
    MAX_REQUESTS_PER_HOUR: 10, // Limit PDF analysis to 10/hour per user
    WINDOW_MS: 60 * 60 * 1000 // 1 hour
}

// Cache configuration
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

function checkRateLimit(identifier) {
    const now = Date.now()
    const userRequests = rateLimitCache.get(identifier) || []

    // Remove old requests outside the window
    const recentRequests = userRequests.filter(
        timestamp => now - timestamp < RATE_LIMIT.WINDOW_MS
    )

    if (recentRequests.length >= RATE_LIMIT.MAX_REQUESTS_PER_HOUR) {
        const oldestRequest = Math.min(...recentRequests)
        const resetTime = oldestRequest + RATE_LIMIT.WINDOW_MS
        const minutesUntilReset = Math.ceil((resetTime - now) / 60000)

        return {
            allowed: false,
            remaining: 0,
            resetIn: minutesUntilReset
        }
    }

    // Add current request
    recentRequests.push(now)
    rateLimitCache.set(identifier, recentRequests)

    return {
        allowed: true,
        remaining: RATE_LIMIT.MAX_REQUESTS_PER_HOUR - recentRequests.length,
        resetIn: null
    }
}

function getCacheKey(pdfData, profile) {
    // Create a simple hash for caching (first 100 chars of PDF + profile keys)
    const pdfHash = pdfData.substring(0, 100)
    const profileHash = JSON.stringify({
        keywords: profile?.keywords || '',
        turnover: profile?.annualTurnover || ''
    })
    return `${pdfHash}_${profileHash}`
}

export async function POST(request) {
    try {
        // 1. Get client IP for rate limiting
        const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            'unknown'

        // 2. Check rate limit
        const rateLimit = checkRateLimit(clientIP)

        if (!rateLimit.allowed) {
            return NextResponse.json(
                {
                    error: 'Rate limit exceeded',
                    message: `Too many PDF analyses. Please try again in ${rateLimit.resetIn} minutes.`,
                    resetIn: rateLimit.resetIn
                },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(rateLimit.resetIn)
                    }
                }
            )
        }

        // 3. Parse request body
        const { pdfData, fileName, profile } = await request.json()

        if (!pdfData) {
            return NextResponse.json(
                { error: 'No PDF data provided' },
                { status: 400 }
            )
        }

        // 4. Check cache first
        const cacheKey = getCacheKey(pdfData, profile)
        const cachedResult = analysisCache.get(cacheKey)

        if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
            console.log('[PDF Analysis] Cache hit for', fileName)
            return NextResponse.json(
                {
                    analysis: cachedResult.data,
                    cached: true
                },
                {
                    headers: {
                        'X-RateLimit-Remaining': String(rateLimit.remaining),
                        'X-Cache': 'HIT'
                    }
                }
            )
        }

        // 5. Validate file size (base64 is ~33% larger than original)
        const sizeInMB = (pdfData.length * 0.75) / (1024 * 1024)
        if (sizeInMB > 10) {
            return NextResponse.json(
                { error: 'PDF file too large. Maximum size is 10MB.' },
                { status: 400 }
            )
        }

        // 6. Initialize Gemini with vision model
        const genAI = new GoogleGenerativeAI(API_KEY)
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash'
        })

        // 7. Create analysis prompt
        const profileText = profile ? `
Company Profile:
- Industry Keywords: ${profile.keywords || 'Not specified'}
- Annual Turnover: ₹${profile.annualTurnover || 'Not specified'}
- Years of Experience: ${profile.yearsOfExperience || 'Not specified'} years
- Certifications: ${profile.certifications || 'Not specified'}
` : ''

        const prompt = `You are an expert Indian tender analyst. Analyze this tender PDF document and provide a comprehensive assessment.

${profileText}

Extract and analyze the following information from the tender document:

### 1. Tender Overview
- Tender Title
- Tender Number/Reference ID
- Issuing Authority/Department
- Estimated Contract Value (in ₹ Crores/Lakhs)
- Tender Type (Open/Limited/Single)

### 2. Critical Dates
- Document Download Start/End Date
- Pre-bid Meeting Date (if any)
- Bid Submission Deadline
- Technical Bid Opening Date
- Financial Bid Opening Date

### 3. Eligibility Criteria
${profile ? '**Based on the company profile provided, assess eligibility:**' : ''}
- Minimum Annual Turnover requirement
- Required Years of Experience
- Technical Qualifications
- Required Certifications/Registrations (ISO, MSME, etc.)
- Past Project Experience requirements
${profile ? '- **Eligibility Status**: ✅ Eligible / ⚠️ Partially Eligible / ❌ Not Eligible' : ''}

### 4. Financial Requirements
- Earnest Money Deposit (EMD) amount
- Tender Fee
- Performance Bank Guarantee (if applicable)
- Payment Terms

### 5. Scope of Work
Summarize the main deliverables and project scope.

### 6. Required Documents Checklist
List all mandatory documents needed for submission.

### 7. Red Flags & Important Clauses
Identify any strict conditions, penalties, or critical clauses.

### 8. Recommendations
${profile ? 'Based on the company profile, provide specific recommendations for this bid.' : 'Provide general recommendations for bidding.'}

Format your response in clear, structured Markdown with proper headings and bullet points.`

        // 8. Call Gemini API with PDF
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: pdfData
                }
            },
            { text: prompt }
        ])

        const response = await result.response
        const analysisText = response.text()

        // 9. Convert markdown to HTML for display
        const htmlAnalysis = markdownToHtml(analysisText)

        // 10. Cache the result
        analysisCache.set(cacheKey, {
            data: htmlAnalysis,
            timestamp: Date.now()
        })

        // Cleanup old cache entries
        if (analysisCache.size > 100) {
            const now = Date.now()
            for (const [key, value] of analysisCache.entries()) {
                if (now - value.timestamp > CACHE_TTL) {
                    analysisCache.delete(key)
                }
            }
        }

        // 11. Return analysis
        return NextResponse.json(
            {
                analysis: htmlAnalysis,
                cached: false
            },
            {
                headers: {
                    'X-RateLimit-Remaining': String(rateLimit.remaining),
                    'X-Cache': 'MISS'
                }
            }
        )

    } catch (error) {
        console.error('[PDF Analysis Error]:', error)

        return NextResponse.json(
            {
                error: 'Analysis failed',
                message: error.message || 'Failed to analyze PDF. Please try again.'
            },
            { status: 500 }
        )
    }
}

// Helper function to convert markdown to HTML
function markdownToHtml(md) {
    return md
        .replace(/^### (.*$)/gim, '<h3 class="font-semibold text-slate-800 mt-4 mb-2 flex items-center gap-2">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="font-bold text-slate-900 mt-5 mb-3 text-lg">$1</h2>')
        .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc marker:text-purple-500">$1</li>')
        .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc marker:text-purple-500">$1</li>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-slate-900">$1</strong>')
        .replace(/✅/g, '<span class="text-green-600">✅</span>')
        .replace(/⚠️/g, '<span class="text-amber-600">⚠️</span>')
        .replace(/❌/g, '<span class="text-red-600">❌</span>')
        .replace(/₹/g, '<span class="font-medium">₹</span>')
        .replace(/\n\n/gim, '</p><p class="mb-3">')
}
