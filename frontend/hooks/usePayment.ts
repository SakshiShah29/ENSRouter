import { useState, useCallback } from 'react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { parseUnits } from 'viem'
import { useBridgeUSDC } from './useBridgeUSDC'
import { CHAIN_ID_TO_KEY, CHAIN_USDC_ADDRESS, USDC_ABI } from '@/lib/contracts'
import type { ParsedProfile, PaymentTransaction, PaymentStatus } from '@/types'

export function usePayment() {
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null)
  const { bridge, isReady: bridgeReady } = useBridgeUSDC()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  const { chain: senderChain } = useAccount()

  const isReady = bridgeReady

  const updateTx = useCallback(
    (tx: PaymentTransaction) =>
      setTransaction({
        ...tx,
        steps: tx.steps.map((s) => ({ ...s })),
      }),
    []
  )

  const executePayment = useCallback(
    async (
      recipient: ParsedProfile,
      amountUSD: string,
      senderAddress: `0x${string}`
    ) => {
      if (!senderChain) throw new Error('No chain detected')

      const sourceChainKey = CHAIN_ID_TO_KEY[senderChain.id]
      if (!sourceChainKey) throw new Error(`Unsupported source chain: ${senderChain.id}`)

      const destChainKey = recipient.chain
      const needsBridge = sourceChainKey !== destChainKey

      const txId = `tx_${Date.now()}`
      const steps = needsBridge
        ? [
            { name: 'Bridge & deliver USDC via CCTP', status: 'pending' as const, timestamp: Date.now() },
          ]
        : [
            { name: 'Transfer USDC', status: 'pending' as const, timestamp: Date.now() },
          ]

      const tx: PaymentTransaction = {
        id: txId,
        sender: senderAddress,
        recipient: recipient.ensName,
        recipientAddress: recipient.address,
        amountUSDC: amountUSD,
        status: 'pending' as PaymentStatus,
        steps,
        createdAt: Date.now(),
      }

      setTransaction(tx)

      try {
        if (needsBridge) {
          // Bridge USDC directly to recipient via Circle Bridge Kit
          tx.steps[0].status = 'processing'
          tx.status = 'bridging' as PaymentStatus
          updateTx(tx)

          const result = await bridge({
            sourceChain: sourceChainKey,
            destChain: destChainKey,
            amount: amountUSD,
            recipientAddress: recipient.address,
          })

          tx.steps[0].status = 'completed'
          tx.bridgeResult = result

          // Extract explorer URL from first step if available
          const firstStep = result.steps[0]
          if (firstStep?.explorerUrl) {
            tx.steps[0].txHash = firstStep.explorerUrl as `0x${string}`
          }

          tx.status = 'completed' as PaymentStatus
          tx.completedAt = Date.now()
          updateTx(tx)
        } else {
          // Same-chain: direct USDC transfer to recipient
          tx.steps[0].status = 'processing'
          tx.status = 'approving' as PaymentStatus
          updateTx(tx)

          const usdcAddress = CHAIN_USDC_ADDRESS[sourceChainKey]
          if (!usdcAddress) throw new Error(`No USDC address for chain: ${sourceChainKey}`)

          const amountWei = parseUnits(amountUSD, 6) // USDC has 6 decimals

          const txHash = await writeContractAsync({
            address: usdcAddress,
            abi: USDC_ABI,
            functionName: 'transfer',
            args: [recipient.address, amountWei],
          })

          tx.steps[0].txHash = txHash
          updateTx(tx)

          // Wait for on-chain confirmation
          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash: txHash })
          }

          tx.steps[0].status = 'completed'
          tx.status = 'completed' as PaymentStatus
          tx.completedAt = Date.now()
          updateTx(tx)
        }

        return tx
      } catch (error) {
        tx.status = 'failed' as PaymentStatus
        const currentStep = tx.steps.find((s) => s.status === 'processing')
        if (currentStep) {
          currentStep.status = 'failed'
          currentStep.error =
            error instanceof Error ? error.message : 'Unknown error'
        }
        updateTx(tx)
        throw error
      }
    },
    [bridge, writeContractAsync, publicClient, senderChain, updateTx]
  )

  const resetTransaction = useCallback(() => {
    setTransaction(null)
  }, [])

  return {
    executePayment,
    transaction,
    resetTransaction,
    isReady,
  }
}
