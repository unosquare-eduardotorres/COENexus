import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, Workflow, Sparkles, Brain, ArrowRight, Users, TrendingUp, Shield, FileSearch, Loader2, AlertTriangle } from 'lucide-react'
import { AGENT_IMAGES } from '../../assets'
import { braniacService } from '../../services/braniacService'

const images = AGENT_IMAGES['braniac']

const PIPELINE_STEPS = [
  {
    num: '①',
    title: 'Aggregate',
    desc: 'Collects all historical positions and candidates for the selected account, including rates, countries, seniorities, rejection reasons, and salary bands.',
  },
  {
    num: '②',
    title: 'Analyze',
    desc: 'Sends the aggregated data to Claude AI with a structured prompt to identify patterns across rate acceptance, geography, seniority, decision speed, and rejection themes.',
  },
  {
    num: '③',
    title: 'Infer',
    desc: 'Extracts structured patterns (with confidence scores based on data point count) and stakeholder profiles (rate floors/ceilings, country preferences, hiring speed).',
  },
  {
    num: '④',
    title: 'Review',
    desc: 'High-confidence patterns (≥0.8, ≥15 data points) are auto-applied; others go to pending review for human approval.',
  },
]

const OUTPUTS = [
  {
    icon: Users,
    title: 'Stakeholder Profiles',
    desc: 'Per-stakeholder rate ranges, accepted/rejected countries, seniority flexibility, decision speed, and preference summaries.',
  },
  {
    icon: TrendingUp,
    title: 'Learned Patterns',
    desc: 'Data-driven rules like "Account X rejects candidates below $X/hr" or "Stakeholder Y prefers Senior-level from LATAM".',
  },
  {
    icon: Shield,
    title: 'Confidence Scoring',
    desc: 'Every pattern has a confidence score (0–1) based on sample size: 3–5 points → low, 6–14 → moderate, 15+ → high.',
  },
]

const DATA_SOURCES = [
  'Synced open positions (from upstream HR API)',
  'Candidate submission history (rates, statuses, feedback)',
  'Salary band reference data',
  'Rejection feedback catalog',
  'Country & seniority metadata',
]

export default function BraniacHomeTab() {
  const navigate = useNavigate()
  const [extractionStatus, setExtractionStatus] = useState<{ total: number; extracted: number; pending: number } | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionResult, setExtractionResult] = useState<{ extracted: number; failed: number } | null>(null)

  const loadExtractionStatus = useCallback(async () => {
    try {
      const result = await braniacService.getExtractionStatus()
      if (result.success && result.data) {
        setExtractionStatus(result.data)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadExtractionStatus()
  }, [loadExtractionStatus])

  const handleExtract = async () => {
    setIsExtracting(true)
    setExtractionResult(null)
    try {
      const result = await braniacService.extractResumeSkills({ limit: 500 })
      if (result.success && result.data) {
        setExtractionResult({ extracted: result.data.extracted, failed: result.data.failed })
      }
      await loadExtractionStatus()
    } catch { /* ignore */ } finally {
      setIsExtracting(false)
    }
  }

  const coveragePct = extractionStatus && extractionStatus.total > 0
    ? Math.round((extractionStatus.extracted / extractionStatus.total) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="relative w-full overflow-hidden rounded-2xl">
        <img
          src={images.banner}
          alt="Braniac banner"
          className="w-full h-auto object-contain"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white/70 dark:from-dark-bg/80 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-5 flex items-end gap-3">
          <img
            src={images.avatar}
            alt="Braniac"
            className="h-16 w-16 rounded-xl object-cover border-2 border-white/50 dark:border-dark-border/50 shadow-lg"
          />
          <div>
            <h1 className="text-2xl font-bold text-primary">Braniac</h1>
            <p className="text-sm text-secondary">Recruitment Intelligence Agent</p>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Brain size={20} className="text-violet-500 dark:text-violet-400" />
          <h2 className="text-lg font-semibold text-primary">What is Braniac?</h2>
        </div>
        <p className="text-sm text-secondary leading-relaxed">
          Braniac is an AI-powered recruitment intelligence agent that analyzes historical hiring data
          to infer stakeholder preferences, rate patterns, and hiring behaviors. It processes your synced
          account data through Claude AI to surface actionable patterns that help recruiters make better
          placement decisions.
        </p>
      </div>

      <div className="glass-panel p-6 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Database size={20} className="text-violet-500 dark:text-violet-400" />
          <h2 className="text-lg font-semibold text-primary">Data Sources</h2>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DATA_SOURCES.map(src => (
            <li key={src} className="flex items-start gap-2 text-sm text-secondary">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-400 dark:bg-violet-500 flex-shrink-0" />
              {src}
            </li>
          ))}
        </ul>
      </div>

      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Workflow size={20} className="text-violet-500 dark:text-violet-400" />
          <h2 className="text-lg font-semibold text-primary">How It Works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PIPELINE_STEPS.map(step => (
            <div key={step.num} className="glass-card p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{step.num}</span>
                <h3 className="text-sm font-semibold text-primary">{step.title}</h3>
              </div>
              <p className="text-xs text-secondary leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-violet-500 dark:text-violet-400" />
          <h2 className="text-lg font-semibold text-primary">What You Get</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {OUTPUTS.map(out => (
            <div key={out.title} className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <out.icon size={16} className="text-violet-500 dark:text-violet-400" />
                <h3 className="text-sm font-semibold text-primary">{out.title}</h3>
              </div>
              <p className="text-xs text-secondary leading-relaxed">{out.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {extractionStatus && (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <FileSearch size={20} className="text-violet-500 dark:text-violet-400" />
            <h2 className="text-lg font-semibold text-primary">Resume Skill Extraction</h2>
          </div>
          <p className="text-sm text-secondary leading-relaxed">
            Extract structured skill profiles from candidate resumes using AI. These profiles replace
            the inaccurate requisition-tagged skills with actual resume-derived tech stacks, improving
            Braniac&apos;s pattern accuracy.
          </p>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-secondary mb-1">
                <span>{extractionStatus.extracted.toLocaleString()} / {extractionStatus.total.toLocaleString()} resumes parsed</span>
                <span>{coveragePct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-dark-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-300"
                  style={{ width: `${coveragePct}%` }}
                />
              </div>
            </div>
          </div>

          {coveragePct < 50 && extractionStatus.total > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Braniac skill analysis quality is limited — only {coveragePct}% of candidate resumes have been parsed.
                Run extraction to improve pattern accuracy.
              </p>
            </div>
          )}

          {extractionResult && (
            <div className="text-xs text-secondary">
              Last run: {extractionResult.extracted} extracted{extractionResult.failed > 0 ? `, ${extractionResult.failed} failed` : ''}
            </div>
          )}

          <button
            onClick={handleExtract}
            disabled={isExtracting || extractionStatus.pending === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors shadow-sm"
          >
            {isExtracting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <FileSearch size={14} />
                {extractionStatus.pending > 0
                  ? `Extract Resume Skills (${extractionStatus.pending.toLocaleString()} pending)`
                  : 'All Resumes Parsed'}
              </>
            )}
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('pipeline')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors shadow-sm"
        >
          Go to Pipeline
          <ArrowRight size={15} />
        </button>
        <button
          onClick={() => navigate('patterns')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg glass-button text-sm font-medium transition-colors"
        >
          View Patterns
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
