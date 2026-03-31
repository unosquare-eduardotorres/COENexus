import { getIconA11yProps, getIconClassName, type IconProps } from './iconProps';

export interface SettingsIconProps extends IconProps {}

export function SettingsIcon({ size = 'md', className, 'aria-label': ariaLabel }: SettingsIconProps) {
  return (
    <svg
      className={getIconClassName(size, className)}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      {...getIconA11yProps(ariaLabel)}
    >
      <circle cx="5" cy="12" r="2" strokeWidth={1.5} />
      <circle cx="19" cy="6" r="2" strokeWidth={1.5} />
      <circle cx="19" cy="18" r="2" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 11l10-4M7 13l10 4" />
    </svg>
  );
}

