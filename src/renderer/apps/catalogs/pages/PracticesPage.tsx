import { useState, useEffect, useCallback } from 'react';
import type { CatalogPractice, PLBPracticeLeadRow } from '../../../../shared/ipc-types';
import { catalogService } from '../services/catalogService';
import CatalogTable from '../components/CatalogTable';
import type { Column } from '../components/CatalogTable';
import RelationshipBadges from '../components/RelationshipBadges';
import PracticeFormModal from '../components/PracticeFormModal';

function buildColumns(practiceLeads: PLBPracticeLeadRow[]): Column<CatalogPractice>[] {
  const leadByPracticeId = new Map<number, PLBPracticeLeadRow>();
  for (const lead of practiceLeads) {
    if (lead.practice_id !== null) leadByPracticeId.set(lead.practice_id, lead);
  }

  return [
    {
      key: 'name',
      label: 'Name',
      render: item => <span className="font-medium">{item.name}</span>,
      sortKey: item => item.name.toLowerCase(),
    },
    {
      key: 'lead',
      label: 'Lead',
      render: item => {
        const lead = leadByPracticeId.get(item.id);
        return lead
          ? <span className="text-slate-200">{lead.display_name}</span>
          : <span className="text-amber-400 italic">Unassigned</span>;
      },
      sortKey: item => {
        const lead = leadByPracticeId.get(item.id);
        return lead?.display_name?.toLowerCase() ?? 'zzz';
      },
    },
    {
      key: 'coes',
      label: 'COEs',
      render: item => <RelationshipBadges items={item.coes} emptyText="Unassigned" />,
      sortKey: item => item.coes.length,
    },
    {
      key: 'skills',
      label: 'Skills',
      render: item => <RelationshipBadges items={item.skills} emptyText="None" />,
      sortKey: item => item.skills.length,
    },
    {
      key: 'sort_order',
      label: 'Order',
      render: item => <span className="text-slate-400 font-mono text-xs">{item.sort_order}</span>,
      sortKey: item => item.sort_order,
    },
  ];
}

export default function PracticesPage() {
  const [practices, setPractices] = useState<CatalogPractice[]>([]);
  const [practiceLeads, setPracticeLeads] = useState<PLBPracticeLeadRow[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPractice, setEditingPractice] = useState<CatalogPractice | null>(null);

  const loadPractices = useCallback(async () => {
    const [data, leads] = await Promise.all([
      catalogService.getPractices(),
      window.api.practiceLeadBonus.getPracticeLeads(),
    ]);
    setPractices(data);
    setPracticeLeads(leads);
  }, []);

  useEffect(() => { loadPractices(); }, [loadPractices]);

  const handleAdd = () => {
    setEditingPractice(null);
    setModalOpen(true);
  };

  const handleEdit = (practice: CatalogPractice) => {
    setEditingPractice(practice);
    setModalOpen(true);
  };

  const handleToggle = async (practice: CatalogPractice) => {
    await catalogService.togglePractice(practice.id);
    await loadPractices();
  };

  return (
    <div className="max-w-5xl mx-auto">
      <CatalogTable
        items={practices}
        columns={buildColumns(practiceLeads)}
        searchValue={search}
        onSearchChange={setSearch}
        onEdit={handleEdit}
        onToggleActive={handleToggle}
        onAdd={handleAdd}
        title="Practices"
        addLabel="Add Practice"
      />

      <PracticeFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={loadPractices}
        editingPractice={editingPractice}
      />
    </div>
  );
}
