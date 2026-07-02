import { useState, useEffect } from 'react';
import type { CatalogPractice, CatalogSkill } from '../../../../shared/ipc-types';
import { catalogService } from '../services/catalogService';

interface PracticeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  editingPractice?: CatalogPractice | null;
}

export default function PracticeFormModal({ isOpen, onClose, onSave, editingPractice }: PracticeFormModalProps) {
  const [name, setName] = useState('');
  const [allSkills, setAllSkills] = useState<CatalogSkill[]>([]);
  const [assignedSkillIds, setAssignedSkillIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!editingPractice;

  useEffect(() => {
    if (isOpen) {
      setName(editingPractice?.name ?? '');
      setError('');
      setSaving(false);
      setAssignedSkillIds(new Set(editingPractice?.skills?.map(s => s.id) ?? []));

      catalogService.getSkills().then(setAllSkills);
    }
  }, [isOpen, editingPractice]);

  const toggleSkill = (skillId: number) => {
    setAssignedSkillIds(prev => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
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
      let practiceId: number;
      if (isEdit) {
        await catalogService.updatePractice(editingPractice!.id, { name: trimmed });
        practiceId = editingPractice!.id;
      } else {
        const created = await catalogService.createPractice(trimmed);
        practiceId = created.id;
      }

      // Sync skill assignments
      const currentSkillIds = new Set(editingPractice?.skills?.map(s => s.id) ?? []);

      // Add new assignments
      for (const skillId of assignedSkillIds) {
        if (!currentSkillIds.has(skillId)) {
          await catalogService.addSkillToPractice(practiceId, skillId);
        }
      }
      // Remove old assignments
      for (const skillId of currentSkillIds) {
        if (!assignedSkillIds.has(skillId)) {
          await catalogService.removeSkillFromPractice(practiceId, skillId);
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

  const activeSkills = allSkills.filter(s => s.is_active);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card w-full max-w-lg rounded-xl border border-white/10 p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-4">
          {isEdit ? 'Edit Practice' : 'New Practice'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="e.g. JavaScript, .NET, Cloud"
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-colors"
            />
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
          </div>

          {/* Skill assignments */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Skills ({assignedSkillIds.size} selected)
            </label>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02] p-2 space-y-0.5">
              {activeSkills.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-2">No skills available. Create skills first.</p>
              ) : (
                activeSkills.map(skill => (
                  <label
                    key={skill.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={assignedSkillIds.has(skill.id)}
                      onChange={() => toggleSkill(skill.id)}
                      className="rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50 focus:ring-offset-0"
                    />
                    <span className="text-sm text-slate-200">{skill.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Parent COEs (read-only) */}
          {isEdit && editingPractice?.coes && editingPractice.coes.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Parent COEs</label>
              <div className="flex flex-wrap gap-1">
                {editingPractice.coes.map(c => (
                  <span key={c.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    {c.name}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-slate-500">COE assignments are managed from the COE editor.</p>
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
