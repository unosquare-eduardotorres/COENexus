import { useState, useEffect, useCallback } from 'react'
import type { MailMaskedConfig, MailSmtpConfig } from '../../../../shared/ipc-types'

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      configured
        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
        : 'bg-gray-100 dark:bg-gray-500/10 text-gray-500 dark:text-gray-400'
    }`}>
      {configured ? (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.828a1 1 0 101.415-1.414L11 9.586V6z" clipRule="evenodd" />
        </svg>
      )}
      {configured ? 'Configured' : 'Not Configured'}
    </span>
  )
}

export default function EmailSettingsPage() {
  const [existingConfig, setExistingConfig] = useState<MailMaskedConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [senderEmail, setSenderEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [appPassword, setAppPassword] = useState('')
  const [smtpHost, setSmtpHost] = useState('smtp-mail.outlook.com')
  const [smtpPort, setSmtpPort] = useState(587)
  const [useTls, setUseTls] = useState(true)
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  const loadConfig = useCallback(() => {
    setLoading(true)
    window.api.mail.getConfig()
      .then((config: MailMaskedConfig | null) => {
        setExistingConfig(config)
        if (config) {
          setSenderEmail(config.senderEmail)
          setDisplayName(config.displayName)
          setSmtpHost(config.smtpHost)
          setSmtpPort(config.smtpPort)
          setUseTls(config.useTls)
          setAppPassword('')
          setShowPasswordInput(false)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  function buildConfig(): MailSmtpConfig {
    return { senderEmail, displayName, appPassword, smtpHost, smtpPort, useTls }
  }

  async function handleTestConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.api.mail.testConnection(buildConfig())
      setTestResult(result)
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : String(err) })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveResult(null)
    setTestResult(null)
    try {
      await window.api.mail.saveConfig(buildConfig())
      setSaveResult({ success: true, message: 'Configuration saved successfully.' })
      loadConfig()
    } catch (err) {
      setSaveResult({ success: false, message: err instanceof Error ? err.message : String(err) })
    } finally {
      setSaving(false)
    }
  }

  async function handleClear() {
    try {
      await window.api.mail.clearConfig()
      setExistingConfig(null)
      setSenderEmail('')
      setDisplayName('')
      setAppPassword('')
      setSmtpHost('smtp-mail.outlook.com')
      setSmtpPort(587)
      setUseTls(true)
      setShowPasswordInput(false)
      setConfirmClear(false)
      setTestResult(null)
      setSaveResult(null)
    } catch {
      // silently fail
    }
  }

  function openExternal(url: string) {
    window.api.app.openExternal(url)
  }

  const canSave = senderEmail.trim() && (appPassword.trim() || (existingConfig?.passwordConfigured && !showPasswordInput)) && smtpHost.trim() && smtpPort > 0
  const canTest = senderEmail.trim() && appPassword.trim() && smtpHost.trim() && smtpPort > 0

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-lg font-semibold text-primary">Email Configuration</h1>
          <p className="text-xs text-muted mt-0.5">Configure your Outlook account to let Nexus send emails on your behalf.</p>
        </div>
        <div className="glass-card p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted">Loading email configuration...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Section A — Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Email Configuration</h1>
          <p className="text-xs text-muted mt-0.5">Configure your Outlook account to let Nexus send emails on your behalf.</p>
        </div>
        <StatusBadge configured={!!existingConfig} />
      </div>

      {/* Section B — Setup Guide */}
      <div className="glass-card border-l-[3px] border-accent-500">
        <button
          type="button"
          onClick={() => setGuideOpen(!guideOpen)}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📧</span>
            <div>
              <h2 className="text-sm font-semibold text-primary">How to set up Outlook email sending</h2>
              <p className="text-xs text-muted mt-0.5">Step-by-step guide to generate an App Password</p>
            </div>
          </div>
          <svg className={`w-4 h-4 text-muted transition-transform duration-200 ${guideOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {guideOpen && (
          <div className="px-5 pb-5 space-y-4 text-sm text-secondary">
            <p className="text-xs text-muted">
              Nexus uses an App Password to send emails from your personal Outlook account.
              App Passwords are special one-time passwords that let apps sign in without
              your main password or 2FA prompts.
            </p>

            <div className="bg-white/40 dark:bg-dark-hover/20 rounded-xl p-4 space-y-3">
              <div>
                <h3 className="text-xs font-semibold text-primary mb-1">Step 1 — Enable 2-Step Verification (if not already)</h3>
                <ol className="list-decimal list-inside text-xs text-muted space-y-0.5 ml-1">
                  <li>Go to{' '}
                    <button type="button" onClick={() => openExternal('https://account.microsoft.com/security')} className="text-accent-600 dark:text-accent-400 hover:underline">
                      account.microsoft.com/security
                    </button>
                  </li>
                  <li>Click &quot;Two-step verification&quot; → Turn on</li>
                  <li>Follow the prompts to complete setup</li>
                </ol>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-primary mb-1">Step 2 — Generate an App Password</h3>
                <ol className="list-decimal list-inside text-xs text-muted space-y-0.5 ml-1">
                  <li>Go to{' '}
                    <button type="button" onClick={() => openExternal('https://account.microsoft.com/security')} className="text-accent-600 dark:text-accent-400 hover:underline">
                      account.microsoft.com/security
                    </button>
                  </li>
                  <li>Click &quot;App passwords&quot; (under &quot;Additional security options&quot;)</li>
                  <li>Click &quot;Create a new app password&quot;</li>
                  <li>Microsoft will display a 16-character password (e.g. abcd-efgh-ijkl-mnop)</li>
                  <li>Copy it — you won&apos;t be able to see it again</li>
                </ol>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-primary mb-1">Step 3 — Enter your details below</h3>
                <ul className="list-disc list-inside text-xs text-muted space-y-0.5 ml-1">
                  <li><strong>Sender Email:</strong> your Outlook/Hotmail/Live email address</li>
                  <li><strong>App Password:</strong> paste the 16-character password from Step 2</li>
                  <li>The SMTP settings are pre-filled for Outlook — no changes needed</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-amber-50/60 dark:bg-amber-500/5 rounded-lg p-3">
              <span className="text-sm mt-0.5">💡</span>
              <p className="text-xs text-amber-800 dark:text-amber-400">
                <strong>Tip:</strong> App Passwords can be revoked anytime from your{' '}
                <button type="button" onClick={() => openExternal('https://account.microsoft.com/security')} className="underline hover:no-underline">
                  Microsoft account security page
                </button>
                {' '}if you no longer want Nexus to send emails.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Section C — Configuration Form */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-primary mb-1">Account Details</h2>
        <p className="text-xs text-muted mb-4">Your Outlook email address and App Password</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Sender Email <span className="text-red-400">*</span></label>
            <input
              type="email"
              value={senderEmail}
              onChange={e => setSenderEmail(e.target.value)}
              placeholder="you@outlook.com"
              className="glass-input w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your Name"
              className="glass-input w-full text-sm"
            />
            <p className="text-[10px] text-muted mt-1">Used as the &quot;From&quot; name in sent emails</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">App Password <span className="text-red-400">*</span></label>
            {existingConfig?.passwordConfigured && !showPasswordInput ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted font-mono tracking-widest">••••••••••••••••</span>
                <button
                  type="button"
                  onClick={() => setShowPasswordInput(true)}
                  className="text-xs text-accent-600 dark:text-accent-400 hover:underline"
                >
                  Change password
                </button>
              </div>
            ) : (
              <input
                type="password"
                value={appPassword}
                onChange={e => setAppPassword(e.target.value)}
                placeholder="abcd-efgh-ijkl-mnop"
                className="glass-input w-full text-sm font-mono"
              />
            )}
          </div>
        </div>

        <div className="minimal-divider my-6" />

        <h3 className="text-xs font-semibold text-secondary mb-1">SMTP Settings</h3>
        <p className="text-[10px] text-muted mb-4">Pre-configured for Outlook. Only change if using a different email provider.</p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">SMTP Host <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={smtpHost}
                onChange={e => setSmtpHost(e.target.value)}
                placeholder="smtp-mail.outlook.com"
                className="glass-input w-full text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">SMTP Port <span className="text-red-400">*</span></label>
              <input
                type="number"
                value={smtpPort}
                onChange={e => setSmtpPort(parseInt(e.target.value, 10) || 0)}
                className="glass-input w-full text-sm font-mono"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={useTls}
              onChange={e => setUseTls(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-accent-500 focus:ring-accent-500"
            />
            <span className="text-xs font-medium text-secondary">Use TLS (STARTTLS)</span>
          </label>
        </div>
      </div>

      {/* Test / Save result messages */}
      {testResult && (
        <div className={`glass-card p-4 border-l-2 ${testResult.success ? 'border-emerald-400' : 'border-red-400'}`}>
          <div className="flex items-center gap-2">
            {testResult.success ? (
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <p className={`text-sm ${testResult.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
              {testResult.message}
            </p>
          </div>
        </div>
      )}

      {saveResult && (
        <div className={`glass-card p-4 border-l-2 ${saveResult.success ? 'border-emerald-400' : 'border-red-400'}`}>
          <div className="flex items-center gap-2">
            {saveResult.success ? (
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <p className={`text-sm ${saveResult.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
              {saveResult.message}
            </p>
          </div>
        </div>
      )}

      {/* Section D — Actions Row */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={!canTest || testing}
          className="glass-button flex items-center gap-2 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {testing ? (
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
          {testing ? 'Testing...' : 'Test Connection'}
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent-500 hover:bg-accent-600 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>

        {existingConfig && (
          <>
            {confirmClear ? (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-muted">Are you sure?</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Yes, clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-1.5 text-xs font-medium text-muted hover:text-secondary rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="ml-auto px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
              >
                Clear Configuration
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
