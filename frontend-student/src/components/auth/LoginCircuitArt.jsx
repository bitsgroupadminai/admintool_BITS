/** Refined hero curves — visible but not cluttered. */
export function LoginHeroAccent({ className = '' }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 640 800"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="hero-curve" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0" />
          <stop offset="50%" stopColor="#6EE7B7" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#A7F3D0" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      <circle cx="480" cy="200" r="160" fill="#10B981" fillOpacity="0.07" />
      <circle cx="120" cy="620" r="100" fill="#6EE7B7" fillOpacity="0.05" />

      <path
        d="M-30 680 C 140 560, 260 460, 420 400 S 620 280, 660 100"
        stroke="url(#hero-curve)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M40 760 C 200 640, 320 540, 500 480"
        stroke="#A7F3D0"
        strokeWidth="1"
        strokeOpacity="0.25"
        strokeLinecap="round"
      />
      <path
        d="M500 120 V 260 Q 500 290 530 290 H 620"
        stroke="#6EE7B7"
        strokeWidth="1"
        strokeOpacity="0.2"
        strokeLinecap="round"
      />

      {[
        [420, 400],
        [500, 480],
        [530, 290],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="5" fill="#052E1C" fillOpacity="0.15" />
          <circle cx={cx} cy={cy} r="2.5" fill="#A7F3D0" fillOpacity="0.7" />
        </g>
      ))}
    </svg>
  );
}

/** Form panel — soft curves + grid wash */
export function LoginFormBackdrop({ className = '' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_90%_10%,rgba(167,243,208,0.3),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_0%_100%,rgba(110,231,183,0.12),transparent)]" />
      <svg
        className="absolute -right-4 bottom-0 h-[55%] w-[70%] max-w-md opacity-[0.18]"
        viewBox="0 0 320 400"
        fill="none"
        preserveAspectRatio="xMaxYMax meet"
      >
        <path
          d="M20 380 C 100 300, 180 260, 280 240 S 340 140, 300 40"
          stroke="#0A6640"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M0 360 H 120 Q 150 360 150 330 V 220 H 280"
          stroke="#10B981"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <circle cx="150" cy="330" r="3.5" fill="#0A6640" fillOpacity="0.5" />
        <circle cx="280" cy="220" r="3.5" fill="#10B981" fillOpacity="0.5" />
      </svg>
    </div>
  );
}
