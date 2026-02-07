import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatUSDC(amountWei: string | bigint): string {
  const amount = typeof amountWei === 'string' ? BigInt(amountWei) : amountWei
  const formatted = Number(amount) / 1e6
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(formatted)
}

export function formatTokenAmount(
  amountWei: string | bigint,
  decimals: number = 18,
  maxDecimals: number = 4
): string {
  const amount = typeof amountWei === 'string' ? BigInt(amountWei) : amountWei
  const divisor = BigInt(10 ** decimals)
  const value = Number(amount) / Number(divisor)
  return value.toFixed(maxDecimals)
}