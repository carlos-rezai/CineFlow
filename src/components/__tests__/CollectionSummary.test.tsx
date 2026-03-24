// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

afterEach(cleanup)
import { CollectionSummary } from '../CollectionSummary'
import type { CollectionStats } from '../../types/stats'

const makeStats = (
  overrides: Partial<CollectionStats> = {},
): CollectionStats => ({
  totalDiscs: 10,
  watchedCount: 4,
  unwatchedCount: 6,
  watchedPercent: 40.0,
  totalWatchCount: 5,
  totalRuntimeMinutes: 1000,
  unwatchedRuntimeMinutes: 620,
  averageRating: 4.2,
  formatBreakdown: { '4K': 5, 'Blu-ray': 3, DVD: 2 },
  genres: [
    { genre: 'Science Fiction', count: 5 },
    { genre: 'Drama', count: 4 },
    { genre: 'Action', count: 3 },
    { genre: 'Thriller', count: 2 },
    { genre: 'Adventure', count: 2 },
    { genre: 'Comedy', count: 1 },
  ],
  directors: [
    {
      name: 'Denis Villeneuve',
      discCount: 3,
      watchedCount: 2,
      titles: ['Dune', 'Arrival', 'Blade Runner 2049'],
    },
    {
      name: 'Christopher Nolan',
      discCount: 2,
      watchedCount: 1,
      titles: ['Inception', 'The Dark Knight'],
    },
    {
      name: 'Solo Director',
      discCount: 1,
      watchedCount: 0,
      titles: ['Solo Film'],
    },
  ],
  ...overrides,
})

describe('CollectionSummary', () => {
  it('renders nothing when stats is null', () => {
    const { container } = render(<CollectionSummary stats={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows totalDiscs, unwatchedCount, and watchedPercent', () => {
    render(<CollectionSummary stats={makeStats()} />)
    expect(screen.getByText(/10 discs/)).toBeInTheDocument()
    expect(screen.getByText(/6 unwatched/)).toBeInTheDocument()
    expect(screen.getByText(/40%/)).toBeInTheDocument()
  })

  it('shows unwatched runtime formatted as Xh Ym', () => {
    render(
      <CollectionSummary stats={makeStats({ unwatchedRuntimeMinutes: 620 })} />,
    )
    expect(screen.getByText(/10h 20m/)).toBeInTheDocument()
  })

  it('hides averageRating when null, shows it when present', () => {
    const { rerender } = render(
      <CollectionSummary stats={makeStats({ averageRating: null })} />,
    )
    expect(screen.queryByTestId('average-rating')).toBeNull()

    rerender(<CollectionSummary stats={makeStats({ averageRating: 4.2 })} />)
    expect(screen.getByTestId('average-rating')).toBeInTheDocument()
    expect(screen.getByTestId('average-rating')).toHaveTextContent('4.2')
  })

  it('director breakdown shows only directors with discCount >= 2, sorted by discCount desc', () => {
    render(<CollectionSummary stats={makeStats()} />)

    expect(screen.getByText('Denis Villeneuve')).toBeInTheDocument()
    expect(screen.getByText('Christopher Nolan')).toBeInTheDocument()
    expect(screen.queryByText('Solo Director')).toBeNull()

    const directorItems = screen.getAllByTestId('director-row')
    expect(directorItems[0]).toHaveTextContent('Denis Villeneuve')
    expect(directorItems[1]).toHaveTextContent('Christopher Nolan')
  })

  it('genre breakdown shows top 5 genres only', () => {
    render(<CollectionSummary stats={makeStats()} />)

    expect(screen.getByText('Science Fiction')).toBeInTheDocument()
    expect(screen.getByText('Drama')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('Thriller')).toBeInTheDocument()
    expect(screen.getByText('Adventure')).toBeInTheDocument()
    expect(screen.queryByText('Comedy')).toBeNull()
  })
})
