import { z } from 'zod'

export const ensNameSchema = z
  .string()
  .min(3, 'ENS name too short')
  .regex(/^[a-z0-9-]+\.eth$/, 'Invalid ENS name format')

export const profileSchema = z.object({
  ensName: z.string().min(1, "ENS name is required").regex(/\.eth$/, "Must be a valid .eth name"),
  chain: z.string().min(1),
  allocations: z.array(z.object({
    token: z.string(),
    percentage: z.number().min(0).max(100)
  })).min(1),
  slippageTolerance: z.number().min(0.1).max(5),
  autoSwapEnabled: z.boolean()
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