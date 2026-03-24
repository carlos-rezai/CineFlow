import { describe, it, expect } from 'vitest'
import { formatRuntime } from '../formatRuntime'

describe('formatRuntime', () => {
  it('converts minutes to Xh Ym', () => {
    expect(formatRuntime(155)).toBe('2h 35m')
  })

  it('handles less than 60 minutes', () => {
    expect(formatRuntime(45)).toBe('0h 45m')
  })

  it('handles exactly 60 minutes', () => {
    expect(formatRuntime(60)).toBe('1h 0m')
  })

  it('handles 0 minutes', () => {
    expect(formatRuntime(0)).toBe('0h 0m')
  })
})
