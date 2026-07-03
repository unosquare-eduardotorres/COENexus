import { getIconA11yProps, getIconClassName, type IconProps } from './iconProps';

const directionClassMap = {
  up: 'rotate-180',
  down: '',
  left: 'rotate-90',
  right: '-rotate-90',
} as const;

export interface ChevronIconProps extends IconProps {
  direction?: keyof typeof directionClassMap;
}

export function ChevronIcon({
  size = 'md',
  className,
  direction = 'down',
  'aria-label': ariaLabel,
}: ChevronIconProps) {
  const directionClass = directionClassMap[direction];
  const mergedClassName = directionClass
    ? `${getIconClassName(size, className)} ${directionClass}`
    : getIconClassName(size, className);

  return (
    <svg
      className={mergedClassName}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      {...getIconA11yProps(ariaLabel)}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
