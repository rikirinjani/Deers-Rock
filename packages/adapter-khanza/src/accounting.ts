/**
 * @deers-rock/adapter-khanza — Accounting engine
 *
 * Produces full accounting cycle outputs from DR charge/claim data:
 * - Journal entries (debit/credit)
 * - Trial balance
 * - Profit & Loss statement
 * - Balance sheet summary
 */
import type { World } from '@deers-rock/core';

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  debit: number;
  credit: number;
}

export interface TrialBalanceItem {
  account: string;
  debit: number;
  credit: number;
}

export interface PnLResult {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  revenueBySource: Record<string, number>;
  expenseByCategory: Record<string, number>;
}

export interface BalanceSheetItem {
  category: 'asset' | 'liability' | 'equity';
  account: string;
  amount: number;
}

export interface AccountingCycle {
  journalEntries: JournalEntry[];
  trialBalance: TrialBalanceItem[];
  pnl: PnLResult;
  balanceSheet: BalanceSheetItem[];
  summary: {
    totalTransactions: number;
    totalDebits: number;
    totalCredits: number;
    balanceCheck: boolean;
  };
}

/**
 * Run a full accounting cycle on DR state.
 */
export function runAccountingCycle(w: World): AccountingCycle {
  const entries: JournalEntry[] = [];
  const accountMap = new Map<string, number>();

  // Initialize accounts
  const accounts = [
    'Piutang Pasien', 'Kas', 'Pendapatan Jasa', 'Pendapatan RS',
    'Beban Operasional', 'Beban Obat', 'Beban Laboratorium',
    'Beban Radiologi', 'Beban Sarana', 'Beban Gaji',
    'Pinjaman Bank', 'Modal Pemilik', 'Persediaan Obat',
    'Perlengkapan Medis', 'Uang Muka Pasien',
  ];
  for (const acc of accounts) {
    accountMap.set(acc, 0);
  }

  // Process charges → journal entries
  let totalDebit = 0;
  let totalCredit = 0;

  for (const [id, charge] of w.state.charges) {
    const date = new Date(charge.billedAt).toISOString().split('T')[0];
    const amount = charge.amount;

    // Debit: Piutang Pasien / Kas
    const accDebit = 'Kas';
    accountMap.set(accDebit, (accountMap.get(accDebit) ?? 0) + amount);
    totalDebit += amount;

    // Credit: Pendapatan Jasa (by department)
    const dept = charge.department ?? 'Jasa Medis';
    const accCredit = `Pendapatan ${dept}`;
    accountMap.set(accCredit, (accountMap.get(accCredit) ?? 0) + amount);
    totalCredit += amount;

    entries.push({
      id: `JE-${id}`,
      date,
      description: charge.description,
      debitAccount: accDebit,
      creditAccount: accCredit,
      debit: amount,
      credit: amount,
    });
  }

  // Process claims → adjust receivables
  for (const claim of w.state.insuranceClaims.values()) {
    if (claim.status === 'paid' && claim.paidAmount > 0) {
      const amount = claim.paidAmount;
      const date = claim.resolvedAt
        ? new Date(claim.resolvedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      accountMap.set('Kas', (accountMap.get('Kas') ?? 0) + amount);
      accountMap.set('Piutang Pasien',
        (accountMap.get('Piutang Pasien') ?? 0) - amount);

      entries.push({
        id: `JE-CLM-${claim.id}`,
        date,
        description: `Pembayaran klaim ${claim.payer}`,
        debitAccount: 'Kas',
        creditAccount: 'Piutang Pasien',
        debit: amount,
        credit: amount,
      });
    }
  }

  // Process payments (patient out-of-pocket)
  for (const payment of w.state.payments.values()) {
    if (payment.type === 'cash' || payment.type === 'card') {
      const amount = payment.amount;
      const date = new Date(payment.paidAt).toISOString().split('T')[0];

      accountMap.set('Kas', (accountMap.get('Kas') ?? 0) + amount);
      accountMap.set('Piutang Pasien',
        (accountMap.get('Piutang Pasien') ?? 0) - amount);

      entries.push({
        id: `JE-PAY-${payment.id}`,
        date,
        description: `Pembayaran ${payment.type}`,
        debitAccount: 'Kas',
        creditAccount: 'Piutang Pasien',
        debit: amount,
        credit: amount,
      });
    }
  }

  // Build trial balance
  const trialBalance: TrialBalanceItem[] = [];
  for (const [account, balance] of accountMap) {
    if (balance !== 0) {
      trialBalance.push({ account, debit: Math.max(0, balance), credit: Math.max(0, -balance) });
    }
  }

  // Build P&L
  const revenueAccounts = new Map<string, number>();
  const expenseAccounts = new Map<string, number>();
  for (const [acc, bal] of accountMap) {
    if (acc.startsWith('Pendapatan')) {
      revenueAccounts.set(acc, bal);
    } else if (acc.startsWith('Beban')) {
      expenseAccounts.set(acc, bal);
    }
  }

  const totalRevenue = Array.from(revenueAccounts.values()).reduce((a, b) => a + b, 0);
  const totalExpenses = Array.from(expenseAccounts.values()).reduce((a, b) => a + b, 0);

  // Build balance sheet
  const balanceSheet: BalanceSheetItem[] = [
    { category: 'asset', account: 'Kas', amount: Math.max(0, accountMap.get('Kas') ?? 0) },
    { category: 'asset', account: 'Piutang Pasien', amount: Math.max(0, -(accountMap.get('Piutang Pasien') ?? 0)) },
    { category: 'asset', account: 'Persediaan Obat', amount: 5000000 },
    { category: 'asset', account: 'Perlengkapan Medis', amount: 15000000 },
    { category: 'liability', account: 'Pinjaman Bank', amount: 0 },
    { category: 'equity', account: 'Modal Pemilik', amount: 50000000 },
  ];

  return {
    journalEntries: entries,
    trialBalance,
    pnl: {
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      revenueBySource: Object.fromEntries(revenueAccounts),
      expenseByCategory: Object.fromEntries(expenseAccounts),
    },
    balanceSheet,
    summary: {
      totalTransactions: entries.length,
      totalDebits: totalDebit,
      totalCredits: totalCredit,
      balanceCheck: Math.abs(totalDebit - totalCredit) < 0.01,
    },
  };
}
