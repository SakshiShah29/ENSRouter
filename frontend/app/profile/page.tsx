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
import { WalletConnect } from '@/components/WalletConnect'
import Dither from '@/components/Dither'
import { ArrowRight, Check, Loader2, Edit2, Info, Copy, Link, QrCode, Download } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { SUPPORTED_CHAINS, type SupportedChain, type ChainAllocation } from '@/types'

// Chain display info
const CHAIN_INFO: Record<SupportedChain, { name: string; color: string; icon: string }> = {
  'ethereum-sepolia': { name: 'Ethereum Sepolia', color: 'bg-blue-500', icon: '⟠' },
  'base-sepolia': { name: 'Base Sepolia', color: 'bg-blue-600', icon: '🔵' },
  'arbitrum-sepolia': { name: 'Arbitrum Sepolia', color: 'bg-cyan-500', icon: '🔷' },
  'arc-testnet': { name: 'Arc Testnet', color: 'bg-purple-500', icon: '⚡' },
}

const chainAllocationSchema = z.object({
  chain: z.enum(SUPPORTED_CHAINS),
  percentage: z.number().min(0).max(100, "Percentage must be 0-100")
})

const profileSchema = z.object({
  ensName: z.string()
    .min(1, "ENS name is required")
    .regex(/\.eth$/, "Must be a valid .eth name (e.g., alice.eth)"),
  chainAllocations: z.array(chainAllocationSchema)
    .min(1, "At least one chain allocation required")
    .refine(
      (allocs) => {
        const sum = allocs.reduce((acc, curr) => acc + curr.percentage, 0)
        return sum === 100
      },
      { message: "Chain allocations must sum to exactly 100%" }
    ),
  fallbackChain: z.enum(SUPPORTED_CHAINS).optional()
})

type ProfileFormData = z.infer<typeof profileSchema>

// Chain Allocation Sliders Component
function ChainAllocationSliders({
  allocations,
  onChange,
  disabled
}: {
  allocations: ChainAllocation[]
  onChange: (allocations: ChainAllocation[]) => void
  disabled?: boolean
}) {
  const handlePercentageChange = (chain: SupportedChain, newPercentage: number) => {
    const existingAlloc = allocations.find(a => a.chain === chain)

    if (existingAlloc) {
      // Update existing allocation
      onChange(allocations.map(a =>
        a.chain === chain ? { ...a, percentage: newPercentage } : a
      ))
    } else if (newPercentage > 0) {
      // Add new allocation
      onChange([...allocations, { chain, percentage: newPercentage }])
    }
  }

  const getChainPercentage = (chain: SupportedChain) => {
    return allocations.find(a => a.chain === chain)?.percentage || 0
  }

  const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0)

  return (
    <div className="space-y-4">
      {SUPPORTED_CHAINS.map((chain) => {
        const info = CHAIN_INFO[chain]
        const percentage = getChainPercentage(chain)

        return (
          <div key={chain} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${info.color}`} />
                <span className="text-sm font-medium text-white">{info.name}</span>
              </div>
              <span className="text-sm font-bold text-[#c084fc]">{percentage}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={percentage}
              disabled={disabled}
              onChange={(e) => handlePercentageChange(chain, parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#c084fc]"
            />
          </div>
        )
      })}

      <div className="pt-3 border-t border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-sm text-white/50">Total Allocation</span>
          <span className={`text-sm font-bold ${totalPercentage === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalPercentage}%
          </span>
        </div>
        {totalPercentage !== 100 && (
          <p className="text-xs text-red-400 mt-1">
            Must equal 100% (currently {totalPercentage > 100 ? `${totalPercentage - 100}% over` : `${100 - totalPercentage}% remaining`})
          </p>
        )}
      </div>
    </div>
  )
}

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
      chainAllocations: [{ chain: 'base-sepolia', percentage: 100 }],
      fallbackChain: undefined,
    },
  })

  const chainAllocations = watch('chainAllocations')
  const ensNameValue = watch('ensName')
  const fallbackChain = watch('fallbackChain')

  // Calculate total allocation percentage
  const totalAllocation = chainAllocations.reduce((sum, a) => sum + a.percentage, 0)

  useEffect(() => {
    if (existingProfile) {
      reset({
        ensName: existingProfile.ensName,
        chainAllocations: existingProfile.chainAllocations,
        fallbackChain: existingProfile.fallbackChain,
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
                Connect your wallet to set up your ChainRouter profile and configure cross-chain payment preferences
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
                Your chain allocation preferences have been saved on-chain. You're ready to receive cross-chain payments.
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
      <div className="relative min-h-screen bg-black">
        <div className="fixed inset-0 z-0">
          <Dither
            waveColor={[0.25, 0.25, 0.25]}
            disableAnimation={false}
            enableMouseInteraction
            mouseRadius={0.3}
            colorNum={4}
            waveAmplitude={0.3}
            waveFrequency={3}
            waveSpeed={0.05}
          />
        </div>

        <div className="fixed inset-0 bg-black/60 z-0 pointer-events-none" />

        <div className="relative z-10 container mx-auto max-w-3xl px-4 py-12">
          <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-xl mb-6 overflow-hidden">
            <div className="relative h-32 bg-gradient-to-r from-[#c084fc] to-[#8b5cf6]">
              <div className="absolute inset-0 bg-black/20" />
            </div>
            <CardContent className="relative -mt-16 px-8 pb-8">
              <div className="flex items-end gap-6 mb-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-2xl bg-black/30 border-4 border-black/50 backdrop-blur-xl overflow-hidden">
                    <img
                      src={`https://metadata.ens.domains/mainnet/avatar/${existingProfile.ensName}`}
                      alt={existingProfile.ensName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${existingProfile.ensName}`
                      }}
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-emerald-500 border-4 border-black flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                </div>

                <div className="flex-1 pb-2">
                  <h1 className="text-3xl font-black text-white mb-1">
                    {existingProfile.ensName}
                  </h1>
                  <p className="text-white/50 font-mono text-sm">
                    {existingProfile.address.slice(0, 6)}...{existingProfile.address.slice(-4)}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-medium text-emerald-400">Active Profile</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chain Allocations Card */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-xl mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#c084fc]/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#c084fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-white/80 uppercase tracking-wider">Chain Allocations</h3>
              </div>

              {/* Allocation Bar */}
              <div className="mb-4">
                <div className="flex h-4 w-full overflow-hidden rounded-full">
                  {existingProfile.chainAllocations.map((alloc, idx) => {
                    const info = CHAIN_INFO[alloc.chain] || { color: 'bg-gray-500' }
                    return (
                      <div
                        key={idx}
                        className={`${info.color} transition-all`}
                        style={{ width: `${alloc.percentage}%` }}
                        title={`${alloc.chain}: ${alloc.percentage}%`}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Chain Legend */}
              <div className="space-y-2">
                {existingProfile.chainAllocations.map((alloc, i) => {
                  const info = CHAIN_INFO[alloc.chain] || { name: alloc.chain, color: 'bg-gray-500', icon: '●' }
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${info.color}`} />
                        <span className="text-sm text-white">{info.name}</span>
                      </div>
                      <span className="text-sm font-bold text-[#c084fc]">{alloc.percentage}%</span>
                    </div>
                  )
                })}
              </div>

              {/* Fallback Chain */}
              {existingProfile.fallbackChain && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/50">Fallback Chain</span>
                    <span className="text-sm text-[#c084fc]">
                      {CHAIN_INFO[existingProfile.fallbackChain]?.name || existingProfile.fallbackChain}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Link Card */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-xl mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Link className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-medium text-white/80 uppercase tracking-wider">Payment Link</h3>
                </div>
                <Button
                  type="button"
                  onClick={() => setShowQR(!showQR)}
                  className={`h-9 px-3 rounded-lg text-xs font-medium ${showQR ? 'bg-[#c084fc]/20 border-[#c084fc]/30 text-[#c084fc]' : 'bg-white/10 border-white/10 text-white/70'} border`}
                >
                  <QrCode className="w-4 h-4 mr-1.5" />
                  QR Code
                </Button>
              </div>
              <p className="text-xs text-white/40 mb-3">
                Share this link to receive payments directly to your configured chains
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
                      // Add padding for the white background
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
                    className="h-9 px-4 rounded-lg text-xs font-medium bg-white/10 border border-white/10 text-white/70 hover:bg-white/20"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Download QR
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3 font-mono text-sm text-[#c084fc] truncate">
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
                  className={`h-12 w-12 rounded-lg flex-shrink-0 ${copied ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-white/10 border-white/10'} border`}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white/70" />
                  )}
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-emerald-400 mt-2">Copied to clipboard!</p>
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
                className="w-full mt-3 h-11 rounded-lg text-sm font-medium bg-white text-black hover:bg-white/90 flex items-center justify-center gap-2"
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

          <div className="flex gap-3">
            <Button
              onClick={() => setIsEditing(true)}
              className="flex-1 bg-white text-black hover:bg-white/90 font-bold text-lg h-14 rounded-xl group"
            >
              <Edit2 className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
              Edit Profile
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 font-bold text-lg h-14 rounded-xl"
            >
              <a href="/send" className="flex items-center justify-center gap-2">
                Send Payment
                <ArrowRight className="w-5 h-5" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black">
      <div className="fixed inset-0 z-0">
        <Dither
          waveColor={[0.25, 0.25, 0.25]}
          disableAnimation={false}
          enableMouseInteraction
          mouseRadius={0.3}
          colorNum={4}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.05}
        />
      </div>

      <div className="fixed inset-0 bg-black/60 z-0 pointer-events-none" />

      <div className="relative z-10 container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-white/60 tracking-wider uppercase">
              {hasProfile ? 'Edit Profile' : 'Setup Profile'}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">
            {hasProfile ? 'Update' : 'Set Up'} Your <span className="text-[#c084fc]">Profile</span>
          </h1>
          <p className="text-white/40">
            Configure your chain allocation preferences once, use everywhere
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* ENS Name Card */}
              <Card className={`bg-white/5 border-white/10 backdrop-blur-md ${isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
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

              {/* Chain Allocations Card */}
              <Card className={`bg-white/5 border-white/10 backdrop-blur-md ${isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-white/80">
                        Chain Allocations
                      </label>
                      <Info className="w-4 h-4 text-white/30" />
                    </div>
                    <span className={`text-xs font-mono ${totalAllocation === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                      Total: {totalAllocation}%
                    </span>
                  </div>

                  <p className="text-xs text-white/40 mb-4">
                    Specify what percentage of incoming USDC you want on each chain
                  </p>

                  <ChainAllocationSliders
                    allocations={chainAllocations}
                    onChange={(newAllocations) => {
                      setValue('chainAllocations', newAllocations.filter(a => a.percentage > 0), { shouldValidate: true })
                    }}
                    disabled={isWriting}
                  />

                  {errors.chainAllocations && (
                    <p className="text-xs text-red-400 mt-2">
                      {errors.chainAllocations.message}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Fallback Chain Card */}
              <Card className={`bg-white/5 border-white/10 backdrop-blur-md ${isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
                <CardContent className="p-4">
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Fallback Chain (Optional)
                  </label>
                  <p className="text-xs text-white/40 mb-3">
                    If a bridge fails, funds will be sent to this chain instead
                  </p>
                  <select
                    {...register('fallbackChain')}
                    disabled={isWriting}
                    className="w-full h-10 bg-black/30 border border-white/10 text-white rounded-md px-3 text-sm"
                  >
                    <option value="">No fallback</option>
                    {SUPPORTED_CHAINS.map((chain) => (
                      <option key={chain} value={chain}>
                        {CHAIN_INFO[chain].name}
                      </option>
                    ))}
                  </select>
                </CardContent>
              </Card>

              <div className="pt-2 space-y-2">
                <Button
                  type="submit"
                  disabled={isWriting || totalAllocation !== 100}
                  className="w-full bg-white text-black hover:bg-white/90 font-bold text-lg h-12 rounded-xl disabled:opacity-50"
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
            <div className="sticky top-8">
              <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-xl">
                <CardContent className="p-6">
                  <div className="text-xs font-medium text-white/50 uppercase tracking-wider mb-4">
                    Preview
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#c084fc] to-[#8b5cf6] flex items-center justify-center text-2xl font-bold text-white">
                        {ensNameValue ? ensNameValue[0].toUpperCase() : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white truncate">
                          {ensNameValue || 'your-name.eth'}
                        </div>
                        <div className="text-xs text-white/50">
                          ENS Router Profile
                        </div>
                      </div>
                    </div>

                    {/* Chain Allocation Preview */}
                    <div>
                      <div className="text-xs text-white/50 mb-2">Chain Allocation</div>

                      {/* Mini allocation bar */}
                      <div className="flex h-2 w-full overflow-hidden rounded-full mb-2">
                        {chainAllocations.filter(a => a.percentage > 0).map((alloc, idx) => {
                          const info = CHAIN_INFO[alloc.chain] || { color: 'bg-gray-500' }
                          return (
                            <div
                              key={idx}
                              className={`${info.color} transition-all`}
                              style={{ width: `${alloc.percentage}%` }}
                            />
                          )
                        })}
                      </div>

                      <div className="space-y-1">
                        {chainAllocations.filter(a => a.percentage > 0).map((alloc, i) => {
                          const info = CHAIN_INFO[alloc.chain] || { name: alloc.chain, color: 'bg-gray-500' }
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${info.color}`} />
                              <span className="text-xs text-white/70 flex-1">
                                {info.name}
                              </span>
                              <span className="text-xs font-medium text-[#c084fc]">
                                {alloc.percentage}%
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {fallbackChain && (
                      <div className="pt-3 border-t border-white/10">
                        <div className="flex justify-between text-xs">
                          <span className="text-white/50">Fallback</span>
                          <span className="text-[#c084fc]">
                            {CHAIN_INFO[fallbackChain]?.name || fallbackChain}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {hasProfile && (
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="ghost"
                  className="w-full mt-4 text-white/50 hover:text-white hover:bg-white/5"
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
