import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { PaymentTransaction, PaymentStep } from '@/types'

interface PaymentStatusTrackerProps {
  transaction: PaymentTransaction
}

export function PaymentStatusTracker({ transaction }: PaymentStatusTrackerProps) {
  const completedSteps = transaction.steps.filter(s => s.status === 'completed').length
  const progress = (completedSteps / transaction.steps.length) * 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Payment Status</span>
          <StatusBadge status={transaction.status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2" />
        
        <div className="space-y-3">
          {transaction.steps.map((step, i) => (
            <StepItem key={i} step={step} />
          ))}
        </div>

        {transaction.status === 'completed' && (
          <div className="pt-4 border-t">
            <p className="text-sm text-green-600 font-medium">
              ✓ Payment delivered successfully!
            </p>
          </div>
        )}

        {transaction.status === 'failed' && (
          <div className="pt-4 border-t">
            <p className="text-sm text-red-600 font-medium">
              ✗ Payment failed. Please try again.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
    pending: 'secondary',
    approving: 'default',
    bridging: 'default',
    swapping: 'default',
    completed: 'default',
    failed: 'destructive',
  }

  return (
    <Badge variant={variants[status] || 'secondary'}>
      {status}
    </Badge>
  )
}

function StepItem({ step }: { step: PaymentStep }) {
  const icons = {
    pending: '⏳',
    processing: '⏳',
    completed: '✅',
    failed: '❌',
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xl">{icons[step.status]}</span>
      <div className="flex-1">
        <p className="text-sm font-medium">{step.name}</p>
        {step.txHash && (
          <a
            href={`https://etherscan.io/tx/${step.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            View transaction
          </a>
        )}
        {step.error && (
          <p className="text-xs text-red-600">{step.error}</p>
        )}
      </div>
    </div>
  )
}