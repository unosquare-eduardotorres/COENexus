import { useState, useEffect } from 'react';
import type { CatalogCoe, CatalogPractice } from '../../../../shared/ipc-types';
import { catalogService } from '../services/catalogService';

interface CoeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  editingCoe?: CatalogCoe | null;
}

export default function CoeFormModal({ isOpen, onClose, onSave, editingCoe }: CoeFormModalProps) {
  const [name, setName] = useState('');
  const [allPractices, setAllPractices] = useState<CatalogPractice[]>([]);
  const [assignedPracticeIds, setAssignedPracticeIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!editingCoe;

  useEffect(() => {
    if (isOpen) {
      setName(editingCoe?.name ?? '');
      setError('');
      setSaving(false);
      setAssignedPracticeIds(new Set(editingCoe?.practices?.map(p => p.id) ?? []));

      catalogService.getPractices().then(setAllPractices);
    }
  }, [isOpen, editingCoe]);

  const togglePractice = (practiceId: number) => {
    setAssignedPracticeIds(prev => {
      const next = new Set(prev);
      if (next.has(practiceId)) {
        next.delete(practiceId);
      } else {
        next.add(practiceId);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    try {
      let coeId: number;
      if (isEdit) {
        await catalogService.updateCoe(editingCoe!.id, { name: trimmed });
        coeId = editingCoe!.id;
      } else {
        const created = await catalogService.createCoe(trimmed);
        coeId = created.id;
      }

      // Sync practice assignments
      const currentPracticeIds = new Set(editingCoe?.practices?.map(p => p.id) ?? []);

      // Add new assignments
      for (const practiceId of assignedPracticeIds) {
        if (!currentPracticeIds.has(practiceId)) {
          await catalogService.addPracticeToCoe(coeId, practiceId);
        }
      }
      // Remove old assignments
      for (const practiceId of currentPracticeIds) {
        if (!assignedPracticeIds.has(practiceId)) {
          await catalogService.removePracticeFromCoe(coeId, practiceId);
        }
      }

      await onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const activePractices = allPractices.filter(p => p.is_active);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card w-full max-w-lg rounded-xl border border-white/10 p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-4">
          {isEdit ? 'Edit Center of Excellence' : 'New Center of Excellence'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Software Engineering, Data & AI"
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-colors"
            />
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
          </div>

          {/* Practice assignments */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Practices ({assignedPracticeIds.size} selected)
            </label>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02] p-2 space-y-0.5">
              {activePractices.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-2">No practices available. Create practices first.</p>
              ) : (
                activePractices.map(practice => (
                  <label
                    key={practice.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={assignedPracticeIds.has(practice.id)}
                      onChange={() => togglePractice(practice.id)}
                      className="rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50 focus:ring-offset-0"
                    />
                    <span className="text-sm text-slate-200">{practice.name}</span>
                    {practice.skills.length > 0 && (
                      <span className="text-[10px] text-slate-500 ml-auto">
                        {practice.skills.length} skill{practice.skills.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

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
