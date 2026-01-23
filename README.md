# Smart Tender Dashboard

A Next.js application for AI-powered tender search and eligibility analysis using Google's Gemini API.

## 🔒 Security Features

This application is **production-ready** with comprehensive security measures:

- **Server-side API calls** - API keys are never exposed to the client
- **Multi-layer rate limiting** - Edge middleware + API route + client-side protection
- **DDoS protection** - Burst detection, automatic IP blocking, circuit breaker
- **Security headers** - HSTS, CSP, XSS protection, clickjacking prevention
- **Input validation** - Request sanitization, bot detection, pattern filtering

See [SECURITY.md](./SECURITY.md) for complete security documentation.

## Features

- **Tender Search**: Search for current, active Indian government tenders using AI-powered web search
- **Tender Analysis**: Analyze tender eligibility based on company profile
- **Company Profile Management**: Save and manage your company's profile details
- **Real-time Results**: Get up-to-date tender information from GeM, CPPP, and state portals
- **PDF Export**: Export eligible tenders as PDF reports

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your API key:
   ```env
   # Server-side API key (secure - NOT exposed to client)
   GEMINI_API_KEY=your_api_key_here
   
   # Application URL (for CORS)
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
   
   Get your API key from: https://makersuite.google.com/app/apikey

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Open in Browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Production Deployment

### Prerequisites Checklist

- [ ] Set `GEMINI_API_KEY` environment variable (server-side only)
- [ ] Set `NEXT_PUBLIC_APP_URL` to your production domain
- [ ] Use HTTPS with valid SSL certificate
- [ ] Consider adding a CDN/WAF (e.g., Cloudflare)

### Build and Deploy

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Vercel Deployment

```bash
# Set environment variables
vercel env add GEMINI_API_KEY production
vercel env add NEXT_PUBLIC_APP_URL production

# Deploy
vercel --prod
```

## Usage

1. **Set Up Your Profile**
   - Fill in your company details (Keywords, Annual Turnover, Years of Experience, Certifications)
   - Click "Save Profile" to persist your settings

2. **Search for Tenders**
   - Enter a search query in the search field
   - Click "Find Tenders" to search for current Indian government tenders
   - Results will appear in the "Latest Opportunities" section

3. **Check Eligibility**
   - Click "Check Eligibility" to automatically assess all tenders
   - Green badges indicate eligible tenders

4. **Analyze in Detail**
   - Click on a tender card to populate the analyzer
   - Get detailed eligibility breakdown with requirements

5. **Export to PDF**
   - Click "Export" to download eligible tenders as a PDF report

## Technology Stack

- **Next.js 16** - React framework with App Router
- **Tailwind CSS 4** - Utility-first CSS framework
- **Framer Motion** - Smooth animations
- **Lucide React** - Icon library
- **Google Gemini API** - AI-powered search and analysis
- **jsPDF** - PDF generation

## Project Structure

```
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.js     # Secure API endpoint
│   ├── layout.jsx           # Root layout
│   ├── page.jsx             # Main dashboard
│   └── globals.css          # Global styles
├── components/              # UI components
├── lib/
│   ├── api.js               # Legacy API (deprecated)
│   ├── secure-api.js        # Secure client API wrapper
│   ├── security.js          # Security middleware
│   └── utils.js             # Utilities
├── middleware.js            # Edge middleware (rate limiting)
├── next.config.js           # Next.js config with security headers
├── SECURITY.md              # Security documentation
├── .env.example             # Environment template
└── .gitignore               # Git ignore (security-enhanced)
```

## API Protection Layers

```
Client → Edge Middleware → API Route → Security Middleware → Gemini API
         (rate limit)      (validation)  (sanitization)
```

## Notes

- Uses Gemini 2.5 Flash Preview model with Google Search grounding
- Optimized for Indian government and PSU tenders
- Financial values displayed in INR (₹ Crores/Lakhs)
- Profile data persisted in browser localStorage
- All API calls routed through secure server-side endpoints

## License

MIT
