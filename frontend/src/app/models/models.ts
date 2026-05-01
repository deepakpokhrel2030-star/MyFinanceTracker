export interface Account {
  id: string;
  name: string;
  bank_name?: string;
  account_type: 'checking' | 'savings' | 'credit' | 'cash';
  balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  merchant?: string;
  description?: string;
  date: string;
  status?: string;
  tags?: string[];
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  month: string;
  spent?: number;
}

export interface Investment {
  id: string;
  name: string;
  symbol?: string;
  quantity: number;
  purchase_price: number;
  current_price?: number;
  current_value?: number;
  profit_loss?: number;
  sector?: string;
  broker?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  status?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
  is_active?: boolean;
}

// expense and expenses are both optional — different analytics endpoints return either field
export interface MonthlyData {
  month: number;
  year: number;
  income: number;
  expense?: number;
  expenses?: number;
  net?: number;
}

export interface CategoryData {
  category: string;
  total: number;
}

// Generic wrapper used by services that normalise paginated API responses
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}
