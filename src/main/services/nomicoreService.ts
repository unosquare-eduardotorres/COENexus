import { chromium, type BrowserContext } from 'playwright'
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
        const buffer = await page.screenshot({ fullPage: true })
        await ctx.close()
        throw new Error('Session expired — please login to Nomicore first. The page redirected to: ' + currentUrl)
      }

      try {
        await page.waitForFunction(() => {
          const tables = document.querySelectorAll('table')
          return tables.length >= 1
        }, { timeout: WASM_LOAD_TIMEOUT })
        await page.waitForTimeout(2000)
      } catch {
        const buffer = await page.screenshot({ fullPage: true })
        const screenshotBase64 = buffer.toString('base64')
        const html = await page.content()
        log.error('Timed out waiting for tables', {
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
