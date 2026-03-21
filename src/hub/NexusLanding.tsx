import { useTheme } from '../contexts/ThemeContext';
import AppCard from './AppCard';
import ParticleNetwork from './ParticleNetwork';

function VemIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="96"
      height="96"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="24" y1="6" x2="24" y2="18" />
      <polyline points="21,15 24,18 27,15" />
      <circle cx="20" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="28" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="24" cy="3" r="1.5" fill="currentColor" stroke="none" />
      <text x="24" y="11" textAnchor="middle" fontSize="6" fontWeight="700" fill="currentColor" stroke="none" fontFamily="system-ui">V</text>

      <line x1="8" y1="40" x2="18" y2="30" />
      <polyline points="15,32 18,30 16,27" />
      <path d="M5,36 L3,36 L3,43 L5,43" strokeWidth="2" fill="none" />
      <text x="8" y="42" textAnchor="middle" fontSize="6" fontWeight="700" fill="currentColor" stroke="none" fontFamily="system-ui">E</text>

      <line x1="40" y1="40" x2="30" y2="30" />
      <polyline points="32,27 30,30 33,32" />
      <circle cx="40" cy="40" r="4" strokeWidth="1.5" fill="none" />
      <circle cx="40" cy="40" r="1.5" fill="currentColor" stroke="none" />
      <text x="40" y="38" textAnchor="middle" fontSize="6" fontWeight="700" fill="currentColor" stroke="none" fontFamily="system-ui">M</text>

      <circle cx="24" cy="26" r="3" strokeWidth="1.5" />
      <circle cx="24" cy="26" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CompassTrailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.3" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function BeakerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
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
  const { theme, toggleTheme } = useTheme();

  const resumeColor = '#3b82f6';
  const pathColor = '#8b5cf6';

  return (
    <div className="relative flex min-h-screen flex-col gradient-subtle transition-colors duration-300">
      <ParticleNetwork isDark={theme === 'dark'} />

      <nav className="glass-nav fixed top-0 z-50 w-full">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
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
            <span className="text-sm font-semibold tracking-tight text-primary">COE Operation Nexus</span>
          </div>

          <button onClick={toggleTheme} className="glass-button rounded-lg p-2">
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      <section className="relative z-10 mx-auto max-w-3xl px-4 pb-12 pt-24 text-center">
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
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <AppCard
            name="V.E.M."
            codename="Vectorize, Extract, Match"
            status="active"
            href="/resume"
            accentColor={resumeColor}
            tagline=""
            description={<><AccentLetter color={resumeColor}>V</AccentLetter>ectorize. <AccentLetter color={resumeColor}>E</AccentLetter>xtract. <AccentLetter color={resumeColor}>M</AccentLetter>atch. Resumes, reimagined. Matches, made.</>}
            icon={<VemIcon />}
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
