import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import VectorizationPanel from './VectorizationPanel'
import { VectorizationConfig } from '../types'

const defaultVecConfig: VectorizationConfig = {
  model: 'voyage-4-large' as VectorizationConfig['model'],
  dimensions: 1024,
} as VectorizationConfig

function renderPanel(overrides = {}) {
  const props = {
    vecConfig: defaultVecConfig,
    setVecConfig: vi.fn(),
    handleSaveVecModel: vi.fn(),
    voyageKeyConfigured: false,
    voyageMaskedKeys: [] as Array<{ index: number; masked: string }>,
    voyageKeySource: '',
    onAddVoyageKey: vi.fn().mockResolvedValue(undefined),
    onRemoveVoyageKey: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  return { ...render(<VectorizationPanel {...props} />), ...props }
}

describe('VectorizationPanel', () => {
  it('should render Voyage AI API Keys heading', () => {
    renderPanel()
    expect(screen.getByText('Voyage AI API Keys')).toBeInTheDocument()
  })

  it('should show warning when no keys are configured', () => {
    renderPanel({ voyageMaskedKeys: [] })
    expect(screen.getByText(/Add one or more API keys/)).toBeInTheDocument()
  })

  it('should display masked keys when configured', () => {
    renderPanel({
      voyageKeyConfigured: true,
      voyageMaskedKeys: [{ index: 0, masked: 'pa-****1234' }],
    })
    expect(screen.getByText('pa-****1234')).toBeInTheDocument()
  })

  it('should show source badge for first key', () => {
    renderPanel({
      voyageKeyConfigured: true,
      voyageMaskedKeys: [{ index: 0, masked: 'pa-****1234' }],
      voyageKeySource: 'env',
    })
    expect(screen.getByText('via env')).toBeInTheDocument()
  })

  it('should call onAddVoyageKey when adding a new key', async () => {
    const { onAddVoyageKey } = renderPanel()
    const input = screen.getByPlaceholderText(/pa-/)
    fireEvent.change(input, { target: { value: 'pa-test-key-12345' } })
    fireEvent.click(screen.getByText('+ Add Key'))
    await waitFor(() => {
      expect(onAddVoyageKey).toHaveBeenCalledWith('pa-test-key-12345')
    })
  })

  it('should disable Add Key button with empty input', () => {
    renderPanel()
    const addBtn = screen.getByText('+ Add Key')
    expect(addBtn).toBeDisabled()
  })

  it('should call onRemoveVoyageKey when remove button clicked', () => {
    const { onRemoveVoyageKey } = renderPanel({
      voyageKeyConfigured: true,
      voyageMaskedKeys: [{ index: 0, masked: 'pa-****1234' }],
    })
    const removeBtn = screen.getByTitle('Remove key')
    fireEvent.click(removeBtn)
    expect(onRemoveVoyageKey).toHaveBeenCalledWith(0)
  })

  it('should show error message when add fails', async () => {
    const { onAddVoyageKey } = renderPanel()
    vi.mocked(onAddVoyageKey).mockRejectedValue(new Error('Invalid key'))
    const input = screen.getByPlaceholderText(/pa-/)
    fireEvent.change(input, { target: { value: 'bad-key' } })
    fireEvent.click(screen.getByText('+ Add Key'))
    await waitFor(() => {
      expect(screen.getByText('Invalid key')).toBeInTheDocument()
    })
  })
})
