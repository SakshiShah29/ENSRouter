import { useState, useCallback, useEffect, useRef } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useSwitchChain } from 'wagmi'
import { namehash } from 'viem/ens'
import { encodeFunctionData } from 'viem'
import type { ProfileFormData, TokenAllocation } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const ENS_PUBLIC_RESOLVER = '0xF29100983E058B709F3D539b0c765937B804AC15'
const ENS_CHAIN_ID = 1

const RESOLVER_ABI = [
  {
    name: 'setText',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'multicall',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'data', type: 'bytes[]' }],
    outputs: [{ name: 'results', type: 'bytes[]' }],
  },
] as const

// Format token allocations as: "USDC:60,ETH:30,DAI:10"
function formatTokenAllocations(allocations: TokenAllocation[]): string {
  return allocations
    .filter(a => a.percentage > 0)
    .map(a => `${a.token}:${a.percentage}`)
    .join(',')
}

function encodeSingleSetText(node: `0x${string}`, key: string, value: string) {
  return encodeFunctionData({
    abi: RESOLVER_ABI,
    functionName: 'setText',
    args: [node, key, value],
  })
}

export function useSetProfile() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isWriting, setIsWriting] = useState(false)
  const { chain: currentChain, address } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const pendingFormData = useRef<ProfileFormData | null>(null)

  const {
    writeContractAsync,
    data: txHash,
    error: writeError,
    reset: resetWrite,
    isPending: isWritePending
  } = useWriteContract()

  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError
  } = useWaitForTransactionReceipt({
    hash: txHash
  })

  useEffect(() => {
    if (isSuccess && isWriting) {
      console.log('Transaction confirmed!')
      // Register user on backend after on-chain confirmation
      const formData = pendingFormData.current
      if (formData && address) {
        fetch(`${API_URL}/api/ens/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ensName: formData.ensName,
            ethAddress: address,
          }),
        })
          .then(res => res.json())
          .then(data => {
            console.log('Backend registration successful:', data)
          })
          .catch(err => {
            console.error('Backend registration failed:', err)
          })
          .finally(() => {
            pendingFormData.current = null
          })
      }
      setIsWriting(false)
      setCurrentStep(0)
    }
  }, [isSuccess, isWriting, address])

  useEffect(() => {
    if (receiptError && isWriting) {
      console.error('Receipt error:', receiptError)
      setIsWriting(false)
      setCurrentStep(0)
    }
  }, [receiptError, isWriting])

  useEffect(() => {
    if (writeError) {
      console.error('Write error:', writeError)
    }
  }, [writeError])

  const setProfile = useCallback(async (data: ProfileFormData) => {
    console.log('setProfile called with:', data)
    console.log('Current wallet chain:', currentChain?.id)
    console.log('Required chain:', ENS_CHAIN_ID)

    // Auto-switch to Ethereum Mainnet if needed
    if (currentChain?.id !== ENS_CHAIN_ID) {
      console.log('Switching to Ethereum Mainnet for ENS update...')
      await switchChainAsync({ chainId: ENS_CHAIN_ID })
    }

    // Validate allocations sum to 100
    const totalPercentage = data.allocations.reduce((sum, a) => sum + a.percentage, 0)
    if (totalPercentage !== 100) {
      throw new Error(`Token allocations must sum to 100% (currently ${totalPercentage}%)`)
    }

    pendingFormData.current = data
    resetWrite()
    setIsWriting(true)
    setCurrentStep(1)

    try {
      const node = namehash(data.ensName) as `0x${string}`
      console.log('Namehash for', data.ensName, ':', node)

      const tokenAllocString = formatTokenAllocations(data.allocations)
      console.log('Token allocation string:', tokenAllocString)

      // Store profile as ENS text records
      // ENSRouter.chain = "base"
      // ENSRouter.tokenAlloc = "USDC:60,ETH:30,DAI:10"
      // ENSRouter.slippage = "0.5"
      const records: { key: string; value: string }[] = [
        { key: 'ENSRouter.chain', value: data.chain },
        { key: 'ENSRouter.tokenAlloc', value: tokenAllocString },
        { key: 'ENSRouter.slippage', value: data.slippageTolerance.toString() },
      ]

      const calls = records.map(({ key, value }) =>
        encodeSingleSetText(node, key, value)
      )

      console.log('Encoded calls:', calls)
      console.log('Resolver address:', ENS_PUBLIC_RESOLVER)

      const hash = await writeContractAsync({
        address: ENS_PUBLIC_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: 'multicall',
        args: [calls],
        chainId: ENS_CHAIN_ID,
      })

      console.log('Transaction hash received:', hash)

    } catch (error) {
      console.error('Error in setProfile:', error)
      setIsWriting(false)
      setCurrentStep(0)
      throw error
    }
  }, [writeContractAsync, resetWrite, currentChain, switchChainAsync])

  const finalIsWriting = isWriting || isWritePending || isConfirming

  return {
    setProfile,
    currentStep,
    totalSteps: 1,
    isWriting: finalIsWriting,
    isSuccess,
    error: writeError || receiptError,
    txHash,
  }
}
