import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calculator,
  Calendar,
  Clock,
  Coins,
  Info,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  AccountCategory,
  getProvidersByCategory,
  InterestRateType,
  ProviderPreset,
  RepaymentModel,
} from '../types/finance';
import { formatPeso } from '../utils/currency';
import { ReconciledAccount } from '../utils/financeEngine';
import {
  calculateRepaymentDetails,
  COMMON_REPAYMENT_TERMS,
  formatFriendlyDate,
} from '../utils/loanCalculations';
import { ProviderLogo } from './ProviderLogo';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: AccountCategory;
  editingAccount?: ReconciledAccount | null;
}

const CATEGORIES: AccountCategory[] = ['Wallet', 'Savings', 'Credit', 'Loans'];

const CUSTOM_COLORS = [
  '#007DFE',
  '#0A0A0A',
  '#00B14F',
  '#F50076',
  '#FF6600',
  '#7C3AED',
  '#B11116',
  '#0038A8',
  '#0F766E',
  '#334155',
];

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'Wallet',
  editingAccount = null,
}) => {
  const { addAccount, updateAccount } = useFinance();

  const [activeTab, setActiveTab] = useState<AccountCategory>(initialCategory);
  const [selectedPreset, setSelectedPreset] = useState<ProviderPreset | null>(null);
  const [isCustomMode, setIsCustomMode] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<AccountCategory>(initialCategory);
  const [startingBalance, setStartingBalance] = useState('');
  const [description, setDescription] = useState('');
  const [accountNumberMasked, setAccountNumberMasked] = useState('');
  const [customColor, setCustomColor] = useState('#007DFE');

  const [hasSavingsGoal, setHasSavingsGoal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const [creditLimit, setCreditLimit] = useState('50000');
  const [statementDay, setStatementDay] = useState('15');
  const [creditDueDay, setCreditDueDay] = useState('5');
  const [creditReminder, setCreditReminder] = useState(true);
  const [hasCreditInstallment, setHasCreditInstallment] = useState(false);
  const [creditInstallmentPrincipal, setCreditInstallmentPrincipal] = useState('20000');
  const [creditTermMonths, setCreditTermMonths] = useState('12');
  const [creditInterestRate, setCreditInterestRate] = useState('0');
  const [creditInterestRateType, setCreditInterestRateType] =
    useState<InterestRateType>('monthly');
  const [creditStartDate, setCreditStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [isManualCreditPayment, setIsManualCreditPayment] = useState(false);
  const [customCreditPayment, setCustomCreditPayment] = useState('');
  const [enableMultipleCreditInstallments, setEnableMultipleCreditInstallments] =
    useState(false);
  const [addInitialCreditPurchase, setAddInitialCreditPurchase] = useState(false);
  const [initialCreditPurchaseName, setInitialCreditPurchaseName] = useState('');

  const [loanLimit, setLoanLimit] = useState('50000');
  const [originalPrincipal, setOriginalPrincipal] = useState('25000');
  const [interestRateAnnual, setInterestRateAnnual] = useState('12');
  const [interestRateType, setInterestRateType] =
    useState<InterestRateType>('annual');
  const [termMonths, setTermMonths] = useState('12');
  const [loanStartDate, setLoanStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [isManualLoanPayment, setIsManualLoanPayment] = useState(false);
  const [customLoanPayment, setCustomLoanPayment] = useState('');
  const [loanDueDay, setLoanDueDay] = useState('15');
  const [repaymentModel, setRepaymentModel] =
    useState<RepaymentModel>('amortized');
  const [enableMultipleLoanInstallments, setEnableMultipleLoanInstallments] =
    useState(false);
  const [addInitialLoanDrawdown, setAddInitialLoanDrawdown] = useState(false);
  const [initialLoanDrawdownName, setInitialLoanDrawdownName] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  // Live Repayment Calculations
  const liveLoanCalculation = useMemo(() => {
    return calculateRepaymentDetails(
      {
        principal: Number(originalPrincipal) || 0,
        termMonths: Number(termMonths) || 12,
        interestRate: Number(interestRateAnnual) || 0,
        interestRateType,
        repaymentModel,
        customMonthlyPayment: isManualLoanPayment
          ? Number(customLoanPayment) || 0
          : undefined,
        startDate: loanStartDate,
        dueDay: Number(loanDueDay) || 15,
      },
      Number(startingBalance) || Number(originalPrincipal) || 0
    );
  }, [
    originalPrincipal,
    termMonths,
    interestRateAnnual,
    interestRateType,
    repaymentModel,
    isManualLoanPayment,
    customLoanPayment,
    loanStartDate,
    loanDueDay,
    startingBalance,
  ]);

  const liveCreditCalculation = useMemo(() => {
    if (!hasCreditInstallment) return null;
    return calculateRepaymentDetails(
      {
        principal: Number(creditInstallmentPrincipal) || 0,
        termMonths: Number(creditTermMonths) || 12,
        interestRate: Number(creditInterestRate) || 0,
        interestRateType: creditInterestRateType,
        repaymentModel: 'flat_rate',
        customMonthlyPayment: isManualCreditPayment
          ? Number(customCreditPayment) || 0
          : undefined,
        startDate: creditStartDate,
        dueDay: Number(creditDueDay) || 5,
      },
      Number(creditInstallmentPrincipal) || 0
    );
  }, [
    hasCreditInstallment,
    creditInstallmentPrincipal,
    creditTermMonths,
    creditInterestRate,
    creditInterestRateType,
    isManualCreditPayment,
    customCreditPayment,
    creditStartDate,
    creditDueDay,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);

    const todayStr = new Date().toISOString().slice(0, 10);

    if (editingAccount) {
      setActiveTab(editingAccount.category);
      setCategory(editingAccount.category);
      setName(editingAccount.name);

      const savedTotalRepayment =
        editingAccount.category === 'Loans'
          ? editingAccount.loanInfo?.totalRepayment ??
            editingAccount.totalRepayment ??
            editingAccount.startingBalance
          : editingAccount.category === 'Credit'
          ? editingAccount.creditInfo?.totalRepayment ??
            editingAccount.totalRepayment ??
            editingAccount.startingBalance
          : editingAccount.startingBalance;

      setStartingBalance(String(savedTotalRepayment ?? 0));
      setDescription(editingAccount.description || '');
      setAccountNumberMasked(editingAccount.accountNumberMasked || '');
      setCustomColor(editingAccount.customColor || '#007DFE');
      setIsCustomMode(editingAccount.providerId === 'custom');
      setSelectedPreset({
        id: editingAccount.providerId,
        name: editingAccount.name,
        shortName: editingAccount.name,
        listLabel: `${editingAccount.name} – ${editingAccount.category}`,
        category: editingAccount.category,
        defaultColor: editingAccount.customColor || '#007DFE',
      });

      if (editingAccount.savingsGoal) {
        setHasSavingsGoal(true);
        setGoalName(editingAccount.savingsGoal.goalName);
        setTargetAmount(String(editingAccount.savingsGoal.targetAmount));
        setTargetDate(editingAccount.savingsGoal.targetDate);
      } else {
        setHasSavingsGoal(false);
        setGoalName('Emergency Fund');
        setTargetAmount('100000');
        setTargetDate('2026-12-31');
      }

      if (editingAccount.creditInfo) {
        setCreditLimit(String(editingAccount.creditInfo.creditLimit));
        setStatementDay(String(editingAccount.creditInfo.statementDay));
        setCreditDueDay(String(editingAccount.creditInfo.dueDay));
        setCreditReminder(editingAccount.creditInfo.reminderEnabled);
        setHasCreditInstallment(!!editingAccount.creditInfo.hasInstallmentPlan);
        setCreditInstallmentPrincipal(
          String(
            editingAccount.creditInfo.installmentPrincipal !== undefined
              ? editingAccount.creditInfo.installmentPrincipal
              : 20000
          )
        );
        setCreditTermMonths(String(editingAccount.creditInfo.termMonths || 12));
        setCreditInterestRate(
          String(editingAccount.creditInfo.interestRate ?? 0)
        );
        setCreditInterestRateType(
          editingAccount.creditInfo.interestRateType || 'monthly'
        );
        setCreditStartDate(editingAccount.creditInfo.startDate || todayStr);
        setIsManualCreditPayment(!!editingAccount.creditInfo.isManualPayment);
        setCustomCreditPayment(
          editingAccount.creditInfo.customMonthlyPayment
            ? String(editingAccount.creditInfo.customMonthlyPayment)
            : ''
        );
        setEnableMultipleCreditInstallments(
          !!editingAccount.creditInfo.enableMultipleInstallments
        );
        setAddInitialCreditPurchase(false);
        setInitialCreditPurchaseName('');
      }

      if (editingAccount.loanInfo) {
        setLoanLimit(
          String(
            editingAccount.loanInfo.creditLimit ||
              editingAccount.loanInfo.originalPrincipal ||
              50000
          )
        );
        setOriginalPrincipal(String(editingAccount.loanInfo.originalPrincipal));
        setInterestRateAnnual(
          String(
            editingAccount.loanInfo.interestRate ??
              editingAccount.loanInfo.interestRateAnnual ??
              12
          )
        );
        setInterestRateType(
          editingAccount.loanInfo.interestRateType || 'annual'
        );
        setTermMonths(String(editingAccount.loanInfo.termMonths || 12));
        setLoanStartDate(editingAccount.loanInfo.startDate || todayStr);
        setIsManualLoanPayment(!!editingAccount.loanInfo.isManualPayment);
        setCustomLoanPayment(
          editingAccount.loanInfo.customMonthlyPayment
            ? String(editingAccount.loanInfo.customMonthlyPayment)
            : ''
        );
        setLoanDueDay(String(editingAccount.loanInfo.dueDay || 15));
        setRepaymentModel(editingAccount.loanInfo.repaymentModel || 'amortized');
        setEnableMultipleLoanInstallments(
          !!editingAccount.loanInfo.enableMultipleInstallments
        );
        setAddInitialLoanDrawdown(false);
        setInitialLoanDrawdownName('');
      }
    } else {
      setActiveTab(initialCategory);
      setCategory(initialCategory);
      setSelectedPreset(null);
      setIsCustomMode(false);
      setName('');
      setStartingBalance('');
      setDescription('');
      setAccountNumberMasked('');
      setHasSavingsGoal(false);
      setGoalName('Emergency Fund');
      setTargetAmount('50000');
      setTargetDate('2026-12-31');
      setCreditLimit('50000');
      setStatementDay('15');
      setEnableMultipleCreditInstallments(false);
      setAddInitialCreditPurchase(false);
      setInitialCreditPurchaseName('');
      setCreditDueDay('5');
      setHasCreditInstallment(false);
      setCreditInstallmentPrincipal('20000');
      setCreditTermMonths('12');
      setCreditInterestRate('0');
      setCreditInterestRateType('monthly');
      setCreditStartDate(todayStr);
      setIsManualCreditPayment(false);
      setCustomCreditPayment('');

      setLoanLimit('50000');
      setEnableMultipleLoanInstallments(false);
      setAddInitialLoanDrawdown(false);
      setInitialLoanDrawdownName('');
      setOriginalPrincipal('20000');
      setInterestRateAnnual('12');
      setInterestRateType('annual');
      setTermMonths('12');
      setLoanStartDate(todayStr);
      setIsManualLoanPayment(false);
      setCustomLoanPayment('');
      setLoanDueDay('15');
      setRepaymentModel('amortized');
    }
  }, [isOpen, initialCategory, editingAccount]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: ProviderPreset) => {
    setSelectedPreset(preset);
    setIsCustomMode(false);
    setCategory(preset.category);
    setName(preset.shortName || preset.name);
    setCustomColor(preset.defaultColor);
    setStartingBalance('');
    if (preset.defaultInterestRate !== undefined) {
      setInterestRateAnnual(String(preset.defaultInterestRate));
    }
  };

  const handleStartCustom = () => {
    setIsCustomMode(true);
    setSelectedPreset(null);
    setCategory(activeTab);
    setName('');
    setStartingBalance('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Please enter an account name.');
      return;
    }

    const parsedStartingBalance = startingBalance === '' ? 0 : Number(startingBalance);
    if (!Number.isFinite(parsedStartingBalance) || parsedStartingBalance < 0) {
      setFormError('Please enter a valid non-negative amount.');
      return;
    }

    const parsedCreditLimit = Math.max(0, Number(creditLimit) || 0);
    const parsedLoanLimit = Math.max(0, Number(loanLimit) || Number(originalPrincipal) || 0);

    if (category === 'Credit') {
      if (parsedCreditLimit <= 0) {
        setFormError('Please enter a total credit limit greater than ₱0.00.');
        return;
      }
      if (enableMultipleCreditInstallments && addInitialCreditPurchase) {
        const initP = Number(creditInstallmentPrincipal) || 0;
        if (initP <= 0) {
          setFormError('Please enter a valid initial purchase amount greater than ₱0.00.');
          return;
        }
        if (initP > parsedCreditLimit) {
          setFormError(
            `Initial purchase amount (₱${initP.toLocaleString()}) cannot exceed the total credit limit of ₱${parsedCreditLimit.toLocaleString()}.`
          );
          return;
        }
      }
    }

    if (category === 'Loans') {
      if (parsedLoanLimit <= 0) {
        setFormError('Please enter an approved loan amount greater than ₱0.00.');
        return;
      }
      if (enableMultipleLoanInstallments && addInitialLoanDrawdown) {
        const initP = Number(originalPrincipal) || 0;
        if (initP <= 0) {
          setFormError('Please enter a valid initial borrowing amount greater than ₱0.00.');
          return;
        }
        if (initP > parsedLoanLimit) {
          setFormError(
            `Initial borrowing amount (₱${initP.toLocaleString()}) cannot exceed the approved loan limit of ₱${parsedLoanLimit.toLocaleString()}.`
          );
          return;
        }
      }
    }

    let parsedStarting = parsedStartingBalance;
    let parsedTotalRepayment: number | undefined;

    if (category === 'Credit') {
      if (enableMultipleCreditInstallments) {
        if (addInitialCreditPurchase) {
          const initP = Number(creditInstallmentPrincipal) || 0;
          parsedTotalRepayment = liveCreditCalculation?.totalRepayment || initP;
          parsedStarting = parsedTotalRepayment;
        } else {
          parsedStarting = 0;
          parsedTotalRepayment = 0;
        }
      } else {
        if (hasCreditInstallment) {
          parsedTotalRepayment =
            liveCreditCalculation?.totalRepayment ||
            Number(creditInstallmentPrincipal) ||
            0;
          parsedStarting = parsedTotalRepayment;
        } else {
          parsedStarting = parsedStartingBalance;
          parsedTotalRepayment = parsedStartingBalance;
        }
      }
    } else if (category === 'Loans') {
      if (enableMultipleLoanInstallments) {
        if (addInitialLoanDrawdown) {
          const initP = Number(originalPrincipal) || 0;
          parsedTotalRepayment = liveLoanCalculation?.totalRepayment || initP;
          parsedStarting = parsedTotalRepayment;
        } else {
          parsedStarting = 0;
          parsedTotalRepayment = 0;
        }
      } else {
        parsedTotalRepayment =
          liveLoanCalculation?.totalRepayment ||
          Number(originalPrincipal) ||
          0;
        parsedStarting = parsedTotalRepayment;
      }
    }

    const providerId = isCustomMode
      ? 'custom'
      : selectedPreset?.id || editingAccount?.providerId || 'custom';

    const savingsGoal =
      category === 'Savings' && hasSavingsGoal
        ? {
            goalName: goalName.trim() || `${trimmedName} Goal`,
            targetAmount: Math.max(0, Number(targetAmount) || 0),
            targetDate: targetDate || '2026-12-31',
          }
        : undefined;

    const creditInfo =
      category === 'Credit'
        ? {
            creditLimit: parsedCreditLimit,
            statementDay: Math.min(31, Math.max(1, Number(statementDay) || 15)),
            dueDay: Math.min(31, Math.max(1, Number(creditDueDay) || 5)),
            reminderEnabled: creditReminder,
            totalRepayment: parsedTotalRepayment,
            hasInstallmentPlan: hasCreditInstallment,
            installmentPrincipal: hasCreditInstallment
              ? Math.max(0, Number(creditInstallmentPrincipal) || 0)
              : undefined,
            termMonths: hasCreditInstallment
              ? Math.max(1, Number(creditTermMonths) || 12)
              : undefined,
            startDate: hasCreditInstallment ? creditStartDate : undefined,
            interestRate: hasCreditInstallment
              ? Math.max(0, Number(creditInterestRate) || 0)
              : undefined,
            interestRateType: hasCreditInstallment
              ? creditInterestRateType
              : undefined,
            customMonthlyPayment:
              hasCreditInstallment && isManualCreditPayment
                ? Math.max(0, Number(customCreditPayment) || 0)
                : undefined,
            isManualPayment: hasCreditInstallment
              ? isManualCreditPayment
              : false,
            monthlyInstallmentEstimate: liveCreditCalculation
              ? liveCreditCalculation.monthlyPayment
              : undefined,
            totalRepaymentEstimate: liveCreditCalculation
              ? liveCreditCalculation.totalRepayment
              : undefined,
            totalInterestEstimate: liveCreditCalculation
              ? liveCreditCalculation.totalInterest
              : undefined,
            expectedPayoffDate: liveCreditCalculation
              ? liveCreditCalculation.expectedPayoffDate
              : undefined,
            enableMultipleInstallments: enableMultipleCreditInstallments,
            purchases: (() => {
              if (!enableMultipleCreditInstallments) {
                return editingAccount?.creditInfo?.purchases;
              }
              const existing = editingAccount?.creditInfo?.purchases
                ? [...editingAccount.creditInfo.purchases]
                : [];
              if (
                addInitialCreditPurchase &&
                existing.length === 0 &&
                Number(creditInstallmentPrincipal) > 0
              ) {
                const initPrincipal = Number(creditInstallmentPrincipal);
                const safeTotalRepay =
                  liveCreditCalculation?.totalRepayment || initPrincipal;
                existing.push({
                  id: `pur_${Date.now()}`,
                  name:
                    initialCreditPurchaseName.trim() ||
                    `${trimmedName} Purchase`,
                  principal: initPrincipal,
                  totalRepayment: safeTotalRepay,
                  termMonths: Math.max(1, Number(creditTermMonths) || 12),
                  startDate:
                    creditStartDate || new Date().toISOString().slice(0, 10),
                  firstPaymentDate:
                    creditStartDate || new Date().toISOString().slice(0, 10),
                  dueDay: Math.min(31, Math.max(1, Number(creditDueDay) || 5)),
                  interestRate: Number(creditInterestRate) || 0,
                  interestRateType: creditInterestRateType,
                  monthlyPayment:
                    liveCreditCalculation?.monthlyPayment ||
                    Math.round(
                      safeTotalRepay / (Number(creditTermMonths) || 12)
                    ),
                  remainingBalance: safeTotalRepay,
                  totalPaid: 0,
                  status: 'active',
                  payments: [],
                  createdAt: new Date().toISOString(),
                });
              }
              return existing;
            })(),
          }
        : undefined;

    const loanInfo =
      category === 'Loans'
        ? {
            creditLimit: parsedLoanLimit,
            originalPrincipal: enableMultipleLoanInstallments
              ? addInitialLoanDrawdown
                ? Math.max(0, Number(originalPrincipal) || 0)
                : parsedLoanLimit
              : Math.max(0, Number(originalPrincipal) || 0),
            totalRepayment: parsedTotalRepayment,
            interestRate: Math.max(0, Number(interestRateAnnual) || 0),
            interestRateAnnual: Math.max(0, Number(interestRateAnnual) || 0),
            interestRateType,
            termMonths: Math.max(1, Number(termMonths) || 12),
            customMonthlyPayment: isManualLoanPayment
              ? Math.max(0, Number(customLoanPayment) || 0)
              : undefined,
            isManualPayment: isManualLoanPayment,
            monthlyInstallmentEstimate: liveLoanCalculation.monthlyPayment,
            totalRepaymentEstimate: liveLoanCalculation.totalRepayment,
            totalInterestEstimate: liveLoanCalculation.totalInterest,
            expectedPayoffDate: liveLoanCalculation.expectedPayoffDate,
            dueDay: Math.min(31, Math.max(1, Number(loanDueDay) || 15)),
            startDate: loanStartDate || new Date().toISOString().slice(0, 10),
            repaymentModel,
            reminderEnabled: true,
            enableMultipleInstallments: enableMultipleLoanInstallments,
            drawdowns: (() => {
              if (!enableMultipleLoanInstallments) {
                return editingAccount?.loanInfo?.drawdowns;
              }
              const existing = editingAccount?.loanInfo?.drawdowns
                ? [...editingAccount.loanInfo.drawdowns]
                : [];
              if (
                addInitialLoanDrawdown &&
                existing.length === 0 &&
                Number(originalPrincipal) > 0
              ) {
                const initPrincipal = Number(originalPrincipal);
                const safeTotalRepay =
                  liveLoanCalculation?.totalRepayment || initPrincipal;
                existing.push({
                  id: `drw_${Date.now()}`,
                  name:
                    initialLoanDrawdownName.trim() ||
                    `${trimmedName} Borrowing`,
                  principal: initPrincipal,
                  totalRepayment: safeTotalRepay,
                  termMonths: Math.max(1, Number(termMonths) || 12),
                  startDate:
                    loanStartDate || new Date().toISOString().slice(0, 10),
                  firstPaymentDate:
                    loanStartDate || new Date().toISOString().slice(0, 10),
                  dueDay: Math.min(31, Math.max(1, Number(loanDueDay) || 15)),
                  interestRate: Number(interestRateAnnual) || 0,
                  interestRateType,
                  monthlyPayment:
                    liveLoanCalculation?.monthlyPayment ||
                    Math.round(safeTotalRepay / (Number(termMonths) || 12)),
                  remainingBalance: safeTotalRepay,
                  totalPaid: 0,
                  status: 'active',
                  payments: [],
                  createdAt: new Date().toISOString(),
                });
              }
              return existing;
            })(),
          }
        : undefined;

    if (editingAccount) {
      const ok = updateAccount(editingAccount.id, {
        providerId,
        name: trimmedName,
        category,
        startingBalance: parsedStarting,
        totalRepayment: parsedTotalRepayment,
        description,
        customColor,
        accountNumberMasked,
        savingsGoal,
        creditInfo,
        loanInfo,
      });
      if (ok) onClose();
    } else {
      const created = addAccount({
        providerId,
        name: trimmedName,
        category,
        startingBalance: parsedStarting,
        totalRepayment: parsedTotalRepayment,
        description,
        customColor,
        accountNumberMasked,
        savingsGoal,
        creditInfo,
        loanInfo,
      });
      if (created) onClose();
    }
  };

  const showFormStep = Boolean(editingAccount || selectedPreset || isCustomMode);
  const providersForTab = getProvidersByCategory(activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-[#FAF9FB] dark:bg-neutral-900 w-full max-w-lg rounded-[24px] sm:rounded-[28px] flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden shadow-2xl">
        {/* Top Header */}
        <div className="relative flex items-center justify-center px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4 shrink-0 border-b border-black/[0.04] dark:border-white/[0.06]">
          {showFormStep && !editingAccount && (
            <button
              type="button"
              onClick={() => {
                setSelectedPreset(null);
                setIsCustomMode(false);
                setFormError(null);
              }}
              aria-label="Back to providers"
              className="absolute left-3 sm:left-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-black dark:text-white" strokeWidth={2.5} />
            </button>
          )}

          <h2 className="text-lg sm:text-[21px] font-bold tracking-tight text-black dark:text-white">
            {editingAccount ? 'Edit Account' : 'Add Account'}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 sm:right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-black dark:text-white" strokeWidth={2.5} />
          </button>
        </div>

        {!showFormStep ? (
          /* STEP 1: PROVIDER SELECTION */
          <div className="flex flex-col flex-1 overflow-hidden p-3.5 sm:p-5">
            {/* Category Tabs */}
            <div className="bg-[#E6E5EA] dark:bg-neutral-800 p-1 sm:p-1.5 rounded-[16px] sm:rounded-[18px] grid grid-cols-4 gap-1 mb-3.5 sm:mb-4 shrink-0">
              {CATEGORIES.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`py-2 sm:py-2.5 px-1 sm:px-2 rounded-[12px] sm:rounded-[14px] text-xs sm:text-[14px] font-medium transition-all text-center truncate ${
                      isActive
                        ? 'bg-white dark:bg-neutral-900 text-black dark:text-white font-semibold shadow-2xs'
                        : 'text-neutral-700 dark:text-neutral-300 hover:text-black'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Provider List */}
            <div className="flex-1 overflow-y-auto bg-[#EAE8ED] dark:bg-neutral-800/70 rounded-[14px] px-2.5 sm:px-4 py-1 divide-y divide-neutral-300/80 dark:divide-neutral-700/70">
              {providersForTab.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="w-full flex items-center gap-3 sm:gap-4 py-3 sm:py-3.5 px-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-lg group"
                >
                  <ProviderLogo providerId={preset.id} name={preset.name} size="lg" />
                  <span className="text-sm sm:text-[15px] text-neutral-900 dark:text-neutral-100 font-normal min-w-0 flex-1 truncate">
                    {preset.listLabel}
                  </span>
                </button>
              ))}

              {/* Custom Account Option */}
              <button
                type="button"
                onClick={handleStartCustom}
                className="w-full flex items-center gap-3 sm:gap-4 py-3.5 px-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-lg"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[12px] bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-white truncate">
                    Custom {activeTab} Account
                  </div>
                  <div className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    Add custom bank, e-wallet, cooperative, or loan
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* STEP 2: ACCOUNT DETAILS FORM */
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4"
          >
            {/* Selected Provider Preview */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700">
              <ProviderLogo
                providerId={
                  isCustomMode
                    ? 'custom'
                    : selectedPreset?.id || editingAccount?.providerId || 'custom'
                }
                name={name || selectedPreset?.name || 'Account'}
                customColor={customColor}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                  {category} Account
                </div>
                <div className="text-sm sm:text-base font-bold text-black dark:text-white truncate">
                  {name || selectedPreset?.name || `Custom ${category}`}
                </div>
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs font-medium text-red-700 dark:text-red-300">
                {formError}
              </div>
            )}

            {/* Account Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                Account Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Gcash, Maya, BPI Payroll"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
            </div>

            {/* Category & Balance / Limit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCat = e.target.value as AccountCategory;
                    setCategory(newCat);
                    if (newCat === 'Credit' && (!creditLimit || creditLimit === '0')) {
                      setCreditLimit('50000');
                    }
                    if (newCat === 'Loans' && (!loanLimit || loanLimit === '0')) {
                      setLoanLimit('50000');
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {category === 'Wallet' || category === 'Savings' ? (
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Starting Balance (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                  />
                </div>
              ) : category === 'Credit' ? (
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Total Credit Limit (₱) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={creditLimit}
                    onChange={(e) => {
                      setCreditLimit(e.target.value);
                      setStartingBalance(e.target.value);
                    }}
                    placeholder="e.g. 50000.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Approved Loan Limit (₱) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={loanLimit}
                    onChange={(e) => {
                      setLoanLimit(e.target.value);
                      setStartingBalance(e.target.value);
                      if (!enableMultipleLoanInstallments) {
                        setOriginalPrincipal(e.target.value);
                      }
                    }}
                    placeholder="e.g. 50000.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                  />
                </div>
              )}
            </div>

            {/* Custom Color Picker */}
            {(isCustomMode || editingAccount?.providerId === 'custom') && (
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Badge Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {CUSTOM_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCustomColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        customColor === c
                          ? 'ring-2 ring-offset-2 ring-neutral-900 scale-110'
                          : ''
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Category-Specific Fields */}
            {category === 'Savings' && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Track a Savings Goal
                  </span>
                  <input
                    type="checkbox"
                    checked={hasSavingsGoal}
                    onChange={(e) => setHasSavingsGoal(e.target.checked)}
                    className="w-4 h-4 accent-neutral-900 dark:accent-white rounded"
                  />
                </div>
                {hasSavingsGoal && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">
                        Goal Name
                      </label>
                      <input
                        type="text"
                        value={goalName}
                        onChange={(e) => setGoalName(e.target.value)}
                        placeholder="e.g. Emergency Fund, Travel"
                        className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">
                          Target Amount (₱)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={targetAmount}
                          onChange={(e) => setTargetAmount(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">
                          Target Date
                        </label>
                        <input
                          type="date"
                          value={targetDate}
                          onChange={(e) => setTargetDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {category === 'Credit' && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 space-y-3.5">
                <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                  <span>Credit Limit & Billing Cycle</span>
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">
                    Total Credit Limit (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">
                      Statement Day
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={statementDay}
                      onChange={(e) => setStatementDay(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">
                      Due Day
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={creditDueDay}
                      onChange={(e) => setCreditDueDay(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                    />
                  </div>
                </div>

                {/* Credit Installment & Repayment Section */}
                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        Track Installment / Repayment Plan
                      </span>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Calculate monthly payment, term payoff, and track installments
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={hasCreditInstallment}
                      onChange={(e) => setHasCreditInstallment(e.target.checked)}
                      className="w-4 h-4 accent-neutral-900 dark:accent-white rounded cursor-pointer"
                    />
                  </div>

                  {hasCreditInstallment && (
                    <div className="space-y-3 pt-1">
                      {/* Installment Principal */}
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">
                          Installment Amount / Balance (₱)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={creditInstallmentPrincipal}
                          onChange={(e) => setCreditInstallmentPrincipal(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                        />
                      </div>

                      {/* Repayment Term Selection */}
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1.5">
                          Repayment Term (Months)
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {COMMON_REPAYMENT_TERMS.map((term) => {
                            const isSelected = String(term) === creditTermMonths;
                            return (
                              <button
                                key={term}
                                type="button"
                                onClick={() => setCreditTermMonths(String(term))}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  isSelected
                                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200'
                                }`}
                              >
                                {term} mo
                              </button>
                            );
                          })}
                        </div>
                        <input
                          type="number"
                          min="1"
                          max="360"
                          value={creditTermMonths}
                          onChange={(e) => setCreditTermMonths(e.target.value)}
                          placeholder="Or enter custom months (e.g. 10, 48)"
                          className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                        />
                      </div>

                      {/* Payment Start Date */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-neutral-500">
                            First Payment Date
                          </label>
                          {liveCreditCalculation && (
                            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              Payoff: <strong className="text-black dark:text-white font-semibold">{liveCreditCalculation.expectedPayoffDate}</strong>
                            </span>
                          )}
                        </div>
                        <input
                          type="date"
                          value={creditStartDate}
                          onChange={(e) => setCreditStartDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                        />
                      </div>

                      {/* Interest Rate & Rate Type */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-neutral-500">
                            Interest Rate (%)
                          </label>
                          <button
                            type="button"
                            onClick={() => setCreditInterestRate('0')}
                            className="text-[11px] font-semibold text-[#2E9E6B] hover:underline"
                          >
                            0% Promo
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={creditInterestRate}
                            onChange={(e) => setCreditInterestRate(e.target.value)}
                            placeholder="0 for 0% promo"
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                          />
                          <select
                            value={creditInterestRateType}
                            onChange={(e) =>
                              setCreditInterestRateType(
                                e.target.value as InterestRateType
                              )
                            }
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                          >
                            <option value="monthly">Monthly (% / mo)</option>
                            <option value="annual">Annual (% p.a.)</option>
                          </select>
                        </div>
                      </div>

                      {/* Fixed Monthly Payment vs Calculated */}
                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/80">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                            Enter fixed monthly payment from bank
                          </span>
                          <input
                            type="checkbox"
                            checked={isManualCreditPayment}
                            onChange={(e) => setIsManualCreditPayment(e.target.checked)}
                            className="w-4 h-4 accent-neutral-900 dark:accent-white rounded cursor-pointer"
                          />
                        </div>
                        {isManualCreditPayment && (
                          <div className="pt-1">
                            <label className="block text-xs text-neutral-500 mb-1">
                              Fixed Monthly Installment (₱)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={customCreditPayment}
                              onChange={(e) => setCustomCreditPayment(e.target.value)}
                              placeholder="e.g. 1750.00"
                              className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                            />
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                              Overrides formula estimate with bank statement amount.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Live Calculation Preview */}
                      {liveCreditCalculation && (
                        <div className="p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.04] space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-500">
                              {liveCreditCalculation.isManualPayment ? 'Fixed Monthly Payment:' : 'Estimated Monthly Payment:'}
                            </span>
                            <strong className="text-sm font-bold text-black dark:text-white tabular-nums">
                              {formatPeso(liveCreditCalculation.monthlyPayment)}
                            </strong>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                            <div>Estimated Repayment: <strong className="text-black dark:text-white tabular-nums">{formatPeso(liveCreditCalculation.totalRepayment)}</strong></div>
                            <div>Total Interest: <strong className="text-black dark:text-white tabular-nums">{formatPeso(liveCreditCalculation.totalInterest)}</strong></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Optional Multiple Installments Toggle */}
                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700/80 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        Enable Multiple Installments/Purchases
                      </span>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Support multiple separate purchases with independent repayment schedules under this shared credit limit.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableMultipleCreditInstallments}
                      onChange={(e) =>
                        setEnableMultipleCreditInstallments(e.target.checked)
                      }
                      className="w-4 h-4 accent-neutral-900 dark:accent-white rounded cursor-pointer shrink-0"
                    />
                  </div>
                </div>
              </div>
            )}

            {category === 'Loans' && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 space-y-3.5">
                <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  Loan Ceiling & Payment Schedule
                </div>

                {/* Approved Loan Limit */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Approved Loan Amount / Total Loan Limit (₱) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={loanLimit}
                    onChange={(e) => {
                      setLoanLimit(e.target.value);
                      if (!enableMultipleLoanInstallments) {
                        setOriginalPrincipal(e.target.value);
                      }
                    }}
                    placeholder="e.g. 50000.00"
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white tabular-nums font-semibold focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                  />
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                    Establish this account's total approved borrowing limit before adding transactions.
                  </p>
                </div>

                {/* Billing Due Day & First Payment Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Billing Due Day (Day of Month)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={loanDueDay}
                      onChange={(e) => setLoanDueDay(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Payment Schedule Start Date
                    </label>
                    <input
                      type="date"
                      value={loanStartDate}
                      onChange={(e) => setLoanStartDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                    />
                  </div>
                </div>

                {/* Optional Multiple Borrowings Toggle */}
                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700/80 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Enable Multiple Borrowings / Drawdowns
                    </span>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Support multiple borrowings on different dates with independent repayment schedules under this account's limit.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableMultipleLoanInstallments}
                    onChange={(e) =>
                      setEnableMultipleLoanInstallments(e.target.checked)
                    }
                    className="w-4 h-4 accent-neutral-900 dark:accent-white rounded cursor-pointer shrink-0"
                  />
                </div>

                {enableMultipleLoanInstallments ? (
                  <div className="p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.04] text-xs space-y-1.5">
                    <div className="font-semibold text-black dark:text-white">
                      Multiple Borrowings Enabled
                    </div>
                    <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                      Your approved loan limit of{' '}
                      <strong className="text-black dark:text-white tabular-nums">
                        {formatPeso(Number(loanLimit) || 0)}
                      </strong>{' '}
                      is established. You can add individual borrowings with independent repayment terms inside the account details after creation.
                    </p>
                  </div>
                ) : (
                  /* Single Loan Workflow */
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 space-y-3">
                    <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Single Loan Terms
                    </div>

                    {/* Original Loan Principal */}
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">
                        Borrowed Amount (₱) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={originalPrincipal}
                        onChange={(e) => setOriginalPrincipal(e.target.value)}
                        placeholder={loanLimit || '0.00'}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                      />
                    </div>

                    {/* Repayment Term */}
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1.5">
                        Repayment Term (Months) *
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {COMMON_REPAYMENT_TERMS.map((term) => {
                          const isSelected = String(term) === termMonths;
                          return (
                            <button
                              key={term}
                              type="button"
                              onClick={() => setTermMonths(String(term))}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200'
                              }`}
                            >
                              {term} mo
                            </button>
                          );
                        })}
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="360"
                        value={termMonths}
                        onChange={(e) => setTermMonths(e.target.value)}
                        placeholder="Or enter custom months (e.g. 10, 48, 60)"
                        className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                      />
                    </div>

                    {/* Interest Rate & Monthly / Annual Selector */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-neutral-500">
                          Interest Rate (%)
                        </label>
                        <button
                          type="button"
                          onClick={() => setInterestRateAnnual('0')}
                          className="text-[11px] font-semibold text-[#2E9E6B] hover:underline"
                        >
                          0% Zero-Interest
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={interestRateAnnual}
                          onChange={(e) => setInterestRateAnnual(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                        />
                        <select
                          value={interestRateType}
                          onChange={(e) =>
                            setInterestRateType(e.target.value as InterestRateType)
                          }
                          className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                        >
                          <option value="annual">Annual (% p.a.)</option>
                          <option value="monthly">Monthly (% / mo)</option>
                        </select>
                      </div>
                    </div>

                    {/* Model */}
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">
                        Repayment Model
                      </label>
                      <select
                        value={repaymentModel}
                        onChange={(e) =>
                          setRepaymentModel(e.target.value as RepaymentModel)
                        }
                        className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                      >
                        <option value="flat_rate">Flat Rate (Add-on)</option>
                        <option value="amortized">Amortized (Reducing)</option>
                        <option value="principal_first">Principal-Only</option>
                      </select>
                    </div>

                    {/* Fixed Monthly Payment vs Calculated Estimate */}
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          Enter fixed monthly payment provided by lender
                        </span>
                        <input
                          type="checkbox"
                          checked={isManualLoanPayment}
                          onChange={(e) => setIsManualLoanPayment(e.target.checked)}
                          className="w-4 h-4 accent-neutral-900 dark:accent-white rounded cursor-pointer"
                        />
                      </div>
                      {isManualLoanPayment && (
                        <div className="pt-1">
                          <label className="block text-xs text-neutral-500 mb-1">
                            Fixed Monthly Installment (₱)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={customLoanPayment}
                            onChange={(e) => setCustomLoanPayment(e.target.value)}
                            placeholder="e.g. 2150.00"
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                          />
                          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                            Lender-specified payment overrides formula estimate.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Live Repayment Preview Card */}
                    {liveLoanCalculation && (
                      <div className="p-3 sm:p-3.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.04] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-500">
                            {liveLoanCalculation.isManualPayment ? 'Fixed Monthly Payment (Lender):' : 'Estimated Monthly Payment:'}
                          </span>
                          <strong className="text-sm font-bold text-black dark:text-white tabular-nums">
                            {formatPeso(liveLoanCalculation.monthlyPayment)}
                          </strong>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 pt-1.5 border-t border-black/[0.04] dark:border-white/[0.06]">
                          <div>Estimated Repayment: <strong className="text-black dark:text-white tabular-nums">{formatPeso(liveLoanCalculation.totalRepayment)}</strong></div>
                          <div>Total Interest: <strong className="text-black dark:text-white tabular-nums">{formatPeso(liveLoanCalculation.totalInterest)}</strong></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Optional Last 4 Digits & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Last 4 Digits / Nickname
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={accountNumberMasked}
                  onChange={(e) => setAccountNumberMasked(e.target.value)}
                  placeholder="e.g. •••• 4821"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Daily wallet"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white"
                />
              </div>
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 text-[11px] text-neutral-500 dark:text-neutral-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Manual tracker only. Never enter passwords, MPINs, or OTPs.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-neutral-200/80 dark:bg-neutral-800 text-sm font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-neutral-950 dark:bg-white text-sm font-semibold text-white dark:text-neutral-950 hover:bg-neutral-800 transition-colors"
              >
                {editingAccount ? 'Save Changes' : 'Save Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
