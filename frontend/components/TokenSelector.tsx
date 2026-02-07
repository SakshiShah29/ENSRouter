import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Token } from '@/lib/tokenList'

interface TokenSelectorProps {
  value: string
  onChange: (value: string) => void
  availableTokens: Token[]
}

export function TokenSelector({ 
  value, 
  onChange, 
  availableTokens 
}: TokenSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {availableTokens.map((token) => (
          <SelectItem key={token.symbol} value={token.symbol}>
            {token.symbol}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}