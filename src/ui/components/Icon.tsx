import type { SVGProps } from 'react';

type Name =
  | 'mine'
  | 'factory'
  | 'planets'
  | 'research'
  | 'prestige'
  | 'more'
  | 'info'
  | 'close'
  | 'lock'
  | 'bolt'
  | 'back';

const PATHS: Record<Name, string> = {
  mine: 'M14 4l6 6-2 2-1-1-7 7-3 1 1-3 7-7-1-1zM4 20l3-3',
  factory: 'M3 21V10l6 4V10l6 4V6h4l2 15zM7 17h2M12 17h2M17 17h2',
  planets: 'M12 7a5 5 0 110 10 5 5 0 010-10zM3 15c3-1 15-6 18-8M5 18c4-1 11-4 15-7',
  research: 'M9 3h6M10 3v6L4 19a1.5 1.5 0 001.3 2h13.4A1.5 1.5 0 0020 19l-6-10V3M7 15h10',
  prestige: 'M12 2l2.6 6.3L21 9l-5 4.4L17.5 20 12 16.8 6.5 20 8 13.4 3 9l6.4-.7z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 110 18 9 9 0 010-18z',
  close: 'M6 6l12 12M18 6L6 18',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 118 0v3',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  back: 'M15 5l-7 7 7 7',
};

export function Icon({ name, size = 22, ...rest }: { name: Name; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'more' ? 3.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
