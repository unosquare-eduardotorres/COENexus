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
        .filter((item): item is { str: string } => 'str' in item)
        .map(item => item.str)
        .join(' ')
      if (pageText.trim()) pages.push(pageText)
    }

    const fullText = pages.join('\n')
    const meaningfulChars = fullText.replace(/[^a-zA-Z0-9]/g, '').length

    if (meaningfulChars < 50 && PDFTOPPM_PATH && TESSERACT_PATH) {
      const ocrText = await extractWithOcr(fileBytes)
      if (ocrText.trim()) return ocrText
    }

    return fullText
  } catch (err) {
    if (PDFTOPPM_PATH && TESSERACT_PATH) {
      const ocrText = await extractWithOcr(fileBytes)
      if (ocrText.trim()) return ocrText
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
