import "./globals.css"
import type { Metadata } from 'next'
import { Inter, Manrope } from 'next/font/google'
import { QueryProvider } from '@/providers/QueryProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' })

export const metadata: Metadata = {
  title: 'LeadMate | Human-Grade AI Voice Agents for Real Estate',
  description: 'Automate your inbound and outbound calls with AI that sounds indistinguishable from your top-performing agent.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      </head>
      <body className={`${inter.variable} ${manrope.variable} overflow-x-hidden selection:bg-primary selection:text-white`} suppressHydrationWarning>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
