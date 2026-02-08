import { useAccount } from 'wagmi'
import { Card, CardContent } from '@/components/ui/card'
import { useBridgeEstimate } from '@/hooks/useBridgeEstimate'
import { CHAIN_ID_TO_KEY } from '@/lib/contracts'
import type { ParsedProfile } from '@/types'

interface PaymentPreviewProps {
  profile: ParsedProfile
  amount: string
}

export function PaymentPreview({ profile, amount }: PaymentPreviewProps) {
  const { chain: senderChain } = useAccount()

  //@ts-ignore
  const swapAllocations = profile.allocations.filter(a => a.token !== 'USDC')

  const sourceChainKey = senderChain ? CHAIN_ID_TO_KEY[senderChain.id] : undefined
  //@ts-ignore
  const needsBridge = !!sourceChainKey && sourceChainKey !== profile.chain

  const { data: estimate, isLoading: estimateLoading } = useBridgeEstimate({
    sourceChain: sourceChainKey ?? '',
    //@ts-ignore
    destChain: profile.chain,
    amount,
    enabled: needsBridge,
  })

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="font-semibold mb-4">Payment Preview</h3>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Amount:</span>
            <span className="font-medium">{amount} USDC</span>
          </div>

          {/* Bridge fee estimate */}
          {needsBridge && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Bridge Fee:</span>
              <span className="font-medium">
                {estimateLoading
                  ? 'Estimating...'
                  : estimate?.fees?.length
                    ? estimate.fees.map(f => `${f.amount} USDC`).join(' + ')
                    : 'Included'}
              </span>
            </div>
          )}

          {needsBridge && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Est. Delivery:</span>
              <span className="font-medium">~8–20 seconds (fast)</span>
            </div>
          )}

          {!needsBridge && sourceChainKey && (
            <div className="text-xs text-green-600 font-medium">
              Same chain — no bridge needed
            </div>
          )}

          <div className="border-t pt-3">
            <p className="text-sm font-medium mb-2">
              {/* @ts-ignore */}
              {profile.ensName} will receive on {profile.chain}:
            </p>
{/* @ts-ignore */}
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

              return (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span>{allocAmount} USDC</span>
                  <span className="text-gray-600">
                    → swap to {alloc.token} (via Uniswap)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
