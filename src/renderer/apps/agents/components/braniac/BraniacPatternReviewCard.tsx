import { useState } from 'react'
import { Lightbulb, CheckCircle2, Clock, XCircle, Check, X, Pencil } from 'lucide-react'
import type { BraniacPattern, BraniacApprovalStatus } from '../../../../../shared/ipc-types'

interface BraniacPatternReviewCardProps {
  pattern: BraniacPattern
  onApprove: (id: string) => Promise<void>
  onReject: (id: string, reason?: string) => Promise<void>
  onUpdate: (id: string, updates: { pattern_text?: string; confidence_score?: number }) => Promise<void>
}

function approvalBadge(status: BraniacApprovalStatus) {
  switch (status) {
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </span>
      )
    case 'auto_applied':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">
          <CheckCircle2 className="h-3 w-3" />
          Auto-applied
        </span>
      )
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">
          <XCircle className="h-3 w-3" />
          Rejected
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
          <Clock className="h-3 w-3" />
          Pending review
        </span>
      )
  }
}

function confidenceBar(score: number) {
  const pct = Math.round(score * 100)
  const color = score >= 0.9
    ? 'bg-green-500'
    : score >= 0.6
      ? 'bg-amber-500'
      : 'bg-red-400'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-dark-muted/30 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted tabular-nums">{pct}%</span>
    </div>
  )
}

export default function BraniacPatternReviewCard({
  pattern,
  onApprove,
  onReject,
  onUpdate,
}: BraniacPatternReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(pattern.pattern_text)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isActing, setIsActing] = useState(false)

  async function handleApprove() {
    setIsActing(true)
    try {
      await onApprove(pattern.id)
    } finally {
      setIsActing(false)
    }
  }

  async function handleRejectConfirm() {
    setIsActing(true)
    try {
      await onReject(pattern.id, rejectReason || undefined)
      setShowRejectModal(false)
      setRejectReason('')
    } finally {
      setIsActing(false)
    }
  }

  async function handleSaveEdit() {
    setIsActing(true)
    try {
      await onUpdate(pattern.id, { pattern_text: editText })
      setIsEditing(false)
    } finally {
      setIsActing(false)
    }
  }

  const isPending = pattern.approval_status === 'pending_review'

  return (
    <div className={`p-4 rounded-xl border space-y-3 transition-colors ${
      isPending
        ? 'bg-amber-50/30 dark:bg-amber-500/5 border-amber-200/50 dark:border-amber-500/20'
        : 'bg-gray-50/50 dark:bg-dark-surface/50 border-gray-100 dark:border-dark-border/30'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Lightbulb className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-primary">{pattern.pattern_name}</h3>
            {isEditing ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="glass-input w-full text-xs min-h-[80px] resize-y"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isActing || editText === pattern.pattern_text}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setIsEditing(false); setEditText(pattern.pattern_text) }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg glass-button text-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-secondary mt-0.5">{pattern.pattern_text}</p>
            )}
          </div>
        </div>
        {approvalBadge(pattern.approval_status)}
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div className="flex-1 max-w-[160px]">
          {confidenceBar(pattern.confidence_score)}
        </div>
        <span className="text-muted">{pattern.data_points_count} data points</span>
        {pattern.account && (
          <span className="text-muted">{pattern.account}</span>
        )}
        {pattern.stakeholder && (
          <span className="text-muted">{pattern.stakeholder}</span>
        )}
        <span className="text-muted">{pattern.source_agent}</span>
      </div>

      {isPending && !isEditing && !showRejectModal && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleApprove}
            disabled={isActing}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={isActing}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </button>
          <button
            onClick={() => setIsEditing(true)}
            disabled={isActing}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg glass-button text-secondary"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      )}

      {showRejectModal && (
        <div className="p-3 rounded-xl bg-red-50/50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20 space-y-2">
          <p className="text-xs font-medium text-red-700 dark:text-red-400">Rejection reason (optional):</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Why is this pattern being rejected?"
            className="glass-input w-full text-xs min-h-[60px] resize-y"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleRejectConfirm}
              disabled={isActing}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 transition-colors"
            >
              Confirm Reject
            </button>
            <button
              onClick={() => { setShowRejectModal(false); setRejectReason('') }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg glass-button text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
