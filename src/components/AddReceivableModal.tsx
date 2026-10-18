import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileText,
  Layers,
  Percent,
  Phone,
  User,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  AddReceivableInput,
  InterestRateType,
  ReceivablePaymentSchedule,
  ReceivableRecord,
  RepaymentModel,
} from '../types/finance';
import { formatPeso } from '../utils/currency';
import {
  calculateReceivableTermsAndSchedule,
  formatFriendlyDate,
} from '../utils/loanCalculations';

interface AddReceivableModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingReceivable?: ReceivableRecord | null;
  initialPersonName?: string;
}

const COMMON_TERMS: number[] = [3, 6, 9, 12, 18, 24, 36];

/**
 * Format ISO date string into DD/MM/YYYY for friendly prototype matching
 */
function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr || '';
  }
}

/**
 * Safely add months to a YYYY-MM-DD date string
 */
function addMonthsToIsoDate(isoDateStr: string, monthsToAdd: number): string {
  try {
    const parts = isoDateStr.slice(0, 10).split('-');
    const year = parseInt(parts[0], 10) || new Date().getFullYear();
    const month = parseInt(parts[1], 10) || 1;
    const day = parseInt(parts[2], 10) || 1;

    const targetDate = new Date(year, month - 1 + monthsToAdd, day);
    if (targetDate.getDate() !== day) {
      targetDate.setDate(0);
    }
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsToAdd);
    return d.toISOString().slice(0, 10);
  }
}

export const AddReceivableModal: React.FC<AddReceivableModalProps> = ({
  isOpen,
  onClose,
  editingReceivable,
  initialPersonName,
}) => {
  const { addReceivable, updateReceivable, receivables } = useFinance();

  // 1. Borrower Info
  const [personName, setPersonName] = useState('');

  // 2. Principal Lent
  const [principal, setPrincipal] = useState<string>('20000');

  // 3. Separate Dates
  const [lentDate, setLentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [scheduleStartDate, setScheduleStartDate] = useState<string>(() =>
    addMonthsToIsoDate(new Date().toISOString().slice(0, 10), 1)
  );

  // 4. Repayment Term
  const [termMonths, setTermMonths] = useState<number>(12);
  const [customTermInput, setCustomTermInput] = useState<string>('12');

  // 5. Interest Rate & Period
  const [interestRate, setInterestRate] = useState<string>('1.99');
  const [interestRateType, setInterestRateType] =
    useState<InterestRateType>('annual');

  // 6. Repayment Model
  const [repaymentModel, setRepaymentModel] =
    useState<RepaymentModel>('amortized');

  // 7. Fixed Monthly Payment agreed with borrower
  const [isFixedMonthlyPayment, setIsFixedMonthlyPayment] =
    useState<boolean>(false);
  const [fixedMonthlyPayment, setFixedMonthlyPayment] = useState<string>('');

  // 8. Payment Schedule Frequency
  const [paymentSchedule, setPaymentSchedule] =
    useState<ReceivablePaymentSchedule>('monthly');

  // 9. Additional Options
  const [collectionDueDay, setCollectionDueDay] = useState<string>('15');
  const [enableMultipleLending, setEnableMultipleLending] =
    useState<boolean>(false);
  const [contactInfo, setContactInfo] = useState('');
  const [notes, setNotes] = useState('');
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [showScheduleBreakdown, setShowScheduleBreakdown] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Existing unique borrowers for autocomplete
  const existingBorrowers = useMemo(() => {
    const set = new Set<string>();
    for (const r of receivables) {
      if (r.personName) set.add(r.personName.trim());
    }
    return Array.from(set);
  }, [receivables]);

  // Existing loans context for this person
  const existingRecordsForPerson = useMemo(() => {
    if (!personName.trim()) return [];
    const q = personName.trim().toLowerCase();
    return receivables.filter(
      (r) =>
        r.personName.trim().toLowerCase() === q &&
        (!editingReceivable || r.id !== editingReceivable.id)
    );
  }, [personName, receivables, editingReceivable]);

  const existingPersonOutstanding = useMemo(() => {
    return existingRecordsForPerson.reduce(
      (sum, r) => sum + (r.remainingBalance || 0),
      0
    );
  }, [existingRecordsForPerson]);

  // Initialize or reset form on open
  useEffect(() => {
    if (!isOpen) return;

    if (editingReceivable) {
      setPersonName(editingReceivable.personName || '');
      setPrincipal(String(editingReceivable.principal || ''));
      const editLent =
        editingReceivable.lentDate || new Date().toISOString().slice(0, 10);
      setLentDate(editLent);
      const editStart =
        editingReceivable.scheduleStartDate ||
        addMonthsToIsoDate(editLent, 1);
      setScheduleStartDate(editStart);
      const terms = editingReceivable.termMonths || 12;
      setTermMonths(terms);
      setCustomTermInput(String(terms));
      setInterestRate(
        editingReceivable.interestRate !== undefined
          ? String(editingReceivable.interestRate)
          : editingReceivable.interestType === 'none'
          ? '0'
          : '1.99'
      );
      setInterestRateType(editingReceivable.interestRateType || 'annual');
      setRepaymentModel(editingReceivable.repaymentModel || 'amortized');
      setIsFixedMonthlyPayment(!!editingReceivable.isFixedMonthlyPayment);
      setFixedMonthlyPayment(
        editingReceivable.fixedMonthlyPayment
          ? String(editingReceivable.fixedMonthlyPayment)
          : ''
      );
      setPaymentSchedule(editingReceivable.paymentSchedule || 'monthly');
      setCollectionDueDay(
        editingReceivable.collectionDueDay !== undefined
          ? String(editingReceivable.collectionDueDay)
          : '15'
      );
      setEnableMultipleLending(!!editingReceivable.enableMultipleLending);
      setContactInfo(editingReceivable.contactInfo || '');
      setNotes(editingReceivable.notes || '');
      setShowOptionalDetails(
        !!(editingReceivable.contactInfo || editingReceivable.notes)
      );
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const nextMonth = addMonthsToIsoDate(today, 1);
      setPersonName(initialPersonName || '');
      setPrincipal('20000');
      setLentDate(today);
      setScheduleStartDate(nextMonth);
      setTermMonths(12);
      setCustomTermInput('12');
      setInterestRate('1.99');
      setInterestRateType('annual');
      setRepaymentModel('amortized');
      setIsFixedMonthlyPayment(false);
      setFixedMonthlyPayment('');
      setPaymentSchedule('monthly');
      setCollectionDueDay('15');
      setEnableMultipleLending(false);
      setContactInfo('');
      setNotes('');
      setShowOptionalDetails(false);
      setShowScheduleBreakdown(false);
    }
    setErrorMessage(null);
  }, [editingReceivable, initialPersonName, isOpen]);

  // Handle common term buttons
  const handleSelectTerm = (t: number) => {
    setTermMonths(t);
    setCustomTermInput(String(t));
  };

  const handleCustomTermChange = (val: string) => {
    setCustomTermInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setTermMonths(num);
    }
  };

  // Immediate loan calculator calculation
  const parsedPrincipal = Math.max(0, parseFloat(principal) || 0);
  const parsedInterestRate = Math.max(0, parseFloat(interestRate) || 0);
  const parsedFixedMonthly = parseFloat(fixedMonthlyPayment) || 0;

  const calculationResult = useMemo(() => {
    return calculateReceivableTermsAndSchedule({
      principal: parsedPrincipal,
      termMonths: Math.max(1, termMonths || 12),
      interestRate: parsedInterestRate,
      interestRateType,
      repaymentModel,
      isFixedMonthlyPayment,
      fixedMonthlyPayment: isFixedMonthlyPayment ? parsedFixedMonthly : undefined,
      scheduleStartDate:
        scheduleStartDate || new Date().toISOString().slice(0, 10),
      paymentSchedule,
    });
  }, [
    parsedPrincipal,
    termMonths,
    parsedInterestRate,
    interestRateType,
    repaymentModel,
    isFixedMonthlyPayment,
    parsedFixedMonthly,
    scheduleStartDate,
    paymentSchedule,
  ]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = personName.trim();
    if (!cleanName) {
      setErrorMessage('Please enter the borrower name or nickname.');
      return;
    }

    if (parsedPrincipal <= 0) {
      setErrorMessage(
        'Please enter a valid principal amount greater than ₱0.00.'
      );
      return;
    }

    if (!scheduleStartDate) {
      setErrorMessage('Please select a payment schedule start date.');
      return;
    }

    if (isFixedMonthlyPayment) {
      if (parsedFixedMonthly <= 0) {
        setErrorMessage(
          'Please enter an agreed fixed monthly payment greater than ₱0.00.'
        );
        return;
      }
      if (calculationResult.isInsufficientPayment) {
        setErrorMessage(
          calculationResult.warning ||
            'The agreed fixed monthly payment is insufficient to cover the monthly interest.'
        );
        return;
      }
    }

    const safeDueDay =
      parseInt(collectionDueDay, 10) >= 1 && parseInt(collectionDueDay, 10) <= 31
        ? parseInt(collectionDueDay, 10)
        : parseInt(scheduleStartDate.slice(8, 10), 10) || 15;

    const inputData: AddReceivableInput = {
      personName: cleanName,
      principal: parsedPrincipal,
      termMonths: calculationResult.termMonths,
      collectionDueDay: safeDueDay,
      scheduleStartDate,
      enableMultipleLending,
      lentDate: lentDate || new Date().toISOString().slice(0, 10),
      dueDate: calculationResult.finalDueDate,
      interestType: parsedInterestRate === 0 ? 'none' : 'percentage',
      interestRate: parsedInterestRate,
      interestRateType,
      repaymentModel,
      isFixedMonthlyPayment,
      fixedMonthlyPayment: isFixedMonthlyPayment ? parsedFixedMonthly : undefined,
      monthlyCollectionEstimate: calculationResult.monthlyPayment,
      interestAmount: calculationResult.totalInterest,
      paymentSchedule,
      schedule: calculationResult.schedule,
      contactInfo: contactInfo.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (editingReceivable) {
      const ok = updateReceivable(editingReceivable.id, inputData);
      if (ok) onClose();
    } else {
      const res = addReceivable(inputData);
      if (res) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-[#FAF9FB] dark:bg-[#121318] text-neutral-900 dark:text-white w-full max-w-[540px] rounded-[24px] sm:rounded-[28px] flex flex-col max-h-[94vh] sm:max-h-[90vh] overflow-hidden shadow-2xl border border-black/[0.06] dark:border-white/10 transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between px-5 sm:px-6 pt-5 sm:pt-6 pb-3 border-b border-black/[0.04] dark:border-white/[0.06] shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {editingReceivable
                ? 'Edit Lending Record'
                : 'Record Money Owed to Me'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Track money you lent to someone, with automatic collection
              schedule and calculation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-200/60 dark:hover:bg-white/10 transition-colors shrink-0 text-neutral-400 hover:text-black dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4"
        >
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-500/50 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Borrower Name or Nickname * */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Borrower Name or Nickname <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                list="borrowers-datalist"
                placeholder="e.g. Maria Santos, Kuya Jun, Alex"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-white dark:bg-[#1C1D24] border border-neutral-200/80 dark:border-white/10 text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              />
              <datalist id="borrowers-datalist">
                {existingBorrowers.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            {existingRecordsForPerson.length > 0 && (
              <div className="mt-2 p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-[#16171E] border border-black/[0.03] dark:border-white/5 flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
                <span>
                  Existing records for {personName}:{' '}
                  <strong className="text-neutral-900 dark:text-white">
                    {existingRecordsForPerson.length} active
                  </strong>
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-bold tabular-nums">
                  {formatPeso(existingPersonOutstanding)} owed
                </span>
              </div>
            )}
          </div>

          {/* 2. Principal Amount Lent (₱) * (No max limit) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Principal Amount Lent (₱) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="text-sm font-bold text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2">
                ₱
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="20000"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 sm:py-3 rounded-xl bg-white dark:bg-[#1C1D24] border border-neutral-200/80 dark:border-white/10 text-xs sm:text-sm font-bold text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] tabular-nums"
              />
            </div>
          </div>

          {/* 3. Date Lent * and Payment Schedule Start Date * (Two columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Date Lent <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={lentDate}
                  onChange={(e) => setLentDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1C1D24] border border-neutral-200/80 dark:border-white/10 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5] [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Payment Schedule Start Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={scheduleStartDate}
                  onChange={(e) => setScheduleStartDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1C1D24] border border-neutral-200/80 dark:border-white/10 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5] [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* 4. Repayment Term (Months) * Buttons */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Repayment Term (Months) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {COMMON_TERMS.map((t) => {
                const isSelected = termMonths === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSelectTerm(t)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      isSelected
                        ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-sm font-extrabold'
                        : 'bg-white dark:bg-[#1C1D24] border border-neutral-200/80 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {t} mo
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Custom Term (Months) Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Custom Term (Months)
            </label>
            <input
              type="number"
              min="1"
              max="360"
              placeholder="12"
              value={customTermInput}
              onChange={(e) => handleCustomTermChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1C1D24] border border-neutral-200/80 dark:border-white/10 text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] tabular-nums"
            />
          </div>

          {/* 6. Interest Rate (%) & Interest Period (Two columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Interest Rate (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="1.99"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1C1D24] border border-neutral-200/80 dark:border-white/10 text-xs sm:text-sm font-bold text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] tabular-nums"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Interest Period
                </label>
                <button
                  type="button"
                  onClick={() => setInterestRate('0')}
                  className="text-[11px] font-bold text-[#10B981] hover:underline"
                >
                  0% Zero-Interest
                </button>
              </div>
              <select
                value={interestRateType}
                onChange={(e) =>
                  setInterestRateType(e.target.value as InterestRateType)
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1C1D24] border border-neutral-200/80 dark:border-white/10 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              >
                <option value="annual" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                  Annual (% p.a.)
                </option>
                <option value="monthly" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                  Monthly (% p.m.)
                </option>
              </select>
            </div>
          </div>

          {/* 7. Repayment Model */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Repayment Model
            </label>
            <select
              value={repaymentModel}
              onChange={(e) => setRepaymentModel(e.target.value as RepaymentModel)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1C1D24] border border-neutral-200/80 dark:border-white/10 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
            >
              <option value="amortized" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                Amortized (Reducing)
              </option>
              <option value="flat_rate" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                Flat Rate / Add-on
              </option>
              <option value="principal_first" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                Principal First
              </option>
            </select>
          </div>

          {/* 8. Fixed Monthly Payment agreed with borrower */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F6F5F8] dark:bg-[#191A20] border border-black/[0.04] dark:border-white/[0.08] space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isFixedMonthlyPayment}
                onChange={(e) => setIsFixedMonthlyPayment(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-neutral-300 dark:border-white/20 bg-white dark:bg-[#1C1D24] text-[#4F46E5] focus:ring-[#4F46E5] accent-[#4F46E5]"
              />
              <div className="flex-1 text-xs">
                <span className="font-bold text-neutral-900 dark:text-white block">
                  Enter fixed monthly payment agreed with borrower
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block leading-snug">
                  Use this if the borrower will make a specific monthly payment amount.
                </span>
              </div>
            </label>

            {isFixedMonthlyPayment && (
              <div className="pt-2 space-y-2 border-t border-black/[0.04] dark:border-white/5">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Agreed Monthly Collection (₱) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="text-xs font-bold text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2">
                    ₱
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 2000.00"
                    value={fixedMonthlyPayment}
                    onChange={(e) => setFixedMonthlyPayment(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#202128] border border-neutral-200/80 dark:border-white/10 text-xs sm:text-sm font-bold text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] tabular-nums"
                  />
                </div>

                {calculationResult.isInsufficientPayment && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500 dark:text-amber-400" />
                    <span>
                      {calculationResult.warning ||
                        'Agreed monthly payment is insufficient to cover the monthly interest.'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 9. Calculation Summary Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#F6F5F8] dark:bg-[#191A20] border border-black/[0.04] dark:border-white/[0.08] space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Estimated Monthly Collection:
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                {formatPeso(calculationResult.monthlyPayment)}
              </span>
            </div>

            <div className="border-t border-black/[0.06] dark:border-white/[0.06]" />

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">
                  Estimated Total Repayment:
                </span>
                <span className="font-extrabold text-neutral-900 dark:text-white tabular-nums text-sm sm:text-base mt-0.5 block">
                  {formatPeso(calculationResult.totalRepayment)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">
                  Total Interest:
                </span>
                <span className="font-extrabold text-neutral-900 dark:text-white tabular-nums text-sm sm:text-base mt-0.5 block">
                  {formatPeso(calculationResult.totalInterest)}
                </span>
              </div>
            </div>
          </div>

          {/* 10. Collection Schedule preview */}
          <div className="p-4 sm:p-4.5 rounded-2xl bg-[#F6F5F8] dark:bg-[#191A20] border border-black/[0.04] dark:border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-700 dark:text-white shrink-0" />
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                  Collection Schedule
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleBreakdown(!showScheduleBreakdown)}
                className="text-[11px] font-bold text-[#4F46E5] hover:text-[#6366F1] dark:hover:text-[#818CF8] transition-colors flex items-center gap-1"
              >
                <span>
                  {showScheduleBreakdown
                    ? 'Hide Breakdown'
                    : `View Schedule (${calculationResult.schedule.length} installments)`}
                </span>
                {showScheduleBreakdown ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">
              The first collection will begin on{' '}
              <strong className="text-neutral-900 dark:text-white font-semibold">
                {formatDisplayDate(scheduleStartDate)}
              </strong>{' '}
              based on the selected payment schedule and terms.
            </p>

            {/* Installment breakdown table */}
            {showScheduleBreakdown && (
              <div className="mt-2 pt-2 border-t border-black/[0.04] dark:border-white/5 space-y-2">
                <div className="max-h-56 overflow-y-auto rounded-xl border border-neutral-200/80 dark:border-white/5 bg-white dark:bg-[#14151B]">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-neutral-100 dark:bg-[#1C1D24] text-neutral-600 dark:text-neutral-400 sticky top-0 font-semibold border-b border-neutral-200/80 dark:border-white/5">
                      <tr>
                        <th className="py-2 px-2.5">#</th>
                        <th className="py-2 px-2.5">Due Date</th>
                        <th className="py-2 px-2.5 text-right">Principal</th>
                        <th className="py-2 px-2.5 text-right">Interest</th>
                        <th className="py-2 px-2.5 text-right">Collection</th>
                        <th className="py-2 px-2.5 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/80 dark:divide-white/5 text-neutral-700 dark:text-neutral-300">
                      {calculationResult.schedule.map((item) => (
                        <tr
                          key={item.installmentNumber}
                          className="hover:bg-neutral-50 dark:hover:bg-white/[0.02]"
                        >
                          <td className="py-2 px-2.5 font-bold text-neutral-500 dark:text-neutral-400">
                            {item.installmentNumber}
                          </td>
                          <td className="py-2 px-2.5 font-medium whitespace-nowrap text-neutral-800 dark:text-neutral-200">
                            {formatFriendlyDate(item.dueDate)}
                          </td>
                          <td className="py-2 px-2.5 text-right tabular-nums text-neutral-900 dark:text-white font-medium">
                            {formatPeso(item.principalPortion)}
                          </td>
                          <td className="py-2 px-2.5 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                            {formatPeso(item.interestPortion)}
                          </td>
                          <td className="py-2 px-2.5 text-right tabular-nums font-bold text-neutral-900 dark:text-white">
                            {formatPeso(item.collectionAmount)}
                          </td>
                          <td className="py-2 px-2.5 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                            {formatPeso(item.remainingBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 px-1">
                  <span>
                    Final Collection Due:{' '}
                    <strong className="text-neutral-900 dark:text-white">
                      {formatFriendlyDate(calculationResult.finalDueDate)}
                    </strong>
                  </span>
                  <span>
                    Total:{' '}
                    <strong className="text-neutral-900 dark:text-white">
                      {formatPeso(calculationResult.totalRepayment)}
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 11. Optional Details Accordion (Frequency, Contact, Multiple Lending, Notes) */}
          <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.08] bg-[#F6F5F8] dark:bg-[#191A20] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowOptionalDetails(!showOptionalDetails)}
              className="w-full p-3 sm:p-3.5 flex items-center justify-between text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <span>Frequency, Contact Info & Notes (Optional)</span>
              {showOptionalDetails ? (
                <ChevronUp className="w-4 h-4 text-neutral-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              )}
            </button>

            {showOptionalDetails && (
              <div className="p-3.5 pt-0 space-y-3 border-t border-black/[0.04] dark:border-white/5">
                {/* Repayment Frequency */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-400 mb-1">
                    Repayment Frequency
                  </label>
                  <select
                    value={paymentSchedule}
                    onChange={(e) =>
                      setPaymentSchedule(
                        e.target.value as ReceivablePaymentSchedule
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#202128] border border-neutral-200/80 dark:border-white/10 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  >
                    <option value="monthly" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                      Monthly Installments
                    </option>
                    <option value="one_time" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                      One-time Payment
                    </option>
                    <option value="weekly" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                      Weekly
                    </option>
                    <option value="biweekly" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                      Bi-weekly
                    </option>
                    <option value="custom" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                      Custom Schedule
                    </option>
                  </select>
                </div>

                {/* Multiple Lending Switch */}
                <div className="flex items-center justify-between gap-2 pt-1 pb-1">
                  <div>
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white block">
                      Enable Multiple Lending
                    </span>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                      Allow recording multiple independent loans for this person
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enableMultipleLending}
                    onClick={() =>
                      setEnableMultipleLending(!enableMultipleLending)
                    }
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      enableMultipleLending ? 'bg-[#10B981]' : 'bg-neutral-300 dark:bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                        enableMultipleLending ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Contact Info */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-400 mb-1">
                    Contact Information
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. 0917-123-4567, Messenger: @maria"
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-[#202128] border border-neutral-200/80 dark:border-white/10 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-400 mb-1">
                    Notes or Agreement
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Lent for car emergency, agreed to pay via GCash"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#202128] border border-neutral-200/80 dark:border-white/10 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 12. Primary Action Button */}
          <div className="pt-2 pb-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-bold shadow-lg active:scale-[0.99] transition-all"
            >
              {editingReceivable ? 'Save Changes' : 'Save Lending Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
