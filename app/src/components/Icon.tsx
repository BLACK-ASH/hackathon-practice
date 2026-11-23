import type { CSSProperties } from 'react';

export type IconName =
  | 'chat'
  | 'devices'
  | 'users'
  | 'transfer'
  | 'settings'
  | 'menu'
  | 'close'
  | 'arrowLeft'
  | 'shield'
  | 'info';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 20, className, style }: IconProps) {
  const paths = (() => {
    switch (name) {
      case 'chat':
        return (
          <>
            <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H9l-5 3v-6.4A7.5 7.5 0 0 1 11.5 4h1A7.5 7.5 0 0 1 20 11.5Z" />
            <path d="M8.5 11h7M8.5 14.5h4.5" />
          </>
        );
      case 'devices':
        return (
          <>
            <rect x="2.5" y="4.5" width="14" height="10.5" rx="2" />
            <path d="M1.5 18h15" />
            <rect x="16.5" y="9" width="5" height="10.5" rx="1.5" />
            <path d="M18.5 16.5h1" />
          </>
        );
      case 'users':
        return (
          <>
            <circle cx="9" cy="8" r="3" />
            <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
            <path d="M16 5.4a3 3 0 0 1 0 5.4M17.2 14.4A5.4 5.4 0 0 1 21 19.2" />
          </>
        );
      case 'transfer':
        return (
          <>
            <path d="M7 7.5h12M19 7.5l-3-3M19 7.5l-3 3" />
            <path d="M17 16.5H5M5 16.5l3-3M5 16.5l3 3" />
          </>
        );
      case 'settings':
        return (
          <>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21H9.9v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.8-2.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L7.1 3.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V2h4.1v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.8 2.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21v4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
          </>
        );
      case 'menu':
        return <path d="M4 7h16M4 12h16M4 17h16" />;
      case 'close':
        return <path d="M6 6l12 12M18 6 6 18" />;
      case 'arrowLeft':
        return (
          <>
            <path d="M19 12H5" />
            <path d="m11 6-6 6 6 6" />
          </>
        );
      case 'shield':
        return (
          <>
            <path d="M12 3 5 6v5c0 4.4 2.9 8.3 7 10 4.1-1.7 7-5.6 7-10V6l-7-3Z" />
            <path d="m9.2 12 1.9 1.9 3.7-3.9" />
          </>
        );
      case 'info':
        return (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </>
        );
    }
  })();

  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      height={size}
      style={style}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      >
        {paths}
      </g>
    </svg>
  );
}
