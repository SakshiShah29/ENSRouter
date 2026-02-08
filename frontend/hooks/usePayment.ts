'use client'

import { useState, useCallback, useRef } from 'react'
import { useAccount, useWriteContract, usePublicClient, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { useBridgeUSDC } from './useBridgeUSDC'
import { CHAIN_ID_TO_KEY, CHAIN_USDC_ADDRESS, USDC_ABI } from '@/lib/contracts'
import { toast } from 'sonner'
import type { ParsedProfile, PaymentTransaction, PaymentStatus, PaymentStep, BridgeStep } from '@/types'

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

export function usePayment() {
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null)
  const { bridge, isReady: bridgeReady, steps: bridgeSteps, currentStep } = useBridgeUSDC()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  const { chain: senderChain } = useAccount()

  // Use ref to track current transaction for updates
  const txRef = useRef<PaymentTransaction | null>(null)

  const isReady = bridgeReady

  // Update transaction state immutably
  const updateTransaction = useCallback((updates: Partial<PaymentTransaction> | ((prev: PaymentTransaction) => PaymentTransaction)) => {
    setTransaction(prev => {
      if (!prev) return prev
      const newTx = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates }
      txRef.current = newTx
      return newTx
    })
  }, [])

  // Update a specific step
  const updateStep = useCallback((stepIndex: number, stepUpdates: Partial<PaymentStep>) => {
    updateTransaction(prev => ({
      ...prev,
      steps: prev.steps.map((step, idx) =>
        idx === stepIndex ? { ...step, ...stepUpdates } : step
      ),
    }))
  }, [updateTransaction])

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

      const destChainKey = recipient.chain
      const needsBridge = sourceChainKey !== destChainKey

      console.log('=== PAYMENT START ===')
      console.log('Source:', sourceChainKey, '-> Dest:', destChainKey)
      console.log('Needs bridge:', needsBridge)

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

      //@ts-ignore
      const balanceFormatted = formatUnits(balance || 0n, 6)
      if (parseFloat(balanceFormatted) < parseFloat(amountUSD)) {
        toast.error('Insufficient USDC balance')
        throw new Error(`Insufficient balance: ${balanceFormatted} USDC`)
      }

      // Initialize transaction
      const txId = `tx_${Date.now()}`
      const steps: PaymentStep[] = needsBridge
        ? [
            { name: 'Approve USDC', status: 'pending', timestamp: Date.now(), description: 'Approve Circle Bridge to spend USDC' },
            { name: 'Burn USDC', status: 'pending', timestamp: Date.now(), description: 'Burn USDC on source chain' },
            { name: 'Attestation', status: 'pending', timestamp: Date.now(), description: 'Wait for Circle attestation' },
            { name: 'Mint USDC', status: 'pending', timestamp: Date.now(), description: 'Mint USDC on destination chain' },
          ]
        : [
            { name: 'Transfer USDC', status: 'pending', timestamp: Date.now(), description: 'Send USDC to recipient' },
          ]

      const tx: PaymentTransaction = {
        id: txId,
        sender: senderAddress,
        recipient: recipient.ensName,
        recipientAddress: recipient.address,
        amountUSDC: amountUSD,
        status: 'pending',
        steps,
        createdAt: Date.now(),
        sourceChain: sourceChainKey,
        destChain: destChainKey,
      }

      setTransaction(tx)
      txRef.current = tx

      try {
        if (needsBridge) {
          // Cross-chain bridge transfer
          updateTransaction({ status: 'approving' })
          updateStep(0, { status: 'processing' })

          const result = await bridge({
            sourceChain: sourceChainKey,
            destChain: destChainKey,
            amount: amountUSD,
            recipientAddress: recipient.address,
            onStepUpdate: (bridgeStep: BridgeStep, stepIndex: number) => {
              // Map bridge step to payment step
              const stepName = bridgeStep.name
              const paymentStepIndex = steps.findIndex(s => s.name === stepName)

              if (paymentStepIndex !== -1) {
                updateStep(paymentStepIndex, {
                  status: bridgeStep.state === 'success' ? 'completed' :
                          bridgeStep.state === 'error' ? 'failed' : 'processing',
                  txHash: bridgeStep.txHash as `0x${string}` | undefined,
                  explorerUrl: bridgeStep.explorerUrl,
                  error: bridgeStep.error,
                  timestamp: Date.now(),
                })

                // Update overall status based on step
                if (bridgeStep.state === 'success') {
                  const nextStepIndex = paymentStepIndex + 1
                  if (nextStepIndex < steps.length) {
                    updateStep(nextStepIndex, { status: 'processing' })
                    // Update status based on which step we're on
                    const statusMap: Record<string, PaymentStatus> = {
                      'Burn USDC': 'burning',
                      'Attestation': 'attesting',
                      'Mint USDC': 'minting',
                    }
                    const nextStatus = statusMap[steps[nextStepIndex].name]
                    if (nextStatus) {
                      updateTransaction({ status: nextStatus })
                    }
                  }
                }
              }
            },
          })

          // Bridge completed - update final state from result
          const finalSteps = txRef.current?.steps.map((step, idx) => {
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
          }) || steps

          updateTransaction({
            status: 'completed',
            steps: finalSteps,
            completedAt: Date.now(),
            bridgeResult: result,
          })

          toast.success('Bridge completed!', {
            description: `${amountUSD} USDC sent to ${recipient.ensName}`,
          })

        } else {
          // Same-chain transfer
          updateTransaction({ status: 'processing' })
          updateStep(0, { status: 'processing' })

          const amountWei = parseUnits(amountUSD, 6)

          // Send transaction
          const txHash = await writeContractAsync({
            address: usdcAddress,
            abi: USDC_ABI,
            functionName: 'transfer',
            args: [recipient.address, amountWei],
          })

          // Update with tx hash immediately
          const explorerUrl = getExplorerUrl(sourceChainKey, txHash)
          updateStep(0, {
            txHash,
            explorerUrl,
          })

          toast.info('Transaction submitted', {
            description: `Tx: ${txHash.slice(0, 10)}...`,
            action: {
              label: 'View',
              onClick: () => window.open(explorerUrl, '_blank'),
            },
          })

          // Wait for confirmation
          const receipt = await publicClient?.waitForTransactionReceipt({
            hash: txHash,
            confirmations: 1,
          })

          if (receipt?.status === 'success') {
            updateStep(0, { status: 'completed', timestamp: Date.now() })
            updateTransaction({
              status: 'completed',
              completedAt: Date.now(),
            })

            toast.success('Payment sent!', {
              description: `${amountUSD} USDC sent to ${recipient.ensName}`,
              action: {
                label: 'View',
                onClick: () => window.open(explorerUrl, '_blank'),
              },
            })
          } else {
            throw new Error('Transaction reverted')
          }
        }

        return txRef.current!
      } catch (error) {
        console.error('Payment failed:', error)

        // Find and mark the failed step
        const currentTx = txRef.current
        if (currentTx) {
          const processingStepIndex = currentTx.steps.findIndex(s => s.status === 'processing')
          if (processingStepIndex !== -1) {
            updateStep(processingStepIndex, {
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
          updateTransaction({ status: 'failed' })
        }

        toast.error('Payment failed', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })

        throw error
      }
    },
    [bridge, writeContractAsync, publicClient, senderChain, updateTransaction, updateStep]
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
    currentStep,
  }
}
