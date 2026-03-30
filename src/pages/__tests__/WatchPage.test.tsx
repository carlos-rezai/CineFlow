// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

afterEach(cleanup)

import WatchPage from '../WatchPage'

describe('WatchPage', () => {
  it('renders a placeholder for the Watch tab', () => {
    render(<WatchPage />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('identifies itself as the Watch tab with visible heading', () => {
    render(<WatchPage />)
    expect(screen.getByRole('heading', { name: /watch/i })).toBeInTheDocument()
  })
})
