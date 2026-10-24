export function toCentavos(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

export function fromCentavos(centavos: number): number {
  if (!Number.isFinite(centavos)) return 0;
  return Math.round(centavos) / 100;
}

export function addPHP(...amounts: number[]): number {
  const totalCentavos = amounts.reduce((acc, val) => acc + toCentavos(val), 0);
  return fromCentavos(totalCentavos);
}

export function subPHP(a: number, b: number): number {
  return fromCentavos(toCentavos(a) - toCentavos(b));
}

export function clampZeroPHP(amount: number): number {
  return Math.max(0, fromCentavos(toCentavos(amount)));
}

export function roundPHP(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return fromCentavos(toCentavos(amount));
}

export function formatPeso(
  amount: number,
  options?: {
    hide?: boolean;
    compact?: boolean;
    showPlus?: boolean;
  }
): string {
  if (options?.hide) {
    return '₱••••••';
  }

  const safeAmount = fromCentavos(toCentavos(amount));
  const isNegative = safeAmount < 0;
  const absVal = Math.abs(safeAmount);

  let formattedNumber: string;
  if (options?.compact && absVal >= 1_000_000) {
    formattedNumber = `${(absVal / 1_000_000).toFixed(2)}M`;
  } else if (options?.compact && absVal >= 100_000) {
    formattedNumber = `${(absVal / 1_000).toFixed(1)}k`;
  } else {
    formattedNumber = absVal.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (isNegative) {
    return `-₱${formattedNumber}`;
  }
  if (options?.showPlus && safeAmount > 0) {
    return `+₱${formattedNumber}`;
  }
  return `₱${formattedNumber}`;
}

export function formatTransactionDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hoursPadded = String(hours).padStart(2, '0');

    return `${month} ${day}, ${year}, ${hoursPadded}:${minutes} ${ampm}`;
  } catch {
    return isoString;
  }
}

export function formatShortDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function getMonthKey(dateOrIso?: Date | string): string {
  const d = dateOrIso ? new Date(dateOrIso) : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;
  const date = new Date(year, monthIdx, 1);
  if (Number.isNaN(date.getTime())) return monthKey;
  return date.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
}

export function toLocalDatetimeInputValue(isoString?: string): string {
  const d = isoString ? new Date(isoString) : new Date();
  const safe = Number.isNaN(d.getTime()) ? new Date() : d;
  const year = safe.getFullYear();
  const month = String(safe.getMonth() + 1).padStart(2, '0');
  const day = String(safe.getDate()).padStart(2, '0');
  const hours = String(safe.getHours()).padStart(2, '0');
  const minutes = String(safe.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
