// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react'

afterEach(cleanup)
afterEach(() => vi.clearAllMocks())

vi.mock('../../../hooks/useMoodStream', () => ({
  useMoodStream: vi.fn(),
}))

vi.mock('../../../hooks/useDecisionStream', () => ({
  useDecisionStream: vi.fn(),
}))

import { useMoodStream } from '../../../hooks/useMoodStream'
import { useDecisionStream } from '../../../hooks/useDecisionStream'
import WatchPage from '../WatchPage'

const mockUseMoodStream = vi.mocked(useMoodStream)
const mockUseDecisionStream = vi.mocked(useDecisionStream)

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

const idleMoodHook = () => ({
  status: 'idle' as const,
  topPick: null,
  runners: [],
  explanation: '',
  submit: vi.fn(),
  reset: vi.fn(),
})

const idleDecideHook = (overrides: Record<string, unknown> = {}) => ({
  status: 'idle' as const,
  topPick: null,
  runners: [],
  explanation: '',
  run: vi.fn(),
  ...overrides,
})

const resultDecideHook = (overrides: Record<string, unknown> = {}) => ({
  status: 'result' as const,
  topPick: makeCandidate(),
  runners: [],
  explanation: 'A great pick for tonight.',
  run: vi.fn(),
  ...overrides,
})

const emptyDecideHook = () => ({
  status: 'empty' as const,
  topPick: null,
  runners: [],
  explanation: '',
  run: vi.fn(),
})

beforeEach(() => {
  mockUseMoodStream.mockReturnValue(idleMoodHook())
  mockUseDecisionStream.mockReturnValue(idleDecideHook())
})

// --- Mode toggle ---

describe('WatchPage — mode toggle', () => {
  it('renders "Mood" mode active by default', () => {
    render(<WatchPage />)

    const moodButton = screen.getByRole('button', { name: /^mood$/i })
    expect(moodButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders "Decide for me" button', () => {
    render(<WatchPage />)

    expect(
      screen.getByRole('button', { name: /decide for me/i }),
    ).toBeInTheDocument()
  })

  it('"Decide for me" toggle is not active by default', () => {
    render(<WatchPage />)

    const decideButton = screen.getByRole('button', { name: /decide for me/i })
    expect(decideButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('"Mood" mode shows the mood input form', () => {
    render(<WatchPage />)

    expect(screen.getAllByTestId('mood-tag')).toHaveLength(8)
  })
})

// --- Decide for me mode: auto-run ---

describe('WatchPage — "Decide for me" mode: auto-run', () => {
  it('calls run() on useDecisionStream when switching to "Decide for me"', async () => {
    const mockRun = vi.fn()
    mockUseDecisionStream.mockReturnValue(idleDecideHook({ run: mockRun }))
    render(<WatchPage />)

    fireEvent.click(screen.getByRole('button', { name: /decide for me/i }))

    await waitFor(() => expect(mockRun).toHaveBeenCalledOnce())
  })

  it('hides the mood input form after switching to "Decide for me"', () => {
    render(<WatchPage />)

    fireEvent.click(screen.getByRole('button', { name: /decide for me/i }))

    expect(screen.queryAllByTestId('mood-tag')).toHaveLength(0)
  })

  it('switching back to "Mood" restores the mood input form', () => {
    render(<WatchPage />)

    fireEvent.click(screen.getByRole('button', { name: /decide for me/i }))
    fireEvent.click(screen.getByRole('button', { name: /^mood$/i }))

    expect(screen.getAllByTestId('mood-tag')).toHaveLength(8)
  })
})

// --- Decide for me mode: result state ---

describe('WatchPage — "Decide for me" mode: result state', () => {
  beforeEach(() => {
    mockUseDecisionStream.mockReturnValue(resultDecideHook())
  })

  it('shows topPick title and year from the decision pipeline', () => {
    render(<WatchPage />)
    fireEvent.click(screen.getByRole('button', { name: /decide for me/i }))

    expect(screen.getByText('Blade Runner 2049')).toBeInTheDocument()
    expect(screen.getByText('2017')).toBeInTheDocument()
  })

  it('shows runtime and genres from the decision pipeline top pick', () => {
    render(<WatchPage />)
    fireEvent.click(screen.getByRole('button', { name: /decide for me/i }))

    expect(screen.getByText(/164/)).toBeInTheDocument()
    expect(screen.getByText(/science fiction/i)).toBeInTheDocument()
  })

  it('shows up to 3 runner cards from the decision pipeline', () => {
    const runners = [
      makeCandidate({ title: 'Dune', tmdbId: 438631 }),
      makeCandidate({ title: 'Arrival', tmdbId: 329865 }),
    ]
    mockUseDecisionStream.mockReturnValue(resultDecideHook({ runners }))
    render(<WatchPage />)
    fireEvent.click(screen.getByRole('button', { name: /decide for me/i }))

    expect(screen.getAllByTestId('runner-card')).toHaveLength(2)
  })
})

// --- Decide for me mode: empty state ---

describe('WatchPage — "Decide for me" mode: empty state', () => {
  it('shows the empty state when useDecisionStream reports empty', () => {
    mockUseDecisionStream.mockReturnValue(emptyDecideHook())
    render(<WatchPage />)
    fireEvent.click(screen.getByRole('button', { name: /decide for me/i }))

    expect(screen.getByTestId('mood-empty')).toBeInTheDocument()
  })
})

// --- Decide for me mode: error state ---

describe('WatchPage — "Decide for me" mode: error state', () => {
  it('shows error state when useDecisionStream reports error', () => {
    mockUseDecisionStream.mockReturnValue({
      status: 'error' as const,
      topPick: null,
      runners: [],
      explanation: '',
      run: vi.fn(),
    })
    render(<WatchPage />)
    fireEvent.click(screen.getByRole('button', { name: /decide for me/i }))

    expect(screen.getByTestId('mood-error')).toBeInTheDocument()
  })
})

// --- Decide for me mode: cached result / Pick again ---

describe('WatchPage — "Decide for me" mode: cached result on re-enter', () => {
  it('does not auto-run when re-entering decide mode with a cached result', async () => {
    const mockRun = vi.fn()
    mockUseDecisionStream.mockReturnValue(resultDecideHook({ run: mockRun }))
    render(<WatchPage />)

    fireEvent.click(screen.getByRole('button', { name: /decide for me/i }))
    fireEvent.click(screen.getByRole('button', { name: /^mood$/i }))
    fireEvent.click(screen.getByRole('button', { name: /decide for me/i }))

    await waitFor(() => expect(mockRun).not.toHaveBeenCalled())
  })

  it('"Pick again" is absent when status is idle, visible when result is cached', () => {
    const { rerender } = render(<WatchPage />)
    fireEvent.click(screen.getByRole('button', { name: /decide for me/i }))

    expect(
      screen.queryByRole('button', { name: /pick again/i }),
    ).not.toBeInTheDocument()

    mockUseDecisionStream.mockReturnValue(resultDecideHook())
    rerender(<WatchPage />)

    expect(
      screen.getByRole('button', { name: /pick again/i }),
    ).toBeInTheDocument()
  })

  it('"Pick again" calls run()', async () => {
    const mockRun = vi.fn()
    mockUseDecisionStream.mockReturnValue(resultDecideHook({ run: mockRun }))
    render(<WatchPage />)

    fireEvent.click(screen.getByRole('button', { name: /decide for me/i }))
    fireEvent.click(screen.getByRole('button', { name: /pick again/i }))

    await waitFor(() => expect(mockRun).toHaveBeenCalledOnce())
  })
})
