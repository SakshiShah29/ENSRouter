import { z } from 'zod'

export const ensNameSchema = z
  .string()
  .min(3, 'ENS name too short')
  .regex(/^[a-z0-9-]+\.eth$/, 'Invalid ENS name format')

export const profileSchema = z.object({
  ensName: ensNameSchema,
  chain: z.enum(['base', 'arbitrum', 'ethereum']),
  allocations: z
    .array(
      z.object({
        token: z.string(),
        percentage: z.number().min(0).max(100),
      })
    )
    .refine(
      (allocations) => {
        const total = allocations.reduce((sum, a) => sum + a.percentage, 0)
        return total === 100
      },
      { message: 'Allocations must sum to 100%' }
    ),
  slippageTolerance: z.number().min(0.1).max(5),
  autoSwapEnabled: z.boolean(),
})

export const sendFormSchema = z.object({
  recipientENS: ensNameSchema,
  amount: z
    .string()
    .min(1, 'Amount required')
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      'Invalid amount'
    ),
})