export interface StatusColorClasses {
  borderColor: string;
  bgColor: string;
  iconColor: string;
  glowRing: string;
  glowShadow: string;
}

export const ISSUE_STATUS_COLORS: Record<'incomplete' | 'not-processed' | 'excluded' | 'sync_failed' | 'extract_failed' | 'vectorize_failed', StatusColorClasses> = {
  incomplete: {
    borderColor: 'border-amber-200/60 dark:border-amber-500/20',
    bgColor: 'bg-amber-100 dark:bg-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    glowRing: 'ring-2 ring-amber-400 dark:ring-amber-500',
    glowShadow: 'shadow-lg shadow-amber-500/20',
  },
  'not-processed': {
    borderColor: 'border-red-200/60 dark:border-red-500/20',
    bgColor: 'bg-red-100 dark:bg-red-500/20',
    iconColor: 'text-red-600 dark:text-red-400',
    glowRing: 'ring-2 ring-red-400 dark:ring-red-500',
    glowShadow: 'shadow-lg shadow-red-500/20',
  },
  excluded: {
    borderColor: 'border-orange-200/60 dark:border-orange-500/20',
    bgColor: 'bg-orange-100 dark:bg-orange-500/20',
    iconColor: 'text-orange-600 dark:text-orange-400',
    glowRing: 'ring-2 ring-orange-400 dark:ring-orange-500',
    glowShadow: 'shadow-lg shadow-orange-500/20',
  },
  sync_failed: {
    borderColor: 'border-rose-200/60 dark:border-rose-500/20',
    bgColor: 'bg-rose-100 dark:bg-rose-500/20',
    iconColor: 'text-rose-600 dark:text-rose-400',
    glowRing: 'ring-2 ring-rose-400 dark:ring-rose-500',
    glowShadow: 'shadow-lg shadow-rose-500/20',
  },
  extract_failed: {
    borderColor: 'border-pink-200/60 dark:border-pink-500/20',
    bgColor: 'bg-pink-100 dark:bg-pink-500/20',
    iconColor: 'text-pink-600 dark:text-pink-400',
    glowRing: 'ring-2 ring-pink-400 dark:ring-pink-500',
    glowShadow: 'shadow-lg shadow-pink-500/20',
  },
  vectorize_failed: {
    borderColor: 'border-fuchsia-200/60 dark:border-fuchsia-500/20',
    bgColor: 'bg-fuchsia-100 dark:bg-fuchsia-500/20',
    iconColor: 'text-fuchsia-600 dark:text-fuchsia-400',
    glowRing: 'ring-2 ring-fuchsia-400 dark:ring-fuchsia-500',
    glowShadow: 'shadow-lg shadow-fuchsia-500/20',
  },
};

export const PIPELINE_STATUS_COLORS: Record<'synced' | 'extracted' | 'vectorized', StatusColorClasses> = {
  synced: {
    borderColor: 'border-emerald-200/60 dark:border-emerald-500/20',
    bgColor: 'bg-emerald-100 dark:bg-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    glowRing: 'ring-2 ring-emerald-400 dark:ring-emerald-500',
    glowShadow: 'shadow-lg shadow-emerald-500/20',
  },
  extracted: {
    borderColor: 'border-blue-200/60 dark:border-blue-500/20',
    bgColor: 'bg-blue-100 dark:bg-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    glowRing: 'ring-2 ring-blue-400 dark:ring-blue-500',
    glowShadow: 'shadow-lg shadow-blue-500/20',
  },
  vectorized: {
    borderColor: 'border-violet-200/60 dark:border-violet-500/20',
    bgColor: 'bg-violet-100 dark:bg-violet-500/20',
    iconColor: 'text-violet-600 dark:text-violet-400',
    glowRing: 'ring-2 ring-violet-400 dark:ring-violet-500',
    glowShadow: 'shadow-lg shadow-violet-500/20',
  },
};
