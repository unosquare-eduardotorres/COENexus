import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('./DatabaseUpdateBanner', () => ({
  default: () => <div data-testid="db-banner">DatabaseUpdateBanner</div>,
}))

vi.mock('../../../components/VemLogo', () => ({
  default: () => <div data-testid="vem-logo">VemLogo</div>,
}))

vi.mock('../../../components/GlobalTitleBar', () => ({
  default: () => <div data-testid="global-title-bar">GlobalTitleBar</div>,
}))

import Layout from './Layout'

function renderLayout(route = '/resume') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Layout>
        <div data-testid="child-content">Page Content</div>
      </Layout>
    </MemoryRouter>
  )
}

describe('Layout', () => {
  it('should render children content', () => {
    renderLayout()
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Page Content')).toBeInTheDocument()
  })

  it('should render GlobalTitleBar', () => {
    renderLayout()
    expect(screen.getByTestId('global-title-bar')).toBeInTheDocument()
  })

  it('should render DatabaseUpdateBanner', () => {
    renderLayout()
    expect(screen.getByTestId('db-banner')).toBeInTheDocument()
  })

  it('should render navigation items', () => {
    renderLayout()
    expect(screen.getByText('Getting Started')).toBeInTheDocument()
    expect(screen.getByText('Resume')).toBeInTheDocument()
    expect(screen.getByText('Match Engine')).toBeInTheDocument()
  })

  it('should render VemLogo in sidebar', () => {
    renderLayout()
    const logos = screen.getAllByTestId('vem-logo')
    expect(logos.length).toBeGreaterThan(0)
  })
})
