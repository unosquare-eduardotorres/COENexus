import { useState, useEffect } from 'react';
import type { CatalogSkill } from '../../../../shared/ipc-types';

interface SkillFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  editingSkill?: CatalogSkill | null;
}

export default function SkillFormModal({ isOpen, onClose, onSave, editingSkill }: SkillFormModalProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!editingSkill;

  useEffect(() => {
    if (isOpen) {
      setName(editingSkill?.name ?? '');
      setError('');
      setSaving(false);
    }
  }, [isOpen, editingSkill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card w-full max-w-md rounded-xl border border-white/10 p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-4">
          {isEdit ? 'Edit Skill' : 'New Skill'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="e.g. React, Python, AWS"
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-colors"
            />
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
          </div>

          {isEdit && editingSkill?.practices && editingSkill.practices.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Belongs to Practices</label>
              <div className="flex flex-wrap gap-1">
                {editingSkill.practices.map(p => (
                  <span key={p.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    {p.name}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-slate-500">Practice assignments are managed from the Practice editor.</p>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
