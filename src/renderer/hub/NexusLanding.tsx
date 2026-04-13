import AppCard from './AppCard';
import ParticleNetwork from './ParticleNetwork';
import VemLogo from '../components/VemLogo';

function CloudDownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
    </svg>
  );
}

function CompassTrailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.3" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function CoreIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <circle cx="18" cy="10" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="12" cy="4" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="6" cy="14" r="2" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="3" />
      <line x1="12" y1="8" x2="12" y2="11" />
      <circle cx="8" cy="16" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function AccentLetter({ children, color }: { children: string; color: string }) {
  return <span style={{ color, fontWeight: 700 }}>{children}</span>;
}

export default function NexusLanding() {
  const resumeColor = '#3b82f6';
  const dataSyncColor = '#f59e0b';
  const coreColor = '#10b981';
  const pathColor = '#8b5cf6';
  const agentColor = '#a855f7';

  return (
    <div className="relative flex min-h-screen pb-8 flex-col gradient-subtle transition-colors duration-300">
      <div className="fixed top-0 left-0 right-0 h-10 z-40 titlebar-drag" />
      <ParticleNetwork isDark />

      <nav className="glass-nav fixed top-0 z-50 w-full titlebar-drag border-b border-white/5">
        <div className="relative mx-auto flex h-10 max-w-7xl items-center justify-center px-4 sm:px-6">
          <div className="flex items-center gap-2 titlebar-no-drag">
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
            <span className="text-xs font-semibold tracking-tight text-primary">COE Operation Nexus</span>
          </div>

        </div>
      </nav>

      <section className="relative z-10 mx-auto max-w-3xl px-4 pb-12 pt-20 text-center">
        <div className="glass-card mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs font-medium tracking-wide text-secondary">Center of Excellence</span>
        </div>

        <h1 className="mb-3 text-4xl font-bold text-primary md:text-5xl">Operation Nexus</h1>
        <p className="mx-auto max-w-xl text-base text-secondary md:text-lg">
          Unified toolkit for the Center of Excellence. Streamline operations, enhance productivity, and drive innovation.
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-16 flex-1">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 auto-rows-fr">
          <AppCard
            name="V.E.M."
            codename="Vectorize, Extract, Match"
            status="active"
            href="/resume"
            accentColor={resumeColor}
            tagline=""
            description={<><AccentLetter color={resumeColor}>V</AccentLetter>ectorize. <AccentLetter color={resumeColor}>E</AccentLetter>xtract. <AccentLetter color={resumeColor}>M</AccentLetter>atch. Resumes, reimagined. Matches, made.</>}
            icon={<VemLogo size={72} />}
          />
          <AppCard
            name="D.A.T.A."
            codename="Data Sync"
            status="active"
            href="/datasync"
            accentColor={dataSyncColor}
            tagline=""
            description={<><AccentLetter color={dataSyncColor}>D</AccentLetter>ownload. <AccentLetter color={dataSyncColor}>A</AccentLetter>lign. <AccentLetter color={dataSyncColor}>T</AccentLetter>ransform. <AccentLetter color={dataSyncColor}>A</AccentLetter>ctivate. Sync employee, candidate &amp; position data from upstream HR systems.</>}
            icon={<CloudDownloadIcon />}
          />
          <AppCard
            name="C.O.R.E."
            codename="Reports Engine"
            status="active"
            href="/command-center"
            accentColor={coreColor}
            tagline=""
            description={<><AccentLetter color={coreColor}>C</AccentLetter>OE. <AccentLetter color={coreColor}>O</AccentLetter>perational. <AccentLetter color={coreColor}>R</AccentLetter>eports. <AccentLetter color={coreColor}>E</AccentLetter>ngine. Operational intelligence and position health monitoring for the COE.</>}
            icon={<CoreIcon />}
          />
          <AppCard
            name="P.A.T.H."
            codename="Training Hub"
            status="active"
            href="/path"
            accentColor={pathColor}
            tagline=""
            description={<><AccentLetter color={pathColor}>P</AccentLetter>ersonalized. <AccentLetter color={pathColor}>A</AccentLetter>daptive. <AccentLetter color={pathColor}>T</AccentLetter>raining. <AccentLetter color={pathColor}>H</AccentLetter>ub. Tailored learning paths and skill development for COE team members.</>}
            icon={<CompassTrailIcon />}
          />
          <AppCard
            name="A.G.E.N.T."
            codename="Agent Studio"
            status="active"
            href="/agents"
            accentColor={agentColor}
            tagline=""
            description={<><AccentLetter color={agentColor}>A</AccentLetter>utonomous. <AccentLetter color={agentColor}>G</AccentLetter>enerative. <AccentLetter color={agentColor}>E</AccentLetter>xpert. <AccentLetter color={agentColor}>N</AccentLetter>etwork. <AccentLetter color={agentColor}>T</AccentLetter>eam. Multi-agent AI workforce for code, design, and operations.</>}
            icon={<BotIcon />}
          />
        </div>
      </section>

      <footer className="relative z-10 mt-auto border-t border-white/10 dark:border-white/5">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
          <span className="text-xs text-muted">&copy; {new Date().getFullYear()} Unosquare &bull; COE Operation Nexus</span>
          <span className="text-xs text-muted">v1.0</span>
        </div>
      </footer>
    </div>
  );
}
