import { useState, useCallback, useEffect, useRef } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { namehash } from 'viem/ens'
import { encodeFunctionData } from 'viem'
import { registerENSProfile } from '@/lib/api'
import type { ProfileFormData, ChainAllocation } from '@/types'

const ENS_PUBLIC_RESOLVER_SEPOLIA = '0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5'
const ENS_PUBLIC_RESOLVER_MAINNET = '0xF29100983E058B709F3D539b0c765937B804AC15'

const IS_TESTNET = true
const ENS_PUBLIC_RESOLVER = IS_TESTNET ? ENS_PUBLIC_RESOLVER_SEPOLIA : ENS_PUBLIC_RESOLVER_MAINNET
const ENS_CHAIN_ID = IS_TESTNET ? 11155111 : 1

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

// Format chain allocations as: "base-sepolia:80,arbitrum-sepolia:10,arc-testnet:10"
function formatChainAllocations(allocations: ChainAllocation[]): string {
  return allocations
    .filter(a => a.percentage > 0)
    .map(a => `${a.chain}:${a.percentage}`)
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
  const lastProfileDataRef = useRef<ProfileFormData | null>(null)
  const { chain: currentChain, address } = useAccount()

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
      lastProfileDataRef.current = null
      setIsWriting(false)
      setCurrentStep(0)
    }
  }, [isSuccess, isWriting])

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

    // Check if on correct chain
    if (currentChain?.id !== ENS_CHAIN_ID) {
      console.error(`Wrong chain! Please switch to ${IS_TESTNET ? 'Sepolia' : 'Mainnet'}`)
      throw new Error(`Please switch to ${IS_TESTNET ? 'Sepolia' : 'Mainnet'} network`)
    }

    // Validate allocations sum to 100
    const totalPercentage = data.chainAllocations.reduce((sum, a) => sum + a.percentage, 0)
    if (totalPercentage !== 100) {
      throw new Error(`Chain allocations must sum to 100% (currently ${totalPercentage}%)`)
    }

    resetWrite()
    lastProfileDataRef.current = data
    setIsWriting(true)
    setCurrentStep(1)

    try {
      const node = namehash(data.ensName) as `0x${string}`
      console.log('Namehash for', data.ensName, ':', node)

      const chainAllocString = formatChainAllocations(data.chainAllocations)
      console.log('Chain allocation string:', chainAllocString)

      // Store chain allocations as a single text record
      // Format: "ENSRouter.chainAlloc" = "base-sepolia:80,arbitrum-sepolia:10,arc-testnet:10"
      const records: { key: string; value: string }[] = [
        { key: 'ENSRouter.chainAlloc', value: chainAllocString },
      ]

      // Add fallback chain if specified
      if (data.fallbackChain) {
        records.push({ key: 'ENSRouter.fallback', value: data.fallbackChain })
      }

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

      // Register with backend as soon as we have the hash (don't wait for confirmation)
      if (address) {
        console.log('Registering ENS profile with backend...', { ensName: data.ensName })
        registerENSProfile({ ensName: data.ensName, ethAddress: address })
          .then(() => console.log('ENS profile registered with server'))
          .catch((err) => console.error('Backend ENS register failed:', err))
      }

    } catch (error) {
      console.error('Error in setProfile:', error)
      setIsWriting(false)
      setCurrentStep(0)
      throw error
    }
  }, [writeContractAsync, resetWrite, currentChain, address])

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
