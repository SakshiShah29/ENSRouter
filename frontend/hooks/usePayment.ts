import { useState } from 'react'
import { useWriteContract } from 'wagmi'
import { parseUnits } from 'viem'
import type { ParsedProfile, PaymentTransaction, PaymentStatus } from '@/types'
import { USDC_ADDRESSES, USDC_ABI, CIRCLE_GATEWAY_ADDRESS } from '@/lib/contracts'

export function usePayment() {
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null)
  const { writeContractAsync } = useWriteContract()

  const executePayment = async (
    recipient: ParsedProfile,
    amountUSD: string,
    senderAddress: `0x${string}`
  ) => {
    const txId = `tx_${Date.now()}`
    const amountWei = parseUnits(amountUSD, 6) // USDC has 6 decimals

    // Initialize transaction state
    const tx: PaymentTransaction = {
      id: txId,
      sender: senderAddress,
      recipient: recipient.ensName,
      recipientAddress: recipient.address,
      amountUSDC: amountWei.toString(),
      status: 'pending' as PaymentStatus,
      steps: [
        { name: 'Approve USDC', status: 'pending', timestamp: Date.now() },
        { name: 'Bridge to destination', status: 'pending', timestamp: Date.now() },
        { name: 'Execute swaps', status: 'pending', timestamp: Date.now() },
        { name: 'Complete delivery', status: 'pending', timestamp: Date.now() },
      ],
      acrossSwaps: [],
      createdAt: Date.now(),
    }
    
    setTransaction(tx)

    try {
      // Step 1: Approve USDC spending
      tx.steps[0].status = 'processing'
      tx.status = 'approving' as PaymentStatus
      setTransaction({...tx})
      
      const approveHash = await writeContractAsync({
        address: USDC_ADDRESSES.arc,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [CIRCLE_GATEWAY_ADDRESS, amountWei],
      })
      
      tx.steps[0].status = 'completed'
      tx.steps[0].txHash = approveHash
      setTransaction({...tx})

      // Step 2: Call backend API to execute payment
      tx.steps[1].status = 'processing'
      tx.status = 'bridging' as PaymentStatus
      setTransaction({...tx})

      const response = await fetch('/api/execute-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: recipient.ensName,
          amount: amountWei.toString(),
          profile: recipient,
          senderAddress,
        }),
      })

      if (!response.ok) {
        throw new Error('Payment execution failed')
      }

      const result = await response.json()

      // Update remaining steps
      tx.steps[1].status = 'completed'
      tx.steps[1].txHash = result.bridgeTxHash
      
      if (recipient.autoSwapEnabled && result.acrossSwaps?.length > 0) {
        tx.steps[2].status = 'completed'
        tx.acrossSwaps = result.acrossSwaps
        tx.status = 'swapping' as PaymentStatus
      } else {
        tx.steps[2].status = 'completed'
      }
      
      tx.steps[3].status = 'completed'
      tx.status = 'completed' as PaymentStatus
      tx.completedAt = Date.now()
      setTransaction({...tx})

      return tx

    } catch (error) {
      tx.status = 'failed'  as PaymentStatus
      const currentStep = tx.steps.find(s => s.status === 'processing')
      if (currentStep) {
        currentStep.status = 'failed'
        currentStep.error = error instanceof Error ? error.message : 'Unknown error'
      }
      setTransaction({...tx})
      throw error
    }
  }

  const resetTransaction = () => {
    setTransaction(null)
  }

  return {
    executePayment,
    transaction,
    resetTransaction,
  }
}