import { createElement, ReactNode } from 'react';

function createStepIcon(paths: string[], className = 'w-3 h-3'): ReactNode {
  return createElement(
    'svg',
    { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
    ...paths.map((d) =>
      createElement('path', {
        key: d,
        d,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 1.5,
      }),
    ),
  );
}

export const STEP_ICONS = {
  person: createStepIcon(['M16 7a4 4 0 11-8 0 4 4 0 018 0z']),
  building: createStepIcon(['M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16']),
  lightning: createStepIcon(['M13 10V3L4 14h7v7l9-11h-7z']),
  cloud: createStepIcon(['M4 14.899A7 7 0 1115.71 8h1.79a4.5 4.5 0 012.5 8.242']),
  check: createStepIcon(['M5 13l4 4L19 7']),
  backArrow: createStepIcon(['M10 19l-7-7m0 0l7-7m-7 7h18']),
  document: createStepIcon(['M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z']),
  filter: createStepIcon(['M3 4h18l-7 8v6l-4 2V12L3 4z']),
  search: createStepIcon(['M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z']),
  people: createStepIcon([
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  ]),
  lightbulb: createStepIcon([
    'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  ]),
  adjustments: createStepIcon([
    'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
  ]),
  chart: createStepIcon([
    'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  ]),
  eye: createStepIcon([
    'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  ]),
  clock: createStepIcon(['M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z']),
} as const;
