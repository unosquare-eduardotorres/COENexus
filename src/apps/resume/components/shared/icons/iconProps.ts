export interface IconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'aria-label'?: string;
}

type IconA11yProps =
  | {
      role: 'img';
      'aria-label': string;
      'aria-hidden'?: never;
    }
  | {
      role?: never;
      'aria-label'?: never;
      'aria-hidden': 'true';
    };

const sizeClassMap = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
} as const;

export function getIconClassName(size: IconProps['size'] = 'md', className?: string): string {
  const base = sizeClassMap[size];
  return className ? `${base} ${className}` : base;
}

export function getIconA11yProps(ariaLabel?: string): IconA11yProps {
  if (ariaLabel) {
    return { role: 'img', 'aria-label': ariaLabel };
  }

  return { 'aria-hidden': 'true' };
}
