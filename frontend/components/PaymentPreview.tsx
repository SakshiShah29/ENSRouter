import { Card, CardContent } from '@/components/ui/card'
import { useAcrossQuote } from '@/hooks/useAccrossQuote'
import { formatUSDC, formatTokenAmount } from '@/lib/utils'
import type { ParsedProfile } from '@/types'

interface PaymentPreviewProps {
  profile: ParsedProfile
  amount: string
}

export function PaymentPreview({ profile, amount }: PaymentPreviewProps) {
  const chainId = profile.chain === 'base' ? 8453 : 
                  profile.chain === 'arbitrum' ? 42161 : 1

  // Get quotes for non-USDC allocations
  const swapAllocations = profile.allocations.filter(a => a.token !== 'USDC')
  
  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="font-semibold mb-4">Payment Preview</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Amount:</span>
            <span className="font-medium">{amount} USDC</span>
          </div>

          <div className="border-t pt-3">
            <p className="text-sm font-medium mb-2">
              {profile.ensName} will receive on {profile.chain}:
            </p>
            
            {profile.allocations.map((alloc, i) => {
              const allocAmount = (parseFloat(amount) * alloc.percentage / 100).toFixed(2)
              
              if (alloc.token === 'USDC') {
                return (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span>{allocAmount} USDC</span>
                    <span className="text-gray-600">→ delivered as USDC</span>
                  </div>
                )
              }

              // For non-USDC, show "fetching quote" or actual quote
              return (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span>{allocAmount} USDC</span>
                  <span className="text-gray-600">
                    → ~{alloc.token} (via Across)
                  </span>
                </div>
              )
            })}
          </div>

          {profile.autoSwapEnabled && swapAllocations.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-xs text-gray-500">
                Across Protocol solvers will handle token swaps and pay destination gas
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}