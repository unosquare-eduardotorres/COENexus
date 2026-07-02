import { useState, useEffect, useCallback } from 'react';
import type { CatalogCoe } from '../../../../shared/ipc-types';
import { catalogService } from '../services/catalogService';
import CatalogTable from '../components/CatalogTable';
import type { Column } from '../components/CatalogTable';
import RelationshipBadges from '../components/RelationshipBadges';
import CoeFormModal from '../components/CoeFormModal';

const columns: Column<CatalogCoe>[] = [
  {
    key: 'name',
    label: 'Name',
    render: item => <span className="font-medium">{item.name}</span>,
    sortKey: item => item.name.toLowerCase(),
  },
  {
    key: 'practices',
    label: 'Practices',
    render: item => <RelationshipBadges items={item.practices} emptyText="None" />,
    sortKey: item => item.practices.length,
  },
  {
    key: 'sort_order',
    label: 'Order',
    render: item => <span className="text-slate-400 font-mono text-xs">{item.sort_order}</span>,
    sortKey: item => item.sort_order,
  },
];

export default function CoesPage() {
  const [coes, setCoes] = useState<CatalogCoe[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoe, setEditingCoe] = useState<CatalogCoe | null>(null);

  const loadCoes = useCallback(async () => {
    const data = await catalogService.getCoes();
    setCoes(data);
  }, []);

  useEffect(() => { loadCoes(); }, [loadCoes]);

  const handleAdd = () => {
    setEditingCoe(null);
    setModalOpen(true);
  };

  const handleEdit = (coe: CatalogCoe) => {
    setEditingCoe(coe);
    setModalOpen(true);
  };

  const handleToggle = async (coe: CatalogCoe) => {
    await catalogService.toggleCoe(coe.id);
    await loadCoes();
  };

  return (
    <div className="max-w-5xl mx-auto">
      <CatalogTable
        items={coes}
        columns={columns}
        searchValue={search}
        onSearchChange={setSearch}
        onEdit={handleEdit}
        onToggleActive={handleToggle}
        onAdd={handleAdd}
        title="Centers of Excellence"
        addLabel="Add COE"
      />

      <CoeFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={loadCoes}
        editingCoe={editingCoe}
      />
    </div>
  );
}
