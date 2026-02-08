'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { sendFormSchema } from '@/lib/validations'
import { useChainRouterProfile } from '@/hooks/useENSRouterProfile'
import { usePayment } from '@/hooks/usePayment'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ENSProfileCard, ENSProfileCardSkeleton } from '@/components/ENSProfileCard'
import { PaymentPreview } from '@/components/PaymentPreview'
import { PaymentStatusTracker } from '@/components/PaymentStatusTracker'
import { WalletConnect } from '@/components/WalletConnect'
import type { SendFormData } from '@/types'

export default function SendPage({ defaultENS }: { defaultENS?: string } = {}) {
  const { address, isConnected } = useAccount()
  const { executePayment, transaction, resetTransaction, isReady } = usePayment()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SendFormData>({
    resolver: zodResolver(sendFormSchema),
    defaultValues: {
      recipientENS: defaultENS || '',
    },
  })

  const recipientENS = watch('recipientENS')
  const amount = watch('amount')

  const { data: profile, isLoading: profileLoading } = useChainRouterProfile(recipientENS)

  const onSubmit = async (data: SendFormData) => {
    if (!profile || !address) return
    try {
      await executePayment(profile, data.amount, address)
    } catch (error) {
      console.error('Payment failed:', error)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md p-8">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <p className="text-gray-600 mb-4">
            Connect your wallet to send payments
          </p>
          <WalletConnect />
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold mb-8">Send USDC</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Recipient ENS */}
        <Card>
          <CardContent className="pt-6">
            <label className="block text-sm font-medium mb-2">
              Recipient ENS Name
            </label>
            <Input
              {...register('recipientENS')}
              placeholder="alice.eth"
              className={errors.recipientENS ? 'border-red-500' : ''}
            />
            {errors.recipientENS && (
              <p className="text-sm text-red-500 mt-1">
                {errors.recipientENS.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Show profile if resolved */}
        {profileLoading && recipientENS && <ENSProfileCardSkeleton />}

{profile && !profileLoading && (
  <ENSProfileCard profile={profile} />
)}

{!profile && !profileLoading && recipientENS && (
  <Card className="bg-[#1a1b1f] border-gray-700">
    <CardContent className="pt-6 text-center text-gray-400">
      No profile found for {recipientENS}
    </CardContent>
  </Card>
)}
        {/* Amount */}
        <Card>
          <CardContent className="pt-6">
            <label className="block text-sm font-medium mb-2">
              Amount (USDC)
            </label>
            <Input
              {...register('amount')}
              type="number"
              step="0.01"
              placeholder="100"
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-sm text-red-500 mt-1">
                {errors.amount.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Payment Preview */}
        {profile && amount && parseFloat(amount) > 0 && (
          <PaymentPreview 
            profile={profile} 
            amount={amount} 
          />
        )}

        {/* Send / Reset Button */}
        {transaction?.status === 'completed' || transaction?.status === 'failed' ? (
          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={resetTransaction}
          >
            Send Another Payment
          </Button>
        ) : (
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!profile || !amount || !!transaction || !isReady}
          >
            {!isReady ? 'Connecting...' : transaction ? 'Processing...' : 'Send Payment'}
          </Button>
        )}
      </form>

      {/* Status Tracker */}
      {transaction && (
        <div className="mt-8">
          <PaymentStatusTracker transaction={transaction} />
        </div>
      )}
    </div>
  )
}