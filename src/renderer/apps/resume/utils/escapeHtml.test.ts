import { describe, it, expect } from 'vitest'
import { escapeHtml, escapeXml } from './escapeHtml'

describe('escapeHtml', () => {
  it('should escape ampersands', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B')
  })

  it('should escape less-than signs', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;')
  })

  it('should escape greater-than signs', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b')
  })

  it('should escape double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
  })

  it('should escape single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s')
  })

  it('should escape all special chars in combination', () => {
    expect(escapeHtml('<a href="test">it\'s & done</a>')).toBe(
      '&lt;a href=&quot;test&quot;&gt;it&#39;s &amp; done&lt;/a&gt;'
    )
  })

  it('should return empty string for empty input', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('should not escape normal text', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123')
  })

  it('should handle XSS injection patterns', () => {
    const xss = '<script>alert("XSS")</script>'
    const escaped = escapeHtml(xss)
    expect(escaped).not.toContain('<script>')
    expect(escaped).toContain('&lt;script&gt;')
  })
})

describe('escapeXml', () => {
  it('should be the same function as escapeHtml', () => {
    expect(escapeXml).toBe(escapeHtml)
  })

  it('should escape XML special characters', () => {
    expect(escapeXml('<tag attr="val">')).toBe('&lt;tag attr=&quot;val&quot;&gt;')
  })
})
