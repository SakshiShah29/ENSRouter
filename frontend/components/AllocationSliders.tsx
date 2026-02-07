import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { TokenSelector } from '@/components/TokenSelector'
import { getAvailableTokens } from '@/lib/tokenList'
import type { TokenAllocation } from '@/types'

interface AllocationSlidersProps {
  allocations: TokenAllocation[]
  onChange: (allocations: TokenAllocation[]) => void
  chain: string
}

export function AllocationSliders({ 
  allocations, 
  onChange, 
  chain 
}: AllocationSlidersProps) {
  const availableTokens = getAvailableTokens(chain)

  const handlePercentageChange = (index: number, percentage: number) => {
    const newAllocations = [...allocations]
    newAllocations[index].percentage = percentage
    
    // Auto-adjust others to maintain 100% total
    const others = newAllocations.filter((_, i) => i !== index)
    const otherTotal = 100 - percentage
    const otherCount = others.length
    
    if (otherCount > 0) {
      const perOther = Math.floor(otherTotal / otherCount)
      let remaining = otherTotal - (perOther * otherCount)
      
      newAllocations.forEach((alloc, i) => {
        if (i !== index) {
          alloc.percentage = perOther + (remaining > 0 ? 1 : 0)
          if (remaining > 0) remaining--
        }
      })
    }

    onChange(newAllocations)
  }

  const handleTokenChange = (index: number, token: string) => {
    const newAllocations = [...allocations]
    newAllocations[index].token = token
    onChange(newAllocations)
  }

  const addAllocation = () => {
    if (allocations.length >= 4) return // Max 4 tokens
    
    const unusedTokens = availableTokens.filter(
      t => !allocations.find(a => a.token === t.symbol)
    )
    
    if (unusedTokens.length === 0) return

    const newToken = unusedTokens[0].symbol
    const newPercentage = 10
    
    const newAllocations = allocations.map(a => ({
      ...a,
      percentage: Math.floor(a.percentage * 0.9), // Reduce by 10%
    }))
    
    newAllocations.push({ token: newToken, percentage: newPercentage })
    onChange(newAllocations)
  }

  const removeAllocation = (index: number) => {
    if (allocations.length <= 1) return
    
    const removed = allocations[index].percentage
    const newAllocations = allocations.filter((_, i) => i !== index)
    
    // Distribute removed percentage
    const perRemaining = Math.floor(removed / newAllocations.length)
    let remainder = removed - (perRemaining * newAllocations.length)
    
    newAllocations.forEach(alloc => {
      alloc.percentage += perRemaining + (remainder > 0 ? 1 : 0)
      if (remainder > 0) remainder--
    })
    
    onChange(newAllocations)
  }

  return (
    <div className="space-y-4">
      {allocations.map((alloc, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between">
            <TokenSelector
              value={alloc.token}
              onChange={(token) => handleTokenChange(index, token)}
              availableTokens={availableTokens}
            />
            <span className="font-medium">{alloc.percentage}%</span>
          </div>
          
          <Slider
            value={[alloc.percentage]}
            onValueChange={([value]) => handlePercentageChange(index, value)}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />

          {allocations.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeAllocation(index)}
              className="text-red-600"
            >
              Remove
            </Button>
          )}
        </div>
      ))}

      {allocations.length < 4 && (
        <Button
          type="button"
          variant="outline"
          onClick={addAllocation}
          className="w-full"
        >
          + Add Token
        </Button>
      )}
    </div>
  )
}