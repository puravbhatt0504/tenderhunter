'use client'

import { useState, useEffect } from 'react'
import { LayoutDashboard, Search, Sparkles, Download, Activity, Bell, Loader2, TrendingUp, Shield, Zap, Target } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

import { ProfileCard } from '../components/ProfileCard'
import { TenderAnalyzer } from '../components/TenderAnalyzer'
import { TenderCard } from '../components/TenderCard'
import { PDFUploader } from '../components/PDFUploader'
import { ErrorDisplay } from '../components/ErrorDisplay'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { callSecureAPI, getClientAPIStatus } from '../lib/secure-api'

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

  // Load profile
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

  // Search Logic - Optimized for Indian tenders
  async function handleSearchTenders() {
    if (!searchQuery.trim()) {
      setSearchError('Please enter a search query')
      return
    }

    setIsSearching(true)
    setSearchError('')
    setTenderFeed([])

    try {
      const prompt = `Act as an expert Indian tender research assistant. Search for current, active government and private tenders in India related to: "${searchQuery}". 
      
Focus on:
- Government e-Procurement portals (GeM, CPPP, state portals)
- PSU and Central/State Government tenders
- Current and upcoming bid submissions

Return a JSON object with the following structure:
{
  "tenders": [
    {
      "title": "Tender title",
      "authority": "Issuing authority/department name",
      "url": "Direct link to tender document or details page",
      "summary": "Brief summary including estimated value if available (in ₹ Crores/Lakhs)"
    }
  ]
}

IMPORTANT: 
- Return only valid JSON, no markdown formatting
- Focus on Indian government and PSU tenders
- Include estimated tender value in INR where available
- The "url" must be a direct link to the tender, NOT a search page
- Include 5-8 relevant active tenders`

      const payload = {
        prompt: prompt,
        model: 'gemini-2.5-flash',
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

      const responseText = await callSecureAPI(payload)
      const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const jsonData = JSON.parse(cleanText)

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

  // Analyze Logic
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
- Industry Keywords: ${profile.keywords || 'Not specified'}
- Annual Turnover: ₹${profile.annualTurnover || 'Not specified'}
- Years of Experience: ${profile.yearsOfExperience || 'Not specified'} years
- Certifications/Registrations: ${profile.certifications || 'Not specified'}
`

      const prompt = `You are an expert Indian tender analyst. Analyze the following tender document and company profile to provide a comprehensive eligibility assessment.

${profileText}

Tender Text:
${tenderText}

Provide a detailed analysis in Markdown format with the following sections:

### Eligibility Status
[✅ Eligible / ⚠️ Partially Eligible / ❌ Not Eligible] - [Brief Reason]

### Key Financial Requirements
- Minimum Turnover requirement (in ₹ Crores/Lakhs)
- EMD/Bid Security amount
- Performance Bank Guarantee if any

### Technical Requirements
List the key technical/qualification requirements.

### Required Documents
List essential documents needed (GST, PAN, MSME, etc.)

### Red Flags & Recommendations
Identify any strict clauses or potential concerns.

Format your response in clear Markdown.`

      const payload = {
        prompt: prompt,
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: 'text/plain'
        }
      }

      const responseText = await callSecureAPI(payload)

      const markdownToHtml = (md) => {
        return md
          .replace(/^### (.*$)/gim, '<h3 class="font-semibold text-slate-800 mt-4 mb-2 flex items-center gap-2">$1</h3>')
          .replace(/^## (.*$)/gim, '<h2 class="font-bold text-slate-900 mt-5 mb-3 text-lg">$1</h2>')
          .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc marker:text-emerald-500">$1</li>')
          .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc marker:text-emerald-500">$1</li>')
          .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-slate-900">$1</strong>')
          .replace(/✅/g, '<span class="text-green-600">✅</span>')
          .replace(/⚠️/g, '<span class="text-amber-600">⚠️</span>')
          .replace(/❌/g, '<span class="text-red-600">❌</span>')
          .replace(/₹/g, '<span class="font-medium">₹</span>')
          .replace(/\n\n/gim, '</p><p class="mb-3">')
      }

      setAnalysisResult(markdownToHtml(responseText))
    } catch (error) {
      setAnalysisError(error.message || 'Failed to analyze tender. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  function handleSelectTender(tender) {
    if (tender.summary) {
      setTenderText(tender.summary)
    }
  }

  function handlePDFAnalyzed(analysis) {
    // Display the PDF analysis result in the analyzer
    setAnalysisResult(analysis)
    setAnalysisError('')
  }

  async function handleCheckEligibility() {
    if (tenderFeed.length === 0) {
      setSearchError('No tenders to check. Please search for tenders first.')
      return
    }

    if (!profile.keywords && !profile.annualTurnover) {
      setSearchError('Please fill in your company profile first.')
      return
    }

    setIsCheckingEligibility(true)
    setSearchError('')

    try {
      setTenderFeed(prev => prev.map(t => ({ ...t, isCheckingEligibility: true, isEligible: undefined })))

      const profileText = `
Company Profile:
- Keywords: ${profile.keywords || 'Not specified'}
- Annual Turnover: ₹${profile.annualTurnover || 'Not specified'}
- Years of Experience: ${profile.yearsOfExperience || 'Not specified'} years
- Certifications: ${profile.certifications || 'Not specified'}
`

      const updatedTenders = await Promise.all(
        tenderFeed.map(async (tender) => {
          try {
            const prompt = `Based on the Indian company profile and tender, determine eligibility:

${profileText}

Tender: ${tender.title} - ${tender.summary}

Respond with JSON: { "isEligible": true/false, "reason": "Brief reason in 10 words or less" }`

            const payload = {
              prompt: prompt,
              model: 'gemini-2.5-flash',
              generationConfig: {
                responseMimeType: 'application/json',
              }
            }

            const responseText = await callSecureAPI(payload)
            const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            const result = JSON.parse(cleanText)

            return {
              ...tender,
              isEligible: result.isEligible,
              eligibilityReason: result.reason,
              isCheckingEligibility: false
            }
          } catch (error) {
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
      setSearchError('Failed to check eligibility.')
      setTenderFeed(prev => prev.map(t => ({ ...t, isCheckingEligibility: false })))
    } finally {
      setIsCheckingEligibility(false)
    }
  }

  function handleExportToPDF() {
    const eligibleTenders = tenderFeed.filter(t => t.isEligible === true)
    if (eligibleTenders.length === 0) return

    const doc = new jsPDF()

    // Header
    doc.setFontSize(22)
    doc.setTextColor(67, 56, 202)
    doc.text('TenderHunter.ai', 14, 20)

    doc.setFontSize(12)
    doc.setTextColor(100)
    doc.text('Eligible Tenders Report', 14, 28)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 35)

    const tableData = eligibleTenders.map((tender, index) => [
      index + 1,
      tender.title,
      tender.authority,
      tender.eligibilityReason
    ])

    doc.autoTable({
      startY: 45,
      head: [['#', 'Tender Title', 'Authority', 'Eligibility Reason']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [67, 56, 202], textColor: 255 },
      styles: { fontSize: 9 },
    })

    doc.save('eligible_tenders_report.pdf')
  }

  const stats = {
    total: tenderFeed.length,
    eligible: tenderFeed.filter(t => t.isEligible === true).length,
    notEligible: tenderFeed.filter(t => t.isEligible === false).length
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Premium Navbar */}
      <nav className="sticky top-0 z-50 glass-card border-b border-slate-200/60 shadow-sm animate-slide-up">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 md:h-18 items-center">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3 animate-fade-in">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-2 sm:p-2.5 rounded-xl text-white shadow-lg hover-glow">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse-slow" />
                </div>
              </div>
              <div>
                <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  TenderHunter<span className="text-gradient-blue">.ai</span>
                </span>
                <p className="hidden sm:block text-[10px] text-slate-500 -mt-0.5">India's Smart Tender Platform</p>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 sm:gap-3 animate-fade-in animation-delay-200">
              {/* Live Status Badge */}
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Live Data</span>
              </div>

              {/* Notification Bell */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full relative hover:bg-slate-100 transition-all hover:scale-110"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              </Button>

              {/* User Avatar */}
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-white ring-2 ring-slate-100 shadow-lg hover:scale-110 transition-transform cursor-pointer" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-6 sm:p-8 md:p-12 shadow-2xl animate-scale-in">
          {/* Animated background elements */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-60 sm:w-80 h-60 sm:h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-60 sm:w-80 h-60 sm:h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-30"></div>

          <div className="relative z-10 max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm text-blue-200 mb-4 sm:mb-6 border border-white/10 animate-fade-in">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 animate-pulse" />
              <span className="hidden sm:inline">AI-Powered Tender Intelligence for Indian Businesses</span>
              <span className="sm:hidden">AI-Powered Tender Search</span>
            </div>

            {/* Heading */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 tracking-tight leading-tight animate-slide-up">
              Find Your Next{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 animate-float">
                Winning Tender
              </span>
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base md:text-lg text-blue-100/80 mb-6 sm:mb-8 leading-relaxed max-w-2xl animate-slide-up animation-delay-100">
              Search government e-procurement portals, GeM, CPPP, and state tenders.
              Get AI-powered eligibility analysis tailored to your company profile.
            </p>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 animate-slide-up animation-delay-200">
              <div className="relative flex-1 group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl blur opacity-30 group-focus-within:opacity-50 transition duration-300"></div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-focus-within:text-white transition-colors" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 rounded-xl border-0 bg-white/10 backdrop-blur-md text-white placeholder-blue-200/60 focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-all shadow-inner text-sm sm:text-base"
                    placeholder="Search: IT services, construction..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchTenders()}
                  />
                </div>
              </div>
              <Button
                size="lg"
                variant="primary"
                className="h-auto py-3 sm:py-4 px-6 sm:px-8 text-sm sm:text-base font-semibold shadow-xl shadow-cyan-500/25 bg-gradient-to-r from-cyan-500 to-blue-600 border-none hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/40 hover:scale-105 transition-all duration-300"
                onClick={handleSearchTenders}
                isLoading={isSearching}
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="hidden sm:inline">Find Tenders</span>
                <span className="sm:hidden">Search</span>
              </Button>
            </div>

            {/* Error Message */}
            {searchError && (
              <p className="mt-4 text-xs sm:text-sm text-red-300 bg-red-900/40 backdrop-blur-sm inline-block px-3 sm:px-4 py-2 rounded-lg border border-red-500/30 animate-fade-in">
                {searchError}
              </p>
            )}

            {/* Quick Stats */}
            {tenderFeed.length > 0 && (
              <div className="flex flex-wrap gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10 animate-fade-in">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-lg hover:bg-white/15 transition-colors">
                  <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" />
                  <span className="text-white font-medium text-sm sm:text-base">{stats.total}</span>
                  <span className="text-blue-200/70 text-xs sm:text-sm">Found</span>
                </div>
                <div className="flex items-center gap-2 bg-green-500/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-lg hover:bg-green-500/30 transition-colors">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                  <span className="text-white font-medium text-sm sm:text-base">{stats.eligible}</span>
                  <span className="text-green-200/70 text-xs sm:text-sm">Eligible</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">


          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="lg:sticky lg:top-24 space-y-6">
              <ProfileCard profile={profile} setProfile={setProfile} />
              <PDFUploader
                onPDFAnalyzed={handlePDFAnalyzed}
                profile={profile}
              />
              <TenderAnalyzer
                tenderText={tenderText}
                setTenderText={setTenderText}
                analysisResult={analysisResult}
                isAnalyzing={isAnalyzing}
                analysisError={analysisError}
                onAnalyze={handleAnalyzeText}
              />
            </div>
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Latest Opportunities</h2>
                  <p className="text-xs text-slate-500">Government & PSU Tenders</p>
                </div>
                <Badge variant="outline" className="ml-2 bg-slate-50">{tenderFeed.length} Found</Badge>
              </div>

              {!isSearching && tenderFeed.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="gradient"
                    onClick={handleCheckEligibility}
                    disabled={isCheckingEligibility}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 shadow-violet-500/20 hover:shadow-violet-500/40"
                  >
                    {isCheckingEligibility ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Check Eligibility
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleExportToPDF}
                    disabled={stats.eligible === 0}
                    className="shadow-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export ({stats.eligible})
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4 min-h-[400px]">
              {isSearching ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white h-36 rounded-2xl animate-pulse border border-slate-100 shadow-sm" />
                  ))}
                </div>
              ) : tenderFeed.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Search className="w-10 h-10 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Search for Tenders</h3>
                  <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                    Enter keywords like "IT services", "road construction", or "medical equipment" to find relevant government tenders.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {['IT Services', 'Construction', 'Healthcare', 'Education'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => { setSearchQuery(tag); handleSearchTenders(); }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-sm transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                tenderFeed.map((tender, index) => (
                  <TenderCard
                    key={index}
                    tender={tender}
                    onSelectTender={handleSelectTender}
                  />
                ))
              )}
            </div>
          </div >
        </div >
      </main >

      {/* Footer */}
      < footer className="border-t border-slate-200 mt-16 py-8 bg-white/50" >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">
              © 2024 TenderHunter.ai — Made for Indian Businesses 🇮🇳
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>Powered by AI</span>
              <span>•</span>
              <span>GeM • CPPP • State Portals</span>
            </div>
          </div>
        </div>
      </footer >
    </div >
  )
}
