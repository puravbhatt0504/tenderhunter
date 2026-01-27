# PDF Analysis & Rate Limiting Features

## 🎯 Overview

This document explains the new **PDF Document Analysis** feature and **Rate Limiting** system added to TenderHunter.ai.

---

## 📄 PDF Document Analysis

### What It Does
Upload actual tender PDF documents and get AI-powered deep analysis using **Gemini 2.5 Flash Vision**.

### Features
- **Drag & Drop Upload**: Easy file upload with visual feedback
- **Comprehensive Extraction**: Automatically extracts:
  - Tender overview (title, number, authority, value)
  - Critical dates (submission deadline, bid opening, etc.)
  - Eligibility criteria (turnover, experience, certifications)
  - Financial requirements (EMD, tender fee, guarantees)
  - Scope of work
  - Required documents checklist
  - Red flags and important clauses
  - Personalized recommendations based on your profile

### How to Use
1. Fill in your **Company Profile** (turnover, experience, certifications)
2. Click the **PDF Analyzer** card in the sidebar
3. **Drag & drop** a tender PDF or click to browse
4. Click **"Analyze PDF with AI"**
5. Wait for AI analysis (typically 10-30 seconds)
6. View detailed results in the **Tender Analyzer** section below

### File Limits
- **Maximum file size**: 10 MB
- **Supported format**: PDF only
- **Rate limit**: 10 PDF analyses per hour per user

---

## 🛡️ Rate Limiting System

### Why Rate Limiting?
- **Token Efficiency**: Prevents excessive API usage and costs
- **Fair Usage**: Ensures all users get fair access
- **Protection**: Prevents abuse and DDoS attacks

### Rate Limits

#### PDF Analysis
- **Limit**: 10 requests per hour per IP address
- **Window**: Rolling 1-hour window
- **Response**: 429 error with reset time when exceeded

#### General API Calls (from proxy.js)
- **API Routes**: 30 requests per minute
- **Page Routes**: 90 requests per minute
- **Static Assets**: No limit

### How It Works
1. **IP-based tracking**: Uses client IP for identification
2. **Rolling window**: Tracks requests in last 60 minutes
3. **Automatic cleanup**: Old entries removed periodically
4. **Informative errors**: Shows remaining requests and reset time

### Rate Limit Headers
All API responses include:
```
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1234567890
```

---

## 💾 Intelligent Caching

### PDF Analysis Cache
- **Cache Duration**: 24 hours
- **Cache Key**: Based on PDF content + user profile
- **Benefits**: 
  - Instant results for repeated analyses
  - Reduced API costs
  - Better user experience

### Cache Headers
Responses include cache status:
```
X-Cache: HIT   (served from cache)
X-Cache: MISS  (fresh API call)
```

### Cache Cleanup
- Automatic cleanup when cache exceeds 100 entries
- Expired entries (>24h) removed automatically

---

## 🔧 Technical Implementation

### Files Created/Modified

#### New Files
1. **`components/PDFUploader.jsx`**
   - React component for PDF upload UI
   - Drag & drop functionality
   - File validation and progress tracking

2. **`app/api/analyze-pdf/route.js`**
   - API endpoint for PDF analysis
   - Gemini Vision integration
   - Rate limiting and caching logic

#### Modified Files
1. **`app/page.jsx`**
   - Added PDFUploader component to sidebar
   - Added handlePDFAnalyzed function
   - Integrated with existing analysis display

### API Flow
```
User uploads PDF
    ↓
PDFUploader.jsx converts to base64
    ↓
POST /api/analyze-pdf
    ↓
Check rate limit (IP-based)
    ↓
Check cache (PDF hash + profile)
    ↓
If cache miss: Call Gemini Vision API
    ↓
Parse & format response
    ↓
Cache result (24h TTL)
    ↓
Return HTML analysis
    ↓
Display in TenderAnalyzer
```

---

## 🚀 Performance Optimizations

### Token Efficiency
1. **Smart Caching**: Identical PDFs + profiles reuse cached results
2. **Structured Prompts**: Optimized prompts for concise responses
3. **Rate Limiting**: Prevents excessive API usage

### User Experience
1. **Progress Indicators**: Shows "Reading PDF...", "Analyzing..."
2. **Error Handling**: Clear error messages with retry guidance
3. **File Validation**: Checks file type and size before upload
4. **Responsive Design**: Works on mobile and desktop

---

## 📊 Monitoring & Debugging

### Console Logs
- `[PDF Analysis] Cache hit for <filename>` - Served from cache
- `[Middleware] Rate limit exceeded for <IP>` - Rate limit triggered

### Error Responses

#### Rate Limit Exceeded
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many PDF analyses. Please try again in 45 minutes.",
  "resetIn": 45
}
```

#### File Too Large
```json
{
  "error": "PDF file too large. Maximum size is 10MB."
}
```

#### Analysis Failed
```json
{
  "error": "Analysis failed",
  "message": "Failed to analyze PDF. Please try again."
}
```

---

## 🔮 Future Enhancements

### Planned Features
1. **Batch Processing**: Upload multiple PDFs at once
2. **OCR Support**: Handle scanned/image-based PDFs
3. **Persistent Storage**: Save analyses to database
4. **Redis Integration**: Distributed caching for production
5. **Advanced Analytics**: Track analysis history and patterns
6. **Export Options**: Download analysis as PDF/Word

### Production Considerations
1. **Replace in-memory cache** with Redis/Memcached
2. **Add user authentication** for per-user rate limits
3. **Implement queue system** for large PDF processing
4. **Add monitoring** (Sentry, DataDog) for error tracking
5. **CDN integration** for faster file uploads

---

## 🛠️ Configuration

### Environment Variables
```env
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

### Rate Limit Configuration
Edit `app/api/analyze-pdf/route.js`:
```javascript
const RATE_LIMIT = {
    MAX_REQUESTS_PER_HOUR: 10,  // Adjust as needed
    WINDOW_MS: 60 * 60 * 1000   // 1 hour
}
```

### Cache Configuration
```javascript
const CACHE_TTL = 24 * 60 * 60 * 1000  // 24 hours
```

---

## 📝 Usage Examples

### Example 1: Basic PDF Analysis
```
1. Upload tender PDF
2. AI extracts all requirements
3. View structured analysis
```

### Example 2: Eligibility Check
```
1. Fill company profile (₹50L turnover, 5 years exp)
2. Upload tender requiring ₹25L turnover
3. AI shows: ✅ Eligible with recommendations
```

### Example 3: Cached Analysis
```
1. Upload PDF "Tender_XYZ.pdf"
2. Analysis takes 15 seconds
3. Upload same PDF again
4. Instant results (cache hit)
```

---

## 🐛 Troubleshooting

### "Rate limit exceeded"
**Solution**: Wait for the reset time shown in the error message

### "PDF file too large"
**Solution**: Compress PDF or split into smaller files

### "Failed to analyze PDF"
**Solution**: 
- Check if PDF is corrupted
- Ensure PDF contains readable text (not just images)
- Try again after a few seconds

### Analysis seems incomplete
**Solution**: 
- Ensure PDF contains clear tender information
- Check if PDF is password-protected
- Try uploading the official tender document

---

## 📞 Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify API key is valid
3. Check rate limit headers in network tab
4. Review this documentation

---

**Last Updated**: January 27, 2026
**Version**: 1.0.0
