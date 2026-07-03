// React context + provider for the COE Bonus config system.
// Manages active period, per-period config, and lock state in localStorage.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  ActivePeriod,
  BonusConfig,
  MeasureConfig,
  MeasureKey,
  MeasureLock,
} from '../types/bonusConfig'
import {
  buildConfigKey,
  defaultConfig,
  getOrCreateConfig,
  loadStore,
  saveStore,
} from '../services/bonusConfigStorage'
import type { CatalogCoe } from '../../../../shared/ipc-types'

// ── Types ────────────────────────────────────────────────────────────────────

export interface BonusConfigContextValue {
  activePeriod: ActivePeriod
  setActivePeriod: (period: ActivePeriod) => void
  config: BonusConfig
  updateMeasure: (key: MeasureKey, patch: Partial<MeasureConfig>) => void
  updateBonusPool: (amount: number) => void
  lockMeasure: (key: MeasureKey, lock: MeasureLock) => void
  unlockMeasure: (key: MeasureKey) => void
  catalogCoes: CatalogCoe[]
  coeNames: string[]
}

const BonusConfigContext = createContext<BonusConfigContextValue | null>(null)

export function useBonusConfig(): BonusConfigContextValue {
  const ctx = useContext(BonusConfigContext)
  if (!ctx) throw new Error('useBonusConfig must be used within <BonusConfigProvider>')
  return ctx
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function currentQuarter(): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  const m = new Date().getMonth()
  if (m < 3) return 'Q1'
  if (m < 6) return 'Q2'
  if (m < 9) return 'Q3'
  return 'Q4'
}

// ── Synchronous localStorage init ───────────────────────────────────────────

function loadInitialState(): { period: ActivePeriod; cfg: BonusConfig } {
  const store = loadStore()
  if (store.activeKey) {
    const parts = store.activeKey.split(':')
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10)
      const quarter = parts[1] as ActivePeriod['quarter']
      const coeName = parts.slice(2).join(':')
      return {
        period: { year, quarter, coeId: null, coeName },
        cfg: store.configs[store.activeKey] ?? defaultConfig(),
      }
    }
  }
  return {
    period: { year: new Date().getFullYear(), quarter: currentQuarter(), coeId: null, coeName: 'All COEs' },
    cfg: defaultConfig(),
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function BonusConfigProvider({ children }: { children: ReactNode }) {
  // COE data from IPC
  const [catalogCoes, setCatalogCoes] = useState<CatalogCoe[]>([])
  const [coeNames, setCoeNames] = useState<string[]>([])

  // Store state — initialized synchronously from localStorage
  const initialRef = useRef(loadInitialState())
  const [activePeriod, setActivePeriodRaw] = useState<ActivePeriod>(initialRef.current.period)
  const [config, setConfig] = useState<BonusConfig>(initialRef.current.cfg)

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── On mount: fetch COE data ────────────────────────────────────────────
  useEffect(() => {
    // Load catalog COEs
    window.api.catalog.getCoes()
      .then(coes => setCatalogCoes(coes))
      .catch(() => {})

    // Load synced COE names
    window.api.report.getAcceptanceRateCoes()
      .then(names => setCoeNames(names))
      .catch(() => {})
  }, [])

  // ── Persist to localStorage (debounced) ─────────────────────────────────
  // Stores the pending write so we can flush it synchronously on period switch.
  const pendingWriteRef = useRef<{ period: ActivePeriod; cfg: BonusConfig } | null>(null)

  const persistStore = useCallback((period: ActivePeriod, cfg: BonusConfig) => {
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

  /** Flush any pending debounced config write immediately (before period switch). */
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

  // ── Public mutations ────────────────────────────────────────────────────

  const setActivePeriod = useCallback((period: ActivePeriod) => {
    // Flush any pending config write from the outgoing period so edits
    // aren't lost and the activeKey isn't overwritten after we switch.
    flushPendingPersist()
    setActivePeriodRaw(period)
    const store = loadStore()
    const key = buildConfigKey(period)
    store.activeKey = key
    const cfg = getOrCreateConfig(store, key)
    setConfig({ ...cfg })
    saveStore(store)
  }, [flushPendingPersist])

  const updateMeasure = useCallback((key: MeasureKey, patch: Partial<MeasureConfig>) => {
    setConfig(prev => {
      const next = {
        ...prev,
        measures: {
          ...prev.measures,
          [key]: { ...prev.measures[key], ...patch },
        },
      }
      persistStore(activePeriod, next)
      return next
    })
  }, [activePeriod, persistStore])

  const updateBonusPool = useCallback((amount: number) => {
    setConfig(prev => {
      const next = { ...prev, bonusPool: amount }
      persistStore(activePeriod, next)
      return next
    })
  }, [activePeriod, persistStore])

  const lockMeasure = useCallback((key: MeasureKey, lock: MeasureLock) => {
    setConfig(prev => {
      const next = {
        ...prev,
        locks: { ...prev.locks, [key]: lock },
      }
      persistStore(activePeriod, next)
      return next
    })
  }, [activePeriod, persistStore])

  const unlockMeasure = useCallback((key: MeasureKey) => {
    setConfig(prev => {
      const next = {
        ...prev,
        locks: { ...prev.locks, [key]: null },
      }
      persistStore(activePeriod, next)
      return next
    })
  }, [activePeriod, persistStore])

  // ── Resolve coeId from catalog when coeName changes ─────────────────────
  useEffect(() => {
    if (catalogCoes.length === 0) return
    const match = catalogCoes.find(c => c.name === activePeriod.coeName)
    if (match && match.id !== activePeriod.coeId) {
      setActivePeriodRaw(prev => ({ ...prev, coeId: match.id }))
    }
  }, [catalogCoes, activePeriod.coeName, activePeriod.coeId])

  // ── Context value ───────────────────────────────────────────────────────

  const value = useMemo<BonusConfigContextValue>(
    () => ({
      activePeriod,
      setActivePeriod,
      config,
      updateMeasure,
      updateBonusPool,
      lockMeasure,
      unlockMeasure,
      catalogCoes,
      coeNames,
    }),
    [activePeriod, setActivePeriod, config, updateMeasure, updateBonusPool, lockMeasure, unlockMeasure, catalogCoes, coeNames],
  )

  return (
    <BonusConfigContext.Provider value={value}>
      {children}
    </BonusConfigContext.Provider>
  )
}
