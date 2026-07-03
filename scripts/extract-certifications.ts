import { execSync } from 'child_process'
import { join } from 'path'
import { homedir } from 'os'
import { writeFileSync } from 'fs'

const DB_PATH = join(homedir(), 'Library', 'Application Support', 'operation-nexus', 'nexus.db')
const PROXY_URL = 'http://localhost:3456'
const API_KEY = 'nexus-local-dev'
const MODEL = 'claude-haiku-4-5-20251001'
const MAX_CONCURRENCY = 2
const MAX_RETRIES = 5
const BACKOFF_MS = [2000, 5000, 10000, 20000, 30000]
const DELAY_BETWEEN_CALLS_MS = 500

interface CertResult {
  name: string
  certifications: string[]
}

const SYSTEM_PROMPT = `You are a resume certification extractor. Given resume text, extract ONLY professional certifications that the person has earned or holds.

Rules:
- ONLY include actual professional certifications, licenses, or accreditations
- DO NOT include: tools, technologies, programming languages, frameworks, or skills (e.g. "Azure DevOps" as a tool is NOT a certification)
- DO NOT include: education degrees, courses, bootcamps, or training programs unless they explicitly granted a certification
- DO NOT include certifications listed as "in progress", "pursuing", "expected", or "none currently"
- Common certifications include: AWS Certified (various), Azure certifications (AZ-xxx), GCP certifications, PMP, Scrum Master (CSM/PSM), CISSP, CompTIA (A+, Security+, Network+), CKA/CKAD, ITIL, SAFe, TOGAF, ISTQB, CEH, CCNA/CCNP, Salesforce Certified, Six Sigma, PRINCE2, etc.
- "Azure DevOps" is a TOOL unless it explicitly says "Azure DevOps Engineer Expert" or similar certification title
- Return ONLY a JSON array of certification name strings. If no certifications found, return an empty array []
- Be concise with cert names — use the standard short form (e.g. "AWS Certified Solutions Architect - Associate" not the full paragraph description)`

async function callHaiku(resumeText: string): Promise<string[]> {
  const truncated = resumeText.substring(0, 8000)

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${PROXY_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          temperature: 0,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Extract certifications from this resume:\n\n${truncated}` },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      })

      if (response.status === 429 || response.status === 502 || response.status === 529) {
        const delay = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)]
        process.stderr.write(`  ${response.status} error, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})...\n`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      if (!response.ok) {
        throw new Error(`Proxy error ${response.status}: ${response.statusText}`)
      }

      const result = await response.json() as { choices: Array<{ message: { content: string } }> }
      const content = result.choices?.[0]?.message?.content?.trim()
      if (!content) return []

      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (!jsonMatch) return []

      const parsed = JSON.parse(jsonMatch[0])
      if (!Array.isArray(parsed)) return []

      return parsed.filter((c: unknown) => typeof c === 'string' && c.trim().length > 0)
    } catch (err) {
      if (attempt === MAX_RETRIES - 1) {
        process.stderr.write(`  Failed for resume after ${MAX_RETRIES} attempts: ${err}\n`)
        return []
      }
      await new Promise(r => setTimeout(r, BACKOFF_MS[attempt]))
    }
  }
  return []
}

async function runConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const idx = nextIndex++
      results[idx] = await fn(items[idx], idx)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

function sqliteQuery(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"')
  return execSync(`sqlite3 "${DB_PATH}" "${escaped}"`, {
    encoding: 'utf-8',
    maxBuffer: 200 * 1024 * 1024,
  })
}

async function main() {
  // Check proxy availability
  try {
    const check = await fetch(`${PROXY_URL}/v1/models`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!check.ok) throw new Error(`Status ${check.status}`)
    console.log('Claude Proxy is available.')
  } catch {
    console.error('ERROR: Claude Proxy is not available at', PROXY_URL)
    console.error('Make sure the proxy is running before executing this script.')
    process.exit(1)
  }

  // Fetch all employee resumes
  console.log('Querying employee resumes from database...')
  const rows: Array<{ name: string; resumeText: string }> = []

  const batchSize = 500
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const raw = sqliteQuery(`
      SELECT
        (SELECT full_name FROM synced_employees WHERE id = re.source_id),
        replace(re.resume_text, '|', ' ')
      FROM resume_embeddings re
      WHERE re.resume_text IS NOT NULL
        AND re.resume_text != ''
        AND re.source_type = 'employees'
      LIMIT ${batchSize} OFFSET ${offset}
    `).trim()

    if (!raw) { hasMore = false; break }

    const lines = raw.split('\n')
    if (lines.length < batchSize) hasMore = false

    for (const line of lines) {
      const pipeIdx = line.indexOf('|')
      if (pipeIdx < 0) continue
      const name = line.substring(0, pipeIdx)
      const resumeText = line.substring(pipeIdx + 1)
      if (name && resumeText.length > 50) {
        rows.push({ name, resumeText })
      }
    }

    offset += batchSize
  }

  console.log(`Found ${rows.length} employee resumes. Processing with Haiku (concurrency: ${MAX_CONCURRENCY})...\n`)

  const startTime = Date.now()
  let processed = 0

  const certResults = await runConcurrent(rows, MAX_CONCURRENCY, async (row, idx) => {
    await new Promise(r => setTimeout(r, DELAY_BETWEEN_CALLS_MS))
    const certs = await callHaiku(row.resumeText)
    processed++
    if (processed % 10 === 0 || processed === rows.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      const rate = (processed / parseFloat(elapsed)).toFixed(1)
      process.stderr.write(`  Progress: ${processed}/${rows.length} (${elapsed}s, ${rate}/s)\n`)
    }
    return { name: row.name, certifications: certs } as CertResult
  })

  // Filter to only those with certifications
  const results = certResults
    .filter(r => r.certifications.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name))

  // Deduplicate per person (case-insensitive)
  for (const r of results) {
    const seen = new Map<string, string>()
    for (const cert of r.certifications) {
      const key = cert.toLowerCase().trim()
      if (!seen.has(key)) seen.set(key, cert)
    }
    r.certifications = [...seen.values()]
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\nDone in ${elapsed}s.`)

  if (results.length === 0) {
    console.log('\nNo certifications found.')
    return
  }

  // Build output
  const outputLines: string[] = []
  const nameWidth = 45

  outputLines.push('='.repeat(110))
  outputLines.push('EMPLOYEE CERTIFICATIONS REPORT (AI-verified via Claude Haiku)')
  outputLines.push('='.repeat(110))
  outputLines.push(`Total employees with certifications: ${results.length}`)
  outputLines.push(`Total employee resumes analyzed: ${rows.length}`)
  outputLines.push('')
  outputLines.push('Name'.padEnd(nameWidth) + 'Certifications')
  outputLines.push('-'.repeat(110))

  for (const r of results) {
    outputLines.push(
      r.name.substring(0, nameWidth - 2).padEnd(nameWidth) +
      r.certifications.join(', ')
    )
  }

  outputLines.push('-'.repeat(110))
  outputLines.push(`\nTotal: ${results.length} employees with certifications`)

  // Certification frequency
  const certCounts = new Map<string, number>()
  for (const r of results) {
    for (const cert of r.certifications) {
      const normalized = cert.replace(/\s+/g, ' ').trim()
      certCounts.set(normalized, (certCounts.get(normalized) || 0) + 1)
    }
  }

  outputLines.push('')
  outputLines.push('='.repeat(70))
  outputLines.push('CERTIFICATION FREQUENCY')
  outputLines.push('='.repeat(70))
  const sorted = [...certCounts.entries()].sort((a, b) => b[1] - a[1])
  for (const [cert, count] of sorted) {
    outputLines.push(`  ${cert.padEnd(55)} ${count}`)
  }

  const output = outputLines.join('\n')

  const outPath = join(__dirname, 'employee-certifications-report.txt')
  writeFileSync(outPath, output, 'utf-8')
  console.log(`\nReport saved to: ${outPath}`)
  console.log(`Total employees with certifications: ${results.length}`)
}

main()
