import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DESTINATION_CHAINS } from '@/lib/chains'

interface ChainSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function ChainSelector({ value, onChange, disabled = false }: ChainSelectorProps) {
  const selectedChain = DESTINATION_CHAINS.find(c => c.id === value)

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full bg-black/30 border-white/10 text-white focus:ring-0 focus:ring-offset-0 h-10">
        <SelectValue>
          {selectedChain && (
            <span className="font-medium capitalize">{selectedChain.name}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-black/95 border-white/10 backdrop-blur-xl">
        {DESTINATION_CHAINS.map((chain) => (
          <SelectItem
            key={chain.id}
            value={chain.id}
            className="text-white hover:bg-white/10 focus:bg-white/10"
          >
            <span className="font-medium capitalize">{chain.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
