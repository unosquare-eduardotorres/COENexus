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

function BeakerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 3h15" />
      <path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" />
      <path d="M6 14h12" />
    </svg>
  );
}

function AccentLetter({ children, color }: { children: string; color: string }) {
  return <span style={{ color, fontWeight: 700 }}>{children}</span>;
}

export default function NexusLanding() {
  const resumeColor = '#3b82f6';
  const dataSyncColor = '#f59e0b';
  const pathColor = '#8b5cf6';

  return (
    <div className="relative flex min-h-screen flex-col gradient-subtle transition-colors duration-300">
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

      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-16 flex-1">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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
            name="P.A.T.H."
            codename="Training Hub"
            status="coming-soon"
            href="/path"
            accentColor={pathColor}
            tagline=""
            description={<><AccentLetter color={pathColor}>P</AccentLetter>ersonalized. <AccentLetter color={pathColor}>A</AccentLetter>daptive. <AccentLetter color={pathColor}>T</AccentLetter>raining. <AccentLetter color={pathColor}>H</AccentLetter>ub. Tailored learning paths and skill development for COE team members.</>}
            icon={<CompassTrailIcon />}
          />
          <AppCard
            name="S.K.I.L.L."
            codename="Skills Matrix"
            status="coming-soon"
            href="/skill"
            accentColor="#10b981"
            tagline="Map talent. Build teams."
            description="Survey. Know. Index. Learn. Level. Comprehensive skills inventory and gap analysis for workforce planning."
            icon={<BeakerIcon />}
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
