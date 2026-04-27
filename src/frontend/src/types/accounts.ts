export interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string | null;
  account_type?: string;
  iban: string | null;
  balance: string;
  currency: string;
  status: 'active' | 'disconnected' | 'error';
  last_synced_at: string | null;
}
