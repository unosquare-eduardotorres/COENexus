import { useState, useEffect, useCallback } from 'react';
import type { CatalogPractice } from '../../../../shared/ipc-types';
import { catalogService } from '../services/catalogService';
import CatalogTable from '../components/CatalogTable';
import type { Column } from '../components/CatalogTable';
import RelationshipBadges from '../components/RelationshipBadges';
import PracticeFormModal from '../components/PracticeFormModal';

const columns: Column<CatalogPractice>[] = [
  {
    key: 'name',
    label: 'Name',
    render: item => <span className="font-medium">{item.name}</span>,
    sortKey: item => item.name.toLowerCase(),
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

export default function PracticesPage() {
  const [practices, setPractices] = useState<CatalogPractice[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPractice, setEditingPractice] = useState<CatalogPractice | null>(null);

  const loadPractices = useCallback(async () => {
    const data = await catalogService.getPractices();
    setPractices(data);
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
        columns={columns}
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
