export type AccountCategory = 'Wallet' | 'Savings' | 'Credit' | 'Loans';

export type TransactionType = 'income' | 'expense' | 'transfer' | 'adjustment';

export type RepaymentModel = 'amortized' | 'principal_first' | 'flat_rate';

export interface ProviderPreset {
  id: string;
  name: string;
  shortName: string;
  listLabel: string;
  category: AccountCategory;
  defaultColor: string;
  defaultInterestRate?: number;
}

export interface SavingsGoalInfo {
  goalName: string;
  targetAmount: number;
  targetDate: string;
  notes?: string;
}

export type InterestRateType = 'monthly' | 'annual';

export interface AccountPaymentRecord {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  principalPortion?: number;
  interestPortion?: number;
  notes?: string;
  sourceAccountId?: string;
  transactionId?: string;
}

export interface CreditPurchaseOrDrawdown {
  id: string;
  name: string; // Description or merchant name (e.g. "iPhone 15 installment", "Laptop")
  principal: number; // Principal borrowed / purchased
  totalRepayment: number; // Agreed or entered total repayment
  termMonths: number; // Number of months
  startDate: string; // YYYY-MM-DD
  firstPaymentDate?: string; // YYYY-MM-DD
  dueDay: number; // Monthly due day (1-31)
  interestRate?: number; // percentage (e.g. 0 or 2.5 or 12)
  interestAmount?: number; // direct interest amount (e.g. 1500)
  interestRateType?: InterestRateType; // 'monthly' | 'annual'
  customMonthlyPayment?: number;
  isManualPayment?: boolean;
  monthlyPayment: number;
  totalInterest?: number;
  remainingBalance: number;
  totalPaid: number;
  status: 'active' | 'completed';
  payments?: AccountPaymentRecord[];
  createdAt: string;
}

export interface CreditAccountInfo {
  creditLimit: number;
  statementDay: number;
  dueDay: number;
  reminderEnabled: boolean;
  // Repayment / Installment Support
  hasInstallmentPlan?: boolean;
  installmentPrincipal?: number;
  termMonths?: number;
  startDate?: string;
  interestRate?: number;
  interestRateType?: InterestRateType;
  customMonthlyPayment?: number;
  isManualPayment?: boolean;
  monthlyInstallmentEstimate?: number;
  totalRepayment?: number;
  totalRepaymentEstimate?: number;
  totalInterestEstimate?: number;
  expectedPayoffDate?: string;
  // Multiple Installments / Purchases Support
  enableMultipleInstallments?: boolean;
  purchases?: CreditPurchaseOrDrawdown[];
}

export interface LoanAccountInfo {
  originalPrincipal: number;
  interestRate?: number;
  interestRateAnnual: number;
  interestRateType?: InterestRateType;
  termMonths: number;
  customMonthlyPayment?: number;
  isManualPayment?: boolean;
  monthlyInstallmentEstimate: number;
  dueDay: number;
  startDate: string;
  repaymentModel: RepaymentModel;
  reminderEnabled: boolean;
  totalRepayment?: number;
  totalRepaymentEstimate?: number;
  totalInterestEstimate?: number;
  expectedPayoffDate?: string;
  // Multiple Drawdowns / Borrowings Support
  enableMultipleInstallments?: boolean;
  drawdowns?: CreditPurchaseOrDrawdown[];
  creditLimit?: number; // Optional loan line limit
}

export interface FinancialAccount {
  id: string;
  providerId: string;
  name: string;
  category: AccountCategory;
  startingBalance: number;
  totalRepayment?: number;
  description?: string;
  customColor?: string;
  accountNumberMasked?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt?: string;
  savingsGoal?: SavingsGoalInfo;
  creditInfo?: CreditAccountInfo;
  loanInfo?: LoanAccountInfo;
  createdByUid?: string;
  createdByName?: string;
  jointWorkspaceId?: string;
}

export interface TransactionRecord {
  id: string;
  type: TransactionType;
  amount: number;
  accountId: string;
  destinationAccountId?: string;
  category: string;
  merchantOrTitle: string;
  dateTime: string;
  notes?: string;
  adjustmentSign?: 'positive' | 'negative';
  interestPortion?: number;
  isStartingBalance?: boolean;
  updatedAt?: string;
  createdByUid?: string;
  createdByName?: string;
  paidByUserId?: string;
  paidByUserName?: string;
  jointWorkspaceId?: string;
}

export interface CategoryBudget {
  category: string;
  limit: number;
}

export interface MonthlyBudget {
  monthKey: string;
  totalBudget: number;
  categoryBudgets: CategoryBudget[];
  alertThresholdPercent: number;
  updatedAt?: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeColor =
  | 'forest'
  | 'ocean'
  | 'purple'
  | 'teal'
  | 'sunset'
  | 'rose'
  | 'crimson'
  | 'amber'
  | 'monochrome';

// ==========================================
// Notification Settings Types (Offline Local)
// ==========================================
export interface NotificationSettings {
  enabled: boolean;
  reminderTime: string; // "HH:mm" (e.g. "09:00") - Reminder Time 1 (preserved for backwards compatibility)
  reminderTimes: string[]; // [Reminder Time 1, Reminder Time 2, Reminder Time 3], e.g. ["09:00", "13:00", "19:00"]
  remindOnDueDate: boolean;
  remindDaysBeforeList: number[]; // e.g. [0, 3, 7] (1 is removed)
  remindEveryDay: boolean; // Daily reminder for upcoming obligations
  billsEnabled: boolean;
  creditEnabled: boolean;
  loanEnabled: boolean;
  receivablesEnabled: boolean;
  overdueEnabled: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  reminderTime: '09:00',
  reminderTimes: ['09:00', '13:00', '19:00'],
  remindOnDueDate: true,
  remindDaysBeforeList: [0, 3],
  remindEveryDay: false,
  billsEnabled: true,
  creditEnabled: true,
  loanEnabled: true,
  receivablesEnabled: true,
  overdueEnabled: true,
};

// ==========================================
// Monthly Bills – Fixed & Variable Types
// ==========================================
export type BillCategory =
  | 'Electricity'
  | 'Water'
  | 'Wi-Fi / Internet'
  | 'Mobile Load'
  | 'Mobile Data'
  | 'Rent'
  | 'Subscriptions'
  | 'Insurance'
  | 'Transportation'
  | 'Other';

export const DEFAULT_BILL_CATEGORIES: BillCategory[] = [
  'Electricity',
  'Water',
  'Wi-Fi / Internet',
  'Mobile Load',
  'Mobile Data',
  'Rent',
  'Subscriptions',
  'Insurance',
  'Transportation',
  'Other',
];

export type BillType = 'fixed' | 'variable';
export type BillStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue';
export type BillRecurrence = 'monthly' | 'bimonthly' | 'quarterly' | 'annually';

export interface BillPaymentRecord {
  id: string;
  billId: string;
  monthKey: string; // YYYY-MM
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: 'Cash' | 'GCash' | 'Maya' | 'Bank Transfer' | 'Other';
  sourceAccountId?: string; // Optional wallet deducted
  transactionId?: string; // Associated TransactionRecord if deducted
  notes?: string;
  createdAt: string;
}

export interface MonthlyBillEntry {
  id: string; // e.g., `${billId}_${monthKey}`
  billId: string;
  monthKey: string; // YYYY-MM
  dueDay?: number; // Month-specific override of due day (1-31)
  dueDate: string; // YYYY-MM-DD
  estimatedAmount?: number; // Variable bills estimate
  actualAmount: number; // The billed / due amount for this specific month
  notes?: string;
  payments: BillPaymentRecord[];
  isPaidManually?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillDefinition {
  id: string;
  name: string; // e.g., "Meralco", "Manila Water", "PLDT Home Fiber", or custom entered name
  category: BillCategory;
  customCategoryName?: string; // Custom bill name when category is 'Other'
  type: BillType; // 'fixed' | 'variable'
  defaultAmount: number; // Fixed monthly amount or initial variable estimate
  dueDay: number; // 1-31
  startMonth: string; // YYYY-MM
  endMonth?: string; // Optional YYYY-MM
  frequency: BillRecurrence;
  notes?: string;
  reminderEnabled: boolean;
  reminderDaysBefore: number; // 0, 1, 3, 7
  createdAt: string;
  updatedAt: string;
  createdByUid?: string;
  createdByName?: string;
  jointWorkspaceId?: string;
}

export interface AddBillInput {
  name: string;
  category: BillCategory;
  customCategoryName?: string;
  type: BillType;
  defaultAmount: number;
  dueDay: number;
  startMonth: string;
  endMonth?: string;
  frequency: BillRecurrence;
  notes?: string;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
}

export interface RecordBillPaymentInput {
  billId: string;
  monthKey: string;
  amount: number;
  date: string;
  paymentMethod: 'Cash' | 'GCash' | 'Maya' | 'Bank Transfer' | 'Other';
  sourceAccountId?: string;
  notes?: string;
}

export interface UserSettings {
  profileName: string;
  profileEmail: string;
  currency: 'PHP';
  currencySymbol: '₱';
  hideBalances: boolean;
  darkMode: boolean; // Backwards compatible boolean
  themeMode?: ThemeMode; // 'light' | 'dark' | 'system'
  themeColor?: ThemeColor; // Custom theme color preference ('forest' default)
  startOfMonthDay: number;
  budgetReminders: boolean;
  dueReminders: boolean;
  numberFormat: 'standard' | 'compact';
  notificationSettings?: NotificationSettings;
}

export type RecurrenceFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'semimonthly'
  | 'monthly'
  | 'annually';

export interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  type: 'expense' | 'income' | 'transfer';
  category: string;
  accountId: string;
  destinationAccountId?: string;
  startDate: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  frequency: RecurrenceFrequency;
  endDate?: string; // YYYY-MM-DD
  notes?: string;
  reminderEnabled?: boolean;
  isActive: boolean;
  autoRecord?: boolean;
  createdAt: string;
  updatedAt?: string;
  lastRecordedDate?: string;
  createdByUid?: string;
  createdByName?: string;
  jointWorkspaceId?: string;
}

// ==========================================
// Money Owed to Me (Receivables) Types
// ==========================================
export type ReceivableStatus = 'unpaid' | 'partially_paid' | 'fully_paid' | 'overdue';

export interface ReceivablePaymentRecord {
  id: string;
  receivableId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: 'Cash' | 'GCash' | 'Maya' | 'Bank Transfer' | 'Other';
  destinationAccountId?: string; // Optional account where repayment was deposited
  transactionId?: string; // Associated transaction ID if deposited into personal account
  notes?: string;
  createdAt: string;
}

export type ReceivablePaymentSchedule =
  | 'one_time'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'custom';

export interface ReceivableInstallmentItem {
  installmentNumber: number;
  dueDate: string; // YYYY-MM-DD
  collectionAmount: number;
  principalPortion: number;
  interestPortion: number;
  remainingBalance: number;
  isPaid?: boolean;
}

export interface ReceivableRecord {
  id: string;
  personName: string; // Borrower's full name or nickname (required)
  principal: number; // Principal amount lent
  termMonths?: number; // Repayment term duration in months (e.g. 12)
  collectionDueDay?: number; // Day of the month for collection (1-31, e.g. 15)
  scheduleStartDate: string; // YYYY-MM-DD start date of collection schedule (required)
  enableMultipleLending?: boolean; // Support multiple lending records for this borrower
  lentDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD final repayment date / payoff date
  interestType?: 'none' | 'fixed' | 'percentage';
  interestRate?: number; // percentage (e.g. 1.99 or 5)
  interestRateType?: InterestRateType; // 'annual' | 'monthly'
  repaymentModel?: RepaymentModel; // 'amortized' | 'flat_rate' | 'principal_first'
  isFixedMonthlyPayment?: boolean;
  fixedMonthlyPayment?: number; // Agreed fixed monthly collection amount
  monthlyCollectionEstimate?: number; // Estimated or agreed monthly collection
  interestAmount?: number; // Total interest or additional fee in PHP
  totalExpected: number; // Principal + Total Interest
  totalCollected: number; // Sum of recorded payments
  remainingBalance: number; // totalExpected - totalCollected
  paymentSchedule?: ReceivablePaymentSchedule;
  schedule?: ReceivableInstallmentItem[]; // Generated installment schedule
  contactInfo?: string; // Optional contact information
  notes?: string; // Optional notes
  payments: ReceivablePaymentRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface AddReceivableInput {
  personName: string;
  principal: number;
  termMonths?: number;
  collectionDueDay?: number;
  scheduleStartDate: string; // Required starting date of the collection schedule
  enableMultipleLending?: boolean;
  lentDate: string;
  dueDate?: string; // If omitted, computed as final installment date
  interestType?: 'none' | 'fixed' | 'percentage';
  interestRate?: number;
  interestRateType?: InterestRateType;
  repaymentModel?: RepaymentModel;
  isFixedMonthlyPayment?: boolean;
  fixedMonthlyPayment?: number;
  monthlyCollectionEstimate?: number;
  interestAmount?: number;
  paymentSchedule?: ReceivablePaymentSchedule;
  schedule?: ReceivableInstallmentItem[];
  contactInfo?: string;
  notes?: string;
}

export interface RecordReceivablePaymentInput {
  receivableId: string;
  amount: number;
  date: string;
  paymentMethod: 'Cash' | 'GCash' | 'Maya' | 'Bank Transfer' | 'Other';
  destinationAccountId?: string;
  notes?: string;
}

// ==========================================
// Grocery List Types & Categories
// ==========================================
export interface GroceryCategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  isCustom?: boolean;
  createdAt?: string;
}

export const DEFAULT_GROCERY_CATEGORIES: GroceryCategory[] = [
  { id: 'fruits', name: 'Fruits', icon: '🍎', description: 'Apples, bananas, oranges, etc.' },
  { id: 'vegetables', name: 'Vegetables', icon: '🥦', description: 'Broccoli, carrots, lettuce, etc.' },
  { id: 'meat', name: 'Meat', icon: '🥩', description: 'Chicken, pork, beef, etc.' },
  { id: 'dairy', name: 'Dairy', icon: '🥛', description: 'Milk, eggs, cheese, etc.' },
  { id: 'grains', name: 'Grains', icon: '🍚', description: 'Rice, bread, pasta, etc.' },
  { id: 'condiments', name: 'Condiments', icon: '🧂', description: 'Oil, soy sauce, salt, etc.' },
  { id: 'snacks', name: 'Snacks', icon: '🍿', description: 'Chips, cookies, etc.' },
  { id: 'beverages', name: 'Beverages', icon: '🥤', description: 'Juice, soda, water, etc.' },
  { id: 'household', name: 'Household', icon: '🧼', description: 'Cleaning supplies, tissue, etc.' },
  { id: 'others', name: 'Others', icon: '📦', description: 'Other grocery items' },
];

export const GROCERY_UNITS = [
  'piece',
  'pack',
  'bottle',
  'can',
  'box',
  'kg',
  'g',
  'liter',
  'mL',
  'tray',
  'dozen',
] as const;

export interface GroceryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  estimatedPrice: number; // Unit price in PHP
  estimatedTotal: number; // quantity * estimatedPrice
  isPurchased: boolean;
  purchasedDate?: string; // YYYY-MM-DD
  notes?: string;
  isRecordedAsExpense?: boolean;
  expenseTransactionId?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  jointWorkspaceId?: string;
  createdByUid?: string;
  createdByName?: string;
}

export interface AddGroceryItemInput {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  isPurchased?: boolean;
  purchasedDate?: string;
  notes?: string;
}

export interface ConvertGroceriesToExpenseInput {
  itemIds: string[];
  accountId: string;
  date: string;
  category: string;
  description: string;
}

// ==========================================
// Joint Account & Multi-User Collaboration Types
// ==========================================
export type AccountMode = 'personal' | 'joint';

export type JointActiveTab =
  | 'home'
  | 'overview'
  | 'bills'
  | 'calendar'
  | 'debt-planner'
  | 'debt'
  | 'transactions'
  | 'budgets'
  | 'accounts'
  | 'reports'
  | 'grocery-list'
  | 'groceries'
  | 'activity'
  | 'messages'
  | 'notifications'
  | 'members'
  | 'settings';

// ==========================================
// Joint Chat, Offline Messaging & Ring Partner Types
// ==========================================
export type MessageDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface JointMessage {
  id: string; // Client-generated unique ID (survives offline restart)
  workspaceId: string;
  senderUid: string;
  senderName: string;
  senderEmail?: string;
  senderAvatarColor?: string;
  recipientUid: string;
  text: string;
  timestamp: string; // ISO string
  status: MessageDeliveryStatus;
  readAt?: string | null;
  deliveredAt?: string | null;
  retryCount?: number;
  errorMessage?: string;
  isDeleted?: boolean;
  mediaUrl?: string;
  mediaType?: 'image' | 'file';
  mediaName?: string;
  deletedForUserIds?: string[];
  isUnsent?: boolean;
  unsentAt?: string;
  unsentByUid?: string;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  replyToMessageId?: string;
  replyToSenderId?: string;
  replyToSenderName?: string;
  replyToPreview?: string;
  fileSize?: number;
}

export type ChatTextSize = 'small' | 'medium' | 'large';

export type RingRequestStatus = 'ringing' | 'accepted' | 'dismissed' | 'cancelled' | 'expired';

export interface JointRingRequest {
  id: string;
  workspaceId: string;
  callerUid: string;
  callerName: string;
  callerEmail?: string;
  callerAvatarColor?: string;
  targetUid: string;
  targetName?: string;
  status: RingRequestStatus;
  createdAt: string; // ISO string
  expiresAt: string; // ISO string (e.g., createdAt + 45s)
  respondedAt?: string | null;
}

export interface UserDeviceToken {
  id: string;
  userId: string;
  token: string;
  platform: 'web' | 'android' | 'ios';
  updatedAt: string;
  userAgent?: string;
}

export type NotificationScope = 'personal' | 'joint' | 'system';
export type NotificationType =
  | 'bill_due'
  | 'bill_paid'
  | 'debt_due'
  | 'debt_paid'
  | 'transaction_added'
  | 'transaction_deleted'
  | 'salary_deposited'
  | 'account_created'
  | 'account_updated'
  | 'budget_alert'
  | 'grocery_added'
  | 'grocery_purchased'
  | 'member_invited'
  | 'member_joined'
  | 'workspace_settings'
  | 'general';

export interface AppNotification {
  id: string;
  scope: NotificationScope;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string; // ISO string
  isRead: boolean;
  actorUid?: string;
  actorName?: string;
  workspaceId?: string;
  workspaceName?: string;
  targetTab?: JointActiveTab | ActiveTab;
  targetId?: string;
  metadata?: Record<string, any>;
}

export type JointRole = 'owner' | 'admin' | 'member';

export interface JointMember {
  uid: string;
  email: string;
  displayName: string;
  role: JointRole;
  joinedAt: string;
  avatarColor?: string;
  avatarUrl?: string;
}

export type WorkspaceRelationshipType =
  | 'Partner'
  | 'Spouse'
  | 'Family'
  | 'Housemate'
  | 'Other';

export function getWorkspaceMemberLimit(relationship?: string): number {
  const rel = (relationship || '').toLowerCase().trim();
  if (rel === 'partner' || rel.startsWith('partner') || rel.includes('spouse') || rel.includes('married')) {
    return 2;
  }
  return 10;
}

export interface JointWorkspace {
  id: string;
  name: string;
  relationship?: WorkspaceRelationshipType | string;
  memberLimit?: number;
  ownerUid: string;
  ownerEmail: string;
  ownerName: string;
  memberUids: string[];
  members: JointMember[];
  notificationSettings?: NotificationSettings;
  clearedAtByMember?: Record<string, string>;
  chatClearedForEveryoneAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type JointInvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

export interface JointInvitation {
  id: string;
  jointWorkspaceId: string;
  jointWorkspaceName: string;
  inviterUid: string;
  inviterEmail: string;
  inviterName: string;
  inviteeEmail: string;
  relationship?: string;
  message?: string;
  status: JointInvitationStatus;
  createdAt: string;
  respondedAt?: string;
}

export type JointActivityActionType =
  | 'workspace_created'
  | 'member_invited'
  | 'member_joined'
  | 'member_left'
  | 'member_removed'
  | 'account_created'
  | 'account_updated'
  | 'account_archived'
  | 'transaction_added'
  | 'transaction_updated'
  | 'transaction_deleted'
  | 'bill_created'
  | 'bill_paid'
  | 'grocery_added'
  | 'grocery_purchased'
  | 'grocery_to_expense'
  | 'budget_updated'
  | 'salary_added'
  | 'salary_deposited'
  | 'settings_updated';

export interface JointActivityItem {
  id: string;
  jointWorkspaceId: string;
  actorUid: string;
  actorName: string;
  actorEmail?: string;
  actorAvatarColor?: string;
  actionType: JointActivityActionType;
  description: string;
  amount?: number;
  entityType?: 'transaction' | 'account' | 'bill' | 'grocery' | 'budget' | 'member' | 'workspace' | 'receivable';
  entityId?: string;
  entityName?: string;
  category?: string;
  changeSummary?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PesoTrackState {
  version: number;
  accounts: FinancialAccount[];
  transactions: TransactionRecord[];
  budgets: Record<string, MonthlyBudget>;
  notifications?: AppNotification[];
  recurringTransactions?: RecurringTransaction[];
  bills?: BillDefinition[];
  monthlyBillEntries?: Record<string, MonthlyBillEntry>;
  customBillNames?: string[];
  customCategories?: {
    expense: string[];
    income: string[];
  };
  receivables?: ReceivableRecord[]; // Dedicated Money Owed to Me records
  groceryItems?: GroceryItem[]; // Dedicated Grocery List items
  groceryCategories?: GroceryCategory[]; // Built-in and custom grocery categories
  settings: UserSettings;
  updatedAt: string;
}

export type ActiveTab =
  | 'home'
  | 'overview'
  | 'bills'
  | 'calendar'
  | 'debt-planner'
  | 'transactions'
  | 'budgets'
  | 'accounts'
  | 'reports'
  | 'grocery-list'
  | 'activity'
  | 'messages'
  | 'notifications'
  | 'settings';

export const DEFAULT_EXPENSE_CATEGORIES: string[] = [
  'Food',
  'Transportation',
  'Shopping',
  'Bills',
  'Health',
  'Travel',
  'Groceries',
  'Gym',
  'Personal Care',
  'Entertainment',
  'Education',
  'Mobile Data',
  'Other',
];

export const DEFAULT_INCOME_CATEGORIES: string[] = [
  'Salary',
  'Freelance',
  'Business',
  'Allowance',
  'Interest',
  'Refund',
  'Other',
];

export const EXPENSE_CATEGORIES: string[] = DEFAULT_EXPENSE_CATEGORIES;

export const INCOME_CATEGORIES: string[] = DEFAULT_INCOME_CATEGORIES;

export const PROVIDER_PRESETS: ProviderPreset[] = [
  // Wallets
  {
    id: 'gcash',
    name: 'GCash',
    shortName: 'GCash',
    listLabel: 'GCash – E-Wallet',
    category: 'Wallet',
    defaultColor: '#007DFE',
  },
  {
    id: 'maya',
    name: 'Maya',
    shortName: 'Maya',
    listLabel: 'Maya – Digital Wallet',
    category: 'Wallet',
    defaultColor: '#0A0A0A',
  },
  {
    id: 'gotyme_wallet',
    name: 'GoTyme',
    shortName: 'GoTyme',
    listLabel: 'GoTyme – Everyday Account',
    category: 'Wallet',
    defaultColor: '#00F0FF',
  },
  {
    id: 'lazada',
    name: 'LazWallet',
    shortName: 'LazWallet',
    listLabel: 'LazWallet – Lazada Wallet',
    category: 'Wallet',
    defaultColor: '#F50076',
  },
  {
    id: 'grabpay',
    name: 'GrabPay',
    shortName: 'GrabPay',
    listLabel: 'GrabPay – E-Wallet',
    category: 'Wallet',
    defaultColor: '#00B14F',
  },
  {
    id: 'shopeepay',
    name: 'ShopeePay',
    shortName: 'ShopeePay',
    listLabel: 'ShopeePay – E-Wallet',
    category: 'Wallet',
    defaultColor: '#EE4D2D',
  },
  {
    id: 'palawanpay',
    name: 'PalawanPay',
    shortName: 'PalawanPay',
    listLabel: 'PalawanPay – Remittance Wallet',
    category: 'Wallet',
    defaultColor: '#0F6B36',
  },
  {
    id: 'hellomoney',
    name: 'HelloMoney',
    shortName: 'HelloMoney',
    listLabel: 'HelloMoney by AUB',
    category: 'Wallet',
    defaultColor: '#E53935',
  },

  // Savings / Banks
  {
    id: 'maya_savings',
    name: 'Maya Savings',
    shortName: 'Maya Save',
    listLabel: 'Maya Savings – Digital Bank',
    category: 'Savings',
    defaultColor: '#0A0A0A',
    defaultInterestRate: 4.5,
  },
  {
    id: 'gotyme_save',
    name: 'GoTyme GoSave',
    shortName: 'GoSave',
    listLabel: 'GoTyme GoSave – High Yield',
    category: 'Savings',
    defaultColor: '#00F0FF',
    defaultInterestRate: 4.0,
  },
  {
    id: 'seabank',
    name: 'SeaBank',
    shortName: 'SeaBank',
    listLabel: 'SeaBank – High Yield Savings',
    category: 'Savings',
    defaultColor: '#FF6600',
    defaultInterestRate: 4.5,
  },
  {
    id: 'cimb',
    name: 'CIMB Bank',
    shortName: 'CIMB',
    listLabel: 'CIMB – GSave / FastPlus',
    category: 'Savings',
    defaultColor: '#D71920',
    defaultInterestRate: 4.0,
  },
  {
    id: 'tonik',
    name: 'Tonik Stash',
    shortName: 'Tonik',
    listLabel: 'Tonik Digital Bank – Stash',
    category: 'Savings',
    defaultColor: '#7C3AED',
    defaultInterestRate: 4.0,
  },
  {
    id: 'bpi',
    name: 'BPI Express Savings',
    shortName: 'BPI',
    listLabel: 'BPI – Bank of the Philippine Islands',
    category: 'Savings',
    defaultColor: '#B11116',
  },
  {
    id: 'bdo',
    name: 'BDO Savings Account',
    shortName: 'BDO',
    listLabel: 'BDO – Banco de Oro',
    category: 'Savings',
    defaultColor: '#0038A8',
  },
  {
    id: 'unionbank',
    name: 'UnionBank Online',
    shortName: 'UnionBank',
    listLabel: 'UnionBank of the Philippines',
    category: 'Savings',
    defaultColor: '#F37021',
  },
  {
    id: 'metrobank',
    name: 'Metrobank Account',
    shortName: 'Metrobank',
    listLabel: 'Metrobank Savings',
    category: 'Savings',
    defaultColor: '#004A99',
  },

  // Credit
  {
    id: 'bpi_credit',
    name: 'BPI Credit Card',
    shortName: 'BPI Credit',
    listLabel: 'BPI Credit Card',
    category: 'Credit',
    defaultColor: '#B11116',
  },
  {
    id: 'bdo_credit',
    name: 'BDO Credit Card',
    shortName: 'BDO Credit',
    listLabel: 'BDO Credit Card',
    category: 'Credit',
    defaultColor: '#0038A8',
  },
  {
    id: 'unionbank_credit',
    name: 'UnionBank Credit Card',
    shortName: 'UB Credit',
    listLabel: 'UnionBank Credit Card (Visa/MC)',
    category: 'Credit',
    defaultColor: '#F37021',
  },
  {
    id: 'metrobank_credit',
    name: 'Metrobank Credit Card',
    shortName: 'MB Credit',
    listLabel: 'Metrobank Credit Card',
    category: 'Credit',
    defaultColor: '#004A99',
  },
  {
    id: 'maya_credit',
    name: 'Maya Credit',
    shortName: 'Maya Credit',
    listLabel: 'Maya Credit – Revolving Credit',
    category: 'Credit',
    defaultColor: '#0A0A0A',
    defaultInterestRate: 3.99,
  },
  {
    id: 'gcredit',
    name: 'GCredit',
    shortName: 'GCredit',
    listLabel: 'GCredit by GCash',
    category: 'Credit',
    defaultColor: '#007DFE',
    defaultInterestRate: 5.0,
  },
  {
    id: 'lazpaylater',
    name: 'LazPayLater',
    shortName: 'LazPayLater',
    listLabel: 'LazPayLater – Lazada Installment',
    category: 'Credit',
    defaultColor: '#F50076',
  },
  {
    id: 'spaylater',
    name: 'SPayLater',
    shortName: 'SPayLater',
    listLabel: 'SPayLater – Shopee Installment',
    category: 'Credit',
    defaultColor: '#EE4D2D',
  },

  // Loans
  {
    id: 'gloan',
    name: 'GLoan',
    shortName: 'GLoan',
    listLabel: 'GLoan by GCash',
    category: 'Loans',
    defaultColor: '#007DFE',
    defaultInterestRate: 2.5,
  },
  {
    id: 'maya_loan',
    name: 'Maya Personal Loan',
    shortName: 'Maya Loan',
    listLabel: 'Maya Personal Loan',
    category: 'Loans',
    defaultColor: '#0A0A0A',
    defaultInterestRate: 1.99,
  },
  {
    id: 'sloan',
    name: 'SLoan',
    shortName: 'SLoan',
    listLabel: 'SLoan – Shopee Cash Loan',
    category: 'Loans',
    defaultColor: '#EE4D2D',
    defaultInterestRate: 3.95,
  },
  {
    id: 'sss_loan',
    name: 'SSS Salary Loan',
    shortName: 'SSS Loan',
    listLabel: 'SSS Salary Loan – Social Security',
    category: 'Loans',
    defaultColor: '#0038A8',
    defaultInterestRate: 10.0,
  },
  {
    id: 'pagibig_loan',
    name: 'Pag-IBIG Multi-Purpose Loan',
    shortName: 'Pag-IBIG Loan',
    listLabel: 'Pag-IBIG MPL – Housing / Cash Loan',
    category: 'Loans',
    defaultColor: '#B11116',
    defaultInterestRate: 10.5,
  },
  {
    id: 'bpi_loan',
    name: 'BPI Personal Loan',
    shortName: 'BPI Loan',
    listLabel: 'BPI Personal Loan',
    category: 'Loans',
    defaultColor: '#B11116',
    defaultInterestRate: 14.4,
  },
  {
    id: 'tonik_loan',
    name: 'Tonik Quick Loan',
    shortName: 'Tonik Loan',
    listLabel: 'Tonik Quick Loan',
    category: 'Loans',
    defaultColor: '#7C3AED',
    defaultInterestRate: 4.8,
  },
];

export function getProvidersByCategory(category: AccountCategory): ProviderPreset[] {
  return PROVIDER_PRESETS.filter((p) => p.category === category);
}
