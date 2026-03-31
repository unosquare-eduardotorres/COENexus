import { getIconA11yProps, getIconClassName, type IconProps } from './iconProps';

export interface ArrowIconProps extends IconProps {}

export function ArrowIcon({ size = 'md', className, 'aria-label': ariaLabel }: ArrowIconProps) {
  return (
    <svg
      className={getIconClassName(size, className)}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      {...getIconA11yProps(ariaLabel)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M13 7l5 5m0 0l-5 5m5-5H6"
      />
    </svg>
  );
}

