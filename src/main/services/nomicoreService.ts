import { chromium, type BrowserContext, type Page } from 'playwright'
import { app } from 'electron'
import { join } from 'path'
import { createLogger } from './logger'
import type { NomicoreCalculateParams, NomicoreCalculationResult, NomicoreDiagnostics } from '../../shared/ipc-types'

const log = createLogger('NomicoreService')

const NOMICORE_BASE = 'https://nomicore.unosquare.com'
const WASM_LOAD_TIMEOUT = 45_000
const PROFILE_DIR_NAME = 'nomicore-browser-profile'

class NomicoreService {
  private getProfilePath(): string {
    return join(app.getPath('userData'), PROFILE_DIR_NAME)
  }

  async launchForLogin(): Promise<{ loggedIn: boolean }> {
    const profilePath = this.getProfilePath()
    const ctx = await chromium.launchPersistentContext(profilePath, {
      headless: false,
      channel: 'chrome',
      args: ['--disable-blink-features=AutomationControlled'],
    })
    const page = ctx.pages()[0] || await ctx.newPage()
    await page.goto(NOMICORE_BASE, { waitUntil: 'networkidle' })

    try {
      await page.waitForURL(
        url => {
          const u = url.toString()
          return u.startsWith(NOMICORE_BASE)
            && !u.includes('.auth/login')
            && !u.includes('login.microsoftonline.com')
        },
        { timeout: 120_000 },
      )
      log.info('User logged in to Nomicore successfully')
    } catch {
      await ctx.close()
      return { loggedIn: false }
    }

    await ctx.close()
    return { loggedIn: true }
  }

  async checkSession(): Promise<{ valid: boolean }> {
    let ctx: BrowserContext | undefined
    try {
      ctx = await chromium.launchPersistentContext(this.getProfilePath(), {
        headless: true,
        channel: 'chrome',
      })
      const page = await ctx.newPage()
      await page.goto(NOMICORE_BASE, {
        waitUntil: 'networkidle',
        timeout: 20_000,
      })

      const finalUrl = page.url()
      const isAuthRedirect = finalUrl.includes('.auth/login')
        || finalUrl.includes('login.microsoftonline.com')
        || finalUrl.includes('/authorize')

      if (isAuthRedirect) {
        await ctx.close()
        return { valid: false }
      }

      let valid: boolean
      try {
        await page.waitForFunction(() => {
          const appDiv = document.getElementById('app')
          const loader = document.getElementById('apploader')
          return appDiv && (!loader || loader.children.length === 0 || loader.style.display === 'none')
        }, { timeout: 15_000 })
        valid = true
      } catch {
        valid = false
      }

      await ctx.close()
      return { valid }
    } catch {
      if (ctx) await ctx.close().catch(() => {})
      return { valid: false }
    }
  }

  async calculate(params: NomicoreCalculateParams): Promise<NomicoreCalculationResult> {
    const phases: NomicoreDiagnostics['phases'] = []
    const ctx = await chromium.launchPersistentContext(this.getProfilePath(), {
      headless: true,
      channel: 'chrome',
    })

    try {
      const page = await ctx.newPage()
      const url = this.buildUrl(params)
      log.info('[nomicore] Navigating to Nomicore', { url })

      await page.goto(url, { waitUntil: 'networkidle', timeout: WASM_LOAD_TIMEOUT })

      const currentUrl = page.url()
      log.info('[nomicore] Landed on URL', { currentUrl })
      phases.push({ phase: 'navigation', status: 'ok', detail: `Landed on: ${currentUrl}` })

      if (currentUrl.includes('login') || currentUrl.includes('.auth') || currentUrl.includes('microsoftonline')) {
        phases.push({ phase: 'auth-check', status: 'failed', detail: `Redirected to login: ${currentUrl}` })
        await ctx.close()
        throw new Error('Session expired — please login to Nomicore first. The page redirected to: ' + currentUrl)
      }
      phases.push({ phase: 'auth-check', status: 'ok' })

      // Phase 1: Wait for Blazor WASM to bootstrap and render the page
      try {
        await this.waitForBlazorReady(page)
        log.info('[nomicore] Blazor WASM bootstrapped')
        phases.push({ phase: 'blazor-bootstrap', status: 'ok' })
      } catch {
        log.warn('[nomicore] Blazor bootstrap timed out — attempting to continue')
        phases.push({ phase: 'blazor-bootstrap', status: 'timeout', detail: 'Continued despite timeout' })
      }

      // Phase 2: Wait for exchange rate API call to complete
      await page.waitForTimeout(3000)
      phases.push({ phase: 'exchange-rate-wait', status: 'ok', detail: 'Waited 3s for exchange rate API' })

      // Phase 3: Check if Finder auto-populated, if not fill manually
      const inputSnapshot = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input')
        return Array.from(inputs).map(inp => ({
          type: (inp as HTMLInputElement).type,
          value: (inp as HTMLInputElement).value,
          name: (inp as HTMLInputElement).name,
          id: (inp as HTMLInputElement).id,
        }))
      })
      log.info('[nomicore] Input snapshot after exchange rate wait', { inputs: inputSnapshot })

      const finderPopulated = inputSnapshot.some(
        inp => inp.value && parseFloat(inp.value) > 0
      )

      if (!finderPopulated) {
        log.info('[nomicore] Finder did not auto-populate — filling fields manually', {
          grossMonthly: params.grossMonthly,
        })
        phases.push({ phase: 'finder-check', status: 'not-populated', detail: `Inputs: ${JSON.stringify(inputSnapshot.slice(0, 10))}` })
        await this.fillCalculatorManually(page, params)
        phases.push({ phase: 'manual-fill', status: 'attempted' })
      } else {
        log.info('[nomicore] Finder auto-populated successfully')
        phases.push({ phase: 'finder-check', status: 'populated' })
      }

      // Phase 4: Wait for tables with actual data
      let tablesTimedOut = false
      try {
        await page.waitForFunction(() => {
          const tables = document.querySelectorAll('table')
          if (tables.length === 0) return false
          for (const table of tables) {
            const dataCells = table.querySelectorAll('td')
            if (dataCells.length >= 2) return true
          }
          return false
        }, { timeout: WASM_LOAD_TIMEOUT })
        await page.waitForTimeout(2000)
        phases.push({ phase: 'wait-for-tables', status: 'ok' })
      } catch {
        tablesTimedOut = true
        log.error('[nomicore] Timed out waiting for tables with data')
        phases.push({ phase: 'wait-for-tables', status: 'timeout' })
      }

      // Diagnostic: inspect the full page structure regardless of success/failure
      const pageStructure = await page.evaluate(() => {
        const tables = document.querySelectorAll('table')
        const tableInfo = Array.from(tables).map((table, i) => {
          const rows = table.querySelectorAll('tr')
          const cells = table.querySelectorAll('td')
          const thCells = table.querySelectorAll('th')
          const parent = table.closest('.card, section, .panel, div[class*="card"]')
          const parentHeader = parent?.querySelector('h1,h2,h3,h4,h5,h6,.card-header,.card-title')
          const prevSibling = table.previousElementSibling
          const headerText = parentHeader?.textContent?.trim()
            || prevSibling?.textContent?.trim()
            || table.caption?.textContent?.trim()
            || `(no header found — parent class: ${parent?.className || 'none'})`
          const sampleCells: string[] = []
          const firstDataRow = table.querySelector('tr:has(td)')
          if (firstDataRow) {
            firstDataRow.querySelectorAll('td').forEach(c => sampleCells.push(c.textContent?.trim() || ''))
          }
          const sampleHeaders: string[] = []
          thCells.forEach(th => sampleHeaders.push(th.textContent?.trim() || ''))
          return {
            index: i,
            rows: rows.length,
            cells: cells.length,
            thCount: thCells.length,
            headerText: headerText.substring(0, 200),
            sampleHeaders: sampleHeaders.slice(0, 10),
            sampleCells: sampleCells.slice(0, 10),
            tableClasses: table.className,
            parentClasses: parent?.className || 'none',
          }
        })

        const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
          .map(h => `${h.tagName}: ${h.textContent?.trim().substring(0, 100)}`)

        const allInputs = document.querySelectorAll('input')
        const inputs = Array.from(allInputs).map(inp => ({
          type: (inp as HTMLInputElement).type,
          value: (inp as HTMLInputElement).value,
          name: (inp as HTMLInputElement).name,
          id: (inp as HTMLInputElement).id,
        }))

        const cards = document.querySelectorAll('.card, div[class*="card"]')
        const bodyText = document.body?.textContent?.substring(0, 500) || ''

        return {
          tableCount: tables.length,
          tables: tableInfo,
          headings,
          inputCount: allInputs.length,
          inputs: inputs.slice(0, 20),
          cardCount: cards.length,
          bodyTextSnippet: bodyText,
        }
      })

      log.info('[nomicore] Page structure', {
        tableCount: pageStructure.tableCount,
        headings: pageStructure.headings,
        inputCount: pageStructure.inputCount,
        cardCount: pageStructure.cardCount,
      })
      log.info('[nomicore] Table details', { tables: pageStructure.tables })

      // If tables timed out, return early with diagnostics
      if (tablesTimedOut) {
        const buffer = await page.screenshot({ fullPage: true })
        const screenshotBase64 = buffer.toString('base64')
        const html = await page.content()
        return {
          params,
          payroll: {},
          cost: {},
          profitability: {},
          rateCard: {},
          rawHtml: html,
          screenshotBase64,
          calculatedAt: new Date().toISOString(),
          diagnostics: { phases, pageStructure, allTablesData: {} },
        }
      }

      const rawHtml = await page.content()
      const buffer = await page.screenshot({ fullPage: true })
      const screenshotBase64 = buffer.toString('base64')

      // Extract ALL tables' data into a diagnostic map, keyed by header/index
      const allTablesData = await page.evaluate(() => {
        const result: Record<string, Record<string, string>> = {}
        const tables = document.querySelectorAll('table')
        tables.forEach((table, i) => {
          const parent = table.closest('.card, section, .panel, div[class*="card"]')
          const parentHeader = parent?.querySelector('h1,h2,h3,h4,h5,h6,.card-header,.card-title')
          const prevSibling = table.previousElementSibling
          const headerText = parentHeader?.textContent?.trim()
            || prevSibling?.textContent?.trim()
            || table.caption?.textContent?.trim()
            || `table_${i}`
          const data: Record<string, string> = {}
          table.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('td, th')
            if (cells.length >= 2) {
              const key = cells[0].textContent?.trim() || ''
              const val = cells[cells.length - 1].textContent?.trim() || ''
              if (key && val) data[key] = val
            }
          })
          result[headerText.substring(0, 100)] = data
        })
        return result
      })

      log.info('[nomicore] All tables data keys', { keys: Object.keys(allTablesData) })
      for (const [tableName, data] of Object.entries(allTablesData)) {
        log.info(`[nomicore] Table "${tableName}"`, { entryCount: Object.keys(data).length, sample: Object.entries(data).slice(0, 5) })
      }

      // Try keyword-based extraction first
      const extracted = await page.evaluate(() => {
        const extractTable = (table: Element): Record<string, string> => {
          const data: Record<string, string> = {}
          table.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('td, th')
            if (cells.length >= 2) {
              const key = cells[0].textContent?.trim() || ''
              const val = cells[cells.length - 1].textContent?.trim() || ''
              if (key && val && key !== val) data[key] = val
            }
          })
          return data
        }

        const findTableByKeywords = (keywords: string[]): Record<string, string> => {
          // Strategy 1: Look for heading elements containing keywords
          const headingSelectors = 'h1, h2, h3, h4, h5, h6, .card-header, .card-title, th, legend, summary, [class*="header"], [class*="title"], label, span, strong, b'
          const allElements = document.querySelectorAll(headingSelectors)
          for (const el of allElements) {
            const text = el.textContent?.trim().toLowerCase() || ''
            if (!keywords.some(kw => text.includes(kw))) continue

            // Walk up to find a container with a table
            let container = el.closest('.card, section, .panel, table, div[class*="card"], div[class*="section"], .container, .row')
            if (!container) container = el.parentElement
            while (container && !container.querySelector('table')) {
              container = container.parentElement
              if (!container || container === document.body) break
            }
            const table = container?.querySelector('table')
            if (!table) continue

            const data = extractTable(table)
            if (Object.keys(data).length > 0) return data
          }

          // Strategy 2: Check table context (prev sibling, parent card header)
          const tables = document.querySelectorAll('table')
          for (const table of tables) {
            const context = [
              table.previousElementSibling?.textContent,
              table.closest('.card')?.querySelector('h1,h2,h3,h4,h5,.card-header,.card-title')?.textContent,
              table.caption?.textContent,
              table.querySelector('thead')?.textContent,
            ].filter(Boolean).join(' ').toLowerCase()

            if (keywords.some(kw => context.includes(kw))) {
              const data = extractTable(table)
              if (Object.keys(data).length > 0) return data
            }
          }

          return {}
        }

        return {
          payroll: findTableByKeywords(['payroll', 'nómina', 'nomina', 'salary', 'sueldo', 'percepciones', 'deducciones', 'pago']),
          cost: findTableByKeywords(['cost', 'costo', 'employer', 'patron', 'empresa', 'imss', 'infonavit']),
          profitability: findTableByKeywords(['profitability', 'rentabilidad', 'profit', 'margin', 'margen', 'utilidad']),
          rateCard: findTableByKeywords(['rate card', 'rate', 'tarifa', 'billing', 'factur', 'hora', 'hourly']),
        }
      })

      log.info('[nomicore] Extraction results', {
        payrollKeys: Object.keys(extracted.payroll).length,
        costKeys: Object.keys(extracted.cost).length,
        profitabilityKeys: Object.keys(extracted.profitability).length,
        rateCardKeys: Object.keys(extracted.rateCard).length,
      })
      phases.push({
        phase: 'extraction',
        status: Object.values(extracted).some(d => Object.keys(d).length > 0) ? 'ok' : 'empty',
        detail: `payroll=${Object.keys(extracted.payroll).length}, cost=${Object.keys(extracted.cost).length}, profitability=${Object.keys(extracted.profitability).length}, rateCard=${Object.keys(extracted.rateCard).length}`,
      })

      return {
        params,
        ...extracted,
        rawHtml,
        screenshotBase64,
        calculatedAt: new Date().toISOString(),
        diagnostics: { phases, pageStructure, allTablesData },
      }
    } finally {
      await ctx.close()
    }
  }

  private async waitForBlazorReady(page: Page, timeout = 30_000): Promise<void> {
    await page.waitForFunction(() => {
      const loader = document.getElementById('apploader')
      return !loader || loader.children.length === 0 || loader.style.display === 'none'
    }, { timeout })

    await page.waitForFunction(() => {
      const appEl = document.getElementById('app')
      if (!appEl) return false
      const hasContent = appEl.querySelectorAll('.card, .container, form, table, input').length > 0
      return hasContent
    }, { timeout: 15_000 })
  }

  private async fillCalculatorManually(page: Page, params: NomicoreCalculateParams): Promise<void> {
    const filled = await page.evaluate((amount) => {
      const allInputs = document.querySelectorAll('input')
      for (const input of allInputs) {
        const inp = input as HTMLInputElement
        const container = inp.closest('.candyform-formgroup, .form-group, .input-group, div')
        const containerText = container?.textContent?.toLowerCase() || ''

        if (containerText.includes('finder') || containerText.includes('amount') ||
            containerText.includes('gross') || containerText.includes('bruto') ||
            containerText.includes('salary') || containerText.includes('sueldo')) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
          )?.set
          nativeInputValueSetter?.call(inp, String(amount))
          inp.dispatchEvent(new Event('input', { bubbles: true }))
          inp.dispatchEvent(new Event('change', { bubbles: true }))
          return true
        }
      }
      return false
    }, params.grossMonthly)

    if (!filled) {
      log.warn('Could not find salary input field to fill manually')
      const numberInput = page.locator('input[type="number"]').first()
      if (await numberInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await numberInput.fill(String(params.grossMonthly))
        log.info('Filled first visible number input as fallback')
      }
    }

    const calcButton = page.locator('button, input[type="submit"]').filter({
      hasText: /calculate|calcular|find|buscar|search/i,
    }).first()
    if (await calcButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await calcButton.click()
      log.info('Clicked calculate/find button')
    }

    await page.waitForTimeout(3000)
  }

  private buildUrl(params: NomicoreCalculateParams): string {
    const year = params.year || new Date().getFullYear()
    const qs = new URLSearchParams({
      year: String(year),
      brutoMensual: '0',
      bonoAxosMensual: '0',
      benefitsStartDate: `${year}-01-01`,
      usdExchangeRate: '',
      FinderReader: 'TypicalMonthlyGross',
      FinderAmount: String(params.grossMonthly),
      FinderWriter: 'brutoMensual',
      ShowCalculator: 'True',
    })
    return `${NOMICORE_BASE}/plan/${params.country}/${params.contractType}?${qs.toString()}`
  }
}

export const nomicoreService = new NomicoreService()
