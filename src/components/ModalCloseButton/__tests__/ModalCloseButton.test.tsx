// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import ModalCloseButton from '../ModalCloseButton'

afterEach(cleanup)

describe('ModalCloseButton', () => {
  it('renders a button with aria-label Close', () => {
    render(<ModalCloseButton onClick={() => {}} />)
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<ModalCloseButton onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies additional className to the button', () => {
    render(<ModalCloseButton onClick={() => {}} className="custom-class" />)
    expect(screen.getByRole('button', { name: /close/i })).toHaveClass(
      'custom-class',
    )
  })
})
