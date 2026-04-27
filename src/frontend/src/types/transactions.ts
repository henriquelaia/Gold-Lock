export interface Transaction {
  id: string;
  bank_account_id: string | null;
  category_id: string | null;
  description: string;
  amount: string; // signed — negative = expense, positive = income
  currency: string;
  transaction_date: string; // YYYY-MM-DD
  is_recurring: boolean;
  ml_confidence: string | null;
  ml_categorized: boolean;
  notes: string | null;
  // joined
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  bank_name: string | null;
}

export interface TransactionSummary {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
  savings: number;
  transaction_count: number;
  byCategory?: { category_name: string; category_icon: string; category_color: string; total: number }[];
  byMonth?: { year: number; month: number; income: number; expenses: number }[];
}

export interface TransactionListMeta {
  total: number;
  limit: number;
  offset: number;
}
