import { Inter, Outfit } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata = {
  title: 'Smart Tender Dashboard',
  description: 'AI-powered tender search and eligibility analysis',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased text-slate-900 bg-slate-50 min-h-screen`}>{children}</body>
    </html>
  )
}
