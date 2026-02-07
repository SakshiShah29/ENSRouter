'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema } from '@/lib/validations'
import { useSetProfile } from '@/hooks/useSetProfile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ChainSelector } from '@/components/ChainSelector'
import { AllocationSliders } from '@/components/AllocationSliders'
import { AllocationPieChart } from '@/components/AllocationPieChart'
import { WalletConnect } from '@/components/WalletConnect'
import Dither from '@/components/Dither'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import type { ProfileFormData } from '@/types'

export default function ProfilePage() {
  const { address, isConnected } = useAccount()
  const { setProfile, currentStep, totalSteps, isWriting } = useSetProfile()
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema) as any, // Type assertion to fix resolver mismatch
    defaultValues: {
      ensName: '',
      chain: 'base',
      allocations: [{ token: 'USDC', percentage: 100 }],
      slippageTolerance: 0.5,
      autoSwapEnabled: true,
    },
  })

  const allocations = watch('allocations')
  const autoSwapEnabled = watch('autoSwapEnabled')
  const chain = watch('chain')
  const slippageTolerance = watch('slippageTolerance')

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await setProfile(data)
      setSuccess(true)
    } catch (error) {
      console.error('Failed to save profile:', error)
    }
  }

  // Wallet not connected state
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

  // Success state
  if (success) {
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
              <Button 
                asChild
                className="bg-white text-black hover:bg-white/90 font-semibold px-8 py-6 rounded-full group"
              >
                <a href="/send" className="flex items-center gap-2">
                  Send a Payment
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Main form
  return (
    <div className="relative min-h-screen bg-black">
      {/* Fixed Dither Background */}
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
      
      {/* Dark overlay for readability */}
      <div className="fixed inset-0 bg-black/60 z-0 pointer-events-none" />

      <div className="relative z-10 container mx-auto max-w-2xl px-4 py-12 md:py-20">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-white/60 tracking-wider uppercase">Profile Setup</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
            Set Up Your <span className="text-[#c084fc]">Profile</span>
          </h1>
          <p className="text-white/40 text-lg max-w-md mx-auto">
            Configure your payment preferences once, use everywhere
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* ENS Name */}
          <Card className={`bg-white/5 border-white/10 backdrop-blur-md shadow-xl overflow-hidden group hover:bg-white/[0.07] transition-colors ${isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
            <CardContent className="p-6">
              <label className="block text-sm font-medium text-white/80 mb-3">
                Your ENS Name
              </label>
              <Input
                {...register('ensName')}
                placeholder="alice.eth"
                className={`bg-black/30 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0 h-12 ${errors.ensName ? 'border-red-500/50 focus:border-red-500/50' : ''}`}
              />
              {errors.ensName && (
                <p className="text-sm text-red-400 mt-2">{errors.ensName.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Destination Chain */}
          <Card className={`bg-white/5 border-white/10 backdrop-blur-md shadow-xl overflow-hidden group hover:bg-white/[0.07] transition-colors ${isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
            <CardContent className="p-6">
              <label className="block text-sm font-medium text-white/80 mb-3">
                Preferred Destination Chain
              </label>
              <ChainSelector
                value={chain}
                onChange={(value) => setValue('chain', value)}
              />
            </CardContent>
          </Card>

          {/* Token Allocation */}
          <Card className={`bg-white/5 border-white/10 backdrop-blur-md shadow-xl overflow-hidden group hover:bg-white/[0.07] transition-colors ${isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
            <CardContent className="p-6">
              <label className="block text-sm font-medium text-white/80 mb-4">
                Token Allocation
              </label>
              
              <AllocationSliders
                allocations={allocations}
                onChange={(newAllocations) => setValue('allocations', newAllocations)}
                chain={chain}
              />

              <div className="mt-6 p-4 bg-black/30 rounded-xl border border-white/5">
                <AllocationPieChart allocations={allocations} />
              </div>

              {errors.allocations && (
                <p className="text-sm text-red-400 mt-3">
                  {errors.allocations.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Slippage */}
          <Card className={`bg-white/5 border-white/10 backdrop-blur-md shadow-xl overflow-hidden group hover:bg-white/[0.07] transition-colors ${isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-medium text-white/80">
                  Slippage Tolerance
                </label>
                <span className="text-2xl font-bold text-[#c084fc]">{slippageTolerance}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={slippageTolerance}
                disabled={isWriting}
                onChange={(e) => setValue('slippageTolerance', parseFloat(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#c084fc] hover:accent-[#c084fc]/80 disabled:opacity-50"
              />
              <div className="flex justify-between text-xs text-white/30 mt-2">
                <span>0.1%</span>
                <span>5%</span>
              </div>
            </CardContent>
          </Card>

          {/* Auto-swap toggle */}
          <Card className={`bg-white/5 border-white/10 backdrop-blur-md shadow-xl overflow-hidden group hover:bg-white/[0.07] transition-colors ${isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
            <CardContent className="p-6">
              <label className="flex items-start gap-4 cursor-pointer">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    {...register('autoSwapEnabled')}
                    disabled={isWriting}
                    className="peer sr-only"
                  />
                  <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c084fc] disabled:opacity-50" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white mb-1">Enable automatic swaps</div>
                  <div className="text-sm text-white/40">
                    Automatically swap USDC to your preferred tokens on arrival via Across Protocol
                  </div>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="pt-4">
            <Button 
              type="submit" 
              disabled={isWriting || isSubmitting}
              className="w-full bg-white text-black hover:bg-white/90 font-bold text-lg h-14 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:hover:scale-100"
            >
              {isWriting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving ({currentStep}/{totalSteps})...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Save to ENS
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
            
            {isWriting && (
              <p className="text-center text-sm text-white/40 mt-3">
                Confirm each transaction in your wallet ({currentStep} of {totalSteps} transactions)
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}