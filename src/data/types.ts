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
  /** واحدهای قابل ویرایش — افزوده‌های کاربر */
  units: string[];
  /** انواع حساب — افزوده‌های کاربر */
  accountKinds: string[];
  /** دسته‌های کالای انبار — افزوده‌های کاربر */
  itemCats: string[];
}

/* ------------------------------- اشخاص (CRM) ------------------------------ */
export type PersonType = 'customer' | 'supplier' | 'both';

export interface Person extends Base {
  code: string;
  firstName: string;
  lastName: string;
  company: string;
  type: PersonType;
  nationalId: string;
  phone: string;
  address: string;
  note: string;
}

/* -------------------------------- معاملات -------------------------------- */
export type TxType = 'purchase' | 'sale' | 'purchase_return' | 'sale_return';
export type PayMode = 'cash' | 'credit' | 'mixed';

export interface TxItem {
  name: string;
  unit: string;
  qty: number;
  price: number;
}

export interface TxShare {
  partnerId: string;
  percent: number;
  amount: number;
}

export interface Transaction extends Base {
  code: string;
  date: string;
  type: TxType;
  personId: string;
  personName: string;
  payMode: PayMode;
  dueDate: string;
  deposit: number;
  hall: string;
  flockId: string;
  warehouse: string;
  items: TxItem[];
  discount: number;
  extraCost: number;
  total: number;
  shares: TxShare[];
  note: string;
  /** سند قفل‌شده قابل ویرایش یا حذف نیست */
  locked: boolean;
}

/* --------------------------- دریافت و پرداخت --------------------------- */
export type PaymentKind = 'in' | 'out';
export type PaymentMethod = 'cash' | 'card' | 'transfer';

export interface PaymentDoc extends Base {
  code: string;
  date: string;
  kind: PaymentKind;
  /** حساب: صندوق مشترک یا شخص (شریک) */
  accountType: 'fund' | 'partner';
  partnerId: string;
  /** پرداخت‌کننده / دریافت‌کننده از شرکا */
  payerId: string;
  /** مالک معامله از شرکا */
  ownerId: string;
  /** طرف حساب بیرونی */
  personId: string;
  /** حساب مقصد/مبدأ از ماژول حساب‌ها */
  accountId: string;
  amount: number;
  method: PaymentMethod;
  transactionId: string;
  note: string;
  locked: boolean;
}

export interface Partner extends Base {
  name: string;
  phone: string;
  share: number;
  role: string;
  color: string;
  joined: string;
}

export interface FlockShare {
  partnerId: string;
  /** سهم به واحد (مثلاً ۳ از ۹) */
  units: number;
  /** سهم درصدی */
  percent: number;
}

export interface Flock extends Base {
  name: string;
  code: string;
  breed: string;
  hall: string;
  startDate: string;
  startCount: number;
  chickType: string;
  /** سن جوجه در روز هنگام ورود به سالن */
  chickAge: number;
  status: 'active' | 'closed';
  endDate: string;
  soldCount: number;
  notes: string;
  /** میزان شراکت در این دوره */
  shares: FlockShare[];
  shareMode: 'unit' | 'percent';
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
  code: string;
  name: string;
  unit: string;
  qty: number;
  min: number;
  pricePerKg: number;
  cat: string;
  active: boolean;
  note: string;
  /** تاریخ انقضا (شمسی) — برای دارو و واکسن */
  expiry: string;
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

/* ------------------------------ حساب‌ها ------------------------------ */
export interface Account extends Base {
  code: string;
  /** نوع حساب: صندوق مشترک / بانک / جیب شریک / نوع دلخواه */
  kind: string;
  name: string;
  opening: number;
  note: string;
  /** اگر جیب شریک است، شناسه شریک */
  partnerId: string;
  active: boolean;
}

/* -------------------------- انتقال بین حساب‌ها -------------------------- */
export interface Transfer extends Base {
  code: string;
  date: string;
  /** مبدأ: صندوق مشترک یا دست شریک */
  fromType: 'fund' | 'partner';
  fromId: string;
  toType: 'fund' | 'partner';
  toId: string;
  amount: number;
  note: string;
  locked: boolean;
}

/* ---------------------------- حرکات انبار ---------------------------- */
export type StockMoveKind = 'in' | 'out';

export interface StockMove extends Base {
  date: string;
  itemId: string;
  itemName: string;
  unit: string;
  kind: StockMoveKind;
  qty: number;
  before: number;
  after: number;
  reason: string;
  refType: 'manual' | 'transaction' | 'adjust';
  refId: string;
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
  persons: Person[];
  transactions: Transaction[];
  payments: PaymentDoc[];
  transfers: Transfer[];
  accounts: Account[];
  stockMoves: StockMove[];
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
  | 'deals'
  | 'persons'
  | 'transactions'
  | 'payments'
  | 'transfers'
  | 'accounts'
  | 'stockMoves';

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
  /** سهم از بهای خرید معاملات */
  shareBuy: number;
  /** سهم از فروش معاملات */
  shareSell: number;
  /** خالص سهم از معاملات (فروش − خرید) */
  shareTx: number;
  /** پرداخت‌هایی که این شریک از جیب خود انجام داده */
  paidOut: number;
  /** دریافت‌هایی که این شریک به دست گرفته (نه صندوق) */
  received: number;
  balance: number;
}

export interface Settlement {
  rows: SettlementRow[];
  totalExp: number;
  surplus: number;
  /** جمع خالص معاملات (فروش − خرید) */
  txNet: number;
  /** جمع دریافت‌های نقدی */
  cashIn: number;
  /** جمع پرداخت‌های نقدی */
  cashOut: number;
  /** موجودی نقدی صندوق بر اساس اسناد دریافت/پرداخت */
  cashBalance: number;
}

export interface Totals {
  /** هزینه‌های عملیاتی (دسته‌های هزینه) */
  expenses: number;
  /** بهای خرید کالا از معاملات (خالص برگشتی) */
  purchase: number;
  revenue: number;
  profit: number;
  count: number;
  salesCount: number;
  salesKg: number;
  margin: number;
}

export interface TxSums {
  revenue: number;
  purchase: number;
  purchaseReturn: number;
  saleReturn: number;
  count: number;
  saleCount: number;
  purchaseCount: number;
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
