import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createRendererLogger } from './rendererLogger'

describe('createRendererLogger', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should create logger with debug, info, warn, error methods', () => {
    const logger = createRendererLogger('TestModule')
    expect(logger.debug).toBeTypeOf('function')
    expect(logger.info).toBeTypeOf('function')
    expect(logger.warn).toBeTypeOf('function')
    expect(logger.error).toBeTypeOf('function')
  })

  it('should call console.log for info level', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const logger = createRendererLogger('MyModule')
    logger.info('test message')
    expect(spy).toHaveBeenCalledWith('[MyModule]', 'test message', '')
  })

  it('should call console.error for error level', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logger = createRendererLogger('ErrorMod')
    logger.error('something broke')
    expect(spy).toHaveBeenCalledWith('[ErrorMod]', 'something broke', '')
  })

  it('should call console.warn for warn level', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logger = createRendererLogger('WarnMod')
    logger.warn('heads up')
    expect(spy).toHaveBeenCalledWith('[WarnMod]', 'heads up', '')
  })

  it('should call console.debug for debug level', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const logger = createRendererLogger('DebugMod')
    logger.debug('trace info', { key: 'value' })
    expect(spy).toHaveBeenCalledWith('[DebugMod]', 'trace info', { key: 'value' })
  })

  it('should pass Error objects directly to console', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logger = createRendererLogger('ErrMod')
    const err = new Error('kaboom')
    logger.error('failed', err)
    expect(spy).toHaveBeenCalledWith('[ErrMod]', 'failed', err)
  })
})
