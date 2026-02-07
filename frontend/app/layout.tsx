import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
//@ts-ignore
import './globals.css'
import { Providers } from '@/components/providers/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ChainRouter - ENS-Powered Cross-Chain Payments',
  description: 'Your ENS name becomes your DeFi autopilot',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}