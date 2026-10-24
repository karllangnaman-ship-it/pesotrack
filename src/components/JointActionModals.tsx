import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Wallet,
  Landmark,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ShoppingBag,
  Receipt,
  Calendar,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  AccountCategory,
  FinancialAccount,
  TransactionRecord,
  TransactionType,
  BillDefinition,
  BillCategory,
  GroceryItem,
  GROCERY_UNITS,
  DEFAULT_BILL_CATEGORIES,
} from '../types/finance';
import { ProviderLogo } from './ProviderLogo';
import { TransactionModal } from './TransactionModal';

// =============================================================================
// PRESETS & CONSTANTS
// =============================================================================
const POPULAR_PROVIDERS = [
  { id: 'gcash', name: 'GCash', color: '#007DFE' },
  { id: 'maya', name: 'Maya', color: '#0A0A0A' },
  { id: 'bdo', name: 'BDO Unibank', color: '#0038A8' },
  { id: 'bpi', name: 'BPI', color: '#B11116' },
  { id: 'unionbank', name: 'UnionBank', color: '#FF6600' },
  { id: 'gotyme', name: 'GoTyme Bank', color: '#00B14F' },
  { id: 'metrobank', name: 'Metrobank', color: '#0F766E' },
  { id: 'landbank', name: 'Landbank', color: '#15803D' },
  { id: 'cimb', name: 'CIMB Bank', color: '#DC2626' },
  { id: 'cash', name: 'Physical Cash / Envelope', color: '#174F32' },
  { id: 'other', name: 'Other Bank / Account', color: '#334155' },
];

const COLOR_PALETTE = [
  '#174F32',
  '#007DFE',
  '#00B14F',
  '#B11116',
  '#FF6600',
  '#7C3AED',
  '#0A0A0A',
  '#0F766E',
  '#D97706',
  '#334155',
];

const TX_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Shopping',
  'Utilities',
  'Housing & Rent',
  'Transportation',
  'Entertainment',
  'Healthcare',
  'Travel',
  'Salary / Income',
  'Investment',
  'Gift / Donation',
  'Other',
];

const GROCERY_CATEGORIES = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Pantry & Staples',
  'Snacks & Sweets',
  'Beverages',
  'Household & Cleaning',
  'Personal Care',
  'Baby Care',
  'Pet Supplies',
  'Other',
];

// =============================================================================
// 1. ADD JOINT ACCOUNT MODAL
// =============================================================================
interface AddJointAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: FinancialAccount) => Promise<void> | void;
  initialCategory?: AccountCategory;
}

export const AddJointAccountModal: React.FC<AddJointAccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCategory = 'Wallet',
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AccountCategory>(initialCategory);
  const [selectedProvider, setSelectedProvider] = useState(POPULAR_PROVIDERS[0]);
  const [customColor, setCustomColor] = useState(POPULAR_PROVIDERS[0].color);
  const [balanceInput, setBalanceInput] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory);
      setName('');
      setBalanceInput('');
      setNotes('');
      const defaultProv = POPULAR_PROVIDERS[0];
      setSelectedProvider(defaultProv);
      setCustomColor(defaultProv.color);
    }
  }, [isOpen, initialCategory]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const parsedBalance = parseFloat(balanceInput) || 0;
      const accountId = `jacc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const newAccount: FinancialAccount = {
        id: accountId,
        providerId: selectedProvider.id,
        name: name.trim(),
        category,
        startingBalance: parsedBalance,
        customColor,
        description: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (category === 'Credit') {
        newAccount.creditInfo = {
          creditLimit: parsedBalance > 0 ? parsedBalance : 50000,
          statementDay: 1,
          dueDay: 20,
          reminderEnabled: true,
        };
      } else if (category === 'Loans') {
        newAccount.loanInfo = {
          originalPrincipal: parsedBalance,
          termMonths: 12,
          interestRateAnnual: 0,
          monthlyInstallmentEstimate: parsedBalance > 0 ? parsedBalance / 12 : 0,
          dueDay: 15,
          startDate: new Date().toISOString().slice(0, 10),
          repaymentModel: 'flat_rate',
          reminderEnabled: true,
        };
      }

      await onSave(newAccount);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E5E1D8] dark:border-[#223528]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#174F32]/10 dark:bg-[#83C95B]/15 text-[#174F32] dark:text-[#83C95B] flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#252923] dark:text-white">
                Add Shared Account
              </h2>
              <p className="text-xs text-[#777D75]">
                Visible and synchronized with your joint partner
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#777D75] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-[#777D75] mb-1.5 uppercase tracking-wider">
              Account Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Wallet', 'Savings', 'Credit', 'Loans'] as AccountCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    category === cat
                      ? 'bg-[#174F32] dark:bg-[#83C95B] text-white dark:text-[#111C15] border-[#174F32] dark:border-[#83C95B] shadow-2xs'
                      : 'bg-[#F9F8F6] dark:bg-[#1A2C22] text-[#252923] dark:text-white border-transparent hover:border-[#174F32]/30'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Provider Preset */}
          <div>
            <label className="block text-xs font-bold text-[#777D75] mb-1.5 uppercase tracking-wider">
              Provider / Institution
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 border border-[#E5E1D8] dark:border-[#223528] rounded-2xl">
              {POPULAR_PROVIDERS.map((prov) => {
                const isSelected = selectedProvider.id === prov.id;
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => {
                      setSelectedProvider(prov);
                      setCustomColor(prov.color);
                      if (!name || POPULAR_PROVIDERS.some((p) => p.name === name)) {
                        setName(prov.name);
                      }
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#174F32] dark:border-[#83C95B] bg-[#174F32]/5 dark:bg-[#83C95B]/10 shadow-2xs'
                        : 'border-[#E5E1D8] dark:border-[#223528] hover:border-[#174F32]/40 bg-white dark:bg-[#15221B]'
                    }`}
                  >
                    <ProviderLogo providerId={prov.id} name={prov.name} size="sm" />
                    <span className="text-[11px] font-bold text-[#252923] dark:text-white truncate w-full text-center">
                      {prov.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-xs font-bold text-[#777D75] mb-1.5">Account Label</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Shared GCash, Joint Emergency Fund"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] dark:border-[#223528] bg-[#F9F8F6] dark:bg-[#1A2C22] text-sm text-[#252923] dark:text-white font-medium focus:outline-hidden focus:border-[#174F32]"
            />
          </div>

          {/* Starting Balance or Limit */}
          <div>
            <label className="block text-xs font-bold text-[#777D75] mb-1.5">
              {category === 'Credit'
                ? 'Credit Limit (₱)'
                : category === 'Loans'
                ? 'Initial Loan Balance (₱)'
                : 'Starting Balance (₱)'}
            </label>
            <input
              type="number"
              step="any"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] dark:border-[#223528] bg-[#F9F8F6] dark:bg-[#1A2C22] text-sm text-[#252923] dark:text-white font-medium focus:outline-hidden focus:border-[#174F32]"
            />
          </div>

          {/* Color Tag */}
          <div>
            <label className="block text-xs font-bold text-[#777D75] mb-1.5">Color Tag</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCustomColor(c)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                    customColor === c ? 'scale-115 ring-2 ring-offset-2 ring-[#174F32]' : ''
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {customColor === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[#777D75] mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Shared household groceries & utilities card"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] dark:border-[#223528] bg-[#F9F8F6] dark:bg-[#1A2C22] text-sm text-[#252923] dark:text-white font-medium focus:outline-hidden focus:border-[#174F32]"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E5E1D8] dark:border-[#223528]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#777D75] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#174F32] dark:bg-[#83C95B] text-white dark:text-[#111C15] text-xs font-black shadow-md hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Adding...' : 'Add Shared Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// 2. ADD JOINT TRANSACTION MODAL
export interface AddJointTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (tx: TransactionRecord) => Promise<void> | void;
  accounts: FinancialAccount[];
  initialType?: TransactionType;
  onOpenCreateAccount?: () => void;
}

export const AddJointTransactionModal: React.FC<AddJointTransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  accounts,
  initialType = 'expense',
  onOpenCreateAccount,
}) => {
  return (
    <TransactionModal
      isOpen={isOpen}
      onClose={onClose}
      mode="joint"
      accounts={accounts}
      initialType={initialType}
      onOpenCreateAccount={onOpenCreateAccount}
      onSave={onSave}
    />
  );
};

// =============================================================================
// 3. ADD JOINT BILL MODAL
// =============================================================================
interface AddJointBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bill: BillDefinition) => Promise<void> | void;
}

export const AddJointBillModal: React.FC<AddJointBillModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<BillCategory>('Electricity');
  const [amountInput, setAmountInput] = useState('');
  const [dueDay, setDueDay] = useState(15);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setCategory('Electricity');
      setAmountInput('');
      setDueDay(15);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountInput);
    if (!name.trim() || !parsedAmount) return;

    setSubmitting(true);
    try {
      const billId = `jbill_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const nowIso = new Date().toISOString();
      const newBill: BillDefinition = {
        id: billId,
        name: name.trim(),
        category,
        type: 'fixed',
        defaultAmount: parsedAmount,
        dueDay: Math.min(31, Math.max(1, Number(dueDay))),
        startMonth: nowIso.slice(0, 7),
        frequency: 'monthly',
        reminderEnabled: true,
        reminderDaysBefore: 3,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await onSave(newBill);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E5E1D8] dark:border-[#223528]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#174F32]/10 dark:bg-[#83C95B]/15 text-[#174F32] dark:text-[#83C95B] flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#252923] dark:text-white">
                Add Shared Recurring Bill
              </h2>
              <p className="text-xs text-[#777D75]">
                Shared payment schedule for household expenses
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#777D75] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Bill Name */}
          <div>
            <label className="block text-xs font-bold text-[#777D75] mb-1.5">Bill Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Meralco, Manila Water, PLDT WiFi"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] dark:border-[#223528] bg-[#F9F8F6] dark:bg-[#1A2C22] text-sm text-[#252923] dark:text-white font-medium focus:outline-hidden focus:border-[#174F32]"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-[#777D75] mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BillCategory)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E5E1D8] dark:border-[#223528] bg-[#F9F8F6] dark:bg-[#1A2C22] text-sm text-[#252923] dark:text-white font-medium focus:outline-hidden focus:border-[#174F32]"
            >
              {DEFAULT_BILL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-[#777D75] mb-1.5">
              Default / Estimated Amount (₱)
            </label>
            <input
              type="number"
              step="any"
              required
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] dark:border-[#223528] bg-[#F9F8F6] dark:bg-[#1A2C22] text-sm text-[#252923] dark:text-white font-medium focus:outline-hidden focus:border-[#174F32]"
            />
          </div>

          {/* Due Day */}
          <div>
            <label className="block text-xs font-bold text-[#777D75] mb-1.5">
              Due Day of Month (1 - 31)
            </label>
            <input
              type="number"
              min="1"
              max="31"
              required
              value={dueDay}
              onChange={(e) => setDueDay(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] dark:border-[#223528] bg-[#F9F8F6] dark:bg-[#1A2C22] text-sm text-[#252923] dark:text-white font-medium focus:outline-hidden focus:border-[#174F32]"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E5E1D8] dark:border-[#223528]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#777D75] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !amountInput}
              className="px-5 py-2.5 rounded-xl bg-[#174F32] dark:bg-[#83C95B] text-white dark:text-[#111C15] text-xs font-black shadow-md hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Adding...' : 'Add Shared Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// 4. ADD JOINT GROCERY MODAL
// =============================================================================
interface AddJointGroceryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: GroceryItem) => Promise<void> | void;
}

export const AddJointGroceryModal: React.FC<AddJointGroceryModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(GROCERY_CATEGORIES[0]);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<string>(GROCERY_UNITS[0]);
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setCategory(GROCERY_CATEGORIES[0]);
      setQuantity(1);
      setUnit(GROCERY_UNITS[0]);
      setEstimatedPrice('');
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const priceVal = parseFloat(estimatedPrice) || 0;
      const validQty = Math.max(1, quantity);
      const total = priceVal * validQty;

      const itemId = `jgroc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newItem: GroceryItem = {
        id: itemId,
        name: name.trim(),
        category,
        quantity: validQty,
        unit,
        estimatedPrice: priceVal,
        estimatedTotal: total,
        isPurchased: false,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSave(newItem);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E5E1D8] dark:border-[#223528]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#174F32]/10 dark:bg-[#83C95B]/15 text-[#174F32] dark:text-[#83C95B] flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#252923] dark:text-white">
                Add Shared Grocery Item
              </h2>
              <p className="text-xs text-[#777D75]">
                Collaborative checklist synced with your partner
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#777D75] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Item Name */}
          <div>
            <label className="block text-xs font-bold text-[#777D75] mb-1.5">Item Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sinandomeng Rice 5kg, Eggs 1 dozen"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] dark:border-[#223528] bg-[#F9F8F6] dark:bg-[#1A2C22] text-sm text-[#252923] dark:text-white font-medium focus:outline-hidden focus:border-[#174F32]"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-[#777D75] mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E5E1D8] dark:border-[#223528] bg-[#F9F8F6] dark:bg-[#1A2C22] text-sm text-[#252923] dark:text-white font-medium focus:outline-hidden focus:border-[#174F32]"
            >
              {GROCERY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#777D75] mb-1.5">Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] dark:border-[#223528] bg-[#F9F8F6] dark:bg-[#1A2C22] text-sm text-[#252923] dark:text-white font-medium focus:outline-hidden focus:border-[#174F32]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#777D75] mb-1.5">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E1D8] dark:border-[#223528] bg-[#F9F8F6] dark:bg-[#1A2C22] text-sm text-[#252923] dark:text-white font-medium focus:outline-hidden focus:border-[#174F32]"
              >
                {GROCERY_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Estimated Unit Price */}
          <div>
            <label className="block text-xs font-bold text-[#777D75] mb-1.5">
              Estimated Unit Price (₱)
            </label>
            <input
              type="number"
              step="any"
              value={estimatedPrice}
              onChange={(e) => setEstimatedPrice(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] dark:border-[#223528] bg-[#F9F8F6] dark:bg-[#1A2C22] text-sm text-[#252923] dark:text-white font-medium focus:outline-hidden focus:border-[#174F32]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[#777D75] mb-1.5">Notes (Brand, Store)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Buy at Landmark or SM Supermarket"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] dark:border-[#223528] bg-[#F9F8F6] dark:bg-[#1A2C22] text-sm text-[#252923] dark:text-white font-medium focus:outline-hidden focus:border-[#174F32]"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E5E1D8] dark:border-[#223528]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#777D75] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#174F32] dark:bg-[#83C95B] text-white dark:text-[#111C15] text-xs font-black shadow-md hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Adding...' : 'Add to List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
