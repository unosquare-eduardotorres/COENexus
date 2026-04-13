import { Brain, ScrollText, FileOutput } from 'lucide-react'
import type { StepState } from './WorkflowNode'

interface SubNodeDef {
  icon: typeof Brain
  label: string
}

const SUB_NODES: SubNodeDef[] = [
  { icon: Brain, label: 'Knowledge' },
  { icon: ScrollText, label: 'Prompt' },
  { icon: FileOutput, label: 'Report' },
]

interface SubNodeClusterProps {
  parentStatus: StepState['status']
}

export default function SubNodeCluster({ parentStatus }: SubNodeClusterProps) {
  return (
    <div className="flex flex-col items-center gap-0 mt-1">
      <div className="flex items-start gap-6">
        {SUB_NODES.map((node, i) => {
          const Icon = node.icon
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-4 w-px bg-violet-400/30" />
              <div
                className={`
                  flex h-9 w-9 items-center justify-center rounded-full border transition-all
                  ${parentStatus === 'idle' ? 'border-gray-600/50 bg-dark-surface/60' : ''}
                  ${parentStatus === 'running' ? 'border-violet-400/50 bg-violet-400/10 animate-pulse' : ''}
                  ${parentStatus === 'completed' ? 'border-violet-400/40 bg-violet-400/15' : ''}
                  ${parentStatus === 'failed' ? 'border-red-400/40 bg-red-400/10' : ''}
                `}
              >
                <Icon
                  size={14}
                  className={`
                    ${parentStatus === 'idle' ? 'text-gray-500' : ''}
                    ${parentStatus === 'running' ? 'text-violet-400' : ''}
                    ${parentStatus === 'completed' ? 'text-violet-400' : ''}
                    ${parentStatus === 'failed' ? 'text-red-400' : ''}
                  `}
                />
              </div>
              <span
                className={`text-[9px] font-medium leading-tight text-center
                  ${parentStatus === 'idle' ? 'text-gray-500' : 'text-violet-400/80'}
                `}
              >
                {node.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
