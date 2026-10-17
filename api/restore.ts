import { handleCors } from './_lib/cors';
import { authenticateRequest, getAdminFirestore } from './_lib/firebaseAdmin';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({
      ok: false,
      error: 'Method Not Allowed. Use GET or POST to retrieve cloud backup.',
    });
  }

  // 1. Authenticate user from Firebase ID Token
  let user;
  try {
    user = await authenticateRequest(req);
  } catch (err: any) {
    return res.status(err.statusCode || 401).json({
      ok: false,
      error: err.message || 'Unauthorized.',
    });
  }

  if (!user.emailVerified) {
    return res.status(403).json({
      ok: false,
      error: 'Email verification required before accessing cloud backup.',
      email: user.email,
    });
  }

  const { uid } = user;

  try {
    const firestore = getAdminFirestore();

    // Query all subcollections strictly under users/{uid}
    const [
      accSnap,
      txSnap,
      billSnap,
      entriesSnap,
      budSnap,
      recSnap,
      syncDocSnap,
    ] = await Promise.all([
      firestore.collection('users').doc(uid).collection('accounts').get(),
      firestore.collection('users').doc(uid).collection('transactions').get(),
      firestore.collection('users').doc(uid).collection('bills').get(),
      firestore.collection('users').doc(uid).collection('monthlyBillEntries').get(),
      firestore.collection('users').doc(uid).collection('budgets').get(),
      firestore.collection('users').doc(uid).collection('receivables').get(),
      firestore.collection('users').doc(uid).collection('sync').doc('state').get(),
    ]);

    const accounts: any[] = [];
    accSnap.forEach((doc: any) => {
      const data = doc.data();
      if (!data.isDeleted) accounts.push(data);
    });

    const transactions: any[] = [];
    txSnap.forEach((doc: any) => {
      const data = doc.data();
      if (!data.isDeleted) transactions.push(data);
    });
    transactions.sort(
      (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
    );

    const bills: any[] = [];
    billSnap.forEach((doc: any) => {
      const data = doc.data();
      if (!data.isDeleted) bills.push(data);
    });

    const monthlyBillEntries: Record<string, any> = {};
    entriesSnap.forEach((doc: any) => {
      const data = doc.data();
      if (!data.isDeleted) monthlyBillEntries[doc.id] = data;
    });

    const budgets: Record<string, any> = {};
    budSnap.forEach((doc: any) => {
      const data = doc.data();
      if (!data.isDeleted) budgets[doc.id] = data;
    });

    const receivables: any[] = [];
    recSnap.forEach((doc: any) => {
      const data = doc.data();
      if (!data.isDeleted) receivables.push(data);
    });

    const syncData = syncDocSnap.exists ? syncDocSnap.data() : null;

    const hasCloudData =
      accounts.length > 0 ||
      transactions.length > 0 ||
      bills.length > 0 ||
      receivables.length > 0 ||
      Boolean(syncData);

    if (!hasCloudData) {
      return res.status(200).json({
        ok: true,
        hasCloudData: false,
        message: 'No cloud records found for this account. Local vault unchanged.',
        summary: {
          accountsCount: 0,
          transactionsCount: 0,
          budgetsCount: 0,
          recurringCount: 0,
          customCategoriesCount: 0,
          receivablesCount: 0,
          billsCount: 0,
          billEntriesCount: 0,
          version: 1,
        },
      });
    }

    const restoredState = {
      version: syncData?.version || 1,
      accounts,
      transactions,
      bills,
      monthlyBillEntries,
      receivables,
      budgets,
      recurringTransactions: [],
      customBillNames: syncData?.customBillNames || [],
      customCategories: syncData?.customCategories || {
        expense: [],
        income: [],
      },
      settings: syncData?.settings || {
        profileName: user.email?.split('@')[0] || 'PesoTrack User',
        profileEmail: user.email || '',
        currency: 'PHP',
        hideBalances: false,
        themeMode: 'system',
        startOfMonthDay: 1,
        budgetReminders: true,
        dueReminders: true,
      },
      updatedAt: syncData?.updatedAt || new Date().toISOString(),
    };

    const summary = {
      accountsCount: accounts.length,
      transactionsCount: transactions.length,
      budgetsCount: Object.keys(budgets).length,
      recurringCount: 0,
      customCategoriesCount:
        (restoredState.customCategories.expense?.length || 0) +
        (restoredState.customCategories.income?.length || 0),
      receivablesCount: receivables.length,
      billsCount: bills.length,
      billEntriesCount: Object.keys(monthlyBillEntries).length,
      profileName: restoredState.settings?.profileName,
      version: restoredState.version,
      updatedAt: restoredState.updatedAt,
    };

    return res.status(200).json({
      ok: true,
      hasCloudData: true,
      data: restoredState,
      summary,
      message: `Successfully retrieved cloud backup (${accounts.length} accounts, ${transactions.length} transactions).`,
    });
  } catch (err: any) {
    console.error('[RestoreEndpoint] Error retrieving cloud data:', err);

    if (
      err?.code === 'app/no-options' ||
      err?.message?.includes('Could not load the default credentials')
    ) {
      return res.status(200).json({
        ok: true,
        fallbackToClientSdk: true,
        message: 'Backend verified user authentication. Direct client Firestore restore active.',
      });
    }

    return res.status(500).json({
      ok: false,
      error: 'Backend failed retrieving cloud backup.',
      detail: err?.message || 'Database query error',
    });
  }
}
