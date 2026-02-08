import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useENSAvatar, useENSHeader } from '@/hooks/useENSAvatar'
import { formatAddress } from '@/lib/utils'
import type { ParsedProfile } from '@/types'
import { ExternalLink, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface ENSProfileCardProps {
  profile: ParsedProfile
  isLoading?: boolean
}

export function ENSProfileCard({ profile, isLoading }: ENSProfileCardProps) {
  const avatar = useENSAvatar(profile.ensName)
  const header = useENSHeader(profile.ensName)
  const [copied, setCopied] = useState(false)

  const copyAddress = () => {
    navigator.clipboard.writeText(profile.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return <ENSProfileCardSkeleton />
  }

  return (
    <Card className="overflow-hidden border-0 bg-[#1a1b1f] text-white shadow-2xl">
      {/* Header Banner */}
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-b from-[#2d3748] to-[#1a1b1f]">
        {header ? (
          <img 
            src={header} 
            alt="header"
            className="h-full w-full object-cover opacity-60"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-blue-900/20 to-purple-900/20" />
        )}
        {/* Cloud pattern overlay */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 50 Q30 30 50 40 T80 50' fill='none' stroke='white' stroke-width='2' opacity='0.3'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 100px'
        }} />
      </div>

      {/* Avatar and Main Info */}
      <div className="relative px-6 pb-6">
        {/* Avatar - positioned to overlap header */}
        <div className="relative -mt-16 mb-4 flex items-end justify-between">
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-[#1a1b1f] bg-[#2d3748] shadow-xl">
              {avatar ? (
                <img 
                  src={avatar} 
                  alt={profile.ensName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-2xl font-bold">
                  {profile.ensName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          
          {/* Extend Button (decorative for now) */}
          <button className="flex items-center gap-2 rounded-lg bg-[#2d3748] px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-[#3d4758]">
            <span>▶</span> Extend
          </button>
        </div>

        {/* ENS Name and Primary Badge */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">{profile.ensName}</h1>
          <Badge className="bg-green-500/20 text-green-400 border-0 hover:bg-green-500/30">
            <svg className="mr-1 h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            Your primary name
          </Badge>
        </div>

        {/* Address Section */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">Addresses</h2>
          <div className="flex items-center gap-3 rounded-xl bg-[#2d3748]/50 p-3 w-fit">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#627eea]">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 12l10 10 10-10L12 2z"/>
              </svg>
            </div>
            <span className="font-mono text-sm text-gray-300">
              {formatAddress(profile.address)}
            </span>
            <button 
              onClick={copyAddress}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Router Records Section */}
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3">Router Records</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Chain */}
            <div className="flex items-center justify-between rounded-xl bg-[#2d3748]/30 px-4 py-3 border border-gray-700/50">
              <span className="text-sm text-gray-400">ENSRouter.chain</span>
              <span className="text-sm font-medium text-blue-400">{profile.chain}</span>
            </div>

            {/* Allocation */}
            <div className="flex items-center justify-between rounded-xl bg-[#2d3748]/30 px-4 py-3 border border-gray-700/50">
              <span className="text-sm text-gray-400">ENSRouter.alloc</span>
              <span className="text-sm font-medium text-white">
                {profile.allocations.map(a => `${a.token}:${a.percentage}`).join(', ')}
              </span>
            </div>

            {/* Slippage */}
            <div className="flex items-center justify-between rounded-xl bg-[#2d3748]/30 px-4 py-3 border border-gray-700/50">
              <span className="text-sm text-gray-400">ENSRouter.slippage</span>
              <span className="text-sm font-medium text-white">{profile.slippageTolerance}</span>
            </div>

            {/* Autoswap */}
            <div className="flex items-center justify-between rounded-xl bg-[#2d3748]/30 px-4 py-3 border border-gray-700/50">
              <span className="text-sm text-gray-400">ENSRouter.autoswap</span>
              <span className="text-sm font-medium text-green-400">
                {profile.autoSwapEnabled ? 'true' : 'false'}
              </span>
            </div>

            {/* Fallback */}
            {profile.fallbackChain && (
              <div className="flex items-center justify-between rounded-xl bg-[#2d3748]/30 px-4 py-3 border border-gray-700/50">
                <span className="text-sm text-gray-400">ENSRouter.fallback</span>
                <span className="text-sm font-medium text-white">{profile.fallbackChain}</span>
              </div>
            )}
          </div>
        </div>

        {/* Ownership Section */}
        <div className="mt-6 pt-6 border-t border-gray-700/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-400">Ownership</h2>
            <button className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View <ExternalLink className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl bg-[#2d3748]/30 px-4 py-3 border border-gray-700/50">
              <span className="text-xs text-gray-500 block mb-1">manager</span>
              <span className="text-sm text-white">{profile.ensName}</span>
            </div>
            <div className="rounded-xl bg-[#2d3748]/30 px-4 py-3 border border-gray-700/50">
              <span className="text-xs text-gray-500 block mb-1">owner</span>
              <span className="text-sm text-white">{profile.ensName}</span>
            </div>
            <div className="rounded-xl bg-[#2d3748]/30 px-4 py-3 border border-gray-700/50">
              <span className="text-xs text-gray-500 block mb-1">expiry</span>
              <span className="text-sm text-white">February 8, 2027</span>
            </div>
            <div className="rounded-xl bg-[#2d3748]/30 px-4 py-3 border border-gray-700/50">
              <span className="text-xs text-gray-500 block mb-1">parent</span>
              <span className="text-sm text-white">eth</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Skeleton Loading Component
export function ENSProfileCardSkeleton() {
  return (
    <Card className="overflow-hidden border-0 bg-[#1a1b1f] text-white shadow-2xl">
      {/* Header Skeleton */}
      <Skeleton className="h-32 w-full bg-[#2d3748]" />
      
      <div className="relative px-6 pb-6">
        {/* Avatar Skeleton */}
        <div className="relative -mt-16 mb-4 flex items-end justify-between">
          <Skeleton className="h-24 w-24 rounded-2xl border-4 border-[#1a1b1f] bg-[#2d3748]" />
          <Skeleton className="h-10 w-24 rounded-lg bg-[#2d3748]" />
        </div>

        {/* Name Skeleton */}
        <Skeleton className="h-8 w-48 mb-2 bg-[#2d3748]" />
        <Skeleton className="h-6 w-32 mb-6 bg-[#2d3748]" />

        {/* Address Section Skeleton */}
        <Skeleton className="h-4 w-20 mb-3 bg-[#2d3748]" />
        <Skeleton className="h-12 w-64 rounded-xl bg-[#2d3748] mb-6" />

        {/* Records Grid Skeleton */}
        <Skeleton className="h-4 w-24 mb-3 bg-[#2d3748]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl bg-[#2d3748]" />
          ))}
        </div>

        {/* Ownership Skeleton */}
        <Skeleton className="h-4 w-20 mb-3 bg-[#2d3748]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl bg-[#2d3748]" />
          ))}
        </div>
      </div>
    </Card>
  )
}