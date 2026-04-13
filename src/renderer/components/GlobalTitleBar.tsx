import { Link } from 'react-router-dom';

function NexusIcon() {
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-violet-600">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="12" x2="5" y2="6" />
        <line x1="12" y1="12" x2="19" y2="6" />
        <line x1="12" y1="12" x2="5" y2="18" />
        <line x1="12" y1="12" x2="19" y2="18" />
        <line x1="12" y1="12" x2="12" y2="3" />
        <circle cx="5" cy="6" r="2" fill="white" opacity="0.6" />
        <circle cx="19" cy="6" r="2" fill="white" opacity="0.6" />
        <circle cx="5" cy="18" r="2" fill="white" opacity="0.6" />
        <circle cx="19" cy="18" r="2" fill="white" opacity="0.6" />
        <circle cx="12" cy="3" r="2" fill="white" opacity="0.6" />
        <circle cx="12" cy="12" r="3" fill="white" />
      </svg>
    </div>
  );
}

export default function GlobalTitleBar() {
  return (
    <div className="glass-nav fixed top-0 left-0 right-0 z-[60] h-10 titlebar-drag border-b border-white/5">
      <div className="flex items-center justify-center h-full px-4">
        <Link to="/" className="titlebar-no-drag flex items-center gap-2">
          <NexusIcon />
          <span className="text-xs font-semibold tracking-tight text-primary">COE Operation Nexus</span>
        </Link>
      </div>
    </div>
  );
}
