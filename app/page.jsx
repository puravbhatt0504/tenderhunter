'use client'

import { useState, useEffect } from 'react'
import { Loader2, Search, FileText, CheckCircle2, XCircle, AlertCircle, ExternalLink, Download, Sparkles } from 'lucide-react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// API Key handling
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''

// ProfileCard Component
function ProfileCard({ profile, setProfile }) {
  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    // Save to localStorage for persistence
    localStorage.setItem('tenderProfile', JSON.stringify(profile))
    alert('Profile saved successfully!')
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Company Profile</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Keywords
          </label>
          <input
            type="text"
            value={profile.keywords || ''}
            onChange={(e) => handleChange('keywords', e.target.value)}
            placeholder="e.g., IT services, construction, healthcare"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Annual Turnover
          </label>
          <input
            type="text"
            value={profile.annualTurnover || ''}
            onChange={(e) => handleChange('annualTurnover', e.target.value)}
            placeholder="e.g., $1M - $5M"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Years of Experience
          </label>
          <input
            type="number"
            value={profile.yearsOfExperience || ''}
            onChange={(e) => handleChange('yearsOfExperience', e.target.value)}
            placeholder="e.g., 10"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Certifications
          </label>
          <textarea
            value={profile.certifications || ''}
            onChange={(e) => handleChange('certifications', e.target.value)}
            placeholder="e.g., ISO 9001, CMMI Level 3"
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          Save Profile
        </button>
      </div>
    </div>
  )
}

// TenderAnalyzer Component
function TenderAnalyzer({ tenderText, setTenderText, analysisResult, isAnalyzing, analysisError, onAnalyze }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-5 h-5 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-800">Tender Analyzer</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste Tender Text
          </label>
          <textarea
            value={tenderText}
            onChange={(e) => setTenderText(e.target.value)}
            placeholder="Paste tender details here for eligibility analysis..."
            rows="8"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing || !tenderText.trim()}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Eligibility'
          )}
        </button>
        {analysisError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              <span className="text-sm">{analysisError}</span>
            </div>
          </div>
        )}
        {analysisResult && (
          <div className="mt-4 border border-gray-200 rounded-md p-4 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Analysis Results</h3>
            <div 
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: analysisResult }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// TenderCard Component
function TenderCard({ tender, onSelectTender }) {
  const getEligibilityBadge = () => {
    if (tender.isEligible === true) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Eligible
        </span>
      )
    } else if (tender.isEligible === false) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Not Eligible
        </span>
      )
    } else if (tender.isCheckingEligibility) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Checking...
        </span>
      )
    }
    return null
  }

  return (
    <div
      onClick={() => onSelectTender(tender)}
      className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 hover:border-blue-300"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-start gap-2">
            <h3 className="text-lg font-semibold text-gray-800 flex-1">{tender.title}</h3>
            {getEligibilityBadge()}
          </div>
        </div>
        {tender.url && (
          <a
            href={tender.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-600 hover:text-blue-800 ml-2"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
      {tender.authority && (
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium">Authority:</span> {tender.authority}
        </p>
      )}
      {tender.summary && (
        <p className="text-sm text-gray-700 mt-3 line-clamp-3">{tender.summary}</p>
      )}
    </div>
  )
}

// ErrorDisplay Component
function ErrorDisplay({ error }) {
  if (!error) return null
  
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{error}</span>
      </div>
    </div>
  )
}

// Main App Component
export default function SmartTenderDashboard() {
  const [profile, setProfile] = useState({
    keywords: '',
    annualTurnover: '',
    yearsOfExperience: '',
    certifications: ''
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [tenderText, setTenderText] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [tenderFeed, setTenderFeed] = useState([])
  const [analysisResult, setAnalysisResult] = useState('')
  const [searchError, setSearchError] = useState('')
  const [analysisError, setAnalysisError] = useState('')
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false)

  // Load profile from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('tenderProfile')
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile))
      } catch (e) {
        console.error('Error loading profile:', e)
      }
    }
  }, [])

  // API Helper Function with Exponential Backoff
  async function callGeminiApi(options, retries = 3, delay = 1000) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const genAI = new GoogleGenerativeAI(API_KEY)
        const modelName = options.model || 'gemini-2.5-flash-preview-09-2025'
        const modelConfig = {
          model: modelName
        }
        
        // Add tools if provided (tools go in model config)
        if (options.tools) {
          modelConfig.tools = options.tools
        }
        
        const model = genAI.getGenerativeModel(modelConfig)
        
        // Get the prompt/contents
        let content
        if (options.prompt) {
          content = options.prompt
        } else if (options.contents) {
          content = options.contents
        } else {
          throw new Error('No prompt or contents provided')
        }
        
        // Prepare generateContent call - try with generationConfig in options if provided
        let result
        if (options.generationConfig) {
          // Some SDK versions support generationConfig as second parameter
          try {
            result = await model.generateContent(content, { generationConfig: options.generationConfig })
          } catch (e) {
            // Fallback: try with generationConfig in model config
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
          // Exponential backoff for throttling
          const backoffDelay = delay * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, backoffDelay))
        } else {
          // Shorter delay for other errors
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
  }

  // Handle Tender Search
  async function handleSearchTenders() {
    if (!searchQuery.trim()) {
      setSearchError('Please enter a search query')
      return
    }

    setIsSearching(true)
    setSearchError('')
    setTenderFeed([])

    try {
      const prompt = `Act as a tender research assistant. Search for current, active tenders related to: "${searchQuery}". 
      
Return a JSON object with the following structure:
{
  "tenders": [
    {
      "title": "Tender title",
      "authority": "Issuing authority name",
      "url": "Direct link to tender document or details page",
      "summary": "Brief summary of the tender"
    }
  ]
}

IMPORTANT: 
- Return only valid JSON, no markdown formatting
- The "url" must be a direct link to the tender document or details page, NOT a search results page
- Include as many relevant tenders as possible
- Focus on current and active tenders only`

      const payload = {
        prompt: prompt,
        model: 'gemini-2.5-flash-preview-09-2025',
        tools: [{ google_search: {} }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              tenders: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    authority: { type: 'string' },
                    url: { type: 'string' },
                    summary: { type: 'string' }
                  },
                  required: ['title', 'authority', 'url', 'summary']
                }
              }
            },
            required: ['tenders']
          }
        }
      }

      const responseText = await callGeminiApi(payload)
      
      // Parse JSON response
      let jsonData
      try {
        // Remove markdown code blocks if present
        const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        jsonData = JSON.parse(cleanText)
      } catch (parseError) {
        throw new Error('Failed to parse API response as JSON')
      }

      if (jsonData.tenders && Array.isArray(jsonData.tenders)) {
        setTenderFeed(jsonData.tenders)
      } else {
        throw new Error('Invalid response format from API')
      }
    } catch (error) {
      setSearchError(error.message || 'Failed to search for tenders. Please try again.')
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // Handle Tender Analysis
  async function handleAnalyzeText() {
    if (!tenderText.trim()) {
      setAnalysisError('Please enter tender text to analyze')
      return
    }

    setIsAnalyzing(true)
    setAnalysisError('')
    setAnalysisResult('')

    try {
      const profileText = `
Company Profile:
- Keywords: ${profile.keywords || 'Not specified'}
- Annual Turnover: ${profile.annualTurnover || 'Not specified'}
- Years of Experience: ${profile.yearsOfExperience || 'Not specified'}
- Certifications: ${profile.certifications || 'Not specified'}
`

      const prompt = `You are an expert tender analyst. Analyze the following tender document and company profile to provide a comprehensive eligibility assessment.

${profileText}

Tender Text:
${tenderText}

Provide a detailed analysis in Markdown format with the following sections:

## Eligibility Check
[Yes/No/Uncertain] - Provide a clear answer with brief justification.

## Key Requirements
List the key requirements extracted from the tender text.

## Scope Summary
Provide 3 bullet points summarizing the scope of work:
- [First point]
- [Second point]
- [Third point]

## Red Flags
Identify any unusual clauses, strict requirements, or potential concerns that should be noted.

Format your response in clear Markdown with proper headings and formatting.`

      const payload = {
        prompt: prompt,
        model: 'gemini-2.5-flash-preview-09-2025',
        generationConfig: {
          responseMimeType: 'text/plain'
        }
      }

      const responseText = await callGeminiApi(payload)
      
      // Convert Markdown to HTML for display
      const markdownToHtml = (md) => {
        return md
          .replace(/^### (.*$)/gim, '<h3 class="font-semibold text-gray-800 mt-4 mb-2">$1</h3>')
          .replace(/^## (.*$)/gim, '<h2 class="font-bold text-gray-900 mt-5 mb-3 text-lg">$1</h2>')
          .replace(/^# (.*$)/gim, '<h1 class="font-bold text-gray-900 mt-6 mb-4 text-xl">$1</h1>')
          .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
          .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
          .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/gim, '<em>$1</em>')
          .replace(/\n\n/gim, '</p><p class="mb-3">')
          .replace(/^(?!<[h|u|o|l])/gim, '<p class="mb-3">')
          .replace(/(?<!>)$/gim, '</p>')
          .replace(/<p class="mb-3"><\/p>/gim, '')
      }

      setAnalysisResult(markdownToHtml(responseText))
    } catch (error) {
      setAnalysisError(error.message || 'Failed to analyze tender. Please try again.')
      console.error('Analysis error:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Handle Tender Selection
  function handleSelectTender(tender) {
    if (tender.summary) {
      setTenderText(tender.summary)
      // Scroll to analyzer (optional, can be enhanced)
    }
  }

  // Check Eligibility for All Tenders
  async function handleCheckEligibility() {
    if (tenderFeed.length === 0) {
      setSearchError('No tenders to check. Please search for tenders first.')
      return
    }

    if (!profile.keywords && !profile.annualTurnover && !profile.yearsOfExperience && !profile.certifications) {
      setSearchError('Please fill in your company profile first.')
      return
    }

    setIsCheckingEligibility(true)
    setSearchError('')

    try {
      // Mark all tenders as checking
      setTenderFeed(prev => prev.map(t => ({ ...t, isCheckingEligibility: true, isEligible: undefined })))

      const profileText = `
Company Profile:
- Keywords: ${profile.keywords || 'Not specified'}
- Annual Turnover: ${profile.annualTurnover || 'Not specified'}
- Years of Experience: ${profile.yearsOfExperience || 'Not specified'}
- Certifications: ${profile.certifications || 'Not specified'}
`

      // Check eligibility for each tender
      const updatedTenders = await Promise.all(
        tenderFeed.map(async (tender) => {
          try {
            const prompt = `You are an expert tender analyst. Based on the company profile and tender information, determine if the company is eligible for this tender.

${profileText}

Tender Information:
- Title: ${tender.title}
- Authority: ${tender.authority || 'Not specified'}
- Summary: ${tender.summary || 'Not specified'}

Respond with ONLY a JSON object in this exact format:
{
  "isEligible": true/false,
  "reason": "Brief one-sentence explanation"
}

Be strict - only return true if the company clearly meets the requirements. Return false if there are any doubts or missing requirements.`

            const payload = {
              prompt: prompt,
              model: 'gemini-2.5-flash-preview-09-2025',
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: 'object',
                  properties: {
                    isEligible: { type: 'boolean' },
                    reason: { type: 'string' }
                  },
                  required: ['isEligible', 'reason']
                }
              }
            }

            const responseText = await callGeminiApi(payload)
            const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            const result = JSON.parse(cleanText)

            return {
              ...tender,
              isEligible: result.isEligible,
              eligibilityReason: result.reason,
              isCheckingEligibility: false
            }
          } catch (error) {
            console.error(`Error checking eligibility for tender: ${tender.title}`, error)
            return {
              ...tender,
              isEligible: false,
              eligibilityReason: 'Error checking eligibility',
              isCheckingEligibility: false
            }
          }
        })
      )

      setTenderFeed(updatedTenders)
    } catch (error) {
      setSearchError('Failed to check eligibility. Please try again.')
      console.error('Eligibility check error:', error)
      // Reset checking status
      setTenderFeed(prev => prev.map(t => ({ ...t, isCheckingEligibility: false })))
    } finally {
      setIsCheckingEligibility(false)
    }
  }

  // Export Eligible Tenders to PDF
  function handleExportToPDF() {
    const eligibleTenders = tenderFeed.filter(t => t.isEligible === true)

    if (eligibleTenders.length === 0) {
      setSearchError('No eligible tenders found. Please check eligibility first.')
      return
    }

    try {
      const doc = new jsPDF()
      
      // Title
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('Eligible Tenders Report', 14, 20)
      
      // Company Profile Section
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Company Profile', 14, 35)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      let yPos = 42
      doc.text(`Keywords: ${profile.keywords || 'Not specified'}`, 14, yPos)
      yPos += 7
      doc.text(`Annual Turnover: ${profile.annualTurnover || 'Not specified'}`, 14, yPos)
      yPos += 7
      doc.text(`Years of Experience: ${profile.yearsOfExperience || 'Not specified'}`, 14, yPos)
      yPos += 7
      doc.text(`Certifications: ${profile.certifications || 'Not specified'}`, 14, yPos)
      
      // Table data
      const tableData = eligibleTenders.map((tender, index) => [
        index + 1,
        tender.title || 'N/A',
        tender.authority || 'N/A',
        tender.url || 'N/A',
        tender.eligibilityReason || 'N/A'
      ])

      // Table
      doc.autoTable({
        startY: yPos + 10,
        head: [['#', 'Title', 'Authority', 'URL', 'Eligibility Reason']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 60 },
          2: { cellWidth: 40 },
          3: { cellWidth: 50 },
          4: { cellWidth: 25 }
        },
        margin: { left: 14, right: 14 },
        didDrawPage: function (data) {
          // Footer
          doc.setFontSize(8)
          doc.text(
            `Page ${data.pageNumber} of ${data.totalPages} - Generated on ${new Date().toLocaleDateString()}`,
            data.settings.margin.left,
            doc.internal.pageSize.height - 10
          )
        }
      })

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `Eligible_Tenders_${timestamp}.pdf`
      
      // Save PDF
      doc.save(filename)
    } catch (error) {
      setSearchError('Failed to generate PDF. Please try again.')
      console.error('PDF export error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Smart Tender Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">AI-powered tender search and eligibility analysis</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Controls (Sticky) */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-8 lg:self-start">
            <ProfileCard profile={profile} setProfile={setProfile} />
            <TenderAnalyzer
              tenderText={tenderText}
              setTenderText={setTenderText}
              analysisResult={analysisResult}
              isAnalyzing={isAnalyzing}
              analysisError={analysisError}
              onAnalyze={handleAnalyzeText}
            />
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tender Search */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-800">Tender Search</h2>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchTenders()}
                  placeholder="Search for tenders (e.g., IT services, construction projects)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSearchTenders}
                  disabled={isSearching}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Find Tenders
                    </>
                  )}
                </button>
              </div>
              {searchError && (
                <div className="mt-4">
                  <ErrorDisplay error={searchError} />
                </div>
              )}
            </div>

            {/* Tender Feed */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Tender Feed</h2>
                {!isSearching && tenderFeed.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCheckEligibility}
                      disabled={isCheckingEligibility}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                    >
                      {isCheckingEligibility ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Check Eligibility
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleExportToPDF}
                      disabled={tenderFeed.filter(t => t.isEligible === true).length === 0}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Export Eligible ({tenderFeed.filter(t => t.isEligible === true).length})
                    </button>
                  </div>
                )}
              </div>
              {isSearching && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              )}
              {!isSearching && tenderFeed.length === 0 && !searchError && (
                <div className="text-center py-12 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No tenders found. Enter a search query and click "Find Tenders" to start.</p>
                </div>
              )}
              {!isSearching && tenderFeed.length > 0 && (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {tenderFeed.map((tender, index) => (
                    <TenderCard
                      key={index}
                      tender={tender}
                      onSelectTender={handleSelectTender}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

