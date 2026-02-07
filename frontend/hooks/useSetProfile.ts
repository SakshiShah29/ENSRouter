import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { namehash } from 'viem/ens'
import { ENS_RESOLVER_ADDRESS, ENS_RESOLVER } from '@/lib/contracts'
import { formatAllocation } from '@/lib/formatAllocation'
import type { ProfileFormData } from '@/types'

export function useSetProfile() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isWriting, setIsWriting] = useState(false)
  const { writeContractAsync } = useWriteContract()

  const setProfile = async (data: ProfileFormData) => {
    setIsWriting(true)
    setCurrentStep(0)

    try {
      const node = namehash(data.ensName)
      
      // Format allocation string: "USDC:50,ETH:30,USDT:20"
      const allocString = formatAllocation(data.allocations)

      const records = [
        { key: 'chainrouter.chain', value: data.chain },
        { key: 'chainrouter.alloc', value: allocString },
        { key: 'chainrouter.slippage', value: data.slippageTolerance.toString() },
        { key: 'chainrouter.autoswap', value: data.autoSwapEnabled.toString() },
      ]

      // Write each text record
      for (let i = 0; i < records.length; i++) {
        setCurrentStep(i)
        const { key, value } = records[i]
        
        const hash = await writeContractAsync({
          address: ENS_RESOLVER_ADDRESS,
          abi: ENS_RESOLVER.abi,
          functionName: 'setText',
          args: [node, key, value],
          chainId: 1, // Ethereum mainnet
        })

        // Wait for confirmation (simplified - could use useWaitForTransactionReceipt)
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

      setCurrentStep(records.length)
      setIsWriting(false)
      return true
    } catch (error) {
      setIsWriting(false)
      throw error
    }
  }

  return {
    setProfile,
    currentStep,
    totalSteps: 4,
    isWriting,
  }
}