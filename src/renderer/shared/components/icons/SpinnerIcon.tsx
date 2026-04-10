import { getIconA11yProps, getIconClassName, type IconProps } from './iconProps';

export interface SpinnerIconProps extends IconProps {}

export function SpinnerIcon({ size = 'md', className, 'aria-label': ariaLabel }: SpinnerIconProps) {
  return (
    <svg
      className={getIconClassName(size, className ? `animate-spin ${className}` : 'animate-spin')}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      {...getIconA11yProps(ariaLabel)}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth={1.5} />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

