import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../../contexts/NexusStatusContext', () => ({
  useNexusStatus: vi.fn().mockReturnValue({
    claude: { connected: true, checking: false },
    checkClaude: vi.fn(),
    modals: { claude: true },
    closeModal: vi.fn(),
  }),
}))

import ClaudeStatusModal from './ClaudeStatusModal'

describe('ClaudeStatusModal', () => {
  it('should render status display when modal is open', () => {
    render(<ClaudeStatusModal />)
    expect(screen.getByText(/Claude/i)).toBeInTheDocument()
  })
})
