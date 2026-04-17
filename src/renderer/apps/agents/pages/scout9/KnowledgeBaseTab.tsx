import { useEffect, useState } from 'react'
import { BookOpen, BookText, StickyNote, Lightbulb, Settings2 } from 'lucide-react'
import TokenBudgetMeter from '../../components/scout9/knowledge/TokenBudgetMeter'
import BusinessRulesPanel from '../../components/scout9/knowledge/BusinessRulesPanel'
import GlossaryPanel from '../../components/scout9/knowledge/GlossaryPanel'
import ContextNotesPanel from '../../components/scout9/knowledge/ContextNotesPanel'
import LearnedPatternsPanel from '../../components/scout9/knowledge/LearnedPatternsPanel'
import ClientOverridesPanel from '../../components/scout9/knowledge/ClientOverridesPanel'
import { createRendererLogger } from '../../../../shared/utils/rendererLogger'

const log = createRendererLogger('Scout9KnowledgeBaseTab')

type KBSubTab = 'rules' | 'glossary' | 'notes' | 'patterns' | 'overrides'

const SUB_TABS: { id: KBSubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'rules', label: 'Business Rules', icon: <BookOpen size={13} /> },
  { id: 'glossary', label: 'Glossary', icon: <BookText size={13} /> },
  { id: 'notes', label: 'Context Notes', icon: <StickyNote size={13} /> },
  { id: 'patterns', label: 'Learned Patterns', icon: <Lightbulb size={13} /> },
  { id: 'overrides', label: 'Client Overrides', icon: <Settings2 size={13} /> },
]

export default function KnowledgeBaseTab() {
  const [activeSubTab, setActiveSubTab] = useState<KBSubTab>('rules')

  useEffect(() => {
    log.info('Scout-9 knowledge base tab viewed')
  }, [])

  return (
    <div className="space-y-4">
      <TokenBudgetMeter />

      <div className="flex flex-wrap gap-1.5">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              log.info('Scout-9 knowledge sub-tab selected', { subTab: tab.id })
              setActiveSubTab(tab.id)
            }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all inline-flex items-center gap-1.5 ${
              activeSubTab === tab.id
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                : 'text-secondary hover:text-primary glass-button'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-panel p-5 rounded-xl">
        {activeSubTab === 'rules' && <BusinessRulesPanel />}
        {activeSubTab === 'glossary' && <GlossaryPanel />}
        {activeSubTab === 'notes' && <ContextNotesPanel />}
        {activeSubTab === 'patterns' && <LearnedPatternsPanel />}
        {activeSubTab === 'overrides' && <ClientOverridesPanel />}
      </div>
    </div>
  )
}
