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
}

export function ChainSelector({ value, onChange }: ChainSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select chain" />
      </SelectTrigger>
      <SelectContent>
        {DESTINATION_CHAINS.map((chain) => (
          <SelectItem key={chain.id} value={chain.id}>
            {chain.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}