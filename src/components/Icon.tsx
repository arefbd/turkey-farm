/** مجموعه آیکن‌های SVG درون‌خطی — بدون وابستگی خارجی */

const PATHS: Record<string, React.ReactNode> = {
  home: <path d="M3 10.6 12 3l9 7.6V20a1 1 0 0 1-1 1h-5v-6.5H9V21H4a1 1 0 0 1-1-1z" />,
  egg: (
    <>
      <path d="M12 3c3.6 0 6.2 4.6 6.2 9.2A6.2 6.2 0 0 1 12 21a6.2 6.2 0 0 1-6.2-8.8C5.8 7.6 8.4 3 12 3z" />
      <path d="M9.4 15.4c.5 1.2 1.5 1.9 2.8 1.9" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5z" />
      <path d="M3 9h17" />
      <circle cx="16.5" cy="13.5" r="1.2" />
    </>
  ),
  feed: (
    <>
      <path d="M7 8h10l1.2 12H5.8z" />
      <path d="M9.2 8V5.5A2.5 2.5 0 0 1 11.7 3h.6A2.5 2.5 0 0 1 14.8 5.5V8" />
      <path d="M9.5 12.5h5M9.8 16h4.4" />
    </>
  ),
  tag: (
    <>
      <path d="M20.5 12.5 12.6 20.4a1.5 1.5 0 0 1-2.1 0l-7-7a1.5 1.5 0 0 1-.4-1.1l.5-7a1.5 1.5 0 0 1 1.4-1.4l7-.5a1.5 1.5 0 0 1 1.1.4l7 7a1.5 1.5 0 0 1 0 2.1z" />
      <circle cx="8" cy="8" r="1.4" />
    </>
  ),
  users: (
    <>
      <path d="M15.5 20v-1.8a3.7 3.7 0 0 0-3.7-3.7H6.2A3.7 3.7 0 0 0 2.5 18v2" />
      <circle cx="9" cy="7.5" r="3.6" />
      <path d="M21.5 20v-1.8a3.7 3.7 0 0 0-2.8-3.6" />
      <path d="M16.4 4a3.6 3.6 0 0 1 0 7" />
    </>
  ),
  chart: (
    <>
      <path d="M3 20h18" />
      <rect x="4.5" y="11" width="3.4" height="6.4" rx="1" />
      <rect x="10.3" y="5" width="3.4" height="12.4" rx="1" />
      <rect x="16.1" y="8.5" width="3.4" height="8.9" rx="1" />
    </>
  ),
  check: (
    <>
      <path d="M9 12.2 11.6 15 20 5.5" />
      <path d="M20 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
    </>
  ),
  box: (
    <>
      <path d="M20.5 8.2 12 3.2 3.5 8.2v7.6L12 20.8l8.5-5z" />
      <path d="M3.5 8.2 12 13.2l8.5-5M12 13.2v7.6" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" />
      <path d="M5.5 6 6.6 20a1.6 1.6 0 0 0 1.6 1.4h7.6A1.6 1.6 0 0 0 17.4 20L18.5 6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  chevron: <path d="M15 6l-6 6 6 6" />,
  chevronLeft: <path d="M9 6l6 6-6 6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.6-3.6" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4 20h16" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4 20h16" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5z" />
      <path d="M10.3 19a2 2 0 0 0 3.4 0" />
    </>
  ),
  up: (
    <>
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </>
  ),
  down: (
    <>
      <path d="M12 5v14" />
      <path d="M6 13l6 6 6-6" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  print: (
    <>
      <path d="M6.5 8V3h11v5" />
      <rect x="3" y="8" width="18" height="8" rx="2" />
      <path d="M6.5 16h11v5h-11z" />
    </>
  ),
  dots: (
    <>
      <circle cx="12" cy="5" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="12" cy="19" r="1.4" />
    </>
  ),
  scale: (
    <>
      <path d="M12 3v18" />
      <path d="M6 21h12" />
      <path d="M4 8h16" />
      <path d="M7 8l-3 6h6z" />
      <path d="M17 8l-3 6h6z" />
    </>
  ),
  drop: <path d="M12 3s6 6.4 6 10.4A6 6 0 0 1 6 13.4C6 9.4 12 3 12 3z" />,
  flask: (
    <>
      <path d="M9 3h6" />
      <path d="M10 3v6L5.5 18a2 2 0 0 0 1.7 3h9.6a2 2 0 0 0 1.7-3L14 9V3" />
      <path d="M7.5 14h9" />
    </>
  ),
  truck: (
    <>
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </>
  ),
  money: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 12h.01M18 12h.01" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4.5M12 17h.01" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

interface Props {
  name: IconName | string;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 20, className }: Props) {
  const path = PATHS[name] ?? PATHS.dots;
  return (
    <svg
      className={'ic' + (className ? ' ' + className : '')}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}
