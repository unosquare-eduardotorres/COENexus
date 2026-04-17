import { chromium, type BrowserContext, type Page } from 'playwright'
import { app } from 'electron'
import { join } from 'path'
import { createLogger } from './logger'
import type { NomicoreCalculateParams, NomicoreCalculationResult } from '../../shared/ipc-types'

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
    const ctx = await chromium.launchPersistentContext(this.getProfilePath(), {
      headless: true,
      channel: 'chrome',
    })

    try {
      const page = await ctx.newPage()
      const url = this.buildUrl(params)
      log.info('Navigating to Nomicore', { url })

      await page.goto(url, { waitUntil: 'networkidle', timeout: WASM_LOAD_TIMEOUT })

      const currentUrl = page.url()
      log.info('Landed on URL', { currentUrl })

      if (currentUrl.includes('login') || currentUrl.includes('.auth') || currentUrl.includes('microsoftonline')) {
        await ctx.close()
        throw new Error('Session expired — please login to Nomicore first. The page redirected to: ' + currentUrl)
      }

      // Phase 1: Wait for Blazor WASM to bootstrap and render the page
      try {
        await this.waitForBlazorReady(page)
        log.info('Blazor WASM bootstrapped')
      } catch {
        log.warn('Blazor bootstrap timed out — attempting to continue')
      }

      // Phase 2: Wait for exchange rate API call to complete
      // The Blazor component fetches from internal-api.unosquare.com/exchangerate/
      // Give it time to complete + re-render
      await page.waitForTimeout(3000)

      // Phase 3: Check if Finder auto-populated, if not fill manually
      const finderPopulated = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="number"], input[type="text"]')
        for (const input of inputs) {
          const val = (input as HTMLInputElement).value
          if (val && parseFloat(val) > 0) return true
        }
        return false
      })

      if (!finderPopulated) {
        log.info('Finder did not auto-populate — filling fields manually', {
          grossMonthly: params.grossMonthly,
        })
        await this.fillCalculatorManually(page, params)
      }

      // Phase 4: Wait for tables with actual data
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
      } catch {
        const buffer = await page.screenshot({ fullPage: true })
        const screenshotBase64 = buffer.toString('base64')
        const html = await page.content()
        log.error('Timed out waiting for tables with data', {
          currentUrl: page.url(),
          htmlLength: html.length,
          htmlSnippet: html.substring(0, 2000),
        })
        return {
          params,
          payroll: {},
          cost: {},
          profitability: {},
          rateCard: {},
          rawHtml: html,
          screenshotBase64,
          calculatedAt: new Date().toISOString(),
        }
      }

      const rawHtml = await page.content()
      const buffer = await page.screenshot({ fullPage: true })
      const screenshotBase64 = buffer.toString('base64')

      const extracted = await page.evaluate(() => {
        const extractSection = (keywords: string[]): Record<string, string> => {
          const data: Record<string, string> = {}
          const allElements = document.querySelectorAll(
            'h1, h2, h3, h4, h5, h6, .card-header, .card-title, th, legend, summary, [class*="header"], [class*="title"]'
          )
          for (const el of allElements) {
            const text = el.textContent?.trim().toLowerCase() || ''
            if (!keywords.some(kw => text.includes(kw))) continue

            const container = el.closest('.card, section, .panel, table, div[class*="card"], div[class*="section"]')
            const table = container?.querySelector('table') || el.parentElement?.querySelector('table')
            if (!table) continue

            const rows = table.querySelectorAll('tr')
            rows.forEach(row => {
              const cells = row.querySelectorAll('td, th')
              if (cells.length >= 2) {
                const key = cells[0].textContent?.trim() || ''
                const val = cells[cells.length - 1].textContent?.trim() || ''
                if (key && val && key !== val) data[key] = val
              }
            })
            if (Object.keys(data).length > 0) return data
          }

          const tables = document.querySelectorAll('table')
          for (const table of tables) {
            const headerText = (table.previousElementSibling?.textContent ||
                               table.closest('.card')?.querySelector('h1,h2,h3,h4,h5,.card-header')?.textContent || '').toLowerCase()
            if (keywords.some(kw => headerText.includes(kw))) {
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
          }
          return data
        }

        return {
          payroll: extractSection(['payroll', 'nómina', 'nomina', 'salary']),
          cost: extractSection(['cost', 'costo', 'employer']),
          profitability: extractSection(['profitability', 'rentabilidad', 'profit', 'margin']),
          rateCard: extractSection(['rate card', 'rate', 'tarifa', 'billing']),
        }
      })

      return {
        params,
        ...extracted,
        rawHtml,
        screenshotBase64,
        calculatedAt: new Date().toISOString(),
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
