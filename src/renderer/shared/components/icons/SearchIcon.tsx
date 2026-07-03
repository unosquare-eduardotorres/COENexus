import { getIconA11yProps, getIconClassName, type IconProps } from './iconProps';

export interface SearchIconProps extends IconProps {}

export function SearchIcon({ size = 'md', className, 'aria-label': ariaLabel }: SearchIconProps) {
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
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

