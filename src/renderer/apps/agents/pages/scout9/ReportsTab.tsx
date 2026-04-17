import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, FileText } from 'lucide-react'
import ReportRenderer from '../../components/scout9/ReportRenderer'
import { createRendererLogger } from '../../../../shared/utils/rendererLogger'

const log = createRendererLogger('Scout9ReportsTab')

interface ReportSummary {
  id: string
  job_id: string
  report_title: string
  status: string
  confidence_score: number | null
  created_at: string
}

interface ReportCandidate {
  id: string
  title: string
  details: string
  source_ref: string
  status: 'pending' | 'approved' | 'rejected' | 'skipped'
  confidence_score: number | null
  metadata_json: string
}

interface ReportDetail {
  report: ReportSummary & { report_markdown: string }
  candidates: ReportCandidate[]
}

export default function ReportsTab() {
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    log.info('Scout-9 reports tab viewed')
    loadReports()
  }, [])

  async function loadReports() {
    setLoading(true)
    try {
      const result = await window.api?.scout9?.listReports?.()
      if (result?.success && result.data) {
        log.info('Scout-9 reports loaded', { count: result.data.length })
        setReports(result.data as ReportSummary[])
      }
    } catch (error) {
      log.error('Scout-9 reports load failed', error)
    } finally {
      setLoading(false)
    }
  }

  async function selectReport(id: string) {
    try {
      const result = await window.api?.scout9?.getReport?.(id)
      if (result?.success && result.data) {
        log.info('Scout-9 report selected', { reportId: id })
        setSelectedReport(result.data as ReportDetail)
      }
    } catch (error) {
      log.error('Scout-9 report load failed', error)
    }
  }

  const handleUpdateCandidate = useCallback(async (id: string, status: string) => {
    try {
      await window.api?.scout9?.updateCandidate?.({ id, status })
      log.info('Scout-9 candidate status updated', { candidateId: id, status })
      if (selectedReport) {
        setSelectedReport({
          ...selectedReport,
          candidates: selectedReport.candidates.map(c =>
            c.id === id ? { ...c, status: status as ReportCandidate['status'] } : c
          ),
        })
      }
    } catch (error) {
      log.error('Scout-9 candidate status update failed', error)
    }
  }, [selectedReport])

  const handleSubmitSkip = useCallback(async (candidateId: string, reason: string, scope: string) => {
    try {
      await window.api?.scout9?.submitSkip?.({ candidate_id: candidateId, reason, notes: scope })
      log.info('Scout-9 candidate skip submitted', { candidateId, reason })
    } catch (error) {
      log.error('Scout-9 candidate skip submit failed', error)
    }
  }, [])

  if (selectedReport) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => {
            log.info('Scout-9 report detail closed')
            setSelectedReport(null)
          }}
          className="text-xs text-secondary hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          Back to reports
        </button>
        <ReportRenderer
          report={selectedReport.report}
          candidates={selectedReport.candidates}
          onUpdateCandidate={handleUpdateCandidate}
          onSubmitSkip={handleSubmitSkip}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-primary">Scout-9 Reports</h3>
        </div>
        <p className="text-xs text-secondary mt-1">View and act on Scout-9 analysis reports.</p>
      </div>

      {loading && (
        <div className="glass-panel p-8 text-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted mt-2">Loading reports...</p>
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div className="glass-panel p-8 text-center">
          <FileText size={24} className="mx-auto text-muted mb-2" />
          <p className="text-xs text-muted">No reports yet. Run the pipeline to generate your first report.</p>
        </div>
      )}

      {!loading && reports.length > 0 && (
        <div className="glass-panel overflow-hidden rounded-xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 dark:border-dark-border/30">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">Title</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">Score</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">Date</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr
                  key={report.id}
                  onClick={() => selectReport(report.id)}
                  className="border-b border-white/5 dark:border-dark-border/20 hover:bg-white/30 dark:hover:bg-dark-hover/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-xs font-medium text-primary">{report.report_title}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      report.status === 'published' ? 'bg-green-500/15 text-green-400' :
                      report.status === 'draft' ? 'bg-gray-400/15 text-gray-400' :
                      'bg-amber-500/15 text-amber-400'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-secondary font-mono">
                    {report.confidence_score !== null ? `${report.confidence_score}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{new Date(report.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
