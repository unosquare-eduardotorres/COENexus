import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('should render title and description', () => {
    render(<EmptyState icon={<span>📭</span>} title="No results" description="Try adjusting your filters." />)
    expect(screen.getByText('No results')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your filters.')).toBeInTheDocument()
  })

  it('should render action button when provided', () => {
    render(
      <EmptyState
        icon={<span>📭</span>}
        title="Empty"
        description="Nothing here."
        action={<button>Add item</button>}
      />
    )
    expect(screen.getByText('Add item')).toBeInTheDocument()
  })

  it('should not render action area when not provided', () => {
    const { container } = render(
      <EmptyState icon={<span>📭</span>} title="Empty" description="Nothing." />
    )
    expect(container.querySelectorAll('button')).toHaveLength(0)
  })
})
