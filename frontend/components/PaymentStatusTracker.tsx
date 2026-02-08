'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Copy, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { PaymentTransaction, PaymentStep, ChainTransfer } from '@/types'

interface PaymentStatusTrackerProps {
  transaction: PaymentTransaction
}

// Chain display info
const CHAIN_INFO: Record<string, { name: string; color: string; bgColor: string }> = {
  'ethereum': { name: 'Ethereum', color: 'text-blue-400', bgColor: 'bg-blue-500' },
  'base': { name: 'Base', color: 'text-blue-500', bgColor: 'bg-blue-600' },
  'arbitrum': { name: 'Arbitrum', color: 'text-cyan-400', bgColor: 'bg-cyan-500' },
  'polygon': { name: 'Polygon', color: 'text-purple-400', bgColor: 'bg-purple-500' },
  'optimism': { name: 'Optimism', color: 'text-red-400', bgColor: 'bg-red-500' },
}

export function PaymentStatusTracker({ transaction }: PaymentStatusTrackerProps) {
  const completedTransfers = transaction.chainTransfers.filter(t => t.status === 'completed').length
  const totalTransfers = transaction.chainTransfers.length
  const progress = totalTransfers > 0 ? (completedTransfers / totalTransfers) * 100 : 0

  return (
    <Card className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl shadow-xl text-white">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <span>Payment Status</span>
            <span className="text-sm font-normal text-white/40">
              ({transaction.totalAmountUSDC} USDC)
            </span>
          </div>
          <StatusBadge status={transaction.status} />
        </CardTitle>

        {/* Overall progress */}
        <div className="space-y-1">
          <Progress value={progress} className="h-2 bg-white/10" />
          <div className="flex justify-between text-xs text-white/40">
            <span>From: {transaction.sourceChain}</span>
            <span>{completedTransfers} of {totalTransfers} transfers complete</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Chain Transfers */}
        {transaction.chainTransfers.map((transfer, i) => (
          <ChainTransferCard
            key={i}
            transfer={transfer}
            index={i}
            total={totalTransfers}
          />
        ))}

        {/* Success Message */}
        {transaction.status === 'completed' && (
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-[#a3e635]">
              <Check className="h-5 w-5" />
              <span className="font-medium">All payments completed successfully!</span>
            </div>
            <p className="text-sm text-white/40 mt-1">
              {transaction.totalAmountUSDC} USDC delivered to {transaction.recipient}
            </p>
          </div>
        )}

        {/* Failure Message */}
        {transaction.status === 'failed' && (
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Payment failed</span>
            </div>
            <p className="text-sm text-white/40 mt-1">
              Please check the error details above and try again.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ChainTransferCard({ transfer, index }: { transfer: ChainTransfer; index: number; total: number }) {
  const [expanded, setExpanded] = useState(transfer.status === 'processing' || transfer.status === 'failed')
  const chainInfo = CHAIN_INFO[transfer.chain] || { name: transfer.chain, color: 'text-white/40', bgColor: 'bg-white/20' }

  const completedSteps = transfer.steps.filter(s => s.status === 'completed').length
  const totalSteps = transfer.steps.length
  const stepProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  // Get status icon based on transfer status
  const getStatusIcon = () => {
    switch (transfer.status) {
      case 'completed':
        return <span className="h-6 w-6 rounded-full bg-[#a3e635] flex items-center justify-center text-xs text-black font-bold">✓</span>
      case 'failed':
        return <span className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center text-xs text-white">✕</span>
      case 'processing':
      case 'approving':
      case 'sending':
      case 'bridging':
        return <span className="h-6 w-6 rounded-full border-2 border-[#a3e635] flex items-center justify-center text-xs text-[#a3e635] animate-pulse">{index + 1}</span>
      default:
        return <span className="h-6 w-6 rounded-full border-2 border-white/20 flex items-center justify-center text-xs text-white/40">{index + 1}</span>
    }
  }

  return (
    <div className={`rounded-2xl border ${
      transfer.status === 'processing' ? 'border-[#a3e635]/30 bg-[#a3e635]/5' :
      transfer.status === 'completed' ? 'border-[#a3e635]/20 bg-[#a3e635]/5' :
      transfer.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
      'border-white/10 bg-white/5'
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors rounded-2xl"
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">{transfer.token}</span>
              <span className={`text-xs ${chainInfo.color}`}>on {chainInfo.name}</span>
              <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                {transfer.percentage}%
              </Badge>
            </div>
            <p className="text-sm text-white/40">
              {transfer.amount} USDC → {transfer.token}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <span className="text-white/40">{completedSteps}/{totalSteps} steps</span>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
        </div>
      </button>

      {/* Expanded Steps */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          <Progress value={stepProgress} className="h-1 bg-white/10" />
          {transfer.steps.map((step, i) => (
            <StepItem key={i} step={step} index={i} total={totalSteps} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { color: string; bg: string; label: string }> = {
    pending: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Pending' },
    approving: { color: 'text-[#a3e635]', bg: 'bg-[#a3e635]/10', label: 'Approving' },
    sending: { color: 'text-orange-400', bg: 'bg-orange-400/10', label: 'Sending' },
    bridging: { color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Bridging' },
    processing: { color: 'text-[#a3e635]', bg: 'bg-[#a3e635]/10', label: 'Processing' },
    completed: { color: 'text-[#a3e635]', bg: 'bg-[#a3e635]/10', label: 'Completed' },
    failed: { color: 'text-red-400', bg: 'bg-red-400/10', label: 'Failed' },
  }

  const style = variants[status] || variants.pending

  return (
    <Badge className={`${style.bg} ${style.color} border-0`}>
      {style.label}
    </Badge>
  )
}

function StepItem({ step, index, total }: { step: PaymentStep; index: number; total: number }) {
  const [copied, setCopied] = useState(false)

  const copyHash = () => {
    if (step.txHash) {
      navigator.clipboard.writeText(step.txHash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getExplorerUrl = () => {
    if (step?.explorerUrl) return step?.explorerUrl
    if (step.txHash) {
      return `https://basescan.org/tx/${step.txHash}`
    }
    return null
  }

  const icons = {
    pending: <span className="h-5 w-5 rounded-full border border-white/20 flex items-center justify-center text-[10px] text-white/40">{index + 1}</span>,
    processing: <span className="h-5 w-5 rounded-full border border-[#a3e635] flex items-center justify-center text-[10px] text-[#a3e635] animate-pulse">{index + 1}</span>,
    completed: <span className="h-5 w-5 rounded-full bg-[#a3e635] flex items-center justify-center text-[10px] text-black font-bold">✓</span>,
    failed: <span className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] text-white">✕</span>,
  }

  return (
    <div className={`flex items-start gap-2 p-2 rounded-xl ${
      step.status === 'processing' ? 'bg-[#a3e635]/5' :
      step.status === 'completed' ? 'bg-[#a3e635]/5' :
      step.status === 'failed' ? 'bg-red-500/10' : ''
    }`}>
      <div className="mt-0.5">{icons[step.status]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white">{step.name}</p>
          <span className="text-xs text-white/30">{index + 1}/{total}</span>
        </div>

        {/* Show LI.FI live message when processing, otherwise show static description */}
        {step.status === 'processing' && step.message ? (
          <p className="text-xs text-[#a3e635]/80 mt-0.5 animate-pulse">{step.message}</p>
        ) : step.description ? (
          <p className="text-xs text-white/40 mt-0.5">{step.description}</p>
        ) : null}

        {step.txHash && (
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/50 truncate max-w-[180px]">
              {step.txHash.slice(0, 14)}...{step.txHash.slice(-6)}
            </code>
            <button
              onClick={copyHash}
              className="text-white/40 hover:text-white transition-colors"
            >
              {copied ? <Check className="h-3 w-3 text-[#a3e635]" /> : <Copy className="h-3 w-3" />}
            </button>
            {getExplorerUrl() && (
              <a
                href={getExplorerUrl()!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#a3e635] hover:text-[#a3e635]/80"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {step.error && (
          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {step.error}
          </p>
        )}
      </div>
    </div>
  )
}
