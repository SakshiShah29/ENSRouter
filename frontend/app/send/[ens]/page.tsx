'use client'

import { use } from 'react'
import SendPage from '../page'

export default function SendWithENS({ params }: { params: Promise<{ ens: string }> }) {
  const { ens } = use(params)
  const ensName = decodeURIComponent(ens)

  return <SendPage defaultENS={ensName} />
}
