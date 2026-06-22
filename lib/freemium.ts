'use client'

const KEY = 'qf_free_uses'
const LIMIT = 3

export function getUses(): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(KEY) || '0', 10)
}
export function remaining(): number { return Math.max(0, LIMIT - getUses()) }
export function canUse(): boolean { return remaining() > 0 }
export function recordUse() {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, String(getUses() + 1))
}
export const FREE_LIMIT = LIMIT
