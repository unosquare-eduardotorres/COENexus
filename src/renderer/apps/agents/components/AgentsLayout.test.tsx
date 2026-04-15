import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.stubGlobal('window', {
  ...window,
  api: {
    ...window.api,
    scout9: {
      getStatus: vi.fn().mockResolvedValue({ success: true, data: {} }),
      onStatusEvent: vi.fn().mockReturnValue(() => {}),
    },
    vigil: {
      getStatus: vi.fn().mockResolvedValue({ success: true, data: {} }),
      onStatusEvent: vi.fn().mockReturnValue(() => {}),
    },
  },
})

describe('AgentsLayout (lucide-react v1 telemetry)', () => {
  it('should render sidebar with all agent nav items', async () => {
    const AgentsLayout = (await import('./AgentsLayout')).default
    render(
      <MemoryRouter initialEntries={['/agents']}>
        <AgentsLayout />
      </MemoryRouter>
    )
    expect(screen.getByText('A.G.E.N.T.')).toBeTruthy()
    expect(screen.getByText('Scout-9')).toBeTruthy()
    expect(screen.getByText('Switchboard')).toBeTruthy()
    expect(screen.getByText('Sensei')).toBeTruthy()
    expect(screen.getByText('Payday')).toBeTruthy()
  })
})
