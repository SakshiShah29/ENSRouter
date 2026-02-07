import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useENSAvatar } from '@/hooks/useENSAvatar'
import { formatAddress } from '@/lib/utils'
import type { ParsedProfile } from '@/types'

interface ENSProfileCardProps {
  profile: ParsedProfile
}

export function ENSProfileCard({ profile }: ENSProfileCardProps) {
  const avatar = useENSAvatar(profile.ensName)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          {avatar && (
            <img 
              src={avatar} 
              alt={profile.ensName}
              className="w-12 h-12 rounded-full"
            />
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{profile.ensName}</h3>
            <p className="text-sm text-gray-600">
              {formatAddress(profile.address)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <span className="text-sm text-gray-600">Destination Chain:</span>
          <Badge variant="secondary" className="ml-2">
            {profile.chain}
          </Badge>
        </div>
        
        <div>
          <span className="text-sm text-gray-600">Token Allocation:</span>
          <div className="mt-2 space-y-1">
            {profile.allocations.map((alloc, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{alloc.token}</span>
                <span className="font-medium">{alloc.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {profile.autoSwapEnabled && (
          <div className="pt-2 border-t">
            <span className="text-sm text-green-600">
              ✓ Auto-swap enabled
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}