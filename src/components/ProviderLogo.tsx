import React from 'react';
import { findProvider } from '../data/providerDirectory';

interface ProviderLogoProps {
  providerId: string;
  name?: string;
  customColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 rounded-[7px] text-[10px]',
  sm: 'w-8 h-8 sm:w-9 sm:h-9 rounded-[9px] sm:rounded-[10px] text-xs',
  md: 'w-10 h-10 sm:w-11 sm:h-11 rounded-[11px] sm:rounded-[12px] text-sm',
  lg: 'w-12 h-12 sm:w-13 sm:h-13 rounded-[13px] sm:rounded-[14px] text-base',
  xl: 'w-14 h-14 sm:w-16 sm:h-16 rounded-[16px] sm:rounded-[18px] text-lg',
};

export const ProviderLogo: React.FC<ProviderLogoProps> = ({
  providerId,
  name = '',
  customColor,
  size = 'md',
  className = '',
  showBorder = true,
}) => {
  // Normalize provider lookup
  const cleanId = (providerId || '').toLowerCase().trim();
  const provider = findProvider(cleanId) || (name ? findProvider(name) : undefined);

  // Border styling to ensure white-backed logos look crisp in light mode and dark mode
  const borderClass = showBorder
    ? 'border border-black/[0.06] dark:border-white/[0.08]'
    : '';

  const baseClass = `${SIZE_MAP[size]} shrink-0 flex items-center justify-center overflow-hidden select-none font-bold relative shadow-2xs ${borderClass} ${className}`;

  // ==========================================
  // 1. E-WALLETS
  // ==========================================
  if (cleanId === 'gcash' || cleanId === 'gcredit' || cleanId === 'gloan') {
    return (
      <div className={`${baseClass} bg-[#007DFE] text-white`} title="GCash">
        <svg viewBox="0 0 48 48" className="w-full h-full p-1.5" aria-label="GCash logo">
          <circle cx="21" cy="24" r="13" fill="#005CE6" opacity="0.45" />
          <path
            d="M26.5 23.5H21v3.2h3.4c-.5 1.8-2.1 3-4.1 3-2.6 0-4.6-2-4.6-4.7s2-4.7 4.6-4.7c1.3 0 2.5.5 3.3 1.4l2.5-2.3C24.6 17.9 22.6 17 20.3 17c-4.6 0-8.2 3.6-8.2 8s3.6 8 8.2 8c4.4 0 7.7-3.1 7.7-7.8 0-.6-.1-1.2-.2-1.7h-1.3z"
            fill="#FFFFFF"
          />
          <path
            d="M30.6 19.6a6.8 6.8 0 0 1 0 8.8"
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
    cleanId === 'maya' ||
    cleanId === 'maya_bank' ||
    cleanId === 'maya_savings' ||
    cleanId === 'maya_credit' ||
    cleanId === 'maya_loan'
  ) {
    return (
      <div className={`${baseClass} bg-[#0B0B0B] text-white`} title="Maya">
        <div className="flex flex-col items-center justify-center">
          <span className="text-[#2CE59B] font-extrabold tracking-tighter text-[13px] sm:text-[14px] leading-none">
            maya
          </span>
          {cleanId === 'maya_bank' && (
            <span className="text-[7.5px] uppercase tracking-widest text-neutral-300 font-semibold mt-0.5">
              BANK
            </span>
          )}
        </div>
      </div>
    );
  }

  if (cleanId === 'grabpay') {
    return (
      <div className={`${baseClass} bg-[#00B14F] text-white`} title="GrabPay">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <text
            x="24"
            y="29"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="14"
            fontWeight="800"
            fontFamily="Plus Jakarta Sans, sans-serif"
            letterSpacing="-0.5"
          >
            Grab
          </text>
        </svg>
      </div>
    );
  }

  if (cleanId === 'shopeepay' || cleanId === 'spaylater' || cleanId === 'sloan') {
    return (
      <div className={`${baseClass} bg-[#EE4D2D] text-white`} title="ShopeePay">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Shopping bag outline */}
          <path
            d="M14 16h20v22a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V16z"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.6"
          />
          <path
            d="M19 16v-4a5 5 0 0 1 10 0v4"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          {/* S curve inside bag */}
          <path
            d="M26.5 22.5c-.5-.8-1.4-1.2-2.5-1.2-1.6 0-2.6 1-2.6 2.2 0 2.6 5.2 2.2 5.2 5 0 1.5-1.2 2.5-2.8 2.5-1.6 0-2.6-.8-3.1-2"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  if (cleanId === 'coins_ph' || cleanId === 'coins') {
    return (
      <div className={`${baseClass} bg-[#0052FF] text-white`} title="Coins.ph">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="14" fill="none" stroke="#FFFFFF" strokeWidth="4.5" />
          <path
            d="M28 17.5a9.5 9.5 0 1 0 0 13"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx="24" cy="24" r="4.5" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'palawanpay') {
    return (
      <div className={`${baseClass} bg-white text-[#0F6B36]`} title="PalawanPay">
        <svg viewBox="0 0 48 48" className="w-full h-full p-1.5">
          <path d="M12 14h11c3.5 0 6 2 6 5.5s-2.5 5.5-6 5.5H12V14z" fill="#FACC15" />
          <path
            d="M19 37l4.5-23h9c5 0 8 3 7.2 7.5-.8 4.5-4.2 7.5-9.2 7.5h-4.8L23.8 37H19z"
            fill="#0F6B36"
          />
          <circle cx="29.5" cy="21.5" r="2.5" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'diskartech') {
    return (
      <div className={`${baseClass} bg-[#00A651] text-white`} title="DiskarTech">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <path
            d="M14 11h11c7.2 0 13 5.8 13 13s-5.8 13-13 13H14V11z"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="4.5"
            strokeLinejoin="round"
          />
          <circle cx="25" cy="24" r="5" fill="#FFCC00" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'bayad') {
    return (
      <div className={`${baseClass} bg-[#FF6A00] text-white`} title="Bayad">
        <svg viewBox="0 0 48 48" className="w-full h-full p-1.5">
          <circle cx="24" cy="24" r="16" fill="#003882" />
          <text
            x="24"
            y="30"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="18"
            fontWeight="900"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            B
          </text>
        </svg>
      </div>
    );
  }

  if (cleanId === 'alleasy') {
    return (
      <div className={`${baseClass} bg-[#003366] text-white`} title="AllEasy">
        <svg viewBox="0 0 48 48" className="w-full h-full p-1.5">
          <circle cx="19" cy="24" r="9" fill="#FF6B00" />
          <circle cx="29" cy="24" r="9" fill="#00A3E0" opacity="0.85" />
          <path d="M24 16v16" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'bananapay') {
    return (
      <div className={`${baseClass} bg-[#FFD100] text-neutral-950`} title="BananaPay">
        <svg viewBox="0 0 48 48" className="w-full h-full p-1.5">
          <path
            d="M34 14c-8 0-18 6-20 18 6-2 16-6 20-18z"
            fill="#111111"
            stroke="#111111"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="18" cy="30" r="2.5" fill="#FFD100" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'starpay') {
    return (
      <div className={`${baseClass} bg-[#E51937] text-white`} title="StarPay">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <polygon
            points="24,8 28.5,18.5 39.5,19.5 31,27.5 33.5,38.5 24,32.5 14.5,38.5 17,27.5 8.5,19.5 19.5,18.5"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    );
  }

  if (cleanId === 'bizmoto') {
    return (
      <div className={`${baseClass} bg-[#FF6B00] text-white`} title="Bizmoto">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <path
            d="M12 24l8-10h8l-8 10 10 10h-8z"
            fill="#FFFFFF"
          />
          <circle cx="34" cy="24" r="4.5" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'toktok_wallet' || cleanId === 'toktok') {
    return (
      <div className={`${baseClass} bg-[#FF5722] text-white`} title="Toktok Wallet">
        <svg viewBox="0 0 48 48" className="w-full h-full p-1.5">
          <rect x="10" y="14" width="28" height="20" rx="5" fill="#FFFFFF" />
          <path d="M18 19h12M24 19v10" stroke="#FF5722" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'topwallet') {
    return (
      <div className={`${baseClass} bg-[#002B49] text-[#00E5FF]`} title="Topwallet">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <path
            d="M12 16h24v18a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3V16z"
            fill="none"
            stroke="#00E5FF"
            strokeWidth="3"
          />
          <path d="M24 16v12M18 22l6-6 6 6" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'wise') {
    return (
      <div className={`${baseClass} bg-[#9FE870] text-[#163300]`} title="Wise">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Wise fast flag chevron */}
          <path
            d="M13 14l6.5 13.5L25 14h-5.5l-3 6.5-1.5-6.5H13zm9 10l3.5 10H33L26 24h-4z"
            fill="#163300"
          />
        </svg>
      </div>
    );
  }

  if (cleanId === 'alipay_plus' || cleanId === 'alipay') {
    return (
      <div className={`${baseClass} bg-[#1677FF] text-white`} title="Alipay+">
        <svg viewBox="0 0 48 48" className="w-full h-full p-1.5">
          <circle cx="24" cy="24" r="16" fill="#0E5CD5" />
          <text
            x="24"
            y="30"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="18"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            支
          </text>
        </svg>
      </div>
    );
  }

  // ==========================================
  // B. DIGITAL BANKS
  // ==========================================
  if (
    cleanId === 'gotyme' ||
    cleanId === 'gotyme_bank' ||
    cleanId === 'gotyme_wallet' ||
    cleanId === 'gotyme_save'
  ) {
    return (
      <div className={`${baseClass} bg-[#00F0FF] text-[#141923]`} title="GoTyme Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <circle cx="31" cy="24" r="11" fill="#00C4D6" opacity="0.6" />
          <text
            x="24"
            y="29"
            textAnchor="middle"
            fill="#141923"
            fontSize="16"
            fontWeight="900"
            fontFamily="Plus Jakarta Sans, sans-serif"
            letterSpacing="-0.8"
          >
            GO
          </text>
        </svg>
      </div>
    );
  }

  if (cleanId === 'maribank') {
    return (
      <div className={`${baseClass} bg-[#FF5722] text-white`} title="MariBank Philippines">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="15" fill="#E64A19" />
          <path
            d="M16 31V17l8 8 8-8v14"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  if (cleanId === 'tonik' || cleanId === 'tonik_loan') {
    return (
      <div className={`${baseClass} bg-[#7C3AED] text-white`} title="Tonik Digital Bank">
        <span className="font-extrabold text-[12px] sm:text-[13px] tracking-tight">tonik</span>
      </div>
    );
  }

  if (cleanId === 'uniondigital') {
    return (
      <div className={`${baseClass} bg-[#FF6200] text-white`} title="UnionDigital Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <rect x="11" y="11" width="26" height="26" rx="6" fill="#E55600" />
          <text
            x="24"
            y="28"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="14"
            fontWeight="900"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            UD
          </text>
        </svg>
      </div>
    );
  }

  if (cleanId === 'uno_digital_bank' || cleanId === 'uno') {
    return (
      <div className={`${baseClass} bg-[#6C1352] text-white`} title="UNO Digital Bank">
        <span className="font-extrabold text-[12px] sm:text-[13px] tracking-tighter">uno.</span>
      </div>
    );
  }

  if (cleanId === 'cimb') {
    return (
      <div className={`${baseClass} bg-[#D71920] text-white`} title="CIMB Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <polygon
            points="14,14 34,14 37,24 34,34 14,34 11,24"
            fill="#FFFFFF"
          />
          <polygon
            points="16,16 32,16 34.5,24 32,32 16,32 13.5,24"
            fill="#D71920"
          />
          <text
            x="24"
            y="27.5"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="8.5"
            fontWeight="900"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            CIMB
          </text>
        </svg>
      </div>
    );
  }

  if (cleanId === 'ownbank') {
    return (
      <div className={`${baseClass} bg-[#111111] text-[#E5FF00]`} title="OwnBank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="20" cy="24" r="8" fill="none" stroke="#E5FF00" strokeWidth="3.5" />
          <path
            d="M26 16h6a6 6 0 0 1 0 12h-6V16z"
            fill="none"
            stroke="#E5FF00"
            strokeWidth="3.5"
          />
        </svg>
      </div>
    );
  }

  if (cleanId === 'netbank') {
    return (
      <div className={`${baseClass} bg-[#0B44CD] text-white`} title="Netbank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <path
            d="M15 32V16l18 16V16"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="15" cy="16" r="2.5" fill="#00E5FF" />
          <circle cx="33" cy="32" r="2.5" fill="#00E5FF" />
        </svg>
      </div>
    );
  }

  // ==========================================
  // C. TRADITIONAL BANKS
  // ==========================================
  if (cleanId === 'bdo' || cleanId === 'bdo_credit') {
    return (
      <div className={`${baseClass} bg-[#0038A8] text-[#FACC15]`} title="BDO Unibank">
        <span className="font-extrabold text-[12px] sm:text-[13px] tracking-wider text-[#FACC15]">
          BDO
        </span>
      </div>
    );
  }

  if (cleanId === 'bpi' || cleanId === 'bpi_credit' || cleanId === 'bpi_loan') {
    return (
      <div className={`${baseClass} bg-[#B11116] text-white`} title="BPI">
        <div className="flex flex-col items-center justify-center">
          <svg viewBox="0 0 32 32" className="w-4 h-4 mb-0.5">
            <path
              d="M16 4l10 5v9c0 6-5 10-10 11-5-1-10-5-10-11V9l10-5z"
              fill="#FFFFFF"
              opacity="0.9"
            />
            <path d="M16 7l7 3.5v6.5c0 4.5-3.5 7.5-7 8.5-3.5-1-7-4-7-8.5v-6.5l7-3.5z" fill="#B11116" />
          </svg>
          <span className="font-black text-[10px] tracking-wider leading-none">BPI</span>
        </div>
      </div>
    );
  }

  if (cleanId === 'metrobank' || cleanId === 'metrobank_credit') {
    return (
      <div className={`${baseClass} bg-[#004A99] text-white`} title="Metrobank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Diamond monogram logo */}
          <polygon points="24,10 36,24 24,38 12,24" fill="#0066CC" />
          <polygon points="24,14 32,24 24,34 16,24" fill="#FFFFFF" />
          <polygon points="24,18 28,24 24,30 20,24" fill="#004A99" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'landbank') {
    return (
      <div className={`${baseClass} bg-[#006837] text-white`} title="LandBank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="14" fill="#008844" />
          <path
            d="M24 16c-4 5-4 12 0 16 4-4 4-11 0-16z"
            fill="#FFD200"
          />
          <path d="M16 26c4-1 9 1 12 5" stroke="#FFFFFF" strokeWidth="2" fill="none" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'chinabank') {
    return (
      <div className={`${baseClass} bg-[#A30014] text-white`} title="China Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="13" fill="none" stroke="#FFFFFF" strokeWidth="3" />
          <rect x="18" y="18" width="12" height="12" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
          <text
            x="24"
            y="27"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="9"
            fontWeight="bold"
          >
            CBC
          </text>
        </svg>
      </div>
    );
  }

  if (cleanId === 'rcbc') {
    return (
      <div className={`${baseClass} bg-[#003DA5] text-white`} title="RCBC">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <polygon points="24,8 37,16 37,32 24,40 11,32 11,16" fill="#D4AF37" opacity="0.4" />
          <polygon points="24,11 34,17 34,31 24,37 14,31 14,17" fill="#002D80" />
          <text
            x="24"
            y="27.5"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="9.5"
            fontWeight="900"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            RCBC
          </text>
        </svg>
      </div>
    );
  }

  if (cleanId === 'security_bank') {
    return (
      <div className={`${baseClass} bg-[#00857C] text-white`} title="Security Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="14" fill="#006962" />
          {/* Dual ribbon knot S */}
          <path
            d="M17 19c0-3 3-5 7-5s7 2 7 5c0 5-14 3-14 8 0 3 3 5 7 5s7-2 7-5"
            fill="none"
            stroke="#99D6D0"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  if (cleanId === 'pnb') {
    return (
      <div className={`${baseClass} bg-[#003A70] text-[#E3A824]`} title="Philippine National Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="14" fill="#002B54" stroke="#E3A824" strokeWidth="2" />
          <text
            x="24"
            y="28"
            textAnchor="middle"
            fill="#E3A824"
            fontSize="10"
            fontWeight="900"
            fontFamily="Plus Jakarta Sans, sans-serif"
            letterSpacing="0.5"
          >
            PNB
          </text>
        </svg>
      </div>
    );
  }

  if (cleanId === 'unionbank' || cleanId === 'unionbank_credit') {
    return (
      <div className={`${baseClass} bg-[#F37021] text-white`} title="UnionBank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <rect x="12" y="12" width="10" height="24" rx="2" fill="#FFFFFF" />
          <rect x="26" y="12" width="10" height="24" rx="2" fill="#FFFFFF" />
          <rect x="18" y="22" width="12" height="14" rx="2" fill="#FFFFFF" opacity="0.8" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'dbp') {
    return (
      <div className={`${baseClass} bg-[#002D62] text-[#FFC72C]`} title="Development Bank of the Philippines">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="14" fill="#001F44" stroke="#FFC72C" strokeWidth="2.5" />
          <path d="M24 14v20M17 24h14" stroke="#FFC72C" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="24" cy="24" r="5" fill="#FFC72C" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'eastwest') {
    return (
      <div className={`${baseClass} bg-[#5B2C86] text-white`} title="EastWest Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="14" fill="#D9007E" opacity="0.3" />
          <text
            x="24"
            y="28"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="12"
            fontWeight="900"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            EW
          </text>
        </svg>
      </div>
    );
  }

  if (cleanId === 'aub') {
    return (
      <div className={`${baseClass} bg-[#8B0000] text-[#FFD700]`} title="Asia United Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <path
            d="M14 34L24 14l10 20h-6l-4-9-4 9z"
            fill="#FFD700"
          />
        </svg>
      </div>
    );
  }

  if (cleanId === 'bank_of_commerce') {
    return (
      <div className={`${baseClass} bg-[#DE1A22] text-white`} title="Bank of Commerce">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="13" fill="#B31017" />
          <path d="M17 18h14v4H17zM17 26h10v4H17z" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'pbcom') {
    return (
      <div className={`${baseClass} bg-[#C8102E] text-white`} title="PBCOM">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="14" fill="#A00D24" />
          <path
            d="M17 16h8c3 0 5 1.5 5 4s-2 4-5 4h-8v-8zm0 10h9c3 0 5 1.5 5 4s-2 4-5 4h-9V26z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    );
  }

  if (cleanId === 'psbank') {
    return (
      <div className={`${baseClass} bg-[#00457C] text-white`} title="PSBank">
        <div className="flex flex-col items-center justify-center">
          <div className="w-3.5 h-1.5 bg-[#FF6A00] rounded-xs mb-1" />
          <span className="font-extrabold text-[10px] tracking-tight">PSBank</span>
        </div>
      </div>
    );
  }

  if (cleanId === 'maybank_ph' || cleanId === 'maybank') {
    return (
      <div className={`${baseClass} bg-[#FFD100] text-black`} title="Maybank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Maybank tiger head silhouette */}
          <path
            d="M14 19c2-5 7-6 10-6s8 1 10 6c-2 2-3 4-3 7 0 5-3 8-7 8s-7-3-7-8c0-3-1-5-3-7z"
            fill="#111111"
          />
          <circle cx="20" cy="22" r="1.5" fill="#FFD100" />
          <circle cx="28" cy="22" r="1.5" fill="#FFD100" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'veterans_bank') {
    return (
      <div className={`${baseClass} bg-[#002244] text-[#E5A823]`} title="Philippine Veterans Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <path d="M14 14l10 20 10-20h-6l-4 9-4-9z" fill="#E5A823" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'philtrust') {
    return (
      <div className={`${baseClass} bg-[#1A365D] text-[#D4AF37]`} title="Philtrust Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Temple seal */}
          <path d="M12 20h24v3H12zm2 5h4v7h-4zm8 0h4v7h-4zm8 0h4v7h-4zm-8-11l14 5H10z" fill="#D4AF37" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'sterling_bank') {
    return (
      <div className={`${baseClass} bg-[#005596] text-white`} title="Sterling Bank of Asia">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <polygon points="24,12 27,21 36,21 29,26 31,35 24,30 17,35 19,26 12,21 21,21" fill="#E2E8F0" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'allbank') {
    return (
      <div className={`${baseClass} bg-[#007A3D] text-white`} title="AllBank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <path d="M14 24l8-8v16l-8-8zm12 0l8-8v16l-8-8z" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'citysavings') {
    return (
      <div className={`${baseClass} bg-[#F37021] text-white`} title="City Savings Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="13" fill="#D6580D" />
          <path d="M17 24c0-5 3-9 7-9s7 4 7 9-3 9-7 9-7-4-7-9z" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'cbs') {
    return (
      <div className={`${baseClass} bg-[#A30014] text-white`} title="China Bank Savings">
        <div className="flex flex-col items-center justify-center">
          <div className="w-3.5 h-1.5 bg-neutral-200 rounded-xs mb-0.5" />
          <span className="font-extrabold text-[10px] tracking-tight">CBS</span>
        </div>
      </div>
    );
  }

  if (cleanId === 'equicom') {
    return (
      <div className={`${baseClass} bg-[#E31837] text-white`} title="Equicom Savings Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="19" cy="24" r="7" fill="none" stroke="#FFFFFF" strokeWidth="2.8" />
          <circle cx="29" cy="24" r="7" fill="none" stroke="#FFFFFF" strokeWidth="2.8" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'bank_of_makati') {
    return (
      <div className={`${baseClass} bg-[#008037] text-white`} title="Bank of Makati">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="14" fill="#00662C" />
          <text
            x="24"
            y="28"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="bold"
          >
            BMI
          </text>
        </svg>
      </div>
    );
  }

  if (cleanId === 'card_bank' || cleanId === 'card_sme_bank') {
    const isSme = cleanId === 'card_sme_bank';
    return (
      <div className={`${baseClass} ${isSme ? 'bg-[#005A32]' : 'bg-[#00703C]'} text-white`} title={isSme ? 'CARD SME Bank' : 'CARD Bank'}>
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Tree emblem */}
          <circle cx="24" cy="18" r="8" fill="#8CE071" opacity="0.8" />
          <rect x="22" y="24" width="4" height="12" fill="#FFFFFF" />
          <path d="M16 28h16" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'cebuana_rural_bank' || cleanId === 'cebuana_lhuillier') {
    return (
      <div className={`${baseClass} bg-[#B5121B] text-[#FFB81C]`} title="Cebuana Lhuillier">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="14" fill="none" stroke="#FFB81C" strokeWidth="3" />
          <text
            x="24"
            y="29"
            textAnchor="middle"
            fill="#FFB81C"
            fontSize="13"
            fontWeight="900"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            CL
          </text>
        </svg>
      </div>
    );
  }

  if (cleanId === 'rb_guinobatan') {
    return (
      <div className={`${baseClass} bg-[#0D5C3A] text-[#E5C158]`} title="Rural Bank of Guinobatan">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <polygon points="24,12 36,32 12,32" fill="#E5C158" opacity="0.8" />
          <circle cx="24" cy="24" r="4" fill="#0D5C3A" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'bangko_mabuhay') {
    return (
      <div className={`${baseClass} bg-[#00838F] text-[#FFB300]`} title="Bangko Mabuhay">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="7" fill="#FFB300" />
          <path d="M24 10v4M24 34v4M10 24h4M34 24h4" stroke="#FFB300" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'camalig_bank') {
    return (
      <div className={`${baseClass} bg-[#195E38] text-[#F39C12]`} title="Camalig Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Mayon volcano cone */}
          <polygon points="24,12 37,34 11,34" fill="#F39C12" />
          <polygon points="24,12 28,20 20,20" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'cantilan_bank') {
    return (
      <div className={`${baseClass} bg-[#024E82] text-[#F57C00]`} title="Cantilan Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Ocean wave */}
          <path
            d="M10 28c5 0 7-8 14-8s9 8 14 8"
            fill="none"
            stroke="#F57C00"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  if (cleanId === 'ldb') {
    return (
      <div className={`${baseClass} bg-[#0D47A1] text-[#FFD600]`} title="Luzon Development Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <polygon points="20,12 20,34 32,23" fill="#FFD600" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'pbb') {
    return (
      <div className={`${baseClass} bg-[#A71930] text-white`} title="Philippine Business Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <rect x="12" y="16" width="24" height="16" rx="4" fill="none" stroke="#FFFFFF" strokeWidth="3" />
          <text
            x="24"
            y="27.5"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="8.5"
            fontWeight="bold"
          >
            PBB
          </text>
        </svg>
      </div>
    );
  }

  if (cleanId === 'wealthbank') {
    return (
      <div className={`${baseClass} bg-[#4A154B] text-[#FFD700]`} title="Wealth Development Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <polygon points="24,12 36,24 24,36 12,24" fill="none" stroke="#FFD700" strokeWidth="3" />
          <text
            x="24"
            y="28"
            textAnchor="middle"
            fill="#FFD700"
            fontSize="12"
            fontWeight="900"
          >
            W
          </text>
        </svg>
      </div>
    );
  }

  if (cleanId === 'sun_savings_bank') {
    return (
      <div className={`${baseClass} bg-[#F57C00] text-white`} title="Sun Savings Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="8" fill="#FFF3E0" />
          <path d="M24 10v4M24 34v4M10 24h4M34 24h4" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'malayan_bank') {
    return (
      <div className={`${baseClass} bg-[#1565C0] text-white`} title="Malayan Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <polygon points="24,12 34,32 14,32" fill="#E53935" />
          <polygon points="24,17 31,31 17,31" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'rang_ay_bank') {
    return (
      <div className={`${baseClass} bg-[#2E7D32] text-[#FFD54F]`} title="Rang-Ay Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Rice stalks */}
          <circle cx="20" cy="18" r="3.5" fill="#FFD54F" />
          <circle cx="28" cy="18" r="3.5" fill="#FFD54F" />
          <circle cx="24" cy="24" r="3.5" fill="#FFD54F" />
          <path d="M24 24v12" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'producers_bank') {
    return (
      <div className={`${baseClass} bg-[#E65100] text-white`} title="Producers Savings Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="14" fill="#BF360C" />
          <path d="M18 16h8c3 0 5 2 5 5s-2 5-5 5h-8v-10z" fill="#FFFFFF" />
          <path d="M18 26v8" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // ==========================================
  // D. INTERNATIONAL BANKS
  // ==========================================
  if (cleanId === 'hsbc') {
    return (
      <div className={`${baseClass} bg-white text-[#DB0011]`} title="HSBC">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* HSBC Bowtie Hexagon Logo */}
          <polygon points="12,24 24,12 24,36" fill="#DB0011" />
          <polygon points="36,24 24,12 24,36" fill="#DB0011" />
          <polygon points="24,12 18,18 30,18" fill="#DB0011" />
          <polygon points="24,36 18,30 30,30" fill="#DB0011" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'standard_chartered') {
    return (
      <div className={`${baseClass} bg-white text-[#008656]`} title="Standard Chartered">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Interlocking helical dynamic knot */}
          <path
            d="M15 28c0 4 3 6 7 6 5 0 9-4 12-8s3-8 0-10-6 2-9 6"
            fill="none"
            stroke="#008656"
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          <path
            d="M33 20c0-4-3-6-7-6-5 0-9 4-12 8s-3 8 0 10 6-2 9-6"
            fill="none"
            stroke="#0099DA"
            strokeWidth="3.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  if (cleanId === 'citibank') {
    return (
      <div className={`${baseClass} bg-[#003B70] text-white`} title="Citibank">
        <div className="flex flex-col items-center justify-center relative">
          {/* Citi red arc */}
          <div className="w-6 h-2 border-t-2 border-[#ED1B2D] rounded-t-full mb-0.5" />
          <span className="font-extrabold text-[12px] sm:text-[13px] tracking-tight">citi</span>
        </div>
      </div>
    );
  }

  if (cleanId === 'bank_of_china') {
    return (
      <div className={`${baseClass} bg-[#B31B1B] text-white`} title="Bank of China">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Ancient coin with '中' emblem */}
          <circle cx="24" cy="24" r="14" fill="none" stroke="#FFFFFF" strokeWidth="3" />
          <rect x="18" y="18" width="12" height="12" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
          <line x1="24" y1="8" x2="24" y2="40" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'bank_of_america') {
    return (
      <div className={`${baseClass} bg-[#012169] text-white`} title="Bank of America">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Bank of America iconic flag stripes */}
          <rect x="12" y="14" width="7" height="6" fill="#E31837" rx="1" />
          <rect x="21" y="14" width="7" height="6" fill="#E31837" rx="1" />
          <rect x="12" y="22" width="7" height="6" fill="#FFFFFF" rx="1" />
          <rect x="21" y="22" width="7" height="6" fill="#FFFFFF" rx="1" />
          <rect x="30" y="14" width="6" height="14" fill="#E31837" rx="1" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'chase') {
    return (
      <div className={`${baseClass} bg-[#117ACA] text-white`} title="JPMorgan Chase">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Chase octagonal geometric mark */}
          <polygon points="19,13 29,13 25,18 19,18" fill="#FFFFFF" />
          <polygon points="35,19 35,29 30,25 30,19" fill="#FFFFFF" />
          <polygon points="29,35 19,35 23,30 29,30" fill="#FFFFFF" />
          <polygon points="13,29 13,19 18,23 18,29" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'deutsche_bank') {
    return (
      <div className={`${baseClass} bg-[#0018A8] text-white`} title="Deutsche Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Deutsche Bank square with slash */}
          <rect x="11" y="11" width="26" height="26" fill="none" stroke="#FFFFFF" strokeWidth="3.5" />
          <line x1="16" y1="32" x2="32" y2="16" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="square" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'mufg') {
    return (
      <div className={`${baseClass} bg-[#ED1C24] text-white`} title="MUFG Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Overlapping circular emblems */}
          <circle cx="21" cy="24" r="10" fill="#FFFFFF" />
          <circle cx="27" cy="24" r="10" fill="#D9D9D9" opacity="0.6" />
          <circle cx="21" cy="24" r="6" fill="#ED1C24" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'mizuho') {
    return (
      <div className={`${baseClass} bg-[#001E62] text-white`} title="Mizuho Bank">
        <div className="flex flex-col items-center justify-center">
          <div className="w-5 h-1.5 bg-[#ED1B2D] rounded-full mb-1" />
          <span className="font-extrabold text-[10px] tracking-tight">MIZUHO</span>
        </div>
      </div>
    );
  }

  if (cleanId === 'shinhan_bank') {
    return (
      <div className={`${baseClass} bg-[#0046FF] text-white`} title="Shinhan Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="13" fill="#0035C8" />
          {/* Shinhan flying golden bird */}
          <path d="M17 26c3-4 8-6 14-4-2 4-5 6-10 6-2 0-3-1-4-2z" fill="#FFD700" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'cathay_united') {
    return (
      <div className={`${baseClass} bg-[#008000] text-white`} title="Cathay United Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Cathay lush tree */}
          <circle cx="24" cy="20" r="10" fill="#2ECC71" />
          <circle cx="18" cy="22" r="6" fill="#27AE60" />
          <circle cx="30" cy="22" r="6" fill="#27AE60" />
          <rect x="22" y="27" width="4" height="9" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'bangkok_bank') {
    return (
      <div className={`${baseClass} bg-[#002244] text-[#E5A823]`} title="Bangkok Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Lotus flower bualuang */}
          <path
            d="M24 12c-4 5-4 12 0 16 4-4 4-11 0-16z"
            fill="#E5A823"
          />
          <path
            d="M17 19c-1 4 1 8 5 9 1-4 0-7-5-9zm14 0c1 4-1 8-5 9-1-4 0-7 5-9z"
            fill="#E5A823"
            opacity="0.8"
          />
        </svg>
      </div>
    );
  }

  if (cleanId === 'uob') {
    return (
      <div className={`${baseClass} bg-[#002060] text-white`} title="United Overseas Bank">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* UOB 5-gate emblem */}
          <rect x="14" y="16" width="3" height="16" fill="#EE3124" />
          <rect x="19" y="16" width="3" height="16" fill="#EE3124" />
          <rect x="24" y="16" width="3" height="16" fill="#EE3124" />
          <rect x="29" y="16" width="3" height="16" fill="#EE3124" />
          <rect x="14" y="22" width="18" height="4" fill="#EE3124" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'anz') {
    return (
      <div className={`${baseClass} bg-[#004165] text-white`} title="ANZ">
        <span className="font-black text-[12px] sm:text-[13px] tracking-widest text-[#009CE8]">
          ANZ
        </span>
      </div>
    );
  }

  if (cleanId === 'ctbc') {
    return (
      <div className={`${baseClass} bg-[#00857C] text-white`} title="CTBC Bank Philippines">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="13" fill="#00665F" />
          <circle cx="24" cy="24" r="7" fill="#E60012" />
        </svg>
      </div>
    );
  }

  // ==========================================
  // E. PAYMENT & REMITTANCE SERVICES
  // ==========================================
  if (cleanId === 'paypal') {
    return (
      <div className={`${baseClass} bg-[#003087] text-white`} title="PayPal">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          {/* Overlapping PP monogram */}
          <path
            d="M17 14h8c4 0 7 2.5 6 7-.8 4-4 6-8 6h-3l-2.5 11h-4.5L17 14z"
            fill="#0079C1"
          />
          <path
            d="M21 18h8c4 0 7 2.5 6 7-.8 4-4 6-8 6h-3l-2.5 11h-4.5L21 18z"
            fill="#00457C"
            opacity="0.8"
          />
        </svg>
      </div>
    );
  }

  if (cleanId === 'palawan_express') {
    return (
      <div className={`${baseClass} bg-[#0F6B36] text-[#FFD200]`} title="Palawan Express">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="14" fill="#FFD200" />
          <path
            d="M19 32l3-16h7c4 0 6 2 5.5 5.5-.6 3.5-3.5 5.5-7.5 5.5h-3.5l-1.5 5H19z"
            fill="#0F6B36"
          />
        </svg>
      </div>
    );
  }

  if (cleanId === 'mlhuillier') {
    return (
      <div className={`${baseClass} bg-[#D32F2F] text-white`} title="MLhuillier">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <polygon points="24,11 36,24 24,37 12,24" fill="#B71C1C" />
          <text
            x="24"
            y="28"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="900"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            ML
          </text>
        </svg>
      </div>
    );
  }

  if (cleanId === 'lbc') {
    return (
      <div className={`${baseClass} bg-[#D32F2F] text-[#FFEB3B]`} title="LBC">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="14" fill="#B71C1C" stroke="#FFEB3B" strokeWidth="2.5" />
          <text
            x="24"
            y="28"
            textAnchor="middle"
            fill="#FFEB3B"
            fontSize="10.5"
            fontWeight="900"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            LBC
          </text>
        </svg>
      </div>
    );
  }

  if (cleanId === 'western_union') {
    return (
      <div className={`${baseClass} bg-[#000000] text-[#FFDD00]`} title="Western Union">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <text
            x="24"
            y="29"
            textAnchor="middle"
            fill="#FFDD00"
            fontSize="15"
            fontWeight="900"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontStyle="italic"
          >
            WU
          </text>
        </svg>
      </div>
    );
  }

  if (cleanId === 'moneygram') {
    return (
      <div className={`${baseClass} bg-[#E31837] text-white`} title="MoneyGram">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="14" fill="#C4122C" />
          <path d="M16 24h16M26 18l6 6-6 6" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'remitly') {
    return (
      <div className={`${baseClass} bg-[#002855] text-[#00C389]`} title="Remitly">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <path
            d="M17 14h8c4.5 0 7 2.5 7 6s-2.5 6-7 6h-3.5L30 34h-5.5l-7.5-7.5V34H17V14z"
            fill="#00C389"
          />
        </svg>
      </div>
    );
  }

  if (cleanId === 'worldremit') {
    return (
      <div className={`${baseClass} bg-[#4A154B] text-white`} title="WorldRemit">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <circle cx="24" cy="24" r="14" fill="#360F37" />
          <text
            x="24"
            y="28"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="11"
            fontWeight="900"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            WR
          </text>
        </svg>
      </div>
    );
  }

  if (cleanId === 'pdax') {
    return (
      <div className={`${baseClass} bg-[#0F172A] text-[#00D2FF]`} title="PDAX">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <polygon points="24,10 36,17 36,31 24,38 12,31 12,17" fill="none" stroke="#00D2FF" strokeWidth="3" />
          <circle cx="24" cy="24" r="4.5" fill="#00D2FF" />
        </svg>
      </div>
    );
  }

  if (cleanId === 'moneybees') {
    return (
      <div className={`${baseClass} bg-[#1A1A1A] text-[#FFB300]`} title="Moneybees">
        <svg viewBox="0 0 48 48" className="w-full h-full p-2">
          <polygon points="24,11 35,17 35,31 24,37 13,31 13,17" fill="#FFB300" />
          <circle cx="24" cy="24" r="5" fill="#1A1A1A" />
        </svg>
      </div>
    );
  }

  // ==========================================
  // F. LEGACY & EXTENDED PRESET LOGOS
  // ==========================================
  if (cleanId === 'seabank') {
    return (
      <div className={`${baseClass} bg-[#FF6600] text-white`} title="SeaBank">
        <span className="font-extrabold text-[11px] sm:text-[12px] tracking-tight">Sea</span>
      </div>
    );
  }

  if (cleanId === 'lazada' || cleanId === 'lazpaylater') {
    return (
      <div
        className={`${baseClass} text-white`}
        title="Lazada"
        style={{
          background: 'linear-gradient(135deg, #FF5E3A 0%, #F50076 55%, #7B1FA2 100%)',
        }}
      >
        <span className="font-extrabold text-[11px] sm:text-[12px] tracking-tight">Laz</span>
      </div>
    );
  }

  if (cleanId === 'hellomoney') {
    return (
      <div className={`${baseClass} bg-[#E53935] text-white`} title="HelloMoney">
        <span className="font-bold text-[9px] tracking-tighter">hello</span>
      </div>
    );
  }

  if (cleanId === 'sss_loan') {
    return (
      <div className={`${baseClass} bg-[#0038A8] text-white`} title="SSS">
        <span className="font-extrabold text-[11px] tracking-wider">SSS</span>
      </div>
    );
  }

  if (cleanId === 'pagibig_loan') {
    return (
      <div className={`${baseClass} bg-[#B11116] text-white`} title="Pag-IBIG">
        <span className="font-bold text-[9.5px] tracking-tight">PAG-IBIG</span>
      </div>
    );
  }

  // ==========================================
  // FALLBACK CLEAN INITIALS BADGE
  // ==========================================
  const displayColor = customColor || provider?.brandColor || '#1E293B';
  const effectiveInitials =
    provider?.fallbackInitials ||
    (name || 'Account')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') ||
    '₱';

  return (
    <div
      className={`${baseClass} text-white`}
      style={{ backgroundColor: displayColor }}
      title={name || provider?.name || 'Account'}
    >
      <span className="font-bold tracking-tight">{effectiveInitials}</span>
    </div>
  );
};
