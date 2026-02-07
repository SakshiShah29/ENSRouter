'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { config } from '@/lib/wagmi'
// @ts-ignore
import '@rainbow-me/rainbowkit/styles.css'
// import { Toaster } from '@/components/ui/'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
          {/* <Toaster /> */}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}