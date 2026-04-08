import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="w-full flex justify-center py-8">
      <div className="glass-card w-full max-w-2xl px-6 py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/50 text-muted dark:bg-dark-hover/60">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        <p className="mt-2 mx-auto max-w-xl text-sm text-muted">{description}</p>
        {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
