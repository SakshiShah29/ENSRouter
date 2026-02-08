'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSetProfile } from '@/hooks/useSetProfile'
import { useChainRouterProfile } from '@/hooks/useENSRouterProfile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ChainSelector } from '@/components/ChainSelector'
import { AllocationSliders } from '@/components/AllocationSliders'
import { WalletConnect } from '@/components/WalletConnect'
import { ENSNavbar } from '@/components/ui/ENSNavbar'
import { ENSProfileCard } from '@/components/ENSProfileCard'
import Dither from '@/components/Dither'
import { ArrowRight, Check, Loader2, Edit2, Info, Copy, Link, QrCode, Download } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { SUPPORTED_CHAINS, type SupportedChain } from '@/types'
import type { ProfileFormData } from '@/types'

// Chain display info
const CHAIN_INFO: Record<SupportedChain, { name: string; color: string; icon: string }> = {
  'ethereum': { name: 'Ethereum', color: 'bg-blue-500', icon: '⟠' },
  'base': { name: 'Base', color: 'bg-blue-600', icon: '🔵' },
  'arbitrum': { name: 'Arbitrum', color: 'bg-cyan-500', icon: '🔷' },
  'polygon': { name: 'Polygon', color: 'bg-purple-500', icon: '⬡' },
  'optimism': { name: 'Optimism', color: 'bg-red-500', icon: '🔴' },
}

const tokenAllocationSchema = z.object({
  token: z.string().min(1, "Token is required"),
  percentage: z.number().min(0).max(100, "Percentage must be 0-100")
})

const profileSchema = z.object({
  ensName: z.string()
    .min(1, "ENS name is required")
    .regex(/\.eth$/, "Must be a valid .eth name (e.g., alice.eth)"),
  chain: z.enum(SUPPORTED_CHAINS),
  allocations: z.array(tokenAllocationSchema)
    .min(1, "At least one token allocation required")
    .refine(
      (allocs) => {
        const sum = allocs.reduce((acc, curr) => acc + curr.percentage, 0)
        return sum === 100
      },
      { message: "Token allocations must sum to exactly 100%" }
    ),
  slippageTolerance: z.number().min(1).max(5),
})

export default function ProfilePage() {
  const { isConnected } = useAccount()
  const { setProfile, isWriting, isSuccess: txSuccess, error: profileError, txHash } = useSetProfile()
  const { data: existingProfile, isLoading: profileLoading, hasProfile, ensName } = useChainRouterProfile()

  const [isEditing, setIsEditing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: {
      ensName: '',
      chain: 'base',
      allocations: [{ token: 'USDC', percentage: 100 }],
      slippageTolerance: 1,
    },
  })

  const allocations = watch('allocations')
  const chain = watch('chain')
  const slippageTolerance = watch('slippageTolerance')
  const ensNameValue = watch('ensName')

  const totalAllocation = allocations.reduce((sum, a) => sum + a.percentage, 0)

  useEffect(() => {
    if (existingProfile) {
      reset({
        ensName: existingProfile.ensName,
        chain: existingProfile.chain,
        allocations: existingProfile.tokenAllocations,
        slippageTolerance: existingProfile.slippageTolerance,
      })
      setIsEditing(false)
    } else if (ensName) {
      setValue('ensName', ensName)
      setIsEditing(true)
    }
  }, [existingProfile, ensName, reset, setValue])

  useEffect(() => {
    if (txSuccess) {
      setShowSuccess(true)
      setIsEditing(false)
    }
  }, [txSuccess])

  const onSubmit = async (data: ProfileFormData) => {
    console.log('Submitting with data:', data)
    try {
      await setProfile(data)
    } catch (error) {
      console.error('Failed to save profile:', error)
      alert(error instanceof Error ? error.message : 'Failed to save profile')
    }
  }

  if (!isConnected) {
    return (
      <div className="relative min-h-screen bg-black overflow-hidden">
        <ENSNavbar />
        <div className="absolute inset-0 opacity-30">
          <Dither
            waveColor={[0.3, 0.3, 0.3]}
            disableAnimation={false}
            enableMouseInteraction
            mouseRadius={0.3}
            colorNum={4}
            waveAmplitude={0.3}
            waveFrequency={3}
            waveSpeed={0.05}
          />
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <CardTitle className="text-2xl font-bold text-white">Connect Your Wallet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-white/50 text-center">
                Connect your wallet to set up your ChainRouter profile and configure payment preferences
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

  if (showSuccess) {
    return (
      <div className="relative min-h-screen bg-black overflow-hidden">
        <ENSNavbar />
        <div className="absolute inset-0 opacity-30">
          <Dither
            waveColor={[0.3, 0.3, 0.3]}
            disableAnimation={false}
            enableMouseInteraction
            mouseRadius={0.3}
            colorNum={4}
            waveAmplitude={0.3}
            waveFrequency={3}
            waveSpeed={0.05}
          />
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl text-center">
            <CardContent className="pt-12 pb-8 px-8">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">Profile Saved!</h2>
              <p className="text-white/50 mb-8">
                Your payment preferences have been saved on-chain. You're ready to receive payments.
              </p>
              {txHash && (
                <p className="text-xs text-white/30 mb-4 font-mono break-all">
                  TX: {txHash}
                </p>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowSuccess(false)}
                  className="flex-1 bg-white/10 text-white border border-white/20 hover:bg-white/20 font-semibold px-6 py-6 rounded-full"
                >
                  View Profile
                </Button>
                <Button
                  asChild
                  className="flex-1 bg-white text-black hover:bg-white/90 font-semibold px-6 py-6 rounded-full group"
                >
                  <a href="/send" className="flex items-center justify-center gap-2">
                    Send Payment
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (hasProfile && existingProfile && !isEditing) {
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
                Your Profile
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] mb-4">
              <span className="text-white">{existingProfile.ensName.replace('.eth', '')}</span>
              <span className="text-[#a3e635]">.eth</span>
            </h1>
            <p className="text-lg text-white/60 max-w-xl mx-auto font-normal">
              Your payment preferences are live on-chain. Share your link to start receiving payments.
            </p>
          </div>

          {/* Grid layout */}
          <div className="grid lg:grid-cols-5 gap-6">
            {/* ENS Profile Card - takes 3 columns */}
            <div className="lg:col-span-3">
              <ENSProfileCard profile={existingProfile} />
            </div>

            {/* Right column - Payment Link + Actions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Payment Link Card */}
              <Card className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#a3e635]/20 flex items-center justify-center">
                        <Link className="w-4 h-4 text-[#a3e635]" />
                      </div>
                      <h3 className="text-sm font-medium text-white/80 uppercase tracking-wider">Payment Link</h3>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setShowQR(!showQR)}
                      className={`h-9 px-3 rounded-full text-xs font-medium transition-all ${showQR ? 'bg-[#a3e635]/20 border-[#a3e635]/30 text-[#a3e635]' : 'bg-white/10 border-white/20 text-white/70'} border`}
                    >
                      <QrCode className="w-4 h-4 mr-1.5" />
                      QR Code
                    </Button>
                  </div>
                  <p className="text-xs text-white/40 mb-3">
                    Share this link to receive payments directly to your configured chain
                  </p>

                  {showQR && (
                    <div className="flex flex-col items-center gap-3 mb-4">
                      <div id="qr-code-container" className="bg-white rounded-2xl p-4">
                        <QRCodeSVG
                          value={typeof window !== 'undefined' ? `${window.location.origin}/send/${existingProfile.ensName}` : `https://ensrouter.xyz/send/${existingProfile.ensName}`}
                          size={180}
                          level="H"
                          bgColor="#ffffff"
                          fgColor="#000000"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          const svg = document.querySelector('#qr-code-container svg') as SVGSVGElement
                          if (!svg) return
                          const svgData = new XMLSerializer().serializeToString(svg)
                          const canvas = document.createElement('canvas')
                          const ctx = canvas.getContext('2d')!
                          const img = new Image()
                          const padding = 32
                          const size = 180 + padding * 2
                          canvas.width = size
                          canvas.height = size
                          img.onload = () => {
                            ctx.fillStyle = '#ffffff'
                            ctx.fillRect(0, 0, size, size)
                            ctx.drawImage(img, padding, padding)
                            const link = document.createElement('a')
                            link.download = `${existingProfile.ensName}-payment-qr.png`
                            link.href = canvas.toDataURL('image/png')
                            link.click()
                          }
                          img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
                        }}
                        className="h-9 px-4 rounded-full text-xs font-medium bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 transition-all"
                      >
                        <Download className="w-4 h-4 mr-1.5" />
                        Download QR
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-black/30 border border-white/10 rounded-full px-4 py-3 font-mono text-sm text-[#a3e635] truncate">
                      {typeof window !== 'undefined' ? `${window.location.origin}/send/${existingProfile.ensName}` : `/send/${existingProfile.ensName}`}
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/send/${existingProfile.ensName}`
                        navigator.clipboard.writeText(url)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                      className={`h-12 w-12 rounded-full flex-shrink-0 transition-all ${copied ? 'bg-[#a3e635]/20 border-[#a3e635]/30' : 'bg-white/10 border-white/20'} border`}
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-[#a3e635]" />
                      ) : (
                        <Copy className="w-4 h-4 text-white/70" />
                      )}
                    </Button>
                  </div>
                  {copied && (
                    <p className="text-xs text-[#a3e635] mt-2">Copied to clipboard!</p>
                  )}

                  {/* Share on X */}
                  <Button
                    type="button"
                    onClick={() => {
                      const paymentUrl = `${window.location.origin}/send/${existingProfile.ensName}`
                      const text = `I just set up my @ENSRouter profile!\n\nYou can now send me cross-chain USDC payments by scanning my QR code or clicking the link below.\n\n${paymentUrl}`
                      window.open(
                        `https://x.com/intent/post?text=${encodeURIComponent(text)}`,
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }}
                    className="w-full mt-3 h-11 rounded-full text-sm font-medium bg-white text-black hover:bg-white/90 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Share on X
                  </Button>
                  <p className="text-xs text-white/30 mt-2 text-center">
                    Tip: Download the QR code first, then attach it to your post
                  </p>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 bg-white text-black hover:bg-white/90 font-semibold text-base h-14 rounded-full group transition-all duration-300 hover:scale-105"
                >
                  <Edit2 className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                  Edit Profile
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10 hover:border-white/50 font-semibold text-base h-14 rounded-full bg-transparent transition-all duration-300"
                >
                  <a href="/send" className="flex items-center justify-center gap-2">
                    Send Payment
                    <ArrowRight className="w-5 h-5" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
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

      <div className="relative z-10 container mx-auto max-w-5xl px-4 pt-28 pb-12">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-[#a3e635]" />
            <span className="text-xs font-medium text-white/70 tracking-widest uppercase">
              {hasProfile ? 'Edit Profile' : 'Setup Profile'}
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] mb-4">
            <span className="text-white">{hasProfile ? 'Update' : 'Set Up'} Your </span>
            <span className="text-[#a3e635]">Profile</span>
          </h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto font-normal">
            Configure your payment preferences once, use everywhere
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* ENS Name */}
                <Card className={`bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl ${isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
                  <CardContent className="p-4">
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      ENS Name <span className="text-red-400">*</span>
                    </label>
                    <Input
                      {...register('ensName')}
                      placeholder="alice.eth"
                      disabled={isWriting || profileLoading}
                      className={`bg-black/30 border-white/10 text-white placeholder:text-white/30 h-10 ${errors.ensName ? 'border-red-500/50' : ''}`}
                    />
                    {errors.ensName ? (
                      <p className="text-xs text-red-400 mt-1">{errors.ensName.message}</p>
                    ) : (
                      <p className="text-xs text-white/30 mt-1">Must end with .eth</p>
                    )}
                  </CardContent>
                </Card>

                {/* Destination Chain */}
                <Card className={`bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl ${isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
                  <CardContent className="p-4">
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Destination Chain
                    </label>
                    <ChainSelector
                      value={chain}
                      onChange={(value) => setValue('chain', value as SupportedChain, { shouldValidate: true })}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Token Allocation */}
              <Card className={`bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl ${isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-white/80">
                        Token Allocation
                      </label>
                      <Info className="w-4 h-4 text-white/30" />
                    </div>
                    <span className={`text-xs font-mono ${totalAllocation === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                      Total: {totalAllocation}%
                    </span>
                  </div>

                  <p className="text-xs text-white/40 mb-3">
                    Incoming USDC will be auto-swapped into these tokens on arrival
                  </p>

                  <AllocationSliders
                    allocations={allocations}
                    onChange={(newAllocations) => {
                      setValue('allocations', newAllocations, { shouldValidate: true })
                    }}
                    chain={chain}
                    disabled={isWriting}
                  />

                  {errors.allocations && (
                    <p className="text-xs text-red-400 mt-2">
                      {errors.allocations.message}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Slippage */}
              <Card className={`bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl ${isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-white/80">
                      Slippage Tolerance
                    </label>
                    <span className="text-xl font-bold text-[#a3e635]">{slippageTolerance}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.1"
                    value={slippageTolerance}
                    disabled={isWriting}
                    onChange={(e) => setValue('slippageTolerance', parseFloat(e.target.value), { shouldValidate: true })}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#a3e635]"
                  />
                  <div className="flex justify-between text-xs text-white/30 mt-1">
                    <span>1%</span>
                    <span>5%</span>
                  </div>
                </CardContent>
              </Card>

              <div className="pt-2 space-y-2">
                <Button
                  type="submit"
                  disabled={isWriting || totalAllocation !== 100}
                  className="w-full bg-white text-black hover:bg-white/90 font-semibold text-lg h-12 rounded-full disabled:opacity-50 transition-all duration-300 hover:scale-105"
                >
                  {isWriting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving to ENS...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {hasProfile ? 'Update' : 'Save to'} ENS
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </Button>

                {isWriting && (
                  <p className="text-center text-xs text-white/40">
                    Confirm the transaction in your wallet
                  </p>
                )}

                {profileError && (
                  <p className="text-center text-xs text-red-400">
                    Error: {profileError.message}
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-28">
              <Card className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl shadow-xl">
                <CardContent className="p-6">
                  <div className="text-xs font-medium text-white/50 uppercase tracking-widest mb-4">
                    Preview
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#a3e635] to-emerald-400 flex items-center justify-center text-2xl font-bold text-black">
                        {ensNameValue ? ensNameValue[0].toUpperCase() : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white truncate">
                          {ensNameValue || 'your-name.eth'}
                        </div>
                        <div className="text-xs text-white/50 capitalize">
                          {CHAIN_INFO[chain]?.name || chain}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-white/50 mb-2">Token Allocation</div>
                      <div className="space-y-1.5">
                        {allocations.map((alloc, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#a3e635] rounded-full"
                                style={{ width: `${alloc.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-white/70 w-16 text-right">
                              {alloc.token} {alloc.percentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/50">Slippage</span>
                        <span className="text-[#a3e635] font-medium">{slippageTolerance}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {hasProfile && (
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  className="w-full mt-4 border-white/30 text-white hover:bg-white/10 hover:border-white/50 rounded-full bg-transparent transition-all duration-300"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
