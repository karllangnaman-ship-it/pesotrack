import React from 'react';

interface ProviderLogoProps {
  providerId: string;
  name?: string;
  customColor?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-8 h-8 sm:w-9 sm:h-9 rounded-[9px] sm:rounded-[10px] text-xs',
  md: 'w-10 h-10 sm:w-11 sm:h-11 rounded-[11px] sm:rounded-[12px] text-sm',
  lg: 'w-11 h-11 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-[13px] text-base',
};

export const ProviderLogo: React.FC<ProviderLogoProps> = ({
  providerId,
  name = 'Account',
  customColor,
  size = 'md',
  className = '',
}) => {
  const baseClass = `${SIZE_MAP[size]} shrink-0 flex items-center justify-center overflow-hidden select-none font-bold relative ${className}`;

  if (providerId === 'gcash' || providerId === 'gcredit' || providerId === 'gloan') {
    return (
      <div className={`${baseClass} bg-[#007DFE] text-white shadow-2xs`}>
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <circle cx="22" cy="24" r="14" fill="#005CE6" opacity="0.45" />
          <path
            d="M27.5 23.5H22v3.2h3.4c-.5 1.8-2.1 3-4.1 3-2.6 0-4.6-2-4.6-4.7s2-4.7 4.6-4.7c1.3 0 2.5.5 3.3 1.4l2.5-2.3C25.6 17.9 23.6 17 21.3 17c-4.6 0-8.2 3.6-8.2 8s3.6 8 8.2 8c4.4 0 7.7-3.1 7.7-7.8 0-.6-.1-1.2-.2-1.7h-1.3z"
            fill="#FFFFFF"
          />
          <path
            d="M31.6 19.6a6.8 6.8 0 0 1 0 8.8"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M34.8 17.2a10.2 10.2 0 0 1 0 13.6"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    );
  }

  if (
    providerId === 'maya' ||
    providerId === 'maya_savings' ||
    providerId === 'maya_credit' ||
    providerId === 'maya_loan'
  ) {
    return (
      <div className={`${baseClass} bg-[#0B0B0B] shadow-2xs`}>
        <span className="text-[#2CE59B] font-extrabold tracking-tight text-[12px] sm:text-[13px] leading-none">
          maya
        </span>
      </div>
    );
  }

  if (providerId === 'gotyme_wallet' || providerId === 'gotyme_save') {
    return (
      <div className={`${baseClass} bg-[#00F0FF] shadow-2xs`}>
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <circle cx="30" cy="24" r="10.5" fill="#00C4D6" opacity="0.55" />
          <text
            x="24"
            y="29"
            textAnchor="middle"
            fill="#141923"
            fontSize="17"
            fontWeight="800"
            fontFamily="Plus Jakarta Sans, sans-serif"
            letterSpacing="-0.8"
          >
            GO
          </text>
        </svg>
      </div>
    );
  }

  if (providerId === 'lazada' || providerId === 'lazpaylater') {
    return (
      <div
        className={`${baseClass} shadow-2xs`}
        style={{
          background: 'linear-gradient(135deg, #FF5E3A 0%, #F50076 55%, #7B1FA2 100%)',
        }}
      >
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <path
            d="M24 37.5L10.5 29.2V16.6L17.2 12.5L24 16.8L30.8 12.5L37.5 16.6V29.2L24 37.5Z"
            fill="#FFFFFF"
          />
          <text
            x="24"
            y="27"
            textAnchor="middle"
            fill="#E5006D"
            fontSize="10.5"
            fontWeight="800"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            Laz
          </text>
        </svg>
      </div>
    );
  }

  if (providerId === 'grabpay') {
    return (
      <div className={`${baseClass} bg-[#00B14F] text-white shadow-2xs`}>
        <span className="font-extrabold tracking-tight text-[12px] sm:text-[13px] leading-none">Grab</span>
      </div>
    );
  }

  if (providerId === 'hellomoney') {
    return (
      <div className={`${baseClass} bg-[#E53935] text-white shadow-2xs`}>
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect
            x="28"
            y="5"
            width="10"
            height="16"
            rx="5"
            transform="rotate(30 28 5)"
            fill="#FFD600"
          />
          <text
            x="8"
            y="24"
            fill="#FFFFFF"
            fontSize="9.5"
            fontWeight="700"
            fontStyle="italic"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            hello
          </text>
          <text
            x="7"
            y="34"
            fill="#FFFFFF"
            fontSize="9.5"
            fontWeight="700"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            money
          </text>
        </svg>
      </div>
    );
  }

  if (providerId === 'joyride') {
    return (
      <div className={`${baseClass} bg-[#0B24A6] text-white shadow-2xs`}>
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <circle cx="15" cy="33" r="4" stroke="#FFFFFF" strokeWidth="2.4" fill="none" />
          <circle cx="33" cy="33" r="4" stroke="#FFFFFF" strokeWidth="2.4" fill="none" />
          <path
            d="M15 33h11l5-10h-5m5 0l3 10M18 23h8l-2 6H16z"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="22" cy="15" r="3" fill="#FFFFFF" />
          <circle cx="28" cy="14" r="2.8" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  if (providerId === 'marcopay') {
    return (
      <div className={`${baseClass} bg-white border border-neutral-200 shadow-2xs`}>
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <circle cx="24" cy="24" r="14" stroke="#00838F" strokeWidth="3.2" fill="none" />
          <path
            d="M13 24h22M15 29h18M16 19h16"
            stroke="#004D61"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="24" cy="14" r="1.5" fill="#00838F" />
          <circle cx="24" cy="34" r="1.5" fill="#00838F" />
        </svg>
      </div>
    );
  }

  if (providerId === 'mcash') {
    return (
      <div className={`${baseClass} bg-white border border-neutral-200 shadow-2xs`}>
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="8" y="13" width="22" height="22" rx="5" fill="#E61919" />
          <path d="M19 18l6 6-6 6-6-6 6-6z" fill="#FFFFFF" />
          <path
            d="M34 18a9 9 0 0 1 0 12M38 15a13 13 0 0 1 0 18"
            stroke="#E61919"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    );
  }

  if (providerId === 'palawanpay') {
    return (
      <div className={`${baseClass} bg-white border border-neutral-200 shadow-2xs`}>
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <path
            d="M12 15h10c3 0 5 1.5 5 4s-2 4-5 4H12v-8z"
            fill="#FACC15"
            opacity="0.85"
          />
          <path
            d="M19 36l4-22h8c4.5 0 7 2.5 6.3 6.5-.7 4-3.8 6.5-8.3 6.5h-4.2L23.5 36H19z"
            fill="#0F6B36"
          />
          <circle cx="28.5" cy="20.5" r="2.3" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  if (providerId === 'shopeepay' || providerId === 'spaylater' || providerId === 'sloan') {
    return (
      <div className={`${baseClass} bg-[#EE4D2D] text-white shadow-2xs`}>
        <span className="font-extrabold text-[14px] sm:text-[15px] tracking-tight">S</span>
      </div>
    );
  }

  if (providerId === 'seabank') {
    return (
      <div className={`${baseClass} bg-[#FF6600] text-white shadow-2xs`}>
        <span className="font-extrabold text-[11px] sm:text-[12px] tracking-tight">Sea</span>
      </div>
    );
  }

  if (providerId === 'bpi' || providerId === 'bpi_credit') {
    return (
      <div className={`${baseClass} bg-[#B11116] text-white shadow-2xs`}>
        <span className="font-extrabold text-[12px] sm:text-[13px] tracking-wider">BPI</span>
      </div>
    );
  }

  if (providerId === 'bdo' || providerId === 'bdo_credit') {
    return (
      <div className={`${baseClass} bg-[#0038A8] text-[#FACC15] shadow-2xs`}>
        <span className="font-extrabold text-[12px] sm:text-[13px] tracking-wider">BDO</span>
      </div>
    );
  }

  if (providerId === 'unionbank' || providerId === 'unionbank_credit') {
    return (
      <div className={`${baseClass} bg-[#F37021] text-white shadow-2xs`}>
        <span className="font-extrabold text-[13px] sm:text-[14px]">UB</span>
      </div>
    );
  }

  if (providerId === 'metrobank' || providerId === 'metrobank_credit') {
    return (
      <div className={`${baseClass} bg-[#004A99] text-white shadow-2xs`}>
        <span className="font-extrabold text-[12px] sm:text-[13px]">MB</span>
      </div>
    );
  }

  if (providerId === 'cimb') {
    return (
      <div className={`${baseClass} bg-[#D71920] text-white shadow-2xs`}>
        <span className="font-extrabold text-[10px] sm:text-[11px]">CIMB</span>
      </div>
    );
  }

  if (providerId === 'tonik') {
    return (
      <div className={`${baseClass} bg-[#7C3AED] text-white shadow-2xs`}>
        <span className="font-extrabold text-[10px] sm:text-[11px]">tonik</span>
      </div>
    );
  }

  const bgColor = customColor || '#1E293B';
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '₱';

  return (
    <div
      className={`${baseClass} text-white shadow-2xs`}
      style={{ backgroundColor: bgColor }}
    >
      <span className="font-bold tracking-tight">{initials}</span>
    </div>
  );
};
