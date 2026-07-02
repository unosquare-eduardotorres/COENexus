import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CatalogCoe } from '../../../../shared/ipc-types';
import { catalogService } from '../services/catalogService';

interface Stats {
  coes: { active: number; total: number };
  practices: { active: number; total: number };
  skills: { active: number; total: number };
}

function StatCard({ label, active, total, onClick }: { label: string; active: number; total: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass-card rounded-xl border border-white/10 p-5 text-left hover:border-purple-500/30 transition-colors group"
    >
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-3xl font-bold text-white group-hover:text-purple-300 transition-colors">{active}</p>
      <p className="text-xs text-slate-500 mt-1">
        {active} active of {total} total
      </p>
    </button>
  );
}

function HierarchyTree({ coes }: { coes: CatalogCoe[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (coes.length === 0) {
    return (
      <div className="glass-card rounded-xl border border-white/10 p-8 text-center">
        <p className="text-slate-500">No catalog data yet. Use the sidebar to create COEs, Practices, and Skills.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white">Hierarchy</h3>
        <p className="text-xs text-slate-500 mt-0.5">COE → Practice → Skill</p>
      </div>
      <div className="p-2">
        {coes.map(coe => {
          const isExpanded = expanded.has(coe.id);
          return (
            <div key={coe.id} className="mb-1">
              <button
                onClick={() => toggleExpand(coe.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-white/5 transition-colors"
              >
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  className={`text-slate-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
                <span className={`text-sm font-medium ${coe.is_active ? 'text-white' : 'text-slate-500 line-through'}`}>
                  {coe.name}
                </span>
                <span className="text-[10px] text-slate-500 ml-auto">
                  {coe.practices.length} practice{coe.practices.length !== 1 ? 's' : ''}
                </span>
              </button>

              {isExpanded && coe.practices.length > 0 && (
                <div className="ml-6 border-l border-white/5 pl-3 py-1 space-y-0.5">
                  {coe.practices.map(practice => (
                    <div key={practice.id} className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400/50 flex-shrink-0" />
                      {practice.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CatalogsHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [coes, setCoes] = useState<CatalogCoe[]>([]);

  const load = useCallback(async () => {
    const [coesData, practicesData, skillsData] = await Promise.all([
      catalogService.getCoes(),
      catalogService.getPractices(),
      catalogService.getSkills(),
    ]);
    setCoes(coesData);
    setStats({
      coes: { active: coesData.filter(c => c.is_active).length, total: coesData.length },
      practices: { active: practicesData.filter(p => p.is_active).length, total: practicesData.length },
      skills: { active: skillsData.filter(s => s.is_active).length, total: skillsData.length },
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Catalog Overview</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage the organizational backbone — COEs, Practices, and Skills.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard
          label="Centers of Excellence"
          active={stats.coes.active}
          total={stats.coes.total}
          onClick={() => navigate('/catalogs/coes')}
        />
        <StatCard
          label="Practices"
          active={stats.practices.active}
          total={stats.practices.total}
          onClick={() => navigate('/catalogs/practices')}
        />
        <StatCard
          label="Skills"
          active={stats.skills.active}
          total={stats.skills.total}
          onClick={() => navigate('/catalogs/skills')}
        />
      </div>

      {/* Hierarchy tree */}
      <HierarchyTree coes={coes} />
    </div>
  );
}
