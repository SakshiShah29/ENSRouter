import { useState, useCallback } from 'react'
import { BridgeKit } from '@circle-fin/bridge-kit'
import { useEvmAdapter } from './useEvmAdapter'
import { BRIDGE_KIT_CHAINS } from '@/lib/contracts'
import { toast } from 'sonner'
import type { BridgeResult, BridgeStep } from '@/types'

const kit = new BridgeKit()

interface BridgeParams {
  sourceChain: string          // Our chain ID string (e.g. "base-sepolia")
  destChain: string            // Our chain ID string (e.g. "arbitrum-sepolia")
  amount: string               // Human-readable USDC amount (e.g. "100.00")
  recipientAddress?: string    // Recipient wallet address on destination chain
  onStepUpdate?: (step: BridgeStep, stepIndex: number) => void
}

// Map Bridge Kit step names to our step names
const STEP_NAME_MAP: Record<string, string> = {
  'approve': 'Approve USDC',
  'burn': 'Burn USDC',
  'attestation': 'Attestation',
  'mint': 'Mint USDC',
}

// Get explorer URL for a chain
const getExplorerUrl = (chainKey: string, txHash: string): string => {
  const explorers: Record<string, string> = {
    'ethereum-sepolia': 'https://sepolia.etherscan.io/tx/',
    'base-sepolia': 'https://sepolia.basescan.org/tx/',
    'arbitrum-sepolia': 'https://sepolia.arbiscan.io/tx/',
    'ethereum': 'https://etherscan.io/tx/',
    'base': 'https://basescan.org/tx/',
    'arbitrum': 'https://arbiscan.io/tx/',
  }
  return `${explorers[chainKey] || 'https://etherscan.io/tx/'}${txHash}`
}

// ✅ NEW: Fix truncated transaction hashes from Bridge Kit
const normalizeTxHash = (txHash: string | undefined): string | undefined => {
  if (!txHash) return undefined
  
  // Remove 0x prefix if present
  let hash = txHash.toLowerCase().replace('0x', '')
  
  // Bridge Kit sometimes returns 63 characters instead of 64
  // Pad with leading zeros if needed
  if (hash.length === 63) {
    console.warn('⚠️ Detected truncated tx hash, padding with leading zero:', txHash)
    hash = '0' + hash
  }
  
  // If still not 64 characters, something is very wrong
  if (hash.length !== 64) {
    console.error('❌ Invalid tx hash length:', hash.length, txHash)
    return undefined
  }
  
  return '0x' + hash
}

export function useBridgeUSDC() {
  const { evmAdapter, isReady } = useEvmAdapter()
  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [steps, setSteps] = useState<BridgeStep[]>([])
  const [currentStep, setCurrentStep] = useState<string | null>(null)

  const bridge = useCallback(
    async (params: BridgeParams): Promise<BridgeResult> => {
      if (!evmAdapter) {
        throw new Error('Wallet not connected')
      }

      console.log('=== BRIDGE DEBUG ===')
      console.log('Input sourceChain:', params.sourceChain)
      console.log('Input destChain:', params.destChain)

      const fromChain = BRIDGE_KIT_CHAINS[params.sourceChain]
      const toChain = BRIDGE_KIT_CHAINS[params.destChain]

      if (!fromChain || !toChain) {
        const errorMsg = `Unsupported chain: ${!fromChain ? params.sourceChain : params.destChain}`
        toast.error('Chain Error', { description: errorMsg })
        throw new Error(errorMsg)
      }

      setIsPending(true)
      setIsSuccess(false)
      setError(null)
      setSteps([])
      setCurrentStep('approve')

      try {
        console.log('Starting bridge:', { fromChain, toChain, amount: params.amount })

        toast.info('Starting Bridge', {
          description: `Bridging ${params.amount} USDC from ${params.sourceChain} to ${params.destChain}`,
        })

        const result = await kit.bridge({
          from: { adapter: evmAdapter, chain: fromChain as any },
          to: {
            adapter: evmAdapter,
            chain: toChain as any,
            ...(params.recipientAddress && { recipientAddress: params.recipientAddress }),
          },
          amount: params.amount,
        })

        console.log('Bridge Kit raw result:', result)

        // Parse steps from Bridge Kit result
        const rawSteps = (result as any).steps || []
        const parsedSteps: BridgeStep[] = rawSteps.map((step: any, idx: number) => {
          // ✅ FIX: Normalize the transaction hash
          const rawTxHash = step.txHash || step.data?.txHash
          const txHash = normalizeTxHash(rawTxHash)
          
          const stepName = STEP_NAME_MAP[step.name] || step.name

          // Determine which chain this step is on
          const isSourceChainStep = ['approve', 'burn'].includes(step.name)
          const chainKey = isSourceChainStep ? params.sourceChain : params.destChain

          const bridgeStep: BridgeStep = {
            name: stepName,
            state: step.state === 'success' ? 'success' : step.state === 'error' ? 'error' : 'pending',
            txHash: txHash,
            explorerUrl: txHash ? (step.explorerUrl || getExplorerUrl(chainKey, txHash)) : undefined,
            error: step.error?.message || step.errorMessage,
            data: step.data,
          }

          // Notify about step completion
          params.onStepUpdate?.(bridgeStep, idx)
          setCurrentStep(step.name)

          if (bridgeStep.state === 'success' && bridgeStep.txHash) {
            toast.success(`${stepName} Complete`, {
              description: `Tx: ${bridgeStep.txHash.slice(0, 10)}...${bridgeStep.txHash.slice(-8)}`,
              action: bridgeStep.explorerUrl ? {
                label: 'View',
                onClick: () => window.open(bridgeStep.explorerUrl, '_blank'),
              } : undefined,
            })
          } else if (bridgeStep.state === 'error') {
            toast.error(`${stepName} Failed`, {
              description: bridgeStep.error || 'Unknown error',
            })
          }

          return bridgeStep
        })

        setSteps(parsedSteps)

        const bridgeResult: BridgeResult = {
          state: (result as any).state === 'error' ? 'error' : 'success',
          steps: parsedSteps,
        }

        if (bridgeResult.state === 'error') {
          // Find the failed step for better error message
          const failedStep = parsedSteps.find(s => s.state === 'error')
          throw new Error(failedStep?.error || 'Bridge failed')
        }

        setIsSuccess(true)
        setCurrentStep(null)

        toast.success('Bridge Complete!', {
          description: `${params.amount} USDC bridged successfully`,
        })

        return bridgeResult
      } catch (err) {
        console.error('Bridge error:', err)
        const bridgeError = err instanceof Error ? err : new Error(String(err))
        setError(bridgeError)
        setCurrentStep(null)

        toast.error('Bridge Failed', {
          description: bridgeError.message,
          duration: 10000,
        })

        throw bridgeError
      } finally {
        setIsPending(false)
      }
    },
    [evmAdapter]
  )

  const reset = useCallback(() => {
    setIsPending(false)
    setIsSuccess(false)
    setError(null)
    setSteps([])
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
