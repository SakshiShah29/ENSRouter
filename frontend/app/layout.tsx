import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
//@ts-ignore
import './globals.css'
import { Toaster } from 'sonner'
import { Providers } from '@/components/providers/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ChainRouter - ENS-Powered Cross-Chain Payments',
  description: 'Your ENS name becomes your DeFi autopilot',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
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
         <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1b1f',
              color: '#fff',
              border: '1px solid #374151',
            },
          }}
        />
      </body>
    </html>
  )
}