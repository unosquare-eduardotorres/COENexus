import { getIconA11yProps, getIconClassName, type IconProps } from './iconProps';

export interface CheckIconProps extends IconProps {}

export function CheckIcon({ size = 'md', className, 'aria-label': ariaLabel }: CheckIconProps) {
  return (
    <svg
      className={getIconClassName(size, className)}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      {...getIconA11yProps(ariaLabel)}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}
