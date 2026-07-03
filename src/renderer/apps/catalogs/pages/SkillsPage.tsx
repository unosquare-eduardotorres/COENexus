import { useState, useEffect, useCallback } from 'react';
import type { CatalogSkill } from '../../../../shared/ipc-types';
import { catalogService } from '../services/catalogService';
import CatalogTable from '../components/CatalogTable';
import type { Column } from '../components/CatalogTable';
import RelationshipBadges from '../components/RelationshipBadges';
import SkillFormModal from '../components/SkillFormModal';

const columns: Column<CatalogSkill>[] = [
  {
    key: 'name',
    label: 'Name',
    render: item => <span className="font-medium">{item.name}</span>,
    sortKey: item => item.name.toLowerCase(),
  },
  {
    key: 'practices',
    label: 'Practices',
    render: item => <RelationshipBadges items={item.practices} emptyText="Unassigned" />,
    sortKey: item => item.practices.length,
  },
  {
    key: 'sort_order',
    label: 'Order',
    render: item => <span className="text-slate-400 font-mono text-xs">{item.sort_order}</span>,
    sortKey: item => item.sort_order,
  },
];

export default function SkillsPage() {
  const [skills, setSkills] = useState<CatalogSkill[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<CatalogSkill | null>(null);

  const loadSkills = useCallback(async () => {
    const data = await catalogService.getSkills();
    setSkills(data);
  }, []);

  useEffect(() => { loadSkills(); }, [loadSkills]);

  const handleAdd = () => {
    setEditingSkill(null);
    setModalOpen(true);
  };

  const handleEdit = (skill: CatalogSkill) => {
    setEditingSkill(skill);
    setModalOpen(true);
  };

  const handleSave = async (name: string) => {
    if (editingSkill) {
      await catalogService.updateSkill(editingSkill.id, { name });
    } else {
      await catalogService.createSkill(name);
    }
    await loadSkills();
  };

  const handleToggle = async (skill: CatalogSkill) => {
    await catalogService.toggleSkill(skill.id);
    await loadSkills();
  };

  return (
    <div className="max-w-5xl mx-auto">
      <CatalogTable
        items={skills}
        columns={columns}
        searchValue={search}
        onSearchChange={setSearch}
        onEdit={handleEdit}
        onToggleActive={handleToggle}
        onAdd={handleAdd}
        title="Skills"
        addLabel="Add Skill"
      />

      <SkillFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editingSkill={editingSkill}
      />
    </div>
  );
}
