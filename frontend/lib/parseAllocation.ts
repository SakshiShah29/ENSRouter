import type { TokenAllocation } from '@/types'

export function parseAllocation(allocString: string | undefined | null): TokenAllocation[] {
  if (!allocString) {
    return [{ token: 'USDC', percentage: 100 }]
  }

  try {
    const allocations = allocString.split(',').map(part => {
      const [token, pct] = part.trim().split(':')
      return {
        token: token.trim(),
        percentage: parseInt(pct.trim(), 10),
      }
    })

    // Validate percentages sum to 100
    const total = allocations.reduce((sum, a) => sum + a.percentage, 0)
    if (total !== 100) {
      console.warn(`Allocation percentages sum to ${total}, not 100`)
      return [{ token: 'USDC', percentage: 100 }]
    }

    return allocations
  } catch (error) {
    console.error('Failed to parse allocation:', error)
    return [{ token: 'USDC', percentage: 100 }]
  }
}