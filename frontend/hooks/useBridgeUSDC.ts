import { useState, useCallback, useRef } from 'react'
import { useAccount } from 'wagmi'
import { parseUnits } from 'viem'
import { getQuote, convertQuoteToRoute, executeRoute } from '@lifi/sdk'
import type { RouteExtended, Process } from '@lifi/sdk'
import { CHAIN_USDC_ADDRESS } from '@/lib/contracts'
import { CHAIN_KEY_TO_CHAIN_ID } from '@/lib/lifi'
import { toast } from 'sonner'
import type { BridgeResult, BridgeStep } from '@/types'

interface BridgeParams {
  sourceChain: string          // Our chain key (e.g. "base")
  destChain: string            // Our chain key (e.g. "arbitrum")
  amount: string               // Human-readable USDC amount (e.g. "100.00")
  destTokenAddress?: string    // Token address on destination chain (defaults to dest chain USDC)
  destTokenSymbol?: string     // Display name for the destination token (e.g. "ETH")
  recipientAddress?: string    // Recipient wallet address on destination chain
  slippage?: number            // Slippage tolerance as decimal (e.g. 0.005 = 0.5%). Defaults to 0.005
  onStepUpdate?: (step: BridgeStep, stepIndex: number) => void
}

// Map LI.FI process types to display names
const PROCESS_NAME_MAP: Record<string, string> = {
  'TOKEN_ALLOWANCE': 'Approve USDC',
  'SWAP': 'Swap',
  'CROSS_CHAIN': 'Bridge Transfer',
  'RECEIVING_CHAIN': 'Receiving',
  'PERMIT': 'Permit',
}

// Map LI.FI process status to our step state
function mapProcessStatus(status: string): BridgeStep['state'] {
  switch (status) {
    case 'DONE': return 'success'
    case 'FAILED': return 'error'
    case 'STARTED':
    case 'ACTION_REQUIRED':
    case 'PENDING': return 'processing'
    default: return 'pending'
  }
}

export function useBridgeUSDC() {
  const { address } = useAccount()
  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [steps, setSteps] = useState<BridgeStep[]>([])
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const stepsRef = useRef<BridgeStep[]>([])

  const isReady = !!address

  const bridge = useCallback(
    async (params: BridgeParams): Promise<BridgeResult> => {
      if (!address) {
        throw new Error('Wallet not connected')
      }

      const fromChainId = CHAIN_KEY_TO_CHAIN_ID[params.sourceChain]
      const toChainId = CHAIN_KEY_TO_CHAIN_ID[params.destChain]

      if (!fromChainId || !toChainId) {
        const errorMsg = `Unsupported chain: ${!fromChainId ? params.sourceChain : params.destChain}`
        toast.error('Chain Error', { description: errorMsg })
        throw new Error(errorMsg)
      }

      // Source is always USDC (sender pays in USDC)
      const fromToken = CHAIN_USDC_ADDRESS[params.sourceChain]
      // Destination token: use provided address, or default to USDC on dest chain
      const toToken = params.destTokenAddress || CHAIN_USDC_ADDRESS[params.destChain]

      if (!fromToken || !toToken) {
        throw new Error('Token address not configured for chain')
      }

      const destTokenName = params.destTokenSymbol || 'USDC'

      setIsPending(true)
      setIsSuccess(false)
      setError(null)
      setSteps([])
      stepsRef.current = []
      setCurrentStep('approve')
      const toastedProcesses = new Set<string>()

      try {
        toast.info(`Sending ${destTokenName}`, {
          description: `${params.amount} USDC → ${destTokenName} on ${params.destChain}`,
        })

        const amountWei = parseUnits(params.amount, 6).toString()

        // 1. Get quote from LI.FI (USDC on source chain → target token on dest chain)
        const quote = await getQuote({
          fromChain: fromChainId,
          toChain: toChainId,
          fromToken,
          toToken,
          fromAmount: amountWei,
          fromAddress: address,
          toAddress: params.recipientAddress ?? address,
          slippage: params.slippage ?? 0.01,
        })

        // 2. Convert quote to route and execute
        const route = convertQuoteToRoute(quote)

        const executedRoute: RouteExtended = await executeRoute(route, {
          updateRouteHook(updatedRoute) {
            // Extract all processes from all steps in the route
            const allProcesses: Process[] = []
            for (const step of updatedRoute.steps) {
              if (step.execution?.process) {
                allProcesses.push(...step.execution.process)
              }
            }

            // Map processes to our BridgeStep format
            const bridgeSteps: BridgeStep[] = allProcesses.map(proc => ({
              name: PROCESS_NAME_MAP[proc.type] || proc.type,
              state: mapProcessStatus(proc.status),
              txHash: proc.txHash,
              explorerUrl: proc.txLink,
              error: proc.error?.message,
              substatus: proc.substatus,
              message: proc.message,
              processType: proc.type,
            }))

            stepsRef.current = bridgeSteps
            setSteps(bridgeSteps)

            // Update current step name
            const activeProcess = allProcesses.find(
              p => p.status === 'PENDING' || p.status === 'ACTION_REQUIRED' || p.status === 'STARTED'
            )
            if (activeProcess) {
              setCurrentStep(PROCESS_NAME_MAP[activeProcess.type] || activeProcess.type)
            }

            // Notify callback for each step
            bridgeSteps.forEach((step, idx) => {
              params.onStepUpdate?.(step, idx)
            })

            // Toast for completed processes (deduplicated)
            for (const proc of allProcesses) {
              const key = `${proc.type}:${proc.txHash || proc.startedAt}`
              if (proc.status === 'DONE' && !toastedProcesses.has(key)) {
                toastedProcesses.add(key)
                const name = PROCESS_NAME_MAP[proc.type] || proc.type
                if (proc.txHash) {
                  toast.success(`${name} Complete`, {
                    description: `Tx: ${proc.txHash.slice(0, 10)}...${proc.txHash.slice(-8)}`,
                    action: proc.txLink ? {
                      label: 'View',
                      onClick: () => window.open(proc.txLink, '_blank'),
                    } : undefined,
                  })
                }
              }
            }
          },
        })

        // 3. Check final execution status
        const allDone = executedRoute.steps.every(
          s => s.execution?.status === 'DONE'
        )

        if (allDone) {
          setIsSuccess(true)
          setCurrentStep(null)

          toast.success('Transfer Complete!', {
            description: `${params.amount} USDC → ${destTokenName} delivered`,
          })

          return {
            state: 'success',
            steps: stepsRef.current,
          }
        } else {
          const failedStep = stepsRef.current.find(s => s.state === 'error')
          throw new Error(failedStep?.error || 'Bridge failed')
        }
      } catch (err) {
        console.error('Bridge error:', err)
        const bridgeError = err instanceof Error ? err : new Error(String(err))
        setError(bridgeError)
        setCurrentStep(null)

        toast.error('Transfer Failed', {
          description: bridgeError.message,
          duration: 10000,
        })

        throw bridgeError
      } finally {
        setIsPending(false)
      }
    },
    [address]
  )

  const reset = useCallback(() => {
    setIsPending(false)
    setIsSuccess(false)
    setError(null)
    setSteps([])
    stepsRef.current = []
    setCurrentStep(null)
  }, [])

  return {
    bridge,
    isPending,
    isSuccess,
    error,
    steps,
    currentStep,
    isReady,
    reset,
  }
}
