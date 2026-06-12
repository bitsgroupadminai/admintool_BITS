import { GraduationCap } from "lucide-react";

export function AuthLayout({
  title,
  subtitle,
  heroTitle,
  heroSubtitle,
  children,
  wide = false,
}) {
  return (
    <div className="relative flex min-h-screen w-full items-stretch bg-[#F4FAF7]">
      <AcademicBackground />

      <div className="relative z-10 hidden lg:flex lg:w-[50%] xl:w-[48%] flex-col justify-between p-12 xl:p-16">
        <Logo />

        <div className="space-y-9">
          {heroTitle && (
            <div className="space-y-4 max-w-[380px]">
              <h2 className="text-[2.1rem] xl:text-[2.4rem] font-bold leading-[1.18] tracking-[-0.03em] text-[#052E1C]">
                {heroTitle}
              </h2>
              {heroSubtitle && (
                <p className="text-[0.9rem] leading-relaxed text-[#3D7A5C]/75 font-normal">
                  {heroSubtitle}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            {[
              { value: "100%", label: "Paperless" },
              { value: "3×", label: "Faster setup" },
              { value: "AI", label: "Powered" },
            ].map(({ value, label }, i) => (
              <div
                key={label}
                className={`flex-1 rounded-2xl border px-4 py-4 ${
                  i === 1
                    ? "bg-[#0A6640] border-[#0A6640]"
                    : "bg-white/55 border-[#B6DFC8]"
                } backdrop-blur-sm`}
              >
                <p
                  className={`text-[1.2rem] font-bold tracking-tight ${i === 1 ? "text-white" : "text-[#052E1C]"}`}
                >
                  {value}
                </p>
                <p
                  className={`text-[0.7rem] mt-0.5 font-semibold tracking-wide uppercase ${i === 1 ? "text-emerald-200" : "text-[#3D7A5C]/60"}`}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex -space-x-2.5">
              {[
                { bg: "#A7F3D0", text: "#052E1C", initials: "KS" },
                { bg: "#6EE7B7", text: "#052E1C", initials: "PM" },
                { bg: "#34D399", text: "#fff", initials: "RA" },
                { bg: "#0A6640", text: "#fff", initials: "+4" },
              ].map(({ bg, text, initials }, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold"
                  style={{ backgroundColor: bg, color: text, zIndex: 4 - i }}
                >
                  {initials}
                </div>
              ))}
            </div>
            <p className="text-[0.75rem] text-[#3D7A5C]/80 font-medium">
              Trusted by{" "}
              <span className="text-[#052E1C] font-semibold">2,400+</span>{" "}
              institutions
            </p>
          </div>
        </div>

        <p className="text-[0.7rem] text-[#3D7A5C]/45 font-medium">
          © 2025 AdminPortal · All rights reserved
        </p>
      </div>

      <div
        className={`relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8 lg:py-12 ${wide ? "lg:px-10 xl:px-14" : "lg:px-12 xl:px-16"}`}
      >
        <div className="flex lg:hidden mb-8">
          <Logo />
        </div>

        <div className={`w-full ${wide ? "max-w-[520px]" : "max-w-[420px]"}`}>
          <div className="rounded-3xl bg-white/85 backdrop-blur-2xl border border-[#D1EEE0]/80 shadow-[0_4px_40px_rgba(10,102,64,0.10),0_1px_6px_rgba(10,102,64,0.06)] p-8 sm:p-10">
            <div className="mb-7">
              <h1 className="text-[1.55rem] font-bold tracking-[-0.025em] text-[#052E1C] leading-tight">
                {title}
              </h1>
              <p className="mt-1.5 text-[0.85rem] text-[#6B7280] font-normal leading-relaxed">
                {subtitle}
              </p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0A6640] shadow-[0_2px_14px_rgba(10,102,64,0.32)]">
        <GraduationCap className="h-5 w-5 text-white" strokeWidth={2} />
      </div>
      <span className="text-[0.75rem] font-black tracking-[0.2em] text-[#052E1C] uppercase">
        Admin<span className="text-[#0A6640]">Portal</span>
      </span>
    </div>
  );
}

function AcademicBackground() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1440 900"
    >
      <defs>
        <radialGradient id="rg1" cx="18%" cy="18%" r="48%">
          <stop offset="0%" stopColor="#C6F0DA" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#F4FAF7" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rg2" cx="82%" cy="88%" r="42%">
          <stop offset="0%" stopColor="#A7F3D0" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#F4FAF7" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rg3" cx="50%" cy="0%" r="38%">
          <stop offset="0%" stopColor="#ECFDF5" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#F4FAF7" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rg4" cx="92%" cy="10%" r="30%">
          <stop offset="0%" stopColor="#D1FAE5" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#F4FAF7" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="100%" height="100%" fill="#F4FAF7" />
      <rect width="100%" height="100%" fill="url(#rg1)" />
      <rect width="100%" height="100%" fill="url(#rg2)" />
      <rect width="100%" height="100%" fill="url(#rg3)" />
      <rect width="100%" height="100%" fill="url(#rg4)" />

      <path
        d="M -80 480 C 160 410 400 490 640 420 C 880 350 1080 440 1320 375 C 1400 350 1460 360 1520 340"
        stroke="#10B981"
        strokeWidth="1.5"
        fill="none"
        strokeOpacity="0.16"
      />
      <path
        d="M -80 600 C 180 530 440 610 700 535 C 940 460 1120 545 1360 475 C 1430 452 1480 460 1520 445"
        stroke="#059669"
        strokeWidth="1.1"
        fill="none"
        strokeOpacity="0.11"
      />
      <path
        d="M -80 720 C 200 650 480 730 750 655 C 1000 580 1180 660 1400 600"
        stroke="#34D399"
        strokeWidth="0.9"
        fill="none"
        strokeOpacity="0.09"
      />
      <path
        d="M -80 180 C 180 120 420 185 680 115 C 920 48 1100 130 1340 70 C 1420 50 1470 58 1520 42"
        stroke="#10B981"
        strokeWidth="1.2"
        fill="none"
        strokeOpacity="0.13"
      />
      <path
        d="M -80 320 C 200 255 460 330 720 260 C 960 192 1140 272 1360 210"
        stroke="#059669"
        strokeWidth="0.9"
        fill="none"
        strokeOpacity="0.09"
      />

      <circle
        cx="120"
        cy="260"
        r="130"
        fill="none"
        stroke="#10B981"
        strokeWidth="0.9"
        strokeOpacity="0.1"
      />
      <circle
        cx="120"
        cy="260"
        r="220"
        fill="none"
        stroke="#059669"
        strokeWidth="0.6"
        strokeOpacity="0.065"
      />
      <circle
        cx="120"
        cy="260"
        r="310"
        fill="none"
        stroke="#34D399"
        strokeWidth="0.4"
        strokeOpacity="0.04"
      />

      <circle
        cx="1320"
        cy="680"
        r="150"
        fill="none"
        stroke="#34D399"
        strokeWidth="0.9"
        strokeOpacity="0.1"
      />
      <circle
        cx="1320"
        cy="680"
        r="240"
        fill="none"
        stroke="#10B981"
        strokeWidth="0.6"
        strokeOpacity="0.065"
      />
      <circle
        cx="1320"
        cy="680"
        r="340"
        fill="none"
        stroke="#059669"
        strokeWidth="0.4"
        strokeOpacity="0.04"
      />

      <path
        d="M 720 -20 C 700 80 730 200 710 320 C 690 440 720 540 700 660 C 680 760 710 840 700 920"
        stroke="#10B981"
        strokeWidth="0.9"
        fill="none"
        strokeOpacity="0.08"
      />

      <circle cx="295" cy="165" r="2.8" fill="#10B981" fillOpacity="0.22" />
      <circle cx="520" cy="295" r="2.2" fill="#059669" fillOpacity="0.2" />
      <circle cx="790" cy="185" r="2.5" fill="#34D399" fillOpacity="0.18" />
      <circle cx="1040" cy="355" r="2.8" fill="#10B981" fillOpacity="0.16" />
      <circle cx="660" cy="505" r="2.2" fill="#059669" fillOpacity="0.14" />
      <circle cx="390" cy="625" r="2.5" fill="#34D399" fillOpacity="0.16" />
      <circle cx="930" cy="665" r="2.8" fill="#10B981" fillOpacity="0.13" />
      <circle cx="1220" cy="480" r="2" fill="#059669" fillOpacity="0.13" />
    </svg>
  );
}
