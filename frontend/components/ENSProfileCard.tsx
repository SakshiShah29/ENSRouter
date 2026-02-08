import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useENSAvatar, useENSHeader } from '@/hooks/useENSAvatar'
import { formatAddress } from '@/lib/utils'
import type { ParsedProfile, TokenAllocation } from '@/types'
import { ExternalLink, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface ENSProfileCardProps {
  profile: ParsedProfile
  isLoading?: boolean
}

// Chain display info
const CHAIN_INFO: Record<string, { name: string; color: string; icon: string }> = {
  'ethereum': { name: 'Ethereum', color: 'bg-blue-500', icon: '⟠' },
  'base': { name: 'Base', color: 'bg-blue-600', icon: '🔵' },
  'arbitrum': { name: 'Arbitrum', color: 'bg-cyan-500', icon: '🔷' },
  'polygon': { name: 'Polygon', color: 'bg-purple-500', icon: '⬡' },
  'optimism': { name: 'Optimism', color: 'bg-red-500', icon: '🔴' },
}

function TokenAllocationBar({ allocations }: { allocations: TokenAllocation[] }) {
  const COLORS = ['bg-[#a3e635]', 'bg-emerald-400', 'bg-cyan-400', 'bg-amber-400']

  return (
    <div className="space-y-3">
      {/* Visual bar */}
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {allocations.map((alloc, idx) => (
          <div
            key={idx}
            className={`${COLORS[idx % COLORS.length]} transition-all`}
            style={{ width: `${alloc.percentage}%` }}
            title={`${alloc.token}: ${alloc.percentage}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {allocations.map((alloc, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${COLORS[idx % COLORS.length]}`} />
            <span className="text-sm text-white/60">
              {alloc.token}: <span className="font-medium text-white">{alloc.percentage}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
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

  const chainInfo = CHAIN_INFO[profile.chain] || { name: profile.chain, color: 'bg-gray-500', icon: '●' }

  return (
    <Card className="overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm text-white shadow-2xl rounded-2xl">
      {/* Header Banner */}
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-r from-[#a3e635]/30 to-emerald-400/20">
        {header ? (
          <img
            src={header}
            alt="header"
            className="h-full w-full object-cover opacity-60"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-[#a3e635]/10 to-emerald-500/10" />
        )}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 50 Q30 30 50 40 T80 50' fill='none' stroke='white' stroke-width='2' opacity='0.3'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 100px'
        }} />
      </div>

      {/* Avatar and Main Info */}
      <div className="relative px-6 pb-6">
        {/* Avatar */}
        <div className="relative -mt-16 mb-4 flex items-end justify-between">
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-black/50 bg-black/30 shadow-xl">
              {avatar ? (
                <img
                  src={avatar}
                  alt={profile.ensName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#a3e635] to-emerald-400 text-2xl font-bold text-black">
                  {profile.ensName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <button className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-medium text-[#a3e635] transition-all hover:bg-white/20">
            <span>▶</span> Extend
          </button>
        </div>

        {/* ENS Name and Primary Badge */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">{profile.ensName}</h1>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#a3e635]/20 text-[#a3e635] border-0 hover:bg-[#a3e635]/30">
              <svg className="mr-1 h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              Your primary name
            </Badge>
            <Badge className="bg-white/10 text-white border-0">
              {chainInfo.name}
            </Badge>
          </div>
        </div>

        {/* Address Section */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">Addresses</h2>
          <div className="flex items-center gap-3 rounded-full bg-white/5 border border-white/10 p-3 w-fit">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#a3e635]/20">
              <svg className="h-4 w-4 text-[#a3e635]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 12l10 10 10-10L12 2z" />
              </svg>
            </div>
            <span className="font-mono text-sm text-white/70">
              {formatAddress(profile.address)}
            </span>
            <button
              onClick={copyAddress}
              className="text-white/40 hover:text-white transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-[#a3e635]" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Token Allocations Section */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">Token Allocation on {chainInfo.name}</h2>
          <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
            <TokenAllocationBar allocations={profile.tokenAllocations} />
          </div>
        </div>

        {/* Router Records Section */}
        <div>
          <h2 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">Router Records</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col rounded-2xl bg-white/5 px-4 py-3 border border-white/10">
              <span className="text-xs text-white/30 mb-1">ENSRouter.chain</span>
              <span className="text-sm font-medium text-[#a3e635]">{profile.chain}</span>
            </div>

            <div className="flex flex-col rounded-2xl bg-white/5 px-4 py-3 border border-white/10">
              <span className="text-xs text-white/30 mb-1">ENSRouter.tokenAlloc</span>
              <span className="text-sm font-medium text-white break-all">
                {profile.tokenAllocations.map(a => `${a.token}:${a.percentage}`).join(', ')}
              </span>
            </div>

            <div className="flex flex-col rounded-2xl bg-white/5 px-4 py-3 border border-white/10">
              <span className="text-xs text-white/30 mb-1">ENSRouter.slippage</span>
              <span className="text-sm font-medium text-[#a3e635]">{profile.slippageTolerance}%</span>
            </div>
          </div>
        </div>

        {/* Ownership Section */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider">Ownership</h2>
            <button className="text-sm text-[#a3e635] hover:text-[#a3e635]/80 flex items-center gap-1 transition-colors">
              View <ExternalLink className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white/5 px-4 py-3 border border-white/10">
              <span className="text-xs text-white/30 block mb-1">manager</span>
              <span className="text-sm text-white">{profile.ensName}</span>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3 border border-white/10">
              <span className="text-xs text-white/30 block mb-1">owner</span>
              <span className="text-sm text-white">{profile.ensName}</span>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3 border border-white/10">
              <span className="text-xs text-white/30 block mb-1">expiry</span>
              <span className="text-sm text-white">February 8, 2027</span>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3 border border-white/10">
              <span className="text-xs text-white/30 block mb-1">parent</span>
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
    <Card className="overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm text-white shadow-2xl rounded-2xl">
      <Skeleton className="h-32 w-full bg-white/10" />

      <div className="relative px-6 pb-6">
        <div className="relative -mt-16 mb-4 flex items-end justify-between">
          <Skeleton className="h-24 w-24 rounded-2xl border-4 border-black/50 bg-white/10" />
          <Skeleton className="h-10 w-24 rounded-full bg-white/10" />
        </div>

        <Skeleton className="h-8 w-48 mb-2 bg-white/10" />
        <Skeleton className="h-6 w-32 mb-6 bg-white/10" />

        <Skeleton className="h-4 w-20 mb-3 bg-white/10" />
        <Skeleton className="h-12 w-64 rounded-full bg-white/10 mb-6" />

        <Skeleton className="h-4 w-36 mb-3 bg-white/10" />
        <Skeleton className="h-24 w-full rounded-2xl bg-white/10 mb-6" />

        <Skeleton className="h-4 w-24 mb-3 bg-white/10" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-2xl bg-white/10" />
          ))}
        </div>

        <Skeleton className="h-4 w-20 mb-3 bg-white/10" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl bg-white/10" />
          ))}
        </div>
      </div>
    </Card>
  )
}
