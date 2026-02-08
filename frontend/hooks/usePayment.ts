'use client'

import { useState, useCallback, useRef } from 'react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { useBridgeUSDC } from './useBridgeUSDC'
import { CHAIN_ID_TO_KEY, CHAIN_USDC_ADDRESS, USDC_ABI } from '@/lib/contracts'
import { toast } from 'sonner'
import type {
  ParsedProfile,
  PaymentTransaction,
  PaymentStatus,
  PaymentStep,
  ChainTransfer,
  ChainAllocation,
  SupportedChain,
  BridgeStep,
} from '@/types'

// Get explorer URL for a chain
const getExplorerUrl = (chainKey: string, txHash: string): string => {
  const explorers: Record<string, string> = {
    'ethereum-sepolia': 'https://sepolia.etherscan.io/tx/',
    'base-sepolia': 'https://sepolia.basescan.org/tx/',
    'arbitrum-sepolia': 'https://sepolia.arbiscan.io/tx/',
    'arc-testnet': 'https://testnet.arcscan.io/tx/',
    'ethereum': 'https://etherscan.io/tx/',
    'base': 'https://basescan.org/tx/',
    'arbitrum': 'https://arbiscan.io/tx/',
  }
  return `${explorers[chainKey] || 'https://etherscan.io/tx/'}${txHash}`
}

// Calculate USDC amount for each chain based on percentage
function calculateChainAmounts(
  totalAmount: string,
  allocations: ChainAllocation[]
): { chain: SupportedChain; amount: string; percentage: number }[] {
  const total = parseFloat(totalAmount)
  return allocations
    .filter(a => a.percentage > 0)
    .map(alloc => ({
      chain: alloc.chain,
      amount: ((total * alloc.percentage) / 100).toFixed(6),
      percentage: alloc.percentage,
    }))
}

// Create steps for a bridge transfer
function createBridgeSteps(destChain: string, amount: string): PaymentStep[] {
  return [
    { name: 'Approve USDC', status: 'pending', timestamp: Date.now(), description: `Approve ${amount} USDC for bridge`, chain: destChain, amount },
    { name: 'Burn USDC', status: 'pending', timestamp: Date.now(), description: 'Burn USDC on source chain', chain: destChain, amount },
    { name: 'Attestation', status: 'pending', timestamp: Date.now(), description: 'Wait for Circle attestation', chain: destChain, amount },
    { name: 'Mint USDC', status: 'pending', timestamp: Date.now(), description: `Mint USDC on ${destChain}`, chain: destChain, amount },
  ]
}

// Create step for same-chain transfer
function createTransferStep(chain: string, amount: string): PaymentStep[] {
  return [
    { name: 'Transfer USDC', status: 'pending', timestamp: Date.now(), description: `Send ${amount} USDC on ${chain}`, chain, amount },
  ]
}

export function usePayment() {
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null)
  const { bridge, isReady: bridgeReady } = useBridgeUSDC()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  const { chain: senderChain } = useAccount()

  const txRef = useRef<PaymentTransaction | null>(null)
  const isReady = bridgeReady

  // Update transaction state
  const updateTransaction = useCallback((updates: Partial<PaymentTransaction>) => {
    setTransaction(prev => {
      if (!prev) return prev
      const newTx = { ...prev, ...updates }
      txRef.current = newTx
      return newTx
    })
  }, [])

  // Update a specific chain transfer
  const updateChainTransfer = useCallback((chainIndex: number, updates: Partial<ChainTransfer>) => {
    setTransaction(prev => {
      if (!prev) return prev
      const newTransfers = [...prev.chainTransfers]
      newTransfers[chainIndex] = { ...newTransfers[chainIndex], ...updates }
      const newTx = { ...prev, chainTransfers: newTransfers }
      txRef.current = newTx
      return newTx
    })
  }, [])

  // Update a specific step within a chain transfer
  const updateChainStep = useCallback((chainIndex: number, stepIndex: number, updates: Partial<PaymentStep>) => {
    setTransaction(prev => {
      if (!prev) return prev
      const newTransfers = [...prev.chainTransfers]
      const newSteps = [...newTransfers[chainIndex].steps]
      newSteps[stepIndex] = { ...newSteps[stepIndex], ...updates }
      newTransfers[chainIndex] = { ...newTransfers[chainIndex], steps: newSteps }
      const newTx = { ...prev, chainTransfers: newTransfers }
      txRef.current = newTx
      return newTx
    })
  }, [])

  const executePayment = useCallback(
    async (recipient: ParsedProfile, amountUSD: string, senderAddress: `0x${string}`) => {
      if (!senderChain) {
        toast.error('No wallet connected')
        throw new Error('No chain detected')
      }

      const sourceChainKey = CHAIN_ID_TO_KEY[senderChain.id]
      if (!sourceChainKey) {
        toast.error('Unsupported chain')
        throw new Error(`Unsupported source chain: ${senderChain.id}`)
      }

      console.log('=== MULTI-CHAIN PAYMENT START ===')
      console.log('Source chain:', sourceChainKey)
      console.log('Recipient allocations:', recipient.chainAllocations)
      console.log('Total amount:', amountUSD)

      // Check USDC balance
      const usdcAddress = CHAIN_USDC_ADDRESS[sourceChainKey]
      if (!usdcAddress) {
        toast.error('USDC not available on this chain')
        throw new Error('USDC not configured for chain')
      }

      const balance = await publicClient?.readContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [senderAddress],
      })

      const balanceFormatted = formatUnits((balance as bigint) || BigInt(0), 6)
      if (parseFloat(balanceFormatted) < parseFloat(amountUSD)) {
        toast.error('Insufficient USDC balance')
        throw new Error(`Insufficient balance: ${balanceFormatted} USDC`)
      }

      // Calculate amounts for each destination chain
      const chainAmounts = calculateChainAmounts(amountUSD, recipient.chainAllocations)
      console.log('Chain amounts:', chainAmounts)

      // Create chain transfers
      const chainTransfers: ChainTransfer[] = chainAmounts.map(({ chain, amount, percentage }) => {
        const needsBridge = sourceChainKey !== chain
        return {
          chain,
          amount,
          percentage,
          status: 'pending' as PaymentStatus,
          steps: needsBridge
            ? createBridgeSteps(chain, amount)
            : createTransferStep(chain, amount),
        }
      })

      // Initialize transaction
      const tx: PaymentTransaction = {
        id: `tx_${Date.now()}`,
        sender: senderAddress,
        recipient: recipient.ensName,
        recipientAddress: recipient.address,
        totalAmountUSDC: amountUSD,
        sourceChain: sourceChainKey,
        status: 'pending',
        chainTransfers,
        createdAt: Date.now(),
      }

      setTransaction(tx)
      txRef.current = tx

      try {
        // Process each chain transfer sequentially
        for (let i = 0; i < chainTransfers.length; i++) {
          const transfer = chainTransfers[i]
          const needsBridge = sourceChainKey !== transfer.chain

          console.log(`Processing transfer ${i + 1}/${chainTransfers.length}: ${transfer.amount} USDC to ${transfer.chain}`)

          updateChainTransfer(i, { status: 'processing' })
          updateChainStep(i, 0, { status: 'processing' })

          if (needsBridge) {
            // Cross-chain bridge transfer
            toast.info(`Bridging to ${transfer.chain}`, {
              description: `${transfer.amount} USDC (${transfer.percentage}%)`,
            })

            updateTransaction({ status: 'approving' })

            const result = await bridge({
              sourceChain: sourceChainKey,
              destChain: transfer.chain,
              amount: transfer.amount,
              recipientAddress: recipient.address,
              onStepUpdate: (bridgeStep: BridgeStep, stepIndex: number) => {
                updateChainStep(i, stepIndex, {
                  status: bridgeStep.state === 'success' ? 'completed' :
                          bridgeStep.state === 'error' ? 'failed' : 'processing',
                  txHash: bridgeStep.txHash as `0x${string}` | undefined,
                  explorerUrl: bridgeStep.explorerUrl,
                  error: bridgeStep.error,
                  timestamp: Date.now(),
                })

                // Update status based on step
                if (bridgeStep.state === 'success' && stepIndex < transfer.steps.length - 1) {
                  updateChainStep(i, stepIndex + 1, { status: 'processing' })
                  const statusMap: Record<string, PaymentStatus> = {
                    'Burn USDC': 'burning',
                    'Attestation': 'attesting',
                    'Mint USDC': 'minting',
                  }
                  const nextStatus = statusMap[transfer.steps[stepIndex + 1]?.name]
                  if (nextStatus) {
                    updateTransaction({ status: nextStatus })
                  }
                }
              },
            })

            // Update transfer with final result
            const finalSteps = transfer.steps.map((step, idx) => {
              const bridgeStep = result.steps[idx]
              if (bridgeStep) {
                return {
                  ...step,
                  status: bridgeStep.state === 'success' ? 'completed' as const :
                          bridgeStep.state === 'error' ? 'failed' as const : step.status,
                  txHash: (bridgeStep.txHash as `0x${string}`) || step.txHash,
                  explorerUrl: bridgeStep.explorerUrl || step.explorerUrl,
                  error: bridgeStep.error || step.error,
                }
              }
              return step
            })

            updateChainTransfer(i, {
              status: 'completed',
              steps: finalSteps,
              bridgeResult: result,
            })

            toast.success(`Bridge to ${transfer.chain} complete!`, {
              description: `${transfer.amount} USDC delivered`,
            })

          } else {
            // Same-chain transfer
            toast.info(`Sending on ${transfer.chain}`, {
              description: `${transfer.amount} USDC (${transfer.percentage}%)`,
            })

            updateTransaction({ status: 'processing' })

            const amountWei = parseUnits(transfer.amount, 6)
            const txHash = await writeContractAsync({
              address: usdcAddress,
              abi: USDC_ABI,
              functionName: 'transfer',
              args: [recipient.address, amountWei],
            })

            const explorerUrl = getExplorerUrl(sourceChainKey, txHash)
            updateChainStep(i, 0, { txHash, explorerUrl })

            toast.info('Transaction submitted', {
              description: `Tx: ${txHash.slice(0, 10)}...`,
              action: {
                label: 'View',
                onClick: () => window.open(explorerUrl, '_blank'),
              },
            })

            const receipt = await publicClient?.waitForTransactionReceipt({
              hash: txHash,
              confirmations: 1,
            })

            if (receipt?.status === 'success') {
              updateChainStep(i, 0, { status: 'completed', timestamp: Date.now() })
              updateChainTransfer(i, { status: 'completed' })

              toast.success(`Transfer on ${transfer.chain} complete!`, {
                description: `${transfer.amount} USDC sent`,
              })
            } else {
              throw new Error('Transaction reverted')
            }
          }
        }

        // All transfers complete
        updateTransaction({
          status: 'completed',
          completedAt: Date.now(),
        })

        toast.success('All payments completed!', {
          description: `${amountUSD} USDC sent to ${recipient.ensName}`,
        })

        return txRef.current!

      } catch (error) {
        console.error('Payment failed:', error)

        // Find and mark the failed transfer/step
        const currentTx = txRef.current
        if (currentTx) {
          const processingTransferIndex = currentTx.chainTransfers.findIndex(t => t.status === 'processing')
          if (processingTransferIndex !== -1) {
            const transfer = currentTx.chainTransfers[processingTransferIndex]
            const processingStepIndex = transfer.steps.findIndex(s => s.status === 'processing')
            if (processingStepIndex !== -1) {
              updateChainStep(processingTransferIndex, processingStepIndex, {
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
              })
            }
            updateChainTransfer(processingTransferIndex, { status: 'failed' })
          }
          updateTransaction({ status: 'failed' })
        }

        toast.error('Payment failed', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })

        throw error
      }
    },
    [bridge, writeContractAsync, publicClient, senderChain, updateTransaction, updateChainTransfer, updateChainStep]
  )

  const resetTransaction = useCallback(() => {
    setTransaction(null)
    txRef.current = null
  }, [])

  return {
    executePayment,
    transaction,
    resetTransaction,
    isReady,
  }
}
