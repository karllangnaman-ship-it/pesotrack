import {
  FinancialAccount,
  GroceryItem,
  JointActivityItem,
  MonthlyBillEntry,
  BillDefinition,
  ReceivableRecord,
  TransactionRecord,
  MonthlyBudget,
} from '../types/finance';
import { formatPeso } from './currency';

export function derivePersonalActivities(params: {
  transactions: TransactionRecord[];
  accounts: FinancialAccount[];
  bills: BillDefinition[];
  monthlyBillEntries: Record<string, MonthlyBillEntry>;
  receivables: ReceivableRecord[];
  groceryItems: GroceryItem[];
  budgets?: Record<string, MonthlyBudget>;
  currentUserName?: string;
  currentUserUid?: string;
}): JointActivityItem[] {
  const {
    transactions,
    accounts,
    bills,
    monthlyBillEntries,
    receivables,
    groceryItems,
    budgets,
    currentUserName = 'You',
    currentUserUid = 'personal',
  } = params;

  const activities: JointActivityItem[] = [];

  // 1. Transactions (exclude any that have a jointWorkspaceId)
  transactions
    .filter((tx) => !tx.jointWorkspaceId)
    .forEach((tx) => {
      const typeLabel =
        tx.type === 'income'
          ? 'income'
          : tx.type === 'expense'
          ? 'expense'
          : tx.type === 'transfer'
          ? 'transfer'
          : 'adjustment';

      activities.push({
        id: `act_tx_${tx.id}`,
        jointWorkspaceId: '',
        actorUid: currentUserUid,
        actorName: currentUserName,
        actionType:
          tx.type === 'income'
            ? 'salary_added'
            : tx.type === 'transfer'
            ? 'transaction_added'
            : 'transaction_added',
        description: `Recorded ${typeLabel}: ${tx.merchantOrTitle} (${formatPeso(tx.amount)})`,
        amount: tx.amount,
        entityType: 'transaction',
        entityId: tx.id,
        entityName: tx.merchantOrTitle,
        category: tx.category,
        timestamp: tx.updatedAt || tx.dateTime || new Date().toISOString(),
      });
    });

  // 2. Accounts (exclude any with jointWorkspaceId)
  accounts
    .filter((acc) => !acc.jointWorkspaceId)
    .forEach((acc) => {
      activities.push({
        id: `act_acc_${acc.id}`,
        jointWorkspaceId: '',
        actorUid: currentUserUid,
        actorName: currentUserName,
        actionType: 'account_created',
        description: `Created personal ${acc.category.toLowerCase()} account "${acc.name}"`,
        amount: acc.startingBalance,
        entityType: 'account',
        entityId: acc.id,
        entityName: acc.name,
        category: acc.category,
        timestamp: acc.createdAt || new Date().toISOString(),
      });
    });

  // 3. Bills (exclude any with jointWorkspaceId)
  bills
    .filter((bill) => !bill.jointWorkspaceId)
    .forEach((bill) => {
      activities.push({
        id: `act_bill_${bill.id}`,
        jointWorkspaceId: '',
        actorUid: currentUserUid,
        actorName: currentUserName,
        actionType: 'bill_created',
        description: `Added recurring bill "${bill.customCategoryName || bill.name}" (${formatPeso(bill.defaultAmount)})`,
        amount: bill.defaultAmount,
        entityType: 'bill',
        entityId: bill.id,
        entityName: bill.name,
        category: bill.category,
        timestamp: bill.createdAt || new Date().toISOString(),
      });
    });

  // 4. Bill payments recorded in monthlyBillEntries
  Object.values(monthlyBillEntries || {}).forEach((entry) => {
    const parentBill = bills.find((b) => b.id === entry.billId);
    if (parentBill?.jointWorkspaceId) return; // skip joint bills

    (entry.payments || []).forEach((payment) => {
      activities.push({
        id: `act_pay_${payment.id}`,
        jointWorkspaceId: '',
        actorUid: currentUserUid,
        actorName: currentUserName,
        actionType: 'bill_paid',
        description: `Paid ${formatPeso(payment.amount)} for "${parentBill?.name || 'Bill'}" (${payment.paymentMethod})`,
        amount: payment.amount,
        entityType: 'bill',
        entityId: payment.billId,
        entityName: parentBill?.name || 'Bill',
        timestamp: payment.createdAt || `${payment.date}T12:00:00.000Z`,
      });
    });
  });

  // 5. Receivables (Money Owed to Me)
  (receivables || []).forEach((rec) => {
    activities.push({
      id: `act_rec_${rec.id}`,
      jointWorkspaceId: '',
      actorUid: currentUserUid,
      actorName: currentUserName,
      actionType: 'transaction_added',
      description: `Lent ${formatPeso(rec.principal)} to ${rec.personName}`,
      amount: rec.principal,
      entityType: 'receivable',
      entityId: rec.id,
      entityName: rec.personName,
      timestamp: rec.createdAt || `${rec.lentDate}T12:00:00.000Z`,
    });

    (rec.payments || []).forEach((payment) => {
      activities.push({
        id: `act_recpay_${payment.id}`,
        jointWorkspaceId: '',
        actorUid: currentUserUid,
        actorName: currentUserName,
        actionType: 'transaction_added',
        description: `Received repayment of ${formatPeso(payment.amount)} from ${rec.personName}`,
        amount: payment.amount,
        entityType: 'receivable',
        entityId: rec.id,
        entityName: rec.personName,
        timestamp: payment.createdAt || `${payment.date}T12:00:00.000Z`,
      });
    });
  });

  // 6. Grocery Items (Personal)
  (groceryItems || []).forEach((item) => {
    if (item.isDeleted) return;

    if (item.isPurchased) {
      activities.push({
        id: `act_groc_pur_${item.id}`,
        jointWorkspaceId: '',
        actorUid: currentUserUid,
        actorName: currentUserName,
        actionType: 'grocery_purchased',
        description: `Purchased grocery item "${item.name}" (${item.quantity} ${item.unit})`,
        amount: item.estimatedTotal,
        entityType: 'grocery',
        entityId: item.id,
        entityName: item.name,
        category: item.category,
        timestamp: item.purchasedDate
          ? `${item.purchasedDate}T12:00:00.000Z`
          : item.updatedAt || item.createdAt || new Date().toISOString(),
      });
    } else {
      activities.push({
        id: `act_groc_add_${item.id}`,
        jointWorkspaceId: '',
        actorUid: currentUserUid,
        actorName: currentUserName,
        actionType: 'grocery_added',
        description: `Added "${item.name}" to grocery list`,
        amount: item.estimatedTotal,
        entityType: 'grocery',
        entityId: item.id,
        entityName: item.name,
        category: item.category,
        timestamp: item.createdAt || new Date().toISOString(),
      });
    }
  });

  // 7. Budgets (Personal)
  if (budgets) {
    Object.entries(budgets).forEach(([monthKey, b]) => {
      if (b.categoryBudgets && Array.isArray(b.categoryBudgets)) {
        b.categoryBudgets.forEach((cb) => {
          if (cb.limit > 0) {
            activities.push({
              id: `act_bgt_${monthKey}_${cb.category}`,
              jointWorkspaceId: '',
              actorUid: currentUserUid,
              actorName: currentUserName,
              actionType: 'settings_updated',
              description: `Set monthly budget for ${cb.category} to ${formatPeso(cb.limit)}`,
              amount: cb.limit,
              entityType: 'budget',
              entityId: `${monthKey}_${cb.category}`,
              entityName: cb.category,
              category: cb.category,
              timestamp: b.updatedAt || `${monthKey}-01T08:00:00.000Z`,
            });
          }
        });
      } else if (b.totalBudget && b.totalBudget > 0) {
        activities.push({
          id: `act_bgt_${monthKey}_total`,
          jointWorkspaceId: '',
          actorUid: currentUserUid,
          actorName: currentUserName,
          actionType: 'settings_updated',
          description: `Set monthly overall budget to ${formatPeso(b.totalBudget)}`,
          amount: b.totalBudget,
          entityType: 'budget',
          entityId: `${monthKey}_total`,
          entityName: 'Total Budget',
          category: 'Budget',
          timestamp: b.updatedAt || `${monthKey}-01T08:00:00.000Z`,
        });
      }
    });
  }

  // Sort descending by timestamp
  return activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
