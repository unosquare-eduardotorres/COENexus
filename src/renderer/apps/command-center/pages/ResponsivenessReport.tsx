/**
 * COE Position Attention Report
 *
 * Transformed from the original Responsiveness mention-tracking report into a
 * comprehensive Position Attention dashboard that uses AI to classify ALL active
 * positions into attention states (Needs COE Action, Waiting on Client, On Track,
 * Escalated, No Activity).
 */

import { useState, useMemo } from 'react'
import { useResponsivenessReport } from '../hooks/useResponsivenessReport'
import AiAnalysisModal from '../components/AiAnalysisModal'
import EmailPreviewModal from '../components/EmailPreviewModal'
import EChart from '../../../components/charts/EChart'
import type { EChartsOption } from 'echarts'
import type {
  PositionAttentionState,
  PositionAttentionItem,
  PositionAttentionLeadGroup,
} from '../../../../shared/ipc-types'
import type { PositionDetailResult } from '../types'
import { generatePositionAttentionEmailHtml } from '../services/responsivenessEmailService'
import {
  AlertTriangle, Clock, TrendingUp, Minus,
  ChevronRight, Search, Mail, RefreshCw,
  Sparkles, Target, Info, BrainCircuit,
  CheckCircle2, CircleDot, Bell, ArrowUpCircle,
  ExternalLink, Building2
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────

const STATE_CONFIG: Record<PositionAttentionState, {
  label: string; Icon: LucideIcon; color: string; iconColor: string;
  bgColor: string; borderColor: string; cardBorderLeft: string; cardBg: string
}> = {
  'on-track': {
    label: 'On Track', Icon: CheckCircle2,
    color: 'text-emerald-400', iconColor: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20',
    cardBorderLeft: 'border-l-emerald-500/40', cardBg: 'bg-emerald-500/[0.02]',
  },
  'waiting-on-client': {
    label: 'Waiting on Client', Icon: Clock,
    color: 'text-blue-400', iconColor: 'text-blue-500',
    bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20',
    cardBorderLeft: 'border-l-[#304FF3]/50', cardBg: 'bg-[#304FF3]/[0.02]',
  },
  'needs-coe-action': {
    label: 'Needs Attention', Icon: Bell,
    color: 'text-violet-400', iconColor: 'text-violet-500',
    bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20',
    cardBorderLeft: 'border-l-violet-500/40', cardBg: 'bg-violet-500/[0.02]',
  },
  'escalated': {
    label: 'Escalated', Icon: ArrowUpCircle,
    color: 'text-amber-400', iconColor: 'text-amber-500',
    bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20',
    cardBorderLeft: 'border-l-amber-500/50', cardBg: 'bg-amber-500/[0.02]',
  },
  'no-activity': {
    label: 'No Activity', Icon: CircleDot,
    color: 'text-slate-400', iconColor: 'text-slate-500',
    bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/20',
    cardBorderLeft: 'border-l-slate-500/30', cardBg: 'bg-slate-500/[0.01]',
  },
}

const CHART_COLORS: Record<PositionAttentionState, string> = {
  'on-track': '#10b981',
  'waiting-on-client': '#304FF3',
  'needs-coe-action': '#8B5CF6',
  'escalated': '#F59E0B',
  'no-activity': '#505050',
}

// ── Helpers ───────────────────────────────────────────────

function formatAge(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  if (days < 7) return `${days} days`
  if (days < 30) return `${Math.floor(days / 7)}w`
  return `${Math.floor(days / 30)}mo`
}

// ── Sub-components ────────────────────────────────────────

function SummaryCard({ label, value, Icon, active, onClick }: {
  label: string; value: number; Icon?: LucideIcon; active?: boolean; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all min-w-[100px]
        ${active ? 'border-[#304FF3]/40 bg-[#304FF3]/10 ring-1 ring-[#304FF3]/20' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'}
      `}
    >
      <span className="text-2xl font-bold text-primary">{value}</span>
      <span className="text-xs text-muted whitespace-nowrap flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </span>
    </button>
  )
}

function AttentionStateBadge({ state, escalated }: { state: PositionAttentionState; escalated?: boolean }) {
  const cfg = STATE_CONFIG[state]
  const StateIcon = cfg.Icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bgColor} ${cfg.color} border ${cfg.borderColor}`}>
      <StateIcon className="w-3 h-3" />
      {cfg.label}
      {escalated && state !== 'escalated' && <span className="text-[10px] opacity-70">(escalated)</span>}
    </span>
  )
}

function PositionAttentionCard({ item, expanded, onToggle, candidates, loadingCandidates }: {
  item: PositionAttentionItem
  expanded: boolean
  onToggle: () => void
  candidates?: PositionDetailResult['candidates']
  loadingCandidates?: boolean
}) {
  const cfg = STATE_CONFIG[item.attentionState]
  const StateIcon = cfg.Icon

  return (
    <div className={`border border-l-[3px] rounded-lg transition-all ${cfg.cardBorderLeft} ${
      expanded ? 'border-white/10' : 'border-white/5'
    } ${cfg.cardBg}`}>
      {/* Main content — always visible */}
      <div className="px-4 py-3 flex items-center gap-3">
        {/* State icon — bigger, vertically centered */}
        <div className={`shrink-0 w-9 h-9 rounded-lg ${cfg.bgColor} flex items-center justify-center`}>
          <StateIcon className={`w-4 h-4 ${cfg.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Position ID, account, skill - stakeholder */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">#{item.positionUpstreamId}</span>
            <span className="text-sm text-slate-500">·</span>
            <span className="text-sm text-white">{item.account}</span>
            <span className="text-sm text-slate-500">·</span>
            <span className="text-sm text-slate-300">
              {item.jobTitle || item.mainSkill}
              {item.stakeholder && item.stakeholder !== 'CE' && item.stakeholder !== 'SD' &&
                ` - ${item.stakeholder}`}
            </span>
          </div>

          {/* Row 2: Badge + pills */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <AttentionStateBadge state={item.attentionState} escalated={item.escalated} />
            {item.stakeholder === 'CE' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Building2 className="w-2.5 h-2.5" /> Virtual/Internal
              </span>
            )}
            <span className="text-xs text-slate-400">{formatAge(item.aging)} open</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-400">{item.candidatesPresented} candidates</span>
            {item.ballWith && item.ballWith !== 'N/A' && (
              <>
                <span className="text-xs text-slate-600">·</span>
                <span className="text-xs text-slate-400">Ball with: {item.ballWith}</span>
              </>
            )}
          </div>

          {/* Row 3: Summary in subtle card bg */}
          {item.summary && (
            <div className="mt-2 px-2.5 py-2 rounded bg-white/[0.04] border border-white/[0.06]">
              <p className="text-xs text-slate-300 leading-relaxed">{item.summary}</p>
            </div>
          )}

          {/* Row 4: Flag reason for needs-action / escalated */}
          {(item.attentionState === 'needs-coe-action' || item.attentionState === 'escalated') && item.flagReason && (
            <div className="flex items-start gap-1.5 mt-2 p-2 rounded bg-violet-500/[0.04] border border-violet-500/10">
              <Info className="w-3 h-3 text-violet-400/70 mt-0.5 shrink-0" />
              <p className="text-xs text-violet-300/80 leading-relaxed">{item.flagReason}</p>
            </div>
          )}
        </div>

        {/* Actions: SharePoint + Expand */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.api.app.openExternal(
                `https://unosquare.sharepoint.com/sites/CoE-Core/SitePages/Open-Positions.aspx?OpenPositionId=${item.positionUpstreamId}`
              )
            }}
            className="p-1.5 rounded hover:bg-white/5 transition-colors"
            title="Open in SharePoint"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-blue-400" />
          </button>
          <button onClick={onToggle} className="p-1.5 rounded hover:bg-white/5 transition-colors">
            <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expanded: metadata + candidates */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-white/5 pt-3 ml-12">
          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div><span className="text-slate-500">COE:</span> <span className="text-slate-300">{item.coe}</span></div>
            <div><span className="text-slate-500">Stakeholder:</span> <span className="text-slate-300">{item.stakeholder || '—'}</span></div>
            <div><span className="text-slate-500">Practice:</span> <span className="text-slate-300">{item.practice}</span></div>
            <div><span className="text-slate-500">Seniorities:</span> <span className="text-slate-300">{item.seniorities || '—'}</span></div>
            <div><span className="text-slate-500">Owner:</span> <span className="text-slate-300">{item.ownerName}</span></div>
            <div><span className="text-slate-500">Main Skill:</span> <span className="text-slate-300">{item.mainSkill}</span></div>
            <div><span className="text-slate-500">Last Discussion:</span> <span className="text-slate-300">{item.lastDiscussionDate ? new Date(item.lastDiscussionDate).toLocaleDateString() : 'Never'}</span></div>
            <div><span className="text-slate-500">Confidence:</span> <span className="text-slate-300">{item.confidence === -1 ? 'Rule-based' : `${item.confidence}%`}</span></div>
          </div>

          {/* Candidate pipeline */}
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-400 mb-1.5">Candidates ({item.candidatesPresented})</p>
            {loadingCandidates ? (
              <p className="text-xs text-slate-500">Loading candidates…</p>
            ) : candidates && candidates.length > 0 ? (
              <div className="space-y-1">
                {candidates.map(c => (
                  <div key={c.candidateRequisitionId} className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-white/[0.02]">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      c.candidateStatus === 'Approved' || c.candidateStatus === 'Hired' ? 'bg-emerald-500' :
                      c.rejectionComments || c.rejectionActionDate ? 'bg-red-400' : 'bg-blue-400'
                    }`} />
                    <span className="text-slate-300 font-medium">{c.candidateName}</span>
                    <span className="text-slate-500">{c.mainSkill}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400">{c.candidateStatus}</span>
                    {c.isEmployee && <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1 rounded">Internal</span>}
                    {c.rejectionComments && (
                      <span className="text-slate-500 ml-auto truncate max-w-[200px]" title={c.rejectionComments}>
                        — {c.rejectionComments}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No candidates presented.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function LeadSection({ group, expandedGroups, onTogglePosition, candidateCache, loadingCandidates }: {
  group: PositionAttentionLeadGroup
  expandedGroups: Set<number>
  onTogglePosition: (id: number) => void
  candidateCache: Map<number, PositionDetailResult['candidates']>
  loadingCandidates: Set<number>
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="space-y-2">
      {/* Lead header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 py-2 px-1 group"
      >
        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${collapsed ? '' : 'rotate-90'}`} />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-semibold text-white">{group.leadName}</span>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-xs text-slate-400">{group.coePractice}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          {group.needsAction > 0 && (
            <span className="flex items-center gap-1 text-violet-400">
              <Bell className="w-3 h-3" /> {group.needsAction}
            </span>
          )}
          {group.escalated > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <ArrowUpCircle className="w-3 h-3" /> {group.escalated}
            </span>
          )}
          {group.waitingOnClient > 0 && (
            <span className="flex items-center gap-1 text-blue-400">
              <Clock className="w-3 h-3" /> {group.waitingOnClient}
            </span>
          )}
          {group.onTrack > 0 && (
            <span className="flex items-center gap-1 text-emerald-400">
              <TrendingUp className="w-3 h-3" /> {group.onTrack}
            </span>
          )}
          <span className="text-slate-500">{group.totalPositions} total</span>
        </div>
      </button>

      {/* Position cards */}
      {!collapsed && (
        <div className="space-y-1.5 ml-5">
          {group.positions.map(item => (
            <PositionAttentionCard
              key={item.positionUpstreamId}
              item={item}
              expanded={expandedGroups.has(item.positionUpstreamId)}
              onToggle={() => onTogglePosition(item.positionUpstreamId)}
              candidates={candidateCache.get(item.positionUpstreamId)}
              loadingCandidates={loadingCandidates.has(item.positionUpstreamId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Chart Builders ────────────────────────────────────────

function buildDonutOption(report: { needsAction: number; waitingOnClient: number; onTrack: number; noActivity: number; escalated: number }): EChartsOption {
  const data = [
    { value: report.onTrack, name: 'On Track', itemStyle: { color: CHART_COLORS['on-track'] } },
    { value: report.waitingOnClient, name: 'Waiting on Client', itemStyle: { color: CHART_COLORS['waiting-on-client'] } },
    { value: report.needsAction, name: 'Needs Attention', itemStyle: { color: CHART_COLORS['needs-coe-action'] } },
    { value: report.escalated, name: 'Escalated', itemStyle: { color: CHART_COLORS['escalated'] } },
    { value: report.noActivity, name: 'No Activity', itemStyle: { color: CHART_COLORS['no-activity'] } },
  ].filter(d => d.value > 0)

  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { show: false },
    series: [{
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}\n{c}',
        fontSize: 11,
        color: '#e2e8f0',
        overflow: 'truncate',
        width: 100,
      },
      labelLine: {
        show: true,
        length: 15,
        length2: 12,
        lineStyle: { color: '#475569' },
      },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' }, scaleSize: 4 },
      data,
    }],
  }
}

function buildLeadBarOption(leadGroups: PositionAttentionLeadGroup[]): EChartsOption {
  // Sort by total positions descending for chart
  const sorted = [...leadGroups].sort((a, b) => b.totalPositions - a.totalPositions).slice(0, 10)
  const categories = sorted.map(g => g.leadName)

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      data: ['On Track', 'Waiting on Client', 'Needs Attention', 'Escalated', 'No Activity'],
      textStyle: { fontSize: 10, color: '#94a3b8' },
    },
    grid: { left: 120, right: 30, top: 40, bottom: 10 },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: categories, inverse: true, axisLabel: { fontSize: 11, color: '#cbd5e1' } },
    series: [
      { name: 'On Track', type: 'bar', stack: 'total', data: sorted.map(g => g.onTrack), color: CHART_COLORS['on-track'] },
      { name: 'Waiting on Client', type: 'bar', stack: 'total', data: sorted.map(g => g.waitingOnClient), color: CHART_COLORS['waiting-on-client'] },
      { name: 'Needs Attention', type: 'bar', stack: 'total', data: sorted.map(g => g.needsAction), color: CHART_COLORS['needs-coe-action'] },
      { name: 'Escalated', type: 'bar', stack: 'total', data: sorted.map(g => g.escalated), color: CHART_COLORS['escalated'] },
      { name: 'No Activity', type: 'bar', stack: 'total', data: sorted.map(g => g.noActivity), color: CHART_COLORS['no-activity'] },
    ],
  }
}

// ── Main Component ────────────────────────────────────────

export default function ResponsivenessReport() {
  const {
    report,
    generating,
    progress,
    error,
    generateReport,
    filteredPositions,
    filteredLeadGroups,
    filteredSummary,
    search,
    leadFilter,
    coeFilter,
    stateFilter,
    setSearch,
    setLeadFilter,
    setCoeFilter,
    setStateFilter,
    filterOptions,
    expandedGroups,
    toggleGroup,
    candidateCache,
    loadingCandidates,
  } = useResponsivenessReport()

  const [showEmailModal, setShowEmailModal] = useState(false)

  // Build email data from report
  const emailOutput = useMemo(() => {
    if (!report) return null
    return generatePositionAttentionEmailHtml(report)
  }, [report])

  // ── State A: Empty (no report generated) ──
  if (!report && !generating && !error) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="glass-panel rounded-2xl p-10 max-w-lg text-center space-y-6 border border-white/5">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-[#304FF3]/10 flex items-center justify-center">
              <BrainCircuit className="w-8 h-8 text-[#304FF3]" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-primary">COE Position Attention Report</h2>
            <p className="text-sm text-muted mt-2">
              Generate a comprehensive AI-powered analysis of all active open positions to identify which ones need COE attention.
            </p>
          </div>
          <div className="text-left space-y-2 px-4">
            <div className="flex items-start gap-2 text-xs text-muted">
              <ChevronRight className="w-3 h-3 text-[#304FF3] mt-0.5 shrink-0" />
              <span>AI classifies each position's attention state based on discussion analysis</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted">
              <ChevronRight className="w-3 h-3 text-[#304FF3] mt-0.5 shrink-0" />
              <span>Groups positions by COE Practice Lead ownership</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted">
              <ChevronRight className="w-3 h-3 text-[#304FF3] mt-0.5 shrink-0" />
              <span>Surfaces positions needing immediate action with priority</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted">
              <ChevronRight className="w-3 h-3 text-[#304FF3] mt-0.5 shrink-0" />
              <span>Auto-escalates stale "Waiting on Client" positions after 7 days</span>
            </div>
          </div>
          <button
            onClick={generateReport}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#304FF3] hover:bg-[#304FF3]/90 text-white font-medium text-sm transition-colors shadow-lg shadow-[#304FF3]/20"
          >
            <Sparkles className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error && !generating) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="glass-panel rounded-2xl p-8 max-w-md text-center space-y-4 border border-red-500/20">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-sm text-red-300">{error}</p>
          <button onClick={generateReport} className="text-sm text-[#304FF3] hover:text-[#304FF3]/80 transition-colors">
            Try again
          </button>
        </div>
      </div>
    )
  }

  // ── State B: Generating (progress modal covers while generating) ──
  // ── State C: Report Dashboard ──

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Progress modal overlay */}
      <AiAnalysisModal open={generating} progress={progress} />

      {/* Email modal */}
      {emailOutput && (
        <EmailPreviewModal
          open={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          html={emailOutput.html}
          plainText={emailOutput.plainText}
        />
      )}

      {/* If we're generating and don't have a report yet, show the empty generating state */}
      {generating && !report ? (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-muted">Generating report…</p>
        </div>
      ) : report ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-primary flex items-center gap-2">
                <Target className="w-5 h-5 text-[#304FF3]" /> COE Position Attention Report
              </h1>
              <p className="text-xs text-muted mt-1">
                Last generated {new Date(report.generatedAt).toLocaleString()} · {report.totalPositions} positions analyzed
              </p>
            </div>
            <div className="flex items-center gap-2">
              {emailOutput && (
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted hover:text-primary bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Export Email
                </button>
              )}
              <button
                onClick={generateReport}
                disabled={generating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted hover:text-primary bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="flex items-center gap-3 flex-wrap">
            <SummaryCard
              label="Total Active"
              value={report.totalPositions}
              active={stateFilter === 'all'}
              onClick={() => setStateFilter('all')}
            />
            <SummaryCard
              label="Needs Attention"
              value={report.needsAction}
              Icon={Bell}
              active={stateFilter === 'needs-coe-action'}
              onClick={() => setStateFilter(stateFilter === 'needs-coe-action' ? 'all' : 'needs-coe-action')}
            />
            <SummaryCard
              label="Escalated"
              value={report.escalated}
              Icon={ArrowUpCircle}
              active={stateFilter === 'escalated'}
              onClick={() => setStateFilter(stateFilter === 'escalated' ? 'all' : 'escalated')}
            />
            <SummaryCard
              label="Waiting Client"
              value={report.waitingOnClient}
              Icon={Clock}
              active={stateFilter === 'waiting-on-client'}
              onClick={() => setStateFilter(stateFilter === 'waiting-on-client' ? 'all' : 'waiting-on-client')}
            />
            <SummaryCard
              label="On Track"
              value={report.onTrack}
              Icon={TrendingUp}
              active={stateFilter === 'on-track'}
              onClick={() => setStateFilter(stateFilter === 'on-track' ? 'all' : 'on-track')}
            />
            <SummaryCard
              label="No Activity"
              value={report.noActivity}
              Icon={Minus}
              active={stateFilter === 'no-activity'}
              onClick={() => setStateFilter(stateFilter === 'no-activity' ? 'all' : 'no-activity')}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Donut chart */}
            <div className="glass-panel rounded-xl p-4 border border-white/5">
              <h3 className="text-sm font-medium text-primary mb-2">Attention State Distribution</h3>
              <EChart option={buildDonutOption(report)} height={260} />
            </div>

            {/* Horizontal stacked bar */}
            <div className="glass-panel rounded-xl p-4 border border-white/5">
              <h3 className="text-sm font-medium text-primary mb-2">Positions by Lead</h3>
              <EChart option={buildLeadBarOption(report.leadGroups)} height={260} />
            </div>
          </div>

          {/* Filters toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search positions…"
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm bg-white/[0.03] border border-white/5 text-primary placeholder:text-muted/50 focus:outline-none focus:border-[#304FF3]/30"
              />
            </div>

            {/* Lead filter */}
            <select
              value={leadFilter}
              onChange={e => setLeadFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm bg-white/[0.03] border border-white/5 text-primary focus:outline-none focus:border-[#304FF3]/30"
            >
              <option value="all">All Leads</option>
              {filterOptions.leads.map(l => (
                <option key={l.email} value={l.email}>{l.name}</option>
              ))}
            </select>

            {/* COE filter */}
            <select
              value={coeFilter}
              onChange={e => setCoeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm bg-white/[0.03] border border-white/5 text-primary focus:outline-none focus:border-[#304FF3]/30"
            >
              <option value="all">All COEs</option>
              {filterOptions.coes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Clear filters */}
            {(search || leadFilter !== 'all' || coeFilter !== 'all' || stateFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setLeadFilter('all'); setCoeFilter('all'); setStateFilter('all') }}
                className="text-xs text-[#304FF3] hover:text-[#304FF3]/80 transition-colors"
              >
                Clear filters
              </button>
            )}

            <span className="text-xs text-muted ml-auto">
              {filteredPositions.length} position{filteredPositions.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Lead groups */}
          <div className="space-y-4">
            {filteredLeadGroups.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted">No positions match the current filters.</p>
              </div>
            ) : (
              filteredLeadGroups.map(group => (
                <LeadSection
                  key={group.leadEmail}
                  group={group}
                  expandedGroups={expandedGroups}
                  onTogglePosition={toggleGroup}
                  candidateCache={candidateCache}
                  loadingCandidates={loadingCandidates}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
