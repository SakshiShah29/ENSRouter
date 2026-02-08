'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Copy, Check, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import type { PaymentTransaction, PaymentStep } from '@/types'

interface PaymentStatusTrackerProps {
  transaction: PaymentTransaction
}

export function PaymentStatusTracker({ transaction }: PaymentStatusTrackerProps) {
  const completedSteps = transaction.steps.filter(s => s.status === 'completed').length
  const totalSteps = transaction.steps.length
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  return (
    <Card className="bg-[#1a1b1f] border-gray-700 text-white">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <span>Transaction Status</span>
            {transaction.sourceChain && transaction.destChain && (
              <span className="text-sm font-normal text-gray-400">
                ({transaction.sourceChain} → {transaction.destChain})
              </span>
            )}
          </div>
          <StatusBadge status={transaction.status} />
        </CardTitle>
        <Progress value={progress} className="h-2 bg-gray-700" />
        <p className="text-xs text-gray-400 mt-1">
          Step {completedSteps} of {totalSteps}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {transaction.steps.map((step, i) => (
            <StepItem key={i} step={step} index={i} total={totalSteps} />
          ))}
        </div>

        {transaction.status === 'completed' && (
          <div className="pt-4 border-t border-gray-700">
            <div className="flex items-center gap-2 text-green-400">
              <Check className="h-5 w-5" />
              <span className="font-medium">Payment completed successfully!</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {transaction.amountUSDC} USDC delivered to {transaction.recipient}
            </p>
          </div>
        )}

        {transaction.status === 'failed' && (
          <div className="pt-4 border-t border-gray-700">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Payment failed</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Please check the error details above and try again.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { color: string; bg: string; label: string }> = {
    pending: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Pending' },
    approving: { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Approving' },
    processing: { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Processing' },
    bridging: { color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Bridging' },
    completed: { color: 'text-green-400', bg: 'bg-green-400/10', label: 'Completed' },
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
      // Default to Base Sepolia explorer
      return `https://sepolia.basescan.org/tx/${step.txHash}`
    }
    return null
  }

  const icons = {
    pending: <span className="h-6 w-6 rounded-full border-2 border-gray-600 flex items-center justify-center text-xs text-gray-500">{index + 1}</span>,
    processing: <span className="h-6 w-6 rounded-full border-2 border-blue-500 flex items-center justify-center text-xs text-blue-500 animate-pulse">{index + 1}</span>,
    completed: <span className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center text-xs text-white">✓</span>,
    failed: <span className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center text-xs text-white">✕</span>,
  }

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${
      step.status === 'processing' ? 'bg-blue-500/10 border border-blue-500/20' : 
      step.status === 'completed' ? 'bg-green-500/5' : 
      step.status === 'failed' ? 'bg-red-500/10' : 'bg-gray-800/30'
    }`}>
      <div className="mt-0.5">{icons[step.status]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white">{step.name}</p>
          <span className="text-xs text-gray-500">Step {index + 1}/{total}</span>
        </div>
        
        {step.description && (
          <p className="text-xs text-gray-400 mt-1">{step.description}</p>
        )}
        
        {step.txHash && (
          <div className="flex items-center gap-2 mt-2">
            <code className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300 truncate max-w-[200px]">
              {step.txHash.slice(0, 20)}...{step.txHash.slice(-8)}
            </code>
            <button 
              onClick={copyHash}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
            </button>
            {getExplorerUrl() && (
              <a
                href={getExplorerUrl()!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
        
        {step.error && (
          <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {step.error}
          </p>
        )}
      </div>
    </div>
  )
}