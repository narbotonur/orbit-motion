export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    camera: (
      <>
        <rect x="3" y="6" width="13" height="12" rx="3" />
        <path d="m16 10 5-3v10l-5-3" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    sound: (
      <>
        <path d="M10 5 5 9H2v6h3l5 4zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" />
      </>
    ),
    mute: (
      <>
        <path d="M10 5 5 9H2v6h3l5 4zM16 9l6 6M22 9l-6 6" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    expand: <path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" />,
    pause: (
      <>
        <path d="M8 5v14M16 5v14" />
      </>
    ),
    hand: (
      <>
        <path d="M8 12V5a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v7c0 5-3 7-7 7-3 0-5-2-7-5l-3-4a2 2 0 0 1 3-2l2 2" />
      </>
    ),
    pinch: (
      <>
        <path d="M9 12V5a2 2 0 0 1 4 0v6l2-1 5 3v3c0 4-3 6-6 6s-4-2-6-4l-3-3a2 2 0 0 1 3-3l3 2" />
        <path d="M3 4h2M4 3v2M18 4h3" />
      </>
    ),
    swipe: (
      <>
        <path d="M3 7h18m-5-5 5 5-5 5M7 17v-3a2 2 0 0 1 4 0v2l3-1 4 3v3H9l-4-4a1.5 1.5 0 0 1 2-2" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.arrow}
    </svg>
  );
}

export function OrbitMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="12" stroke="currentColor" strokeWidth="3" />
      <ellipse
        cx="32"
        cy="32"
        rx="28"
        ry="11"
        transform="rotate(-38 32 32)"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="52" cy="17" r="4" fill="currentColor" />
    </svg>
  );
}
