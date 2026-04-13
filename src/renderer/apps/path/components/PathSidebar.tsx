import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import type { PathRole } from '../types';
import { usePathRole } from '../contexts/PathRoleContext';
import RoleSwitcher from './RoleSwitcher';

type NavItem = {
  label: string;
  to: string;
  icon: () => ReactNode;
};

const DashboardIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M3 11.5h5.5V17H3v-5.5Zm8.5-8.5H17v14h-5.5V3ZM3 3h5.5v5.5H3V3Zm8.5 8.5H17v5.5h-5.5v-5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const PlanIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M4 3h12v14H4V3Zm3 4h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const LearningIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M2.5 6.5 10 3l7.5 3.5L10 10 2.5 6.5Zm0 4L10 14l7.5-3.5M2.5 14.5 10 18l7.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const InsightIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M3 16.5h14M5 13l3-3 2.5 2.5L15 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const QueueIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M4 5h12M4 10h12M4 15h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const LadderIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M6 3v14M14 3v14M6 7h8M6 13h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const TaxonomyIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M5 4h10v4H5V4Zm-1 8h12v4H4v-4Zm5-4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function PathIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
    </svg>
  );
}

const developerNav: NavItem[] = [
  { label: 'Dashboard', to: '/path', icon: DashboardIcon },
  { label: 'DP Portal', to: '/path/dp-portal', icon: PlanIcon },
  { label: 'Learning Paths', to: '/path/learning-paths', icon: LearningIcon },
  { label: 'Insights', to: '/path/insights', icon: InsightIcon },
];

const adminNav: NavItem[] = [
  { label: 'Analytics', to: '/path/analytics', icon: InsightIcon },
  { label: 'Assessment Queue', to: '/path/assessment-queue', icon: QueueIcon },
  { label: 'Career Ladders', to: '/path/career-ladders', icon: LadderIcon },
  { label: 'Skill Taxonomy', to: '/path/skill-taxonomy', icon: TaxonomyIcon },
];

const sectionLabel: Record<PathRole, { nav: string; admin?: string }> = {
  developer: { nav: 'Navigation' },
  mentor: { nav: 'Navigation' },
  evaluator: { nav: 'Navigation' },
  'practice-lead': { nav: 'Navigation', admin: 'Administration' },
  'coe-lead': { nav: 'Navigation', admin: 'Administration' },
};

export default function PathSidebar() {
  const { role } = usePathRole();
  const isAdminRole = role === 'practice-lead' || role === 'coe-lead' || role === 'evaluator' || role === 'mentor';
  const labels = sectionLabel[role];

  return (
    <aside className="fixed top-10 left-0 bottom-0 z-50 flex flex-col w-[220px] border-r border-gray-200/30 dark:border-dark-border/30 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl">
      <div className="flex items-center h-12 px-4 gap-2.5 border-b border-gray-200/30 dark:border-dark-border/30">
        <div className="w-8 h-8 rounded-lg bg-violet-500/15 dark:bg-violet-400/15 flex-shrink-0 flex items-center justify-center text-violet-500 dark:text-violet-400">
          <PathIcon />
        </div>
        <span className="text-sm font-bold text-primary tracking-tight">PATH</span>
      </div>

      <Link
        to="/"
        className="flex items-center gap-1.5 px-4 py-2 text-xs text-muted hover:text-secondary transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Nexus
      </Link>

      <div className="px-4 pb-2">
        <RoleSwitcher />
      </div>

      <nav className="flex-1 py-2 overflow-hidden" aria-label="PATH sections">
        <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">{labels.nav}</p>
        {developerNav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/path'}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-dark-hover/50'
              }`
            }
            style={{ maxWidth: 'calc(100% - 16px)' }}
          >
            {({ isActive }) => (
              <>
                <span className={`flex-shrink-0 ${isActive ? 'text-violet-600 dark:text-violet-400' : ''}`}>{item.icon()}</span>
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {isAdminRole && (
          <>
            <div className="minimal-divider mx-3 my-2" />
            <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">{labels.admin ?? 'Administration'}</p>
            {adminNav.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-dark-hover/50'
                  }`
                }
                style={{ maxWidth: 'calc(100% - 16px)' }}
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex-shrink-0 ${isActive ? 'text-violet-600 dark:text-violet-400' : ''}`}>{item.icon()}</span>
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
