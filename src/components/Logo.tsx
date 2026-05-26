type LogoProps = {
  size?: number;
  withText?: boolean;
  className?: string;
};

export default function Logo({ size = 56, withText = true, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Pre Visa Hub logo"
      >
        <circle cx="100" cy="100" r="96" fill="#fff" stroke="#E97A2E" strokeWidth="8" />
        <circle cx="100" cy="100" r="84" fill="#fff" stroke="#1E3A8A" strokeWidth="3" />
        {/* Book base */}
        <path
          d="M40 130 Q100 110 160 130 L160 158 Q100 138 40 158 Z"
          fill="#E97A2E"
        />
        <path d="M100 122 L100 152" stroke="#fff" strokeWidth="2" />
        {/* Globe */}
        <circle cx="100" cy="92" r="32" fill="#E97A2E" />
        <path
          d="M68 92 Q100 76 132 92 M68 92 Q100 108 132 92 M100 60 L100 124 M84 65 Q92 92 84 119 M116 65 Q108 92 116 119"
          stroke="#fff"
          strokeWidth="2"
          fill="none"
        />
        {/* Graduation cap */}
        <path d="M60 58 L100 44 L140 58 L100 72 Z" fill="#1E3A8A" />
        <path d="M100 72 L100 84" stroke="#1E3A8A" strokeWidth="3" />
        <path d="M126 64 L126 80 Q126 88 100 88 Q74 88 74 80 L74 64" fill="#1E3A8A" />
        <circle cx="138" cy="58" r="3" fill="#E97A2E" />
        {/* Arrow */}
        <path
          d="M118 100 Q132 92 142 100 L138 96 M142 100 L138 104"
          stroke="#1E3A8A"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      {withText && (
        <div className="leading-tight">
          <div className="font-display font-extrabold text-lg sm:text-xl">
            <span className="text-brand-navy">PRE</span>
            <span className="text-brand-orange">·</span>
            <span className="text-brand-navy">VISA </span>
            <span className="text-brand-orange">HUB</span>
          </div>
          <div className="text-[10px] sm:text-xs font-semibold tracking-widest text-slate-600">
            STUDY ABROAD CONSULTANT
          </div>
        </div>
      )}
    </div>
  );
}
