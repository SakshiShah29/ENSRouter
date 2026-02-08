import { Button } from '@/components/ui/button'
import { TokenSelector } from '@/components/TokenSelector'
import { getAvailableTokens } from '@/lib/tokenList'
import { X, Plus } from 'lucide-react'

interface AllocationSlidersProps {
  allocations: any[]
  onChange: (allocations: any[]) => void
  chain: string
  disabled?: boolean
}

export function AllocationSliders({ 
  allocations, 
  onChange, 
  chain,
  disabled = false
}: AllocationSlidersProps) {
  const availableTokens = getAvailableTokens(chain)

  const handlePercentageChange = (index: number, percentage: number) => {
    const newAllocations = [...allocations]
    const oldPercentage = newAllocations[index].percentage
    newAllocations[index].percentage = percentage
    
    const diff = percentage - oldPercentage
    
    if (allocations.length > 1) {
      // Distribute the difference among other allocations
      const others = newAllocations.filter((_, i) => i !== index)
      const totalOthers = others.reduce((sum, a) => sum + a.percentage, 0)
      
      newAllocations.forEach((alloc, i) => {
        if (i !== index && totalOthers > 0) {
          const ratio = alloc.percentage / totalOthers
          const adjustment = -diff * ratio
          alloc.percentage = Math.max(0, Math.round(alloc.percentage + adjustment))
        }
      })
      
      // Ensure total is exactly 100
      const total = newAllocations.reduce((sum, a) => sum + a.percentage, 0)
      if (total !== 100) {
        const correction = 100 - total
        // Apply correction to the largest non-modified allocation
        const largestOtherIndex = newAllocations
          .map((a, i) => ({ percentage: a.percentage, index: i }))
          .filter(item => item.index !== index)
          .sort((a, b) => b.percentage - a.percentage)[0]?.index
        
        if (largestOtherIndex !== undefined) {
          newAllocations[largestOtherIndex].percentage += correction
        }
      }
    }

    onChange(newAllocations)
  }

  const handleTokenChange = (index: number, token: string) => {
    const newAllocations = [...allocations]
    newAllocations[index].token = token
    onChange(newAllocations)
  }

  const addAllocation = () => {
    if (allocations.length >= 4) return
    
    const usedTokens = new Set(allocations.map(a => a.token))
    const unusedToken = availableTokens.find(t => !usedTokens.has(t.symbol))
    
    if (!unusedToken) return

    const newPercentage = 20
    const reduction = newPercentage / allocations.length
    
    const newAllocations = allocations.map(a => ({
      ...a,
      percentage: Math.round(a.percentage - reduction),
    }))
    
    // Adjust to ensure total is 100
    const currentTotal = newAllocations.reduce((sum, a) => sum + a.percentage, 0)
    const finalPercentage = 100 - currentTotal
    
    newAllocations.push({ token: unusedToken.symbol, percentage: finalPercentage })
    onChange(newAllocations)
  }

  const removeAllocation = (index: number) => {
    if (allocations.length <= 1) return
    
    const removed = allocations[index]
    const newAllocations = allocations.filter((_, i) => i !== index)
    
    // Distribute removed percentage proportionally
    const totalRemaining = newAllocations.reduce((sum, a) => sum + a.percentage, 0)
    
    if (totalRemaining > 0) {
      newAllocations.forEach(alloc => {
        const ratio = alloc.percentage / totalRemaining
        alloc.percentage = Math.round(alloc.percentage + (removed.percentage * ratio))
      })
    } else {
      // If all were 0, give it all to the first one
      newAllocations[0].percentage = 100
    }
    
    // Ensure total is exactly 100
    const total = newAllocations.reduce((sum, a) => sum + a.percentage, 0)
    if (total !== 100 && newAllocations.length > 0) {
      newAllocations[0].percentage += (100 - total)
    }
    
    onChange(newAllocations)
  }

  const usedTokens = new Set(allocations.map(a => a.token))
  const canAddMore = allocations.length < 4 && availableTokens.some(t => !usedTokens.has(t.symbol))

  return (
    <div className="space-y-3">
      {allocations.map((alloc, index) => (
        <div key={index} className="space-y-2 p-3 bg-black/20 rounded-lg border border-white/5">
          <div className="flex items-center justify-between gap-3">
            <TokenSelector
              value={alloc.token}
              onChange={(token) => handleTokenChange(index, token)}
              availableTokens={availableTokens}
              disabled={disabled}
            />
            
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white min-w-[60px] text-right">
                {alloc.percentage}%
              </span>
              
              {allocations.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAllocation(index)}
                  disabled={disabled}
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="px-1">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={alloc.percentage}
              onChange={(e) => handlePercentageChange(index, parseInt(e.target.value))}
              disabled={disabled}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#c084fc] hover:accent-[#c084fc]/80 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, #c084fc 0%, #c084fc ${alloc.percentage}%, rgba(255,255,255,0.1) ${alloc.percentage}%, rgba(255,255,255,0.1) 100%)`
              }}
            />
          </div>
        </div>
      ))}

      {canAddMore && (
        <Button
          type="button"
          variant="outline"
          onClick={addAllocation}
          disabled={disabled}
          className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Token
        </Button>
      )}
      
      {!canAddMore && allocations.length < 4 && (
        <p className="text-xs text-white/30 text-center">
          All available tokens have been added
        </p>
      )}
    </div>
  )
}