// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

afterEach(cleanup)
afterEach(() => vi.clearAllMocks())

vi.mock('../../../hooks/useMoodStream', () => ({
  useMoodStream: vi.fn(),
}))

import { useMoodStream } from '../../../hooks/useMoodStream'
import WatchPage from '../WatchPage'

const mockUseMoodStream = vi.mocked(useMoodStream)

const makeCandidate = (overrides: Record<string, unknown> = {}) => ({
  tmdbId: 335984,
  title: 'Blade Runner 2049',
  year: 2017,
  posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
  genres: ['Science Fiction'],
  runtime: 164,
  directors: ['Denis Villeneuve'],
  watched: false,
  watchCount: 0,
  lastWatchedAt: null,
  rating: null,
  ...overrides,
})

const idleHook = (overrides: Record<string, unknown> = {}) => ({
  status: 'idle' as const,
  topPick: null,
  runners: [],
  explanation: '',
  submit: vi.fn(),
  reset: vi.fn(),
  ...overrides,
})

const resultHook = (overrides: Record<string, unknown> = {}) => ({
  status: 'result' as const,
  topPick: makeCandidate(),
  runners: [],
  explanation: 'A visually stunning sci-fi epic.',
  submit: vi.fn(),
  reset: vi.fn(),
  ...overrides,
})

const emptyHook = () => ({
  status: 'empty' as const,
  topPick: null,
  runners: [],
  explanation: '',
  submit: vi.fn(),
  reset: vi.fn(),
})

const errorHook = () => ({
  status: 'error' as const,
  topPick: null,
  runners: [],
  explanation: '',
  submit: vi.fn(),
  reset: vi.fn(),
})

beforeEach(() => {
  mockUseMoodStream.mockReturnValue(idleHook())
})

// --- Idle state ---

describe('WatchPage — idle state', () => {
  it('renders 8 MoodTag buttons', () => {
    render(<WatchPage />)
    expect(screen.getAllByTestId('mood-tag')).toHaveLength(8)
  })

  it('renders a free text input', () => {
    render(<WatchPage />)
    expect(screen.getByTestId('mood-freetext')).toBeInTheDocument()
  })

  it('submit button is disabled when no tag selected and text input is empty', () => {
    render(<WatchPage />)
    expect(screen.getByTestId('mood-submit')).toBeDisabled()
  })

  it('submit button is enabled when a tag is selected', () => {
    render(<WatchPage />)
    fireEvent.click(screen.getAllByTestId('mood-tag')[0])
    expect(screen.getByTestId('mood-submit')).not.toBeDisabled()
  })

  it('submit button is enabled when free text is non-empty', () => {
    render(<WatchPage />)
    fireEvent.change(screen.getByTestId('mood-freetext'), {
      target: { value: 'something intense' },
    })
    expect(screen.getByTestId('mood-submit')).not.toBeDisabled()
  })

  it('clicking a tag marks it selected; clicking again deselects it', () => {
    render(<WatchPage />)
    const tag = screen.getAllByTestId('mood-tag')[0]

    fireEvent.click(tag)
    expect(tag).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(tag)
    expect(tag).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking submit calls the hook submit with selected tags and free text', () => {
    const mockSubmit = vi.fn()
    mockUseMoodStream.mockReturnValue(idleHook({ submit: mockSubmit }))
    render(<WatchPage />)

    fireEvent.click(screen.getAllByTestId('mood-tag')[0])
    fireEvent.change(screen.getByTestId('mood-freetext'), {
      target: { value: 'something epic' },
    })
    fireEvent.click(screen.getByTestId('mood-submit'))

    expect(mockSubmit).toHaveBeenCalledOnce()
    const call = mockSubmit.mock.calls[0][0] as {
      tags: string[]
      freeText: string
    }
    expect(call.tags).toHaveLength(1)
    expect(call.freeText).toBe('something epic')
  })
})

// --- Result state ---

describe('WatchPage — result state', () => {
  beforeEach(() => {
    mockUseMoodStream.mockReturnValue(resultHook())
  })

  it('shows topPick title and year', () => {
    render(<WatchPage />)
    expect(screen.getByText('Blade Runner 2049')).toBeInTheDocument()
    expect(screen.getByText('2017')).toBeInTheDocument()
  })

  it('hides the idle tag-selection form', () => {
    render(<WatchPage />)
    expect(screen.queryAllByTestId('mood-tag')).toHaveLength(0)
  })

  it('shows up to 3 runner cards', () => {
    const runners = [
      makeCandidate({ title: 'Dune', tmdbId: 438631 }),
      makeCandidate({ title: 'Arrival', tmdbId: 329865 }),
      makeCandidate({ title: 'Annihilation', tmdbId: 281338 }),
    ]
    mockUseMoodStream.mockReturnValue(resultHook({ runners }))
    render(<WatchPage />)
    expect(screen.getAllByTestId('runner-card')).toHaveLength(3)
  })

  it('clicking "Try again" calls reset()', () => {
    const mockReset = vi.fn()
    mockUseMoodStream.mockReturnValue(resultHook({ reset: mockReset }))
    render(<WatchPage />)

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(mockReset).toHaveBeenCalledOnce()
  })
})

// --- Empty state ---

describe('WatchPage — empty state', () => {
  it('shows a friendly empty message', () => {
    mockUseMoodStream.mockReturnValue(emptyHook())
    render(<WatchPage />)
    expect(screen.getByTestId('mood-empty')).toBeInTheDocument()
  })

  it('clicking "Try again" calls reset()', () => {
    const mockReset = vi.fn()
    mockUseMoodStream.mockReturnValue({ ...emptyHook(), reset: mockReset })
    render(<WatchPage />)

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(mockReset).toHaveBeenCalledOnce()
  })
})

// --- Error state ---

describe('WatchPage — error state', () => {
  it('shows an error message', () => {
    mockUseMoodStream.mockReturnValue(errorHook())
    render(<WatchPage />)
    expect(screen.getByTestId('mood-error')).toBeInTheDocument()
  })

  it('clicking "Try again" calls reset()', () => {
    const mockReset = vi.fn()
    mockUseMoodStream.mockReturnValue({ ...errorHook(), reset: mockReset })
    render(<WatchPage />)

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(mockReset).toHaveBeenCalledOnce()
  })
})
