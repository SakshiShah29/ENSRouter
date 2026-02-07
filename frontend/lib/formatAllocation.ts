import type { TokenAllocation } from '@/types'

export function formatAllocation(allocations: TokenAllocation[]): string {
  return allocations
    .map(a => `${a.token}:${a.percentage}`)
    .join(',')
}