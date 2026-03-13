import { Link } from 'react-router-dom';

interface AppCardProps {
  name: string;
  codename: string;
  tagline: string;
  description: React.ReactNode;
  href: string;
  icon: React.ReactNode;
  accentColor: string;
  status: 'active' | 'coming-soon';
}

function StatusBadge({ status }: { status: 'active' | 'coming-soon' }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-medium text-gray-400">
      Coming Soon
    </span>
  );
}

function CardContent({ name, codename, tagline, description, icon, accentColor, status }: AppCardProps) {
  return (
    <>
      <div
        className="absolute -left-8 -top-8 h-32 w-32 rounded-full blur-3xl opacity-20"
        style={{ background: accentColor }}
      />

      <div className="relative flex items-start justify-between mb-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accentColor}26` }}
        >
          <div style={{ color: accentColor }}>{icon}</div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="relative space-y-1.5">
        <h3 className="text-lg font-semibold text-primary">{name}</h3>
        <p className="text-xs font-mono tracking-wider text-muted uppercase">{codename}</p>
        <p className="text-sm italic text-secondary">{tagline}</p>
        <p className="text-sm text-muted pt-1">{description}</p>
      </div>

      {status === 'active' && (
        <div className="relative mt-4 flex items-center gap-1.5 text-sm font-medium group-hover:gap-2.5 transition-all duration-300" style={{ color: accentColor }}>
          Launch
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </div>
      )}
    </>
  );
}

export default function AppCard(props: AppCardProps) {
  if (props.status === 'active') {
    return (
      <Link to={props.href} className="glass-card-hover p-6 block group relative overflow-hidden">
        <CardContent {...props} />
      </Link>
    );
  }

  return (
    <div className="glass-card p-6 relative overflow-hidden opacity-60 cursor-not-allowed">
      <CardContent {...props} />
    </div>
  );
}
