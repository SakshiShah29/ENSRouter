'use client'

import { useState, useCallback, useRef } from 'react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { useBridgeUSDC } from './useBridgeUSDC'
import { CHAIN_ID_TO_KEY, CHAIN_USDC_ADDRESS, USDC_ABI } from '@/lib/contracts'
import { getTokenAddress } from '@/lib/tokenList'
import { toast } from 'sonner'
import type {
  ParsedProfile,
  PaymentTransaction,
  PaymentStatus,
  PaymentStep,
  ChainTransfer,
  TokenAllocation,
  SupportedChain,
  BridgeStep,
} from '@/types'

// Get explorer URL for a chain
const getExplorerUrl = (chainKey: string, txHash: string): string => {
  const explorers: Record<string, string> = {
    'ethereum': 'https://etherscan.io/tx/',
    'base': 'https://basescan.org/tx/',
    'arbitrum': 'https://arbiscan.io/tx/',
    'polygon': 'https://polygonscan.com/tx/',
    'optimism': 'https://optimistic.etherscan.io/tx/',
  }
  return `${explorers[chainKey] || 'https://etherscan.io/tx/'}${txHash}`
}

// Calculate USDC amount for each token allocation
function calculateTokenAmounts(
  totalAmount: string,
  allocations: TokenAllocation[]
): { token: string; amount: string; percentage: number }[] {
  const total = parseFloat(totalAmount)
  return allocations
    .filter(a => a.percentage > 0)
    .map(alloc => ({
      token: alloc.token,
      amount: ((total * alloc.percentage) / 100).toFixed(6),
      percentage: alloc.percentage,
    }))
}

// Create steps for a bridge/swap transfer via LI.FI
function createBridgeSteps(destChain: string, token: string, amount: string): PaymentStep[] {
  return [
    { name: 'Approve USDC', status: 'pending', timestamp: Date.now(), description: `Approve ${amount} USDC`, chain: destChain, amount },
    { name: `Bridge → ${token}`, status: 'pending', timestamp: Date.now(), description: `Send ${amount} USDC → ${token} on ${destChain}`, chain: destChain, amount },
  ]
}

// Create step for same-chain USDC transfer (no swap needed)
function createTransferStep(chain: string, amount: string): PaymentStep[] {
  return [
    { name: 'Transfer USDC', status: 'pending', timestamp: Date.now(), description: `Send ${amount} USDC on ${chain}`, chain, amount },
  ]
}

// Create steps for same-chain swap via LI.FI (USDC → other token, same chain)
function createSwapSteps(chain: string, token: string, amount: string): PaymentStep[] {
  return [
    { name: 'Approve USDC', status: 'pending', timestamp: Date.now(), description: `Approve ${amount} USDC for swap`, chain, amount },
    { name: `Swap → ${token}`, status: 'pending', timestamp: Date.now(), description: `Swap ${amount} USDC → ${token} on ${chain}`, chain, amount },
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

      const destChain = recipient.chain
      // Convert slippage from percentage (e.g. 0.5) to decimal (e.g. 0.005) for LI.FI
      const slippage = (recipient.slippageTolerance || 1) / 100

      console.log('=== TOKEN ALLOCATION PAYMENT START ===')
      console.log('Source chain:', sourceChainKey)
      console.log('Dest chain:', destChain)
      console.log('Token allocations:', recipient.tokenAllocations)
      console.log('Slippage:', `${recipient.slippageTolerance}% (${slippage})`)
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

      // Calculate amounts for each token allocation
      const tokenAmounts = calculateTokenAmounts(amountUSD, recipient.tokenAllocations)
      console.log('Token amounts:', tokenAmounts)

      const isSameChain = sourceChainKey === destChain

      // Create transfers — one per token allocation
      const chainTransfers: ChainTransfer[] = tokenAmounts.map(({ token, amount, percentage }) => {
        const isUSDC = token.toUpperCase() === 'USDC'
        let steps: PaymentStep[]

        if (isSameChain && isUSDC) {
          // Same chain, same token — direct USDC transfer
          steps = createTransferStep(destChain, amount)
        } else if (isSameChain && !isUSDC) {
          // Same chain, different token — swap via LI.FI
          steps = createSwapSteps(destChain, token, amount)
        } else {
          // Cross-chain — bridge (+ optional swap) via LI.FI
          steps = createBridgeSteps(destChain, token, amount)
        }

        return {
          chain: destChain as SupportedChain,
          token,
          amount,
          percentage,
          status: 'pending' as PaymentStatus,
          steps,
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
        // Process each token transfer sequentially
        for (let i = 0; i < chainTransfers.length; i++) {
          const transfer = chainTransfers[i]
          const isUSDC = transfer.token.toUpperCase() === 'USDC'
          const canDirectTransfer = isSameChain && isUSDC

          console.log(`Processing transfer ${i + 1}/${chainTransfers.length}: ${transfer.amount} USDC → ${transfer.token} on ${destChain}`)

          updateChainTransfer(i, { status: 'processing' })
          updateChainStep(i, 0, { status: 'processing' })

          if (canDirectTransfer) {
            // Same-chain USDC transfer — direct contract call
            toast.info(`Sending USDC`, {
              description: `${transfer.amount} USDC (${transfer.percentage}%)`,
            })

            updateTransaction({ status: 'sending' })

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

              toast.success(`USDC transfer complete!`, {
                description: `${transfer.amount} USDC sent`,
              })
            } else {
              throw new Error('Transaction reverted')
            }
          } else {
            // Use LI.FI for: cross-chain bridge, same-chain swap, or bridge+swap
            const destTokenAddress = getTokenAddress(transfer.token, destChain)
            if (!destTokenAddress) {
              throw new Error(`Token ${transfer.token} not found on ${destChain}`)
            }

            // Helper: execute a LI.FI bridge/swap and update UI steps
            const executeBridge = async (tokenAddress: string, tokenSymbol: string) => {
              const result = await bridge({
                sourceChain: sourceChainKey,
                destChain: destChain,
                amount: transfer.amount,
                destTokenAddress: tokenAddress,
                destTokenSymbol: tokenSymbol,
                recipientAddress: recipient.address,
                slippage,
                onStepUpdate: (bridgeStep: BridgeStep, stepIndex: number) => {
                  const currentTx = txRef.current
                  const currentSteps = currentTx?.chainTransfers[i]?.steps || []

                  const stepUpdate: Partial<PaymentStep> = {
                    name: bridgeStep.name,
                    status: bridgeStep.state === 'success' ? 'completed' :
                            bridgeStep.state === 'error' ? 'failed' : 'processing',
                    txHash: bridgeStep.txHash as `0x${string}` | undefined,
                    explorerUrl: bridgeStep.explorerUrl,
                    error: bridgeStep.error,
                    substatus: bridgeStep.substatus,
                    message: bridgeStep.message,
                    timestamp: Date.now(),
                  }

                  if (stepIndex < currentSteps.length) {
                    updateChainStep(i, stepIndex, stepUpdate)
                  } else {
                    setTransaction(prev => {
                      if (!prev) return prev
                      const newTransfers = [...prev.chainTransfers]
                      const newSteps = [...newTransfers[i].steps, {
                        name: bridgeStep.name,
                        status: stepUpdate.status!,
                        timestamp: Date.now(),
                        description: bridgeStep.message || `${bridgeStep.name} in progress`,
                        chain: destChain,
                        amount: transfer.amount,
                        txHash: stepUpdate.txHash,
                        explorerUrl: stepUpdate.explorerUrl,
                        error: stepUpdate.error,
                        substatus: bridgeStep.substatus,
                        message: bridgeStep.message,
                      } as PaymentStep]
                      newTransfers[i] = { ...newTransfers[i], steps: newSteps }
                      const newTx = { ...prev, chainTransfers: newTransfers }
                      txRef.current = newTx
                      return newTx
                    })
                  }

                  const statusMap: Record<string, PaymentStatus> = {
                    'Approve USDC': 'approving',
                    'Bridge Transfer': 'bridging',
                    'Swap': 'processing',
                    'Receiving': 'bridging',
                  }
                  const stepStatus = statusMap[bridgeStep.name]
                  if (stepStatus) {
                    updateTransaction({ status: stepStatus })
                  }
                },
              })
              return result
            }

            toast.info(`Sending ${transfer.token}`, {
              description: `${transfer.amount} USDC → ${transfer.token} (${transfer.percentage}%)`,
            })

            updateTransaction({ status: isSameChain ? 'processing' : 'approving' })

            let result
            let finalTokenSymbol = transfer.token
            const isSwapToNonUSDC = transfer.token.toUpperCase() !== 'USDC'

            try {
              result = await executeBridge(destTokenAddress, transfer.token)
            } catch (bridgeErr) {
              // If a non-USDC swap failed, fall back to sending USDC instead
              if (isSwapToNonUSDC) {
                const errMsg = bridgeErr instanceof Error ? bridgeErr.message : String(bridgeErr)
                console.warn(`Swap to ${transfer.token} failed (${errMsg}), falling back to USDC`)

                toast.warning(`${transfer.token} swap failed, sending USDC instead`, {
                  description: errMsg,
                })

                // Reset steps for the fallback attempt
                const fallbackSteps = isSameChain
                  ? createTransferStep(destChain, transfer.amount)
                  : createBridgeSteps(destChain, 'USDC', transfer.amount)

                updateChainTransfer(i, {
                  status: 'processing',
                  token: 'USDC',
                  steps: fallbackSteps,
                })
                updateChainStep(i, 0, { status: 'processing' })
                finalTokenSymbol = 'USDC'

                if (isSameChain) {
                  // Same-chain fallback: direct USDC transfer
                  const amountWei = parseUnits(transfer.amount, 6)
                  const txHash = await writeContractAsync({
                    address: usdcAddress,
                    abi: USDC_ABI,
                    functionName: 'transfer',
                    args: [recipient.address, amountWei],
                  })

                  const explorerUrl = getExplorerUrl(sourceChainKey, txHash)
                  updateChainStep(i, 0, { txHash, explorerUrl })

                  const receipt = await publicClient?.waitForTransactionReceipt({
                    hash: txHash,
                    confirmations: 1,
                  })

                  if (receipt?.status === 'success') {
                    updateChainStep(i, 0, { status: 'completed', timestamp: Date.now() })
                    updateChainTransfer(i, { status: 'completed' })
                    toast.success(`USDC fallback transfer complete!`, {
                      description: `${transfer.amount} USDC sent`,
                    })
                  } else {
                    throw new Error('Fallback USDC transaction reverted')
                  }
                  continue
                } else {
                  // Cross-chain fallback: bridge USDC to USDC on dest chain
                  result = await executeBridge(
                    CHAIN_USDC_ADDRESS[destChain],
                    'USDC',
                  )
                }
              } else {
                // USDC-to-USDC bridge failed — no fallback possible
                throw bridgeErr
              }
            }

            // Update transfer with final result
            const finalSteps = (txRef.current?.chainTransfers[i]?.steps || transfer.steps).map((step, idx) => {
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
              token: finalTokenSymbol,
              steps: finalSteps,
              bridgeResult: result,
            })

            toast.success(`${finalTokenSymbol} transfer complete!`, {
              description: finalTokenSymbol === transfer.token
                ? `${transfer.amount} USDC → ${transfer.token} delivered`
                : `${transfer.amount} USDC delivered (fallback from ${transfer.token})`,
            })
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
