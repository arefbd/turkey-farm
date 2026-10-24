/** مدل داده سامانه — همه مجموعه‌ها با کلید id و createdAt */

export type Split = 'share' | 'equal' | 'custom' | 'single';

export interface Base {
  id: string;
  createdAt?: number;
}

export interface Settings {
  farmName: string;
  owner: string;
  currency: string;
  persianDigits: boolean;
  cycleDays: number;
  targetWeightG: number;
  chickWeightG: number;
}

export interface Partner extends Base {
  name: string;
  phone: string;
  share: number;
  role: string;
  color: string;
  joined: string;
}

export interface Flock extends Base {
  name: string;
  code: string;
  breed: string;
  hall: string;
  startDate: string;
  startCount: number;
  chickType: string;
  status: 'active' | 'closed';
  endDate: string;
  soldCount: number;
  notes: string;
}

export interface DailyRecord extends Base {
  flockId: string;
  date: string;
  age: number;
  mortality: number;
  culled: number;
  feedKg: number;
  waterL: number;
  avgWeightG: number;
  tempC: number;
  note: string;
}

export interface Expense extends Base {
  date: string;
  category: string;
  sub: string;
  title: string;
  amount: number;
  qty: number;
  unit: string;
  vendor: string;
  flockId: string;
  paidBy: string;
  split: Split;
  shares?: Record<string, number>;
  note: string;
}

export interface Sale extends Base {
  date: string;
  type: string;
  qtyKg: number;
  pricePerKg: number;
  amount: number;
  buyer: string;
  flockId: string;
  paidTo: string;
  note: string;
}

export interface Vaccine extends Base {
  flockId: string;
  date: string;
  name: string;
  method: string;
  count: number;
  cost: number;
  vet: string;
  note: string;
}

export interface Task extends Base {
  date: string;
  title: string;
  type: string;
  flockId: string;
  note: string;
  done: boolean;
}

export interface FormulaItem {
  name: string;
  percent: number;
  pricePerKg: number;
  protein: number;
}

export interface Formula extends Base {
  name: string;
  note: string;
  items: FormulaItem[];
}

export interface Batch extends Base {
  date: string;
  formulaId: string;
  qtyKg: number;
  flockId: string;
  note: string;
  expensed: boolean;
}

export interface Contribution extends Base {
  partnerId: string;
  date: string;
  amount: number;
  note: string;
}

export interface InventoryItem extends Base {
  name: string;
  unit: string;
  qty: number;
  min: number;
  pricePerKg: number;
  cat: string;
}

export interface Deal extends Base {
  date: string;
  partnerId: string;
  item: string;
  qty: number;
  unit: string;
  buyPrice: number;
  sellPrice: number;
  commission: number;
  note: string;
}

export interface AppState {
  version: number;
  settings: Settings;
  partners: Partner[];
  flocks: Flock[];
  daily: DailyRecord[];
  expenses: Expense[];
  sales: Sale[];
  formulas: Formula[];
  batches: Batch[];
  tasks: Task[];
  vaccines: Vaccine[];
  inventory: InventoryItem[];
  contributions: Contribution[];
  deals: Deal[];
}

export type CollectionKey =
  | 'partners'
  | 'flocks'
  | 'daily'
  | 'expenses'
  | 'sales'
  | 'formulas'
  | 'batches'
  | 'tasks'
  | 'vaccines'
  | 'inventory'
  | 'contributions'
  | 'deals';

export interface FlockStats {
  flock: Flock;
  age: number;
  records: number;
  mortality: number;
  culled: number;
  alive: number;
  sold: number;
  mortalityPct: number;
  survivalPct: number;
  feedKg: number;
  waterL: number;
  avgWeightG: number;
  weightDate: string | null;
  biomass: number;
  fcr: number;
  expenses: number;
  revenue: number;
  profit: number;
  costPerKg: number;
  feedPerBird: number;
}

export interface SettlementRow {
  id: string;
  name: string;
  share: number;
  color: string;
  capital: number;
  paidDirect: number;
  shareExp: number;
  balance: number;
}

export interface Settlement {
  rows: SettlementRow[];
  totalExp: number;
  surplus: number;
}

export interface Totals {
  expenses: number;
  revenue: number;
  profit: number;
  count: number;
  salesCount: number;
  salesKg: number;
  margin: number;
}

export interface CategorySlice {
  id: string;
  label: string;
  color: string;
  icon: string;
  value: number;
}

export interface AlertItem {
  level: 'danger' | 'warn' | 'info' | 'ok';
  icon: string;
  title: string;
  text: string;
}

export interface ExpenseFilter {
  cat?: string;
  flockId?: string;
  partnerId?: string;
  from?: string;
  to?: string;
  q?: string;
}
