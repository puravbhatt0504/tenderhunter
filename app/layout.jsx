import './globals.css'

export const metadata = {
  title: 'Smart Tender Dashboard',
  description: 'AI-powered tender search and eligibility analysis',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}

