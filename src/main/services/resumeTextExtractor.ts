if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    a: number; b: number; c: number; d: number; e: number; f: number
    m11: number; m12: number; m13: number; m14: number
    m21: number; m22: number; m23: number; m24: number
    m31: number; m32: number; m33: number; m34: number
    m41: number; m42: number; m43: number; m44: number
    is2D = true
    isIdentity = true
    constructor(init?: string | number[]) {
      const v = Array.isArray(init) ? init : []
      if (v.length === 6) {
        this.a = v[0]; this.b = v[1]; this.c = v[2]; this.d = v[3]; this.e = v[4]; this.f = v[5]
      } else {
        this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0
      }
      this.m11 = this.a; this.m12 = this.b; this.m13 = 0; this.m14 = 0
      this.m21 = this.c; this.m22 = this.d; this.m23 = 0; this.m24 = 0
      this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0
      this.m41 = this.e; this.m42 = this.f; this.m43 = 0; this.m44 = 1
      this.is2D = true
      this.isIdentity = this.a === 1 && this.b === 0 && this.c === 0
        && this.d === 1 && this.e === 0 && this.f === 0
    }
    inverse() { return new DOMMatrix() }
    multiply() { return new DOMMatrix() }
    translate() { return new DOMMatrix() }
    scale() { return new DOMMatrix() }
    rotate() { return new DOMMatrix() }
    transformPoint(p: { x?: number; y?: number } = {}) {
      return { x: p.x ?? 0, y: p.y ?? 0, z: 0, w: 1 }
    }
    static fromMatrix() { return new DOMMatrix() }
    static fromFloat32Array() { return new DOMMatrix() }
    static fromFloat64Array() { return new DOMMatrix() }
  } as unknown as typeof globalThis.DOMMatrix
}

import { existsSync } from 'fs'
import { join } from 'path'
import { execFile as execFileCb } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'os'
import { writeFileSync, readFileSync, mkdirSync, rmSync, readdirSync } from 'fs'

const execFile = promisify(execFileCb)
import { createLogger } from './logger'

const log = createLogger('ResumeTextExtractor')
import { randomUUID } from 'crypto'

const TESSERACT_PATH = findBinary('tesseract')
const PDFTOPPM_PATH = findBinary('pdftoppm')

function findBinary(name: string): string {
  const searchDirs = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin']
  for (const dir of searchDirs) {
    const path = join(dir, name)
    if (existsSync(path)) return path
  }
  return ''
}

export const resumeTextExtractor = {
  async extractText(fileBytes: Buffer, filename: string): Promise<string> {
    const ext = filename.toLowerCase().split('.').pop() ?? ''
    let raw: string

    switch (`.${ext}`) {
      case '.pdf':
        raw = await extractFromPdf(fileBytes)
        break
      case '.docx':
        raw = await extractFromDocx(fileBytes)
        break
      case '.doc':
        raw = await extractWithTextutil(fileBytes, '.doc')
        break
      case '.jpg':
      case '.jpeg':
      case '.png':
        raw = await extractFromImage(fileBytes, `.${ext}`)
        break
      default:
        throw new Error(`Unsupported resume format: .${ext}`)
    }

    return raw.replace(/\0/g, '')
  },
}

async function extractFromPdf(fileBytes: Buffer): Promise<string> {
  try {
    const pdfjs = await import('pdfjs-dist')
    const data = new Uint8Array(fileBytes)
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
    const pages: string[] = []

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .filter(item => 'str' in item)
        .map(item => (item as { str: string }).str)
        .join(' ')
      if (pageText.trim()) pages.push(pageText)
    }

    const fullText = pages.join('\n')
    const meaningfulChars = fullText.replace(/[^a-zA-Z0-9]/g, '').length

    if (meaningfulChars < 50 && PDFTOPPM_PATH && TESSERACT_PATH) {
      try {
        const ocrText = await extractWithOcr(fileBytes)
        if (ocrText.trim()) return ocrText
      } catch (ocrErr) {
        log.warn('OCR fallback failed, using pdfjs text', {
          meaningfulChars,
          error: ocrErr instanceof Error ? ocrErr.message : String(ocrErr),
        })
      }
    }

    return fullText
  } catch (err) {
    if (PDFTOPPM_PATH && TESSERACT_PATH) {
      try {
        const ocrText = await extractWithOcr(fileBytes)
        if (ocrText.trim()) return ocrText
      } catch (ocrErr) {
        log.warn('OCR last-resort also failed', {
          error: ocrErr instanceof Error ? ocrErr.message : String(ocrErr),
        })
      }
    }
    throw err
  }
}

async function extractFromDocx(fileBytes: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer: fileBytes })
    if (result.value.trim()) return result.value
  } catch (err) {
    log.error('DOCX extraction with mammoth failed, falling back to textutil', err instanceof Error ? err : new Error(String(err)))
  }

  return await extractWithTextutil(fileBytes, '.docx')
}

async function extractWithOcr(pdfBytes: Buffer): Promise<string> {
  if (!TESSERACT_PATH) throw new Error('Tesseract CLI not found. Install via "brew install tesseract" on macOS.')
  if (!PDFTOPPM_PATH) throw new Error('pdftoppm not found. Install via "brew install poppler" on macOS.')

  const tempDir = join(tmpdir(), `ocr-${randomUUID().replace(/-/g, '')}`)
  mkdirSync(tempDir, { recursive: true })

  try {
    const pdfPath = join(tempDir, 'input.pdf')
    const pagesPrefix = join(tempDir, 'page')
    writeFileSync(pdfPath, pdfBytes)

    await execFile(PDFTOPPM_PATH, ['-png', '-r', '300', pdfPath, pagesPrefix], { timeout: 60000 })

    const pageImages = readdirSync(tempDir)
      .filter(f => f.startsWith('page-') && f.endsWith('.png'))
      .sort()

    if (pageImages.length === 0) throw new Error('pdftoppm produced no page images')

    const texts: string[] = []
    for (const pageImage of pageImages) {
      const imagePath = join(tempDir, pageImage)
      const outputBase = imagePath.replace('.png', '-ocr')

      try {
        await execFile(TESSERACT_PATH, [imagePath, outputBase, '-l', 'eng+spa'], { timeout: 30000 })
        const outputFile = `${outputBase}.txt`
        if (existsSync(outputFile)) {
          const text = readFileSync(outputFile, 'utf-8')
          if (text.trim()) texts.push(text)
        }
      } catch (err) {
        log.error(`OCR failed for page image ${pageImage}`, err instanceof Error ? err : new Error(String(err)))
        continue
      }
    }

    return texts.join('\n')
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true })
    } catch (err) {
      log.error('Failed to cleanup OCR temp directory', err instanceof Error ? err : new Error(String(err)))
    }
  }
}

async function extractFromImage(imageBytes: Buffer, extension: string): Promise<string> {
  if (!TESSERACT_PATH) throw new Error('Tesseract CLI not found. Install via "brew install tesseract" on macOS.')

  const tempDir = join(tmpdir(), `ocr-img-${randomUUID().replace(/-/g, '')}`)
  mkdirSync(tempDir, { recursive: true })

  try {
    const inputPath = join(tempDir, `input${extension}`)
    const outputBase = join(tempDir, 'output')
    writeFileSync(inputPath, imageBytes)

    await execFile(TESSERACT_PATH, [inputPath, outputBase, '-l', 'eng+spa'], { timeout: 30000 })

    const outputFile = `${outputBase}.txt`
    if (existsSync(outputFile)) {
      return readFileSync(outputFile, 'utf-8')
    }

    throw new Error('Tesseract produced no output')
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true })
    } catch (err) {
      log.error('Failed to cleanup image OCR temp directory', err instanceof Error ? err : new Error(String(err)))
    }
  }
}

async function extractWithTextutil(fileBytes: Buffer, extension: string): Promise<string> {
  const tempDir = join(tmpdir(), `textutil-${randomUUID().replace(/-/g, '')}`)
  mkdirSync(tempDir, { recursive: true })

  try {
    const inputPath = join(tempDir, `input${extension}`)
    const outputPath = join(tempDir, 'output.txt')
    writeFileSync(inputPath, fileBytes)

    await execFile('/usr/bin/textutil', ['-convert', 'txt', '-output', outputPath, inputPath], { timeout: 15000 })

    if (!existsSync(outputPath)) throw new Error('textutil produced no output')
    return readFileSync(outputPath, 'utf-8')
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true })
    } catch (err) {
      log.error('Failed to cleanup textutil temp directory', err instanceof Error ? err : new Error(String(err)))
    }
  }
}
