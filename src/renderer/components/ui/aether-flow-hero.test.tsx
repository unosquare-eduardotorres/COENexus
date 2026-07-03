import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import AetherFlowHero from './aether-flow-hero'

describe('AetherFlowHero', () => {
  it('should render without crashing after framer-motion → motion migration', () => {
    render(<AetherFlowHero />)
    expect(document.querySelector('canvas')).toBeTruthy()
  })
})
