import React, { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import type { BonusTier } from '../../../../shared/ipc-types'

// ── Types ──────────────────────────────────────────────────────────────────

export interface PLBActivePeriod {
  year: number
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
}

export interface PLBConfig {
  tiers: BonusTier[]
}

interface PLBConfigStore {
  activeKey: string
  configs: Record<string, PLBConfig>
}

export interface PLBSharedFilters {
  coe: string | null
  practice: string | null
  mainSkill: string | null
}

export interface PLBConfigContextValue {
  activePeriod: PLBActivePeriod
  setActivePeriod: (period: PLBActivePeriod) => void
  config: PLBConfig
  updateTier: (index: number, amount: number) => void
  resetTiers: () => void
  sharedFilters: PLBSharedFilters
  setSharedFilters: (filters: PLBSharedFilters) => void
}

// ── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_PLB_TIERS: BonusTier[] = [
  { min: 55,    max: 100,   label: '≥55%',       amount: 350 },
  { min: 50,    max: 54.99, label: '50%–54.99%',  amount: 250 },
  { min: 45,    max: 49.99, label: '45%–49.99%',  amount: 150 },
  { min: 40,    max: 44.99, label: '40%–44.99%',  amount: 50  },
  { min: 0,     max: 39.99, label: '<40%',         amount: 0   },
]

function defaultConfig(): PLBConfig {
  return { tiers: DEFAULT_PLB_TIERS.map(t => ({ ...t })) }
}

// ── localStorage helpers ─────────────────────────────────────────────────

const STORAGE_KEY = 'practice-lead-bonus-configs'

function buildConfigKey(period: PLBActivePeriod): string {
  return `${period.year}:${period.quarter}`
}

function currentQuarter(): PLBActivePeriod['quarter'] {
  const m = new Date().getMonth() + 1
  if (m <= 3) return 'Q1'
  if (m <= 6) return 'Q2'
  if (m <= 9) return 'Q3'
  return 'Q4'
}

function loadStore(): PLBConfigStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { activeKey: '', configs: {} }
}

function saveStore(store: PLBConfigStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function getOrCreateConfig(store: PLBConfigStore, key: string): PLBConfig {
  if (!store.configs[key]) {
    store.configs[key] = defaultConfig()
  }
  return store.configs[key]
}

// ── Context ────────────────────────────────────────────────────────────────

const PLBConfigContext = createContext<PLBConfigContextValue | null>(null)

export function usePLBConfig(): PLBConfigContextValue {
  const ctx = useContext(PLBConfigContext)
  if (!ctx) throw new Error('usePLBConfig must be used within <PLBConfigProvider>')
  return ctx
}

// ── Provider ───────────────────────────────────────────────────────────────

function loadInitialState(): { period: PLBActivePeriod; cfg: PLBConfig } {
  const store = loadStore()
  if (store.activeKey) {
    const parts = store.activeKey.split(':')
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10)
      const quarter = parts[1] as PLBActivePeriod['quarter']
      if (!isNaN(year) && ['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
        return {
          period: { year, quarter },
          cfg: store.configs[store.activeKey] ?? defaultConfig(),
        }
      }
    }
  }
  return {
    period: { year: new Date().getFullYear(), quarter: currentQuarter() },
    cfg: defaultConfig(),
  }
}

export function PLBConfigProvider({ children }: { children: ReactNode }) {
  const initialRef = useRef(loadInitialState())
  const [activePeriod, setActivePeriodRaw] = useState<PLBActivePeriod>(initialRef.current.period)
  const [config, setConfig] = useState<PLBConfig>(initialRef.current.cfg)
  const [sharedFilters, setSharedFilters] = useState<PLBSharedFilters>({
    coe: null, practice: null, mainSkill: null,
  })

  const pendingWriteRef = useRef<{ period: PLBActivePeriod; cfg: PLBConfig } | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Debounced persistence (300ms) ──────────────────────────────
  const persistStore = useCallback((period: PLBActivePeriod, cfg: PLBConfig) => {
    pendingWriteRef.current = { period, cfg }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      pendingWriteRef.current = null
      const store = loadStore()
      const key = buildConfigKey(period)
      store.configs[key] = cfg
      saveStore(store)
    }, 300)
  }, [])

  const flushPendingPersist = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    const pending = pendingWriteRef.current
    if (pending) {
      pendingWriteRef.current = null
      const store = loadStore()
      const key = buildConfigKey(pending.period)
      store.configs[key] = pending.cfg
      saveStore(store)
    }
  }, [])

  // ── Period switching ────────────────────────────────────────────
  const setActivePeriod = useCallback((period: PLBActivePeriod) => {
    flushPendingPersist()
    setActivePeriodRaw(period)
    const store = loadStore()
    const key = buildConfigKey(period)
    store.activeKey = key
    const cfg = getOrCreateConfig(store, key)
    setConfig({ ...cfg })
    saveStore(store)
  }, [flushPendingPersist])

  // ── Tier updates ────────────────────────────────────────────────
  const updateTier = useCallback((index: number, amount: number) => {
    setConfig(prev => {
      const next = {
        ...prev,
        tiers: prev.tiers.map((t, i) => i === index ? { ...t, amount } : t),
      }
      persistStore(activePeriod, next)
      return next
    })
  }, [activePeriod, persistStore])

  const resetTiers = useCallback(() => {
    setConfig(prev => {
      const next = { ...prev, tiers: DEFAULT_PLB_TIERS.map(t => ({ ...t })) }
      persistStore(activePeriod, next)
      return next
    })
  }, [activePeriod, persistStore])

  // Flush on unmount
  useEffect(() => {
    return () => flushPendingPersist()
  }, [flushPendingPersist])

  const value: PLBConfigContextValue = {
    activePeriod,
    setActivePeriod,
    config,
    updateTier,
    resetTiers,
    sharedFilters,
    setSharedFilters,
  }

  return (
    <PLBConfigContext.Provider value={value}>
      {children}
    </PLBConfigContext.Provider>
  )
}
