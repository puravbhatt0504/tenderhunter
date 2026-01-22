import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''

export async function callGeminiApi(options, retries = 3, delay = 1000) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const genAI = new GoogleGenerativeAI(API_KEY)
            const modelName = options.model || 'gemini-2.5-flash-preview-09-2025'
            const modelConfig = {
                model: modelName
            }

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
        } catch (error) {
            const isLastAttempt = attempt === retries - 1
            const isThrottleError = error.status === 429 || error.message?.includes('429') || error.code === 429

            if (isLastAttempt) {
                throw new Error(error.message || 'API request failed')
            }

            if (isThrottleError) {
                const backoffDelay = delay * Math.pow(2, attempt)
                await new Promise(resolve => setTimeout(resolve, backoffDelay))
            } else {
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }
    }
}
