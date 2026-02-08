'use client'

import { useAccount, useReadContract } from 'wagmi'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { formatUnits } from 'viem'
import { sendFormSchema } from '@/lib/validations'
import { useChainRouterProfile } from '@/hooks/useENSRouterProfile'
import { usePayment } from '@/hooks/usePayment'
import { CHAIN_ID_TO_KEY, CHAIN_USDC_ADDRESS, USDC_ABI } from '@/lib/contracts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ENSProfileCard, ENSProfileCardSkeleton } from '@/components/ENSProfileCard'
import { PaymentPreview } from '@/components/PaymentPreview'
import { PaymentStatusTracker } from '@/components/PaymentStatusTracker'
import { WalletConnect } from '@/components/WalletConnect'
import { ENSNavbar } from '@/components/ui/ENSNavbar'
import Dither from '@/components/Dither'
import { Wallet, Send } from 'lucide-react'
import type { SendFormData } from '@/types'

export default function SendPage({ defaultENS }: { defaultENS?: string } = {}) {
  const { address, isConnected, chain: senderChain } = useAccount()
  const { executePayment, transaction, resetTransaction, isReady } = usePayment()

  const senderChainKey = senderChain ? CHAIN_ID_TO_KEY[senderChain.id] : undefined
  const usdcAddress = senderChainKey ? CHAIN_USDC_ADDRESS[senderChainKey] : undefined

  const { data: usdcBalance } = useReadContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!usdcAddress },
  })

  const formattedBalance = usdcBalance != null
    ? parseFloat(formatUnits(usdcBalance as bigint, 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : undefined

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SendFormData>({
    resolver: zodResolver(sendFormSchema),
    defaultValues: {
      recipientENS: defaultENS || '',
    },
  })

  const recipientENS = watch('recipientENS')
  const amount = watch('amount')

  const { data: profile, isLoading: profileLoading } = useChainRouterProfile(recipientENS)

  const onSubmit = async (data: SendFormData) => {
    if (!profile || !address) return
    try {
      await executePayment(profile, data.amount, address)
    } catch (error) {
      console.error('Payment failed:', error)
    }
  }

  if (!isConnected) {
    return (
      <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
        <div className="absolute inset-0 z-0">
          <Dither
            waveColor={[0.5, 0.5, 0.5]}
            disableAnimation={false}
            enableMouseInteraction
            mouseRadius={0.3}
            colorNum={4}
            waveAmplitude={0.3}
            waveFrequency={3}
            waveSpeed={0.05}
          />
        </div>

        <ENSNavbar />

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl shadow-2xl">
            <CardContent className="pt-10 pb-8 px-8">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white text-center mb-2 tracking-tight">Connect Your Wallet</h2>
              <p className="text-white/50 text-center mb-6">
                Connect your wallet to send cross-chain USDC payments
              </p>
              <div className="flex justify-center">
                <WalletConnect />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      <div className="absolute inset-0 z-0">
        <Dither
          waveColor={[0.5, 0.5, 0.5]}
          disableAnimation={false}
          enableMouseInteraction
          mouseRadius={0.3}
          colorNum={4}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.05}
        />
      </div>

      <ENSNavbar />

      <div className="relative z-10 container mx-auto max-w-6xl px-4 pt-28 pb-16">
        {/* Hero-style heading */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-[#a3e635]" />
            <span className="text-xs font-medium text-white/70 tracking-widest uppercase">
              Cross-Chain Payments
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] mb-4">
            <span className="text-white">Send </span>
            <span className="text-[#a3e635]">USDC</span>
          </h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto font-normal">
            Pay anyone with an ENS name. Funds auto-route to their preferred chain and tokens.
          </p>
        </div>

        {/* Grid layout */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sender Info */}
            <Card className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#a3e635]/20 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-[#a3e635]" />
                  </div>
                  <h3 className="text-sm font-medium text-white/80 uppercase tracking-wider">Your Wallet</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-white/40">Address</p>
                    <p className="text-sm font-mono font-medium text-white">
                      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '—'}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center justify-end gap-2">
                      <p className="text-xs text-white/40">Chain</p>
                      {senderChain && (
                        <Badge className="bg-white/10 text-white border-0 text-xs capitalize">
                          {senderChainKey || senderChain.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#a3e635]">
                      {formattedBalance != null ? `${formattedBalance} USDC` : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient ENS */}
              <Card className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl shadow-xl">
                <CardContent className="p-6">
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Recipient ENS Name
                  </label>
                  <Input
                    {...register('recipientENS')}
                    placeholder="alice.eth"
                    className={`bg-black/30 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl ${errors.recipientENS ? 'border-red-500/50' : ''}`}
                  />
                  {errors.recipientENS && (
                    <p className="text-xs text-red-400 mt-1">
                      {errors.recipientENS.message}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Amount */}
              <Card className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl shadow-xl">
                <CardContent className="p-6">
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Amount (USDC)
                  </label>
                  <Input
                    {...register('amount')}
                    type="number"
                    step="0.01"
                    placeholder="100"
                    className={`bg-black/30 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl ${errors.amount ? 'border-red-500/50' : ''}`}
                  />
                  {errors.amount && (
                    <p className="text-xs text-red-400 mt-1">
                      {errors.amount.message}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Payment Preview */}
              {profile && amount && parseFloat(amount) > 0 && (
                <PaymentPreview
                  profile={profile}
                  amount={amount}
                />
              )}

              {/* Send / Reset Button */}
              {transaction?.status === 'completed' || transaction?.status === 'failed' ? (
                <Button
                  type="button"
                  onClick={resetTransaction}
                  className="w-full bg-white text-black hover:bg-white/90 font-semibold text-lg h-14 rounded-full transition-all duration-300 hover:scale-105"
                >
                  Send Another Payment
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!profile || !amount || !!transaction || !isReady}
                  className="w-full bg-white text-black hover:bg-white/90 font-semibold text-lg h-14 rounded-full disabled:opacity-50 transition-all duration-300 hover:scale-105 group"
                >
                  {!isReady ? 'Connecting...' : transaction ? 'Processing...' : (
                    <span className="flex items-center gap-2">
                      Send Payment
                      <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>
              )}
            </form>
          </div>

          {/* Right column - Profile + Status */}
          <div className="lg:col-span-3 space-y-6">
            {/* ENS Profile */}
            {profileLoading && recipientENS && <ENSProfileCardSkeleton />}

            {profile && !profileLoading && (
              <ENSProfileCard profile={profile} />
            )}

            {!profile && !profileLoading && recipientENS && (
              <Card className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl shadow-xl">
                <CardContent className="py-12 text-center text-white/40">
                  No ENSRouter profile found for <span className="text-[#a3e635] font-medium">{recipientENS}</span>
                </CardContent>
              </Card>
            )}

            {!recipientENS && (
              <Card className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl shadow-xl">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-white/30" />
                  </div>
                  <p className="text-white/40 mb-1">Enter a recipient ENS name</p>
                  <p className="text-white/25 text-sm">Their profile will appear here</p>
                </CardContent>
              </Card>
            )}

            {/* Status Tracker */}
            {transaction && (
              <PaymentStatusTracker transaction={transaction} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
