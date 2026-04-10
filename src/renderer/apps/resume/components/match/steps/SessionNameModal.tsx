interface SessionNameModalProps {
  sessionName: string
  onSessionNameChange: (name: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export default function SessionNameModal({
  sessionName,
  onSessionNameChange,
  onConfirm,
  onCancel,
}: SessionNameModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative glass-panel rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h3 className="text-lg font-bold text-primary mb-1">Name This Search</h3>
        <p className="text-sm text-secondary mb-4">Give this session a name so you can find it later.</p>
        <input
          type="text"
          value={sessionName}
          onChange={(e) => onSessionNameChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
          className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          placeholder="e.g., Senior React Developer — March 2026"
          autoFocus
        />
        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-muted hover:text-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 transition-all"
          >
            Start Search
          </button>
        </div>
      </div>
    </div>
  )
}
