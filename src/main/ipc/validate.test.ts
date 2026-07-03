import { describe, it, expect } from 'vitest'
import { validateSender } from './validate'

function createMockEvent(url: string) {
  return {
    senderFrame: { url },
  } as any
}

describe('validateSender', () => {
  it('should accept file:// URLs', () => {
    const event = createMockEvent('file:///path/to/app/index.html')
    expect(() => validateSender(event)).not.toThrow()
  })

  it('should accept http://localhost URLs', () => {
    const event = createMockEvent('http://localhost:5173/index.html')
    expect(() => validateSender(event)).not.toThrow()
  })

  it('should accept http://localhost without port', () => {
    const event = createMockEvent('http://localhost/')
    expect(() => validateSender(event)).not.toThrow()
  })

  it('should reject https://evil.com', () => {
    const event = createMockEvent('https://evil.com/steal-data')
    expect(() => validateSender(event)).toThrow('Unauthorized IPC sender')
  })

  it('should reject http://remote-server.com', () => {
    const event = createMockEvent('http://remote-server.com')
    expect(() => validateSender(event)).toThrow('Unauthorized IPC sender')
  })

  it('should reject empty URL', () => {
    const event = createMockEvent('')
    expect(() => validateSender(event)).toThrow('Unauthorized IPC sender')
  })

  it('should reject data: URLs', () => {
    const event = createMockEvent('data:text/html,<h1>test</h1>')
    expect(() => validateSender(event)).toThrow('Unauthorized IPC sender')
  })
})
