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
import Dither from '@/components/Dither'
import { ArrowRight, Check, Loader2, Edit2, Info } from 'lucide-react'

const tokenAllocationSchema = z.object({
  token: z.string().min(1, "Token is required"),
  percentage: z.number().min(0).max(100, "Percentage must be 0-100")
})

const profileSchema = z.object({
  ensName: z.string()
    .min(1, "ENS name is required")
    .regex(/\.eth$/, "Must be a valid .eth name (e.g., alice.eth)"),
  chain: z.string().min(1, "Chain is required"),
  allocations: z.array(tokenAllocationSchema)
    .min(1, "At least one allocation required")
    .refine(
      (allocs) => {
        const sum = allocs.reduce((acc, curr) => acc + curr.percentage, 0)
        return sum === 100
      },
      { message: "Allocations must sum to exactly 100%" }
    ),
  slippageTolerance: z.number().min(0.1).max(5),
  autoSwapEnabled: z.boolean()
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const { address, isConnected } = useAccount()
  const { setProfile, isWriting, isSuccess: txSuccess, error: profileError, txHash } = useSetProfile()
  const { data: existingProfile, isLoading: profileLoading, hasProfile, ensName } = useChainRouterProfile()
  
  const [isEditing, setIsEditing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
    trigger // Add this to manually validate
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange', // Validate on change
    defaultValues: {
      ensName: '',
      chain: 'base-sepolia',
      allocations: [{ token: 'USDC', percentage: 100 }],
      slippageTolerance: 0.5,
      autoSwapEnabled: true,
    },
  })

  const allocations = watch('allocations')
  const autoSwapEnabled = watch('autoSwapEnabled')
  const chain = watch('chain')
  const slippageTolerance = watch('slippageTolerance')
  const ensNameValue = watch('ensName')

  // Calculate total allocation percentage
  const totalAllocation = allocations.reduce((sum, a) => sum + a.percentage, 0)

  useEffect(() => {
    if (existingProfile) {
      reset({
        ensName: existingProfile.ensName,
        chain: existingProfile.chain,
        allocations: existingProfile.allocations,
        slippageTolerance: existingProfile.slippageTolerance,
        autoSwapEnabled: existingProfile.autoSwapEnabled,
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

  // Debug function to check form state
  const debugForm = () => {
    console.log('Form values:', watch())
    console.log('Form errors:', errors)
    console.log('Is valid:', isValid)
    console.log('Total allocation:', totalAllocation)
    trigger() // Force validation
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
                Your ENS preferences have been saved on-chain. You're ready to receive cross-chain payments.
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
                    {existingProfile.chain && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c084fc]/20 border border-[#c084fc]/30">
                        <span className="text-xs font-medium text-[#c084fc] capitalize">{existingProfile.chain.replace('-', ' ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#c084fc]/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#c084fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-white/80 uppercase tracking-wider">Token Allocation</h3>
                </div>
                <div className="space-y-2">
                  {existingProfile.allocations.map((alloc, i) => (
                    <div key={i} className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{alloc.token}</span>
                        <span className="text-sm font-bold text-[#c084fc]">{alloc.percentage}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#c084fc] to-[#8b5cf6] rounded-full transition-all"
                          style={{ width: `${alloc.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#c084fc]/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#c084fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-white/80 uppercase tracking-wider">Preferences</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-white mb-0.5">Slippage Tolerance</div>
                      <div className="text-xs text-white/50">Maximum price movement</div>
                    </div>
                    <div className="text-xl font-bold text-[#c084fc]">{existingProfile.slippageTolerance}%</div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-white mb-0.5">Auto-Swap</div>
                      <div className="text-xs text-white/50">Automatic token conversion</div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      existingProfile.autoSwapEnabled 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-white/10 text-white/50'
                    }`}>
                      {existingProfile.autoSwapEnabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
            Configure your payment preferences once, use everywhere
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* DEBUG PANEL - Remove after fixing */}
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
              <p className="text-yellow-400 text-xs font-mono mb-2">
                DEBUG INFO (remove after fixing):
              </p>
              <p className="text-yellow-400 text-xs font-mono">
                Valid: {isValid ? '✓' : '✗'} | 
                Total Alloc: {totalAllocation}% | 
                ENS: {ensNameValue || 'empty'} |
                Errors: {Object.keys(errors).length}
              </p>
              {Object.keys(errors).length > 0 && (
                <div className="mt-2 text-red-400 text-xs">
                  {Object.entries(errors).map(([key, error]) => (
                    <div key={key}>• {key}: {error?.message}</div>
                  ))}
                </div>
              )}
              <Button 
                type="button"
                onClick={debugForm}
                className="mt-2 bg-yellow-500/30 text-yellow-400 text-xs px-2 py-1 rounded"
              >
                Force Validate
              </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
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

                <Card className={`bg-white/5 border-white/10 backdrop-blur-md ${isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
                  <CardContent className="p-4">
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Destination Chain
                    </label>
                    <ChainSelector
                      value={chain}
                      onChange={(value) => setValue('chain', value, { shouldValidate: true })}
                    />
                  </CardContent>
                </Card>
              </div>

              <Card className={`bg-white/5 border-white/10 backdrop-blur-md ${isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
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

              <div className="grid md:grid-cols-2 gap-4">
                <Card className={`bg-white/5 border-white/10 backdrop-blur-md ${isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-white/80">
                        Slippage
                      </label>
                      <span className="text-xl font-bold text-[#c084fc]">{slippageTolerance}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="5"
                      step="0.1"
                      value={slippageTolerance}
                      disabled={isWriting}
                      onChange={(e) => setValue('slippageTolerance', parseFloat(e.target.value), { shouldValidate: true })}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#c084fc]"
                    />
                    <div className="flex justify-between text-xs text-white/30 mt-1">
                      <span>0.1%</span>
                      <span>5%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`bg-white/5 border-white/10 backdrop-blur-md ${isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
                  <CardContent className="p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <div className="relative flex items-center mt-0.5">
                        <input
                          type="checkbox"
                          {...register('autoSwapEnabled')}
                          disabled={isWriting}
                          className="peer sr-only"
                        />
                        <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c084fc]" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-white text-sm mb-1">Auto-swap</div>
                        <div className="text-xs text-white/40">
                          Automatically swap to preferred tokens on arrival
                        </div>
                      </div>
                    </label>
                  </CardContent>
                </Card>
              </div>

              <div className="pt-2 space-y-2">
                {/* BUTTON NO LONGER DISABLED BY isValid */}
                <Button 
                  type="submit" 
                  disabled={isWriting}
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
                
                {/* Show validation warning but don't block */}
                {!isValid && (
                  <div className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                    <p className="text-yellow-400 text-xs">
                      ⚠️ Form has errors (check above), but you can still try to submit
                    </p>
                  </div>
                )}

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
                        <div className="text-xs text-white/50 capitalize">
                          {chain.replace('-', ' ')}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-white/50 mb-2">Allocation</div>
                      <div className="space-y-1.5">
                        {allocations.map((alloc, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#c084fc] rounded-full"
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
                        <span className="text-[#c084fc] font-medium">{slippageTolerance}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-white/50">Auto-swap</span>
                        <span className={autoSwapEnabled ? 'text-emerald-400' : 'text-white/30'}>
                          {autoSwapEnabled ? 'On' : 'Off'}
                        </span>
                      </div>
                    </div>
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