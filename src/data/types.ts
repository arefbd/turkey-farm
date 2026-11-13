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
  /** دسته‌های کالاها و محصولات — افزوده‌های کاربر */
  productCategories?: string[];
}

/* ------------------------------- اشخاص (CRM) ------------------------------ */
export type PersonType = 'customer' | 'supplier' | 'both' | 'service';

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
  batchNo?: string;
  warehouseId?: string;
}

export interface TxShare {
  partnerId: string;
  percent: number;
  amount: number;
  units?: number;
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
  warehouseId?: string;
  batchNo?: string;
  invoiceNo?: string;
  items: TxItem[];
  discount: number;
  extraCost: number;
  total: number;
  shares: TxShare[];
  shareMode?: 'percent' | 'unit';
  note: string;
  /** سند قفل‌شده قابل ویرایش یا حذف نیست */
  locked: boolean;
}

/* --------------------------- دریافت و پرداخت --------------------------- */
export type PaymentKind = 'in' | 'out';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'cheque';

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
  reconciled?: boolean;
  reconciledDate?: string;
}

/* ------------------------------- چک‌های صیادی ------------------------------- */
export type ChequeKind = 'in' | 'out'; // دریافتی یا پرداختی
export type ChequeStatus = 'pending' | 'cleared' | 'bounced' | 'passed_on' | 'cancelled';

export interface Cheque extends Base {
  code: string;
  sayadNo: string;
  serialNo?: string;
  bankName: string;
  branchName?: string;
  accountNo?: string;
  drawerName?: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  kind: ChequeKind;
  personId?: string;
  personName?: string;
  accountId?: string;
  status: ChequeStatus;
  clearDate?: string;
  destinationAccountId?: string;
  passedToPersonId?: string;
  passedToPersonName?: string;
  passedDate?: string;
  bounceReason?: string;
  reconciled?: boolean;
  reconciledDate?: string;
  transactionId?: string;
  notes?: string;
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
  tempMinC?: number;
  tempMaxC?: number;
  humidityPct?: number;
  lightHours?: number;
  feedItemId?: string;
  feedItemName?: string;
  feedWarehouseId?: string;
  feedDeducted?: boolean;
  treatment?: string;
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
  shareMode?: 'percent' | 'unit';
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
  shares?: Record<string, number>;
  shareMode?: 'percent' | 'unit';
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

export type FeedStage =
  | 'pre_starter'
  | 'starter'
  | 'grower1'
  | 'grower2'
  | 'finisher'
  | 'custom';

export interface FormulaItem {
  name: string;
  percent: number;
  pricePerKg: number;
  protein: number;
  energyKcal?: number;
}

export interface Formula extends Base {
  code?: string;
  name: string;
  stage?: FeedStage;
  shareMode?: 'percent' | 'unit';
  targetProtein?: number;
  targetEnergy?: number;
  note: string;
  items: FormulaItem[];
}

export interface Batch extends Base {
  code?: string;
  date: string;
  formulaId: string;
  qtyKg: number;
  flockId: string;
  hallId?: string;
  sourceWarehouseId?: string;
  targetWarehouseId?: string;
  millingCostPerKg?: number;
  costPerKg?: number;
  totalCost?: number;
  stockDeducted?: boolean;
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
  /** موجودی به تفکیک انبارها: شناسه انبار -> مقدار موجودی */
  warehouseQuantities?: Record<string, number>;
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
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  note: string;
  locked: boolean;
}

/* ---------------------------- حرکات انبار ---------------------------- */
export type StockMoveKind = 'in' | 'out' | 'transfer';

export type StockInReason =
  | 'موجودی اولیه'
  | 'خرید ثبت‌شده از مسیر معاملات'
  | 'برگشت از مصرف'
  | 'برگشت از فروش'
  | 'دریافت از انبار دیگر'
  | 'ورود محصول تولیدشده'
  | 'ورود محصول حاصل از فرآوری'
  | 'تعدیل مثبت موجودی با مجوز'
  | 'سایر ورودی‌ها';

export type StockOutReason =
  | 'مصرف در سالن پرورش'
  | 'مصرف در تولید خوراک'
  | 'فروش'
  | 'انتقال به انبار دیگر'
  | 'برگشت به فروشنده'
  | 'ضایعات'
  | 'تعدیل منفی موجودی با مجوز'
  | 'سایر خروجی‌ها';

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
  refType: 'manual' | 'transaction' | 'adjust' | 'transfer' | 'consumption' | 'production';
  refId: string;
  note: string;
  /** شناسه انبار مرجع یا مرتبط */
  warehouseId?: string;
  warehouseName?: string;
  /** انبار مبدأ (برای خروج و انتقال) */
  sourceWarehouseId?: string;
  sourceWarehouseName?: string;
  /** انبار مقصد (برای ورود و انتقال) */
  targetWarehouseId?: string;
  targetWarehouseName?: string;
  /** شماره محموله یا بچ */
  batchNo?: string;
  /** شماره فاکتور یا سند مرجع */
  invoiceNo?: string;
  /** قیمت واحد و مبلغ کل در صورت وجود */
  unitPrice?: number;
  totalCost?: number;
}

/* --------------------------- کالاها و محصولات --------------------------- */
export interface Product extends Base {
  code: string;
  name: string;
  category: string;
  unit: string;
  defaultPrice?: number;
  note?: string;
  active?: boolean;
}

/* -------------------------------- سالن‌ها -------------------------------- */
export type HallStatus = 'active' | 'empty' | 'disinfecting' | 'maintenance';

export interface Hall extends Base {
  code: string;
  name: string;
  farmName: string;
  lengthM: number;
  widthM: number;
  areaM2: number;
  capacity: number;
  ventilationType: string;
  heatingType: string;
  coolingType: string;
  status: HallStatus;
  lastDisinfectionDate: string;
  readyDate: string;
  notes: string;
}

/* ------------------------------- انبارها ------------------------------- */
export type WarehouseType =
  | 'raw_feed'
  | 'factory_pellet'
  | 'farm_feed'
  | 'hall_sub'
  | 'medicine_vaccine'
  | 'equipment'
  | 'cold_storage'
  | 'finished_goods'
  | 'waste'
  | 'other';

export interface Warehouse extends Base {
  code: string;
  name: string;
  type: WarehouseType;
  hallId?: string;
  manager: string;
  temperature?: number;
  active: boolean;
  notes: string;
}

/* ----------------------- واحدهای مشارکت و قراردادها ----------------------- */
export type PartnershipScope = 'flock' | 'hall' | 'trading' | 'general';
export type PartnershipUnitStatus = 'active' | 'settled' | 'closed';

export interface PartnershipUnitShare {
  partnerId: string;
  percent: number;
  units: number;
  initialCapital: number;
}

export interface PartnershipUnit extends Base {
  code: string;
  title: string;
  scope: PartnershipScope;
  targetId?: string;
  startDate: string;
  endDate?: string;
  shareMode: 'percent' | 'unit';
  shares: PartnershipUnitShare[];
  status: PartnershipUnitStatus;
  notes: string;
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
  products: Product[];
  halls: Hall[];
  warehouses: Warehouse[];
  partnershipUnits: PartnershipUnit[];
  slaughterBatches: SlaughterBatch[];
  tradeLots: TradeLot[];
  cheques: Cheque[];
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
  | 'stockMoves'
  | 'products'
  | 'halls'
  | 'warehouses'
  | 'partnershipUnits'
  | 'slaughterBatches'
  | 'tradeLots'
  | 'cheques';

/* ------------------------ پارت بازرگانی و تجارت گوشت منجمد (FEFO) ------------------------ */
export type TradeLotStatus = 'active' | 'sold_out' | 'expired';

export interface LotSaleRecord {
  id?: string;
  date: string;
  qtyKg: number;
  pricePerKg: number;
  buyerName?: string;
  buyerId?: string;
  invoiceNo?: string;
  notes?: string;
}

export interface TradeLot extends Base {
  code: string;
  productName: string;
  supplierName?: string;
  supplierId?: string;
  entryDate: string;
  productionDate?: string;
  expiryDate: string;
  warehouseId?: string;
  temperatureC?: number;
  initialWeightKg: number;
  soldWeightKg: number;
  buyPricePerKg: number;
  transportCost: number;
  storageCost: number;
  packagingCost: number;
  effectiveCostPerKg: number;
  avgSellPricePerKg?: number;
  sales: LotSaleRecord[];
  status: TradeLotStatus;
  stockUpdated?: boolean;
  notes?: string;
}

/* ------------------------ کشتارگاه و قطعه‌بندی لاشه ------------------------ */
export interface SlaughterCut {
  name: string;
  weightKg: number;
  marketPricePerKg?: number;
  costPerKg?: number;
  totalCost?: number;
}

export interface SlaughterBatch extends Base {
  code: string;
  date: string;
  flockId: string;
  hallId?: string;
  driverName?: string;
  truckPlate?: string;
  shippingDocNo?: string;
  dispatchBirds: number;
  originWeightKg: number;
  destWeightKg: number;
  doaCount: number;
  transportShrinkKg: number;
  transportShrinkPct: number;
  slaughterBirds: number;
  carcassWeightKg: number;
  dressingYieldPct: number;
  slaughterFeePerBird?: number;
  transportCost?: number;
  packagingCost?: number;
  totalLiveCost?: number;
  totalSlaughterCost?: number;
  cuts: SlaughterCut[];
  targetWarehouseId?: string;
  stockUpdated?: boolean;
  notes?: string;
}

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
  /** شاخص کارایی اروپایی (EPEF / EPI) */
  epef: number;
  /** نسبت مصرف آب به دان (لیتر به کیلوگرم) */
  waterFeedRatio: number;
  /** افزایش وزن روزانه میانگین (گرم در روز) */
  adgG: number;
  /** مصرف روزانه دان به ازای هر پرنده (گرم) */
  feedPerBirdDailyG: number;
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
  /** سهم از کل درآمد فروش‌ها و معاملات */
  shareRevenue: number;
  /** سهم از کل هزینه‌ها و خریدهای گله */
  shareExpenseTotal: number;
  /** سود خالص سهم شریک (درآمد منهای هزینه) */
  shareProfit: number;
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
  flockIds?: string[];
  partnerId?: string;
  from?: string;
  to?: string;
  q?: string;
}
