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

function CalculatorIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="10" y2="10" />
      <line x1="14" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="10" y2="14" />
      <line x1="14" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="10" y2="18" />
      <line x1="14" y1="18" x2="16" y2="18" />
    </svg>
  );
}

function BugIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2l1.88 1.88" /><path d="M14.12 3.88L16 2" />
      <path d="M9 7.13v-1a3.003 3.003 0 116 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6" />
      <path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
      <path d="M6 13H2" /><path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
      <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" /><path d="M22 13h-4" />
      <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
    </svg>
  );
}

function CatalogIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5a2.5 2.5 0 010-5H20" />
      <path d="M8 7h6" /><path d="M8 11h4" />
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
  const bugColor = '#ef4444';
  const nomicoreColor = '#06b6d4';
  const catalogColor = '#a855f7';

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
            name="B.U.G."
            codename="Bug Unified Guardian"
            status="experimental"
            href="/bug"
            accentColor={bugColor}
            tagline=""
            description={<><AccentLetter color={bugColor}>B</AccentLetter>ug. <AccentLetter color={bugColor}>U</AccentLetter>nified. <AccentLetter color={bugColor}>G</AccentLetter>uardian. Track, triage, and resolve application errors with AI-powered diagnostics.</>}
            icon={<BugIcon />}
          />
          <AppCard
            name="N.O.M.I."
            codename="Nomicore Integration"
            status="experimental"
            href="/nomicore"
            accentColor={nomicoreColor}
            tagline=""
            description={<><AccentLetter color={nomicoreColor}>N</AccentLetter>omicore. <AccentLetter color={nomicoreColor}>O</AccentLetter>n-demand. <AccentLetter color={nomicoreColor}>M</AccentLetter>exico. <AccentLetter color={nomicoreColor}>I</AccentLetter>ntelligence. Salary calculations powered by Nomicore browser automation.</>}
            icon={<CalculatorIcon />}
          />
          <AppCard
            name="C.A.T."
            codename="Catalog Administration Tools"
            status="active"
            href="/catalogs"
            accentColor={catalogColor}
            tagline=""
            description={<><AccentLetter color={catalogColor}>C</AccentLetter>atalog. <AccentLetter color={catalogColor}>A</AccentLetter>dministration. <AccentLetter color={catalogColor}>T</AccentLetter>ools. Manage COEs, Practices, and Skills — the organizational backbone of the operation.</>}
            icon={<CatalogIcon />}
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
