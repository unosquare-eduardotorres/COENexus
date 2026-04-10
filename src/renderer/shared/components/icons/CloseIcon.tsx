import { getIconA11yProps, getIconClassName, type IconProps } from './iconProps';

export interface CloseIconProps extends IconProps {}

export function CloseIcon({ size = 'md', className, 'aria-label': ariaLabel }: CloseIconProps) {
  return (
    <svg
      className={getIconClassName(size, className)}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      {...getIconA11yProps(ariaLabel)}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

