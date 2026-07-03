import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GlobalTitleBar from './GlobalTitleBar'

describe('GlobalTitleBar', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <GlobalTitleBar />
      </MemoryRouter>
    )
    expect(container.firstChild).toBeTruthy()
  })
})
