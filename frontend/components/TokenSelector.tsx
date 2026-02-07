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
  disabled?: boolean
}

export function TokenSelector({ 
  value, 
  onChange, 
  availableTokens,
  disabled = false 
}: TokenSelectorProps) {
  const selectedToken = availableTokens.find(t => t.symbol === value)

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[140px] bg-black/30 border-white/10 text-white focus:ring-0 focus:ring-offset-0">
        <SelectValue>
          {selectedToken && (
            <div className="flex items-center gap-2">
              <img 
                src={selectedToken.logo} 
                alt={selectedToken.symbol}
                className="w-5 h-5 rounded-full"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"%3E%3Ccircle cx="12" cy="12" r="10"/%3E%3C/svg%3E'
                }}
              />
              <span className="font-medium">{selectedToken.symbol}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-black/95 border-white/10 backdrop-blur-xl">
        {availableTokens.map((token) => (
          <SelectItem 
            key={token.symbol} 
            value={token.symbol}
            className="text-white hover:bg-white/10 focus:bg-white/10"
          >
            <div className="flex items-center gap-2">
              <img 
                src={token.logo} 
                alt={token.symbol}
                className="w-5 h-5 rounded-full"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"%3E%3Ccircle cx="12" cy="12" r="10"/%3E%3C/svg%3E'
                }}
              />
              <span className="font-medium">{token.symbol}</span>
              <span className="text-xs text-white/40">{token.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}