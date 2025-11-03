# Smart Tender Dashboard

A Next.js application for AI-powered tender search and eligibility analysis using Google's Gemini API.

## Features

- **Tender Search**: Search for current, active tenders using AI-powered web search
- **Tender Analysis**: Analyze tender eligibility based on company profile
- **Company Profile Management**: Save and manage your company's profile details
- **Real-time Results**: Get up-to-date tender information from the web

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure API Key**
   
   Create a `.env.local` file in the root directory:
   ```
   NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
   ```
   
   Get your API key from: https://makersuite.google.com/app/apikey

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Open in Browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Set Up Your Profile**
   - Fill in your company details (Keywords, Annual Turnover, Years of Experience, Certifications)
   - Click "Save Profile" to persist your settings

2. **Search for Tenders**
   - Enter a search query in the "Tender Search" field
   - Click "Find Tenders" to search for current tenders
   - Results will appear in the "Tender Feed" section

3. **Analyze Eligibility**
   - Click on a tender card to automatically populate the analyzer textarea
   - Or manually paste tender text into the "Tender Analyzer"
   - Click "Analyze Eligibility" to get a detailed analysis

## Technology Stack

- **Next.js 14+** - React framework with App Router
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **Google Gemini API** - AI-powered search and analysis

## Project Structure

```
├── app/
│   ├── layout.jsx      # Root layout component
│   ├── page.jsx        # Main dashboard component (single file)
│   └── globals.css     # Global styles with Tailwind
├── package.json
├── next.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Notes

- The application uses Gemini 2.5 Flash Preview model
- Tender search uses Google Search tool for real-time results
- Analysis uses structured prompts to generate detailed reports
- All state is managed with React hooks
- Profile data is persisted in browser localStorage

