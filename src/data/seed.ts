/** وضعیت خالی و داده نمونه (برای دمو و بازنشانی) */
import * as J from '../lib/jalali';
import type {
  AppState,
  Batch,
  Contribution,
  Deal,
  DailyRecord,
  Expense,
  Flock,
  Formula,
  InventoryItem,
  Partner,
  Sale,
  Settings,
  Task,
  Vaccine,
} from './types';

export const STORAGE_KEY = 'turkeyFarm.v3';

export const DEFAULT_SETTINGS: Settings = {
  farmName: 'مزرعه بوقلمون پارس',
  owner: 'مدیریت مزرعه',
  currency: 'تومان',
  persianDigits: true,
  cycleDays: 120,
  targetWeightG: 12000,
  chickWeightG: 60,
  units: [],
  itemCats: [],
};

let seq = 0;
export function uid(): string {
  seq = (seq + 1) % 1000;
  return 'x' + Date.now().toString(36) + seq.toString(36) + Math.random().toString(36).slice(2, 6);
}

export function blank(): AppState {
  return {
    version: 2,
    settings: { ...DEFAULT_SETTINGS },
    partners: [],
    flocks: [],
    daily: [],
    expenses: [],
    sales: [],
    formulas: [],
    batches: [],
    tasks: [],
    vaccines: [],
    inventory: [],
    contributions: [],
    deals: [],
    persons: [],
    transactions: [],
    payments: [],
    stockMoves: [],
  };
}

export function seed(): AppState {
  const s = blank();
  const today = J.today();

  let rs = 987654321;
  const rnd = () => {
    rs = (rs * 1103515245 + 12345) % 2147483648;
    return rs / 2147483648;
  };
  const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

  const partners: Partner[] = [
    { id: 'p1', name: 'علی رضایی', phone: '0912 345 6789', share: 40, color: '#7C3AED', role: 'مدیر مالی', joined: J.addDays(today, -220) },
    { id: 'p2', name: 'محمد کریمی', phone: '0913 222 4455', share: 35, color: '#06B6D4', role: 'مدیر فنی', joined: J.addDays(today, -220) },
    { id: 'p3', name: 'حسین موسوی', phone: '0915 777 1122', share: 25, color: '#F59E0B', role: 'بازار و فروش', joined: J.addDays(today, -200) },
  ];
  s.partners = partners;

  const flocks: Flock[] = [
    {
      id: 'f1',
      name: 'گله ۱ — پاییز ۱۴۰۵',
      code: 'F-1405-01',
      breed: 'B.U.T 6',
      hall: 'سالن ۱',
      startDate: J.addDays(today, -42),
      startCount: 5000,
      chickType: 'یک روزه',
      chickAge: 1,
      status: 'active',
      endDate: '',
      soldCount: 0,
      notes: 'دوره پروار ۱۲۰ روزه، تهویه سالن کنترل شود.',
    },
    {
      id: 'f2',
      name: 'گله ۲ — تابستان ۱۴۰۵',
      code: 'F-1405-02',
      breed: 'Hybrid Converter',
      hall: 'سالن ۲',
      startDate: J.addDays(today, -175),
      startCount: 4200,
      chickType: 'چند روزه',
      chickAge: 15,
      status: 'closed',
      endDate: J.addDays(today, -25),
      soldCount: 4200,
      notes: 'دوره تکمیل شده — میانگین وزن نهایی ۱۱.۸ کیلوگرم.',
    },
  ];
  s.flocks = flocks;

  /* رکوردهای روزانه گله ۱ */
  const daily: DailyRecord[] = [];
  let mortAcc = 0;
  for (let d = 0; d <= 42; d++) {
    const date = J.addDays(today, -(42 - d));
    const mort = d < 7 ? ri(0, 3) : d % 11 === 0 ? ri(2, 6) : ri(0, 2);
    mortAcc += mort;
    const alive = 5000 - mortAcc;
    const feedPerBird = 0.025 + d * 0.0042;
    const feedKg = Math.round(alive * feedPerBird * (0.95 + rnd() * 0.1));
    const water = Math.round(feedKg * 1.8);
    const w = d % 7 === 0 || d === 42 ? Math.round(60 + d * 75) : 0;
    daily.push({
      id: 'd1-' + d,
      flockId: 'f1',
      date,
      age: d,
      mortality: mort,
      culled: d === 21 ? 6 : 0,
      feedKg,
      waterL: water,
      avgWeightG: w,
      tempC: Math.max(22, Math.round(34 - d * 0.28)),
      note: d === 21 ? 'حذف ۶ قطعه لنگ' : '',
    });
  }

  /* رکوردهای گله ۲ — هر ۷ روز */
  let m2 = 0;
  for (let k = 0; k <= 150; k += 7) {
    const m = ri(2, 9);
    m2 += m;
    daily.push({
      id: 'd2-' + k,
      flockId: 'f2',
      date: J.addDays(today, -(175 - k)),
      age: k,
      mortality: m,
      culled: 0,
      feedKg: Math.round((4200 - m2) * (0.03 + k * 0.0038)),
      waterL: 0,
      avgWeightG: Math.round(60 + k * 78),
      tempC: 24,
      note: '',
    });
  }
  s.daily = daily;

  /* هزینه‌ها */
  const expenses: Expense[] = [];
  type Extra = Partial<Expense>;
  const E = (
    daysAgo: number,
    category: string,
    sub: string,
    title: string,
    amount: number,
    extra?: Extra,
  ) => {
    expenses.push({
      id: uid(),
      date: J.addDays(today, -daysAgo),
      category,
      sub,
      title,
      amount,
      qty: 1,
      unit: 'عدد',
      vendor: '',
      paidBy: 'fund',
      split: 'share',
      flockId: 'f1',
      note: '',
      ...extra,
    });
  };

  E(42, 'chick1', 'خرید جوجه', 'خرید ۵۰۰۰ جوجه یک‌روزه', 600000000, { qty: 5000, unit: 'قطعه', vendor: 'تفریخ‌خانه البرز', paidBy: 'p1' });
  E(41, 'chick1', 'حمل جوجه', 'حمل جوجه تا سالن', 12000000, { paidBy: 'p2' });
  E(40, 'med', 'ضدعفونی', 'ضدعفونی و آماده‌سازی سالن', 8500000, { paidBy: 'fund' });
  E(39, 'feed', 'پیش‌دان', 'خرید ۸۰۰۰ کیلو پیش‌دان', 272000000, { qty: 8000, unit: 'کیلوگرم', vendor: 'خوراک دام پارس', paidBy: 'p1' });
  E(38, 'vaccine', 'نیوکاسل', 'واکسن نیوکاسل — نوبت اول', 3200000, { paidBy: 'p2' });
  E(35, 'gas', 'هیتر و شعله', 'گازوئیل و گاز هیتر سالن', 14500000, { paidBy: 'fund' });
  E(34, 'diesel', 'خرید گازوئیل', 'خرید ۴۰۰ لیتر گازوئیل', 22000000, { qty: 400, unit: 'لیتر', paidBy: 'p3' });
  E(32, 'water', 'حساب آب', 'قبض آب دوره اول', 4200000, { paidBy: 'fund' });
  E(31, 'power', 'حساب برق', 'قبض برق دوره اول', 9800000, { paidBy: 'fund' });
  E(30, 'labor', 'حقوق ماهانه', 'حقوق کارگر شیفت شب', 14000000, { paidBy: 'p1' });
  E(29, 'labor', 'حقوق ماهانه', 'حقوق کارگر شیفت روز', 14000000, { paidBy: 'p1' });
  E(28, 'labor', 'حقوق ماهانه', 'حقوق سرکارگر', 18000000, { paidBy: 'p1' });
  E(27, 'vaccine', 'گامبورو', 'واکسن گامبورو', 4300000, { paidBy: 'p2' });
  E(25, 'feed', 'پس‌دان', 'خرید ۱۲۰۰۰ کیلو پس‌دان', 366000000, { qty: 12000, unit: 'کیلوگرم', vendor: 'خوراک دام پارس', paidBy: 'p1' });
  E(24, 'mix', 'ذرت', 'خرید ذرت برای فرمول ساختگی', 84000000, { qty: 4000, unit: 'کیلوگرم', paidBy: 'p3' });
  E(23, 'mix', 'سویا', 'خرید کنجاله سویا', 96000000, { qty: 2000, unit: 'کیلوگرم', paidBy: 'p3' });
  E(22, 'mix', 'روغن', 'روغن گیاهی مخلوط', 18500000, { qty: 300, unit: 'کیلوگرم', paidBy: 'p3' });
  E(21, 'equip', 'دان‌خوری', 'خرید ۲۰ عدد دان‌خوری', 25000000, { qty: 20, unit: 'عدد', paidBy: 'p2' });
  E(20, 'med', 'ویتامین', 'ویتامین و مکمل محلول در آب', 6300000, { paidBy: 'p2' });
  E(18, 'fatten', 'دست‌مزد پروار', 'دست‌مزد پروار دوره اول', 18000000, { paidBy: 'fund' });
  E(16, 'deal', 'دلالی خرید', 'کمیسیون دلال خرید دان', 8500000, { paidBy: 'p3' });
  E(15, 'loss', 'کسری دان', 'کسری و ضایعات دان انبار', 5200000, { paidBy: 'fund' });
  E(14, 'transport', 'حمل دان', 'کرایه حمل دان به مزرعه', 9000000, { paidBy: 'p3' });
  E(13, 'loss', 'تلفات گله', 'ارزش تلفات ۴۲ روز اول', 11200000, { paidBy: 'fund' });
  E(12, 'water', 'پمپ و لوله', 'تعمیر پمپ آب', 3100000, { paidBy: 'p2' });
  E(10, 'rent', 'اجاره سالن', 'اجاره سالن ۱ — ماه اول', 30000000, { paidBy: 'p1' });
  E(9, 'vaccine', 'برونشیت', 'واکسن برونشیت نوبت دوم', 2800000, { paidBy: 'p2' });
  E(7, 'meat', 'ران', 'خرید ران بوقلمون برای توزیع', 120000000, { qty: 600, unit: 'کیلوگرم', paidBy: 'p3' });
  E(6, 'gas', 'حساب گاز', 'قبض گاز سالن', 11800000, { paidBy: 'fund' });
  E(5, 'power', 'حساب برق', 'قبض برق دوره دوم', 12400000, { paidBy: 'fund' });
  E(4, 'labor', 'اضافه‌کاری', 'اضافه‌کاری تخلیه دان', 4200000, { paidBy: 'p1' });
  E(3, 'deal', 'دلالی فروش', 'دلالی فروش گوشت', 6500000, { paidBy: 'p3' });
  E(2, 'equip', 'فن و تهویه', 'تعمیر فن تهویه', 7800000, { paidBy: 'p2' });
  E(1, 'other', 'متفرقه', 'هزینه‌های متفرقه مزرعه', 3500000, { paidBy: 'fund' });

  E(175, 'chick15', 'خرید جوجه', 'خرید ۴۲۰۰ جوجه ۱۵ روزه', 520000000, { qty: 4200, unit: 'قطعه', flockId: 'f2', paidBy: 'p1' });
  E(160, 'feed', 'گروور', 'خرید دان گروور', 410000000, { qty: 14000, unit: 'کیلوگرم', flockId: 'f2', paidBy: 'p1' });
  E(140, 'feed', 'فینیشر', 'خرید دان فینیشر', 380000000, { qty: 12000, unit: 'کیلوگرم', flockId: 'f2', paidBy: 'p1' });
  E(130, 'labor', 'حقوق ماهانه', 'حقوق کارگران دوره قبل', 56000000, { flockId: 'f2', paidBy: 'p1' });
  E(120, 'vaccine', 'آنفلوانزا', 'واکسن آنفلوانزا', 7400000, { flockId: 'f2', paidBy: 'p2' });
  E(110, 'water', 'حساب آب', 'آب دوره قبل', 6800000, { flockId: 'f2', paidBy: 'fund' });
  E(105, 'power', 'حساب برق', 'برق دوره قبل', 14200000, { flockId: 'f2', paidBy: 'fund' });
  E(95, 'gas', 'سیلندر', 'گاز مایع دوره قبل', 16500000, { flockId: 'f2', paidBy: 'fund' });
  E(80, 'diesel', 'خرید گازوئیل', 'گازوئیل دوره قبل', 19500000, { flockId: 'f2', paidBy: 'p3' });
  E(60, 'fatten', 'دست‌مزد پروار', 'دست‌مزد پروار دوره قبل', 22000000, { flockId: 'f2', paidBy: 'fund' });
  E(45, 'loss', 'تلفات گله', 'تلفات دوره قبل', 14800000, { flockId: 'f2', paidBy: 'fund' });
  E(30, 'rent', 'اجاره سالن', 'اجاره سالن ۲', 28000000, { flockId: 'f2', paidBy: 'p1' });
  s.expenses = expenses;

  /* فروش */
  const sales: Sale[] = [];
  const SALE = (
    daysAgo: number,
    type: string,
    kg: number,
    price: number,
    extra?: Partial<Sale>,
  ) => {
    sales.push({
      id: uid(),
      date: J.addDays(today, -daysAgo),
      type,
      qtyKg: kg,
      pricePerKg: price,
      amount: kg * price,
      buyer: 'کشتارگاه مرکزی',
      flockId: 'f1',
      paidTo: 'fund',
      note: '',
      ...extra,
    });
  };
  SALE(75, 'لاشه کامل', 12000, 172000, { buyer: 'کشتارگاه مرکزی', flockId: 'f2', note: 'فروش مرحله اول گله ۲' });
  SALE(50, 'لاشه کامل', 14000, 175000, { buyer: 'کشتارگاه مرکزی', flockId: 'f2', note: 'فروش مرحله دوم گله ۲' });
  SALE(27, 'لاشه کامل', 12000, 178000, { buyer: 'کشتارگاه مرکزی', flockId: 'f2', note: 'تسویه نهایی دوره گله ۲' });
  SALE(30, 'لاشه کامل', 420, 178000, { buyer: 'کشتارگاه مرکزی', flockId: 'f2' });
  SALE(28, 'ران', 180, 205000, { buyer: 'عمده‌فروشی رضوان', flockId: 'f2' });
  SALE(20, 'سینه', 120, 315000, { buyer: 'رستوران باغ ایرانی', flockId: 'f2' });
  SALE(14, 'لاشه کامل', 260, 182000, { buyer: 'کشتارگاه مرکزی' });
  SALE(9, 'ران', 140, 210000, { buyer: 'عمده‌فروشی رضوان' });
  SALE(7, 'سینه', 95, 320000, { buyer: 'رستوران باغ ایرانی' });
  SALE(4, 'بال', 60, 158000, { buyer: 'پخش گوشت آریا' });
  SALE(2, 'فیله', 38, 375000, { buyer: 'رستوران باغ ایرانی' });
  s.sales = sales;

  /* فرمول‌های خوراک */
  const formulas: Formula[] = [
    {
      id: 'fm1',
      name: 'فرمول استارتر (۰ تا ۲۸ روز)',
      note: 'پروتئین بالا برای شروع رشد',
      items: [
        { name: 'ذرت', percent: 45, pricePerKg: 21000, protein: 8.5 },
        { name: 'کنجاله سویا', percent: 38, pricePerKg: 48000, protein: 44 },
        { name: 'روغن گیاهی', percent: 4, pricePerKg: 62000, protein: 0 },
        { name: 'پودر ماهی', percent: 5, pricePerKg: 95000, protein: 60 },
        { name: 'سبوس گندم', percent: 4, pricePerKg: 14000, protein: 15 },
        { name: 'دی‌کلسیم فسفات', percent: 2, pricePerKg: 38000, protein: 0 },
        { name: 'پیش‌مخلوط ویتامین', percent: 2, pricePerKg: 180000, protein: 0 },
      ],
    },
    {
      id: 'fm2',
      name: 'فرمول گروور (۲۸ تا ۸۰ روز)',
      note: 'تعادل انرژی و پروتئین',
      items: [
        { name: 'ذرت', percent: 52, pricePerKg: 21000, protein: 8.5 },
        { name: 'کنجاله سویا', percent: 30, pricePerKg: 48000, protein: 44 },
        { name: 'روغن گیاهی', percent: 5, pricePerKg: 62000, protein: 0 },
        { name: 'سبوس گندم', percent: 8, pricePerKg: 14000, protein: 15 },
        { name: 'دی‌کلسیم فسفات', percent: 2, pricePerKg: 38000, protein: 0 },
        { name: 'پیش‌مخلوط ویتامین', percent: 2, pricePerKg: 180000, protein: 0 },
        { name: 'متیونین', percent: 1, pricePerKg: 240000, protein: 0 },
      ],
    },
    {
      id: 'fm3',
      name: 'فرمول فینیشر (۸۰ روز به بعد)',
      note: 'افزایش انرژی برای وزن‌گیری',
      items: [
        { name: 'ذرت', percent: 62, pricePerKg: 21000, protein: 8.5 },
        { name: 'کنجاله سویا', percent: 22, pricePerKg: 48000, protein: 44 },
        { name: 'روغن گیاهی', percent: 6, pricePerKg: 62000, protein: 0 },
        { name: 'سبوس گندم', percent: 5, pricePerKg: 14000, protein: 15 },
        { name: 'دی‌کلسیم فسفات', percent: 2, pricePerKg: 38000, protein: 0 },
        { name: 'پیش‌مخلوط ویتامین', percent: 3, pricePerKg: 180000, protein: 0 },
      ],
    },
  ];
  s.formulas = formulas;

  const batches: Batch[] = [
    { id: 'b1', date: J.addDays(today, -26), formulaId: 'fm1', qtyKg: 3000, flockId: 'f1', note: 'مخلوط کن اصلی', expensed: true },
    { id: 'b2', date: J.addDays(today, -12), formulaId: 'fm2', qtyKg: 4500, flockId: 'f1', note: '', expensed: true },
    { id: 'b3', date: J.addDays(today, -3), formulaId: 'fm2', qtyKg: 2500, flockId: 'f1', note: '', expensed: false },
  ];
  s.batches = batches;

  const vaccines: Vaccine[] = [
    { id: 'v1', flockId: 'f1', date: J.addDays(today, -38), name: 'نیوکاسل (B1)', method: 'قطره چشمی', count: 5000, cost: 3200000, vet: 'دکتر صادقی', note: '' },
    { id: 'v2', flockId: 'f1', date: J.addDays(today, -27), name: 'گامبورو', method: 'آب آشامیدنی', count: 4950, cost: 4300000, vet: 'دکتر صادقی', note: '' },
    { id: 'v3', flockId: 'f1', date: J.addDays(today, -9), name: 'برونشیت', method: 'اسپری', count: 4880, cost: 2800000, vet: 'دکتر امینی', note: '' },
  ];
  s.vaccines = vaccines;

  const tasks: Task[] = [
    { id: 't1', date: J.today(), title: 'واکسن نیوکاسل نوبت سوم', type: 'واکسن', done: false, flockId: 'f1', note: 'ساعت ۹ صبح' },
    { id: 't2', date: J.addDays(today, 1), title: 'توزین هفتگی گله', type: 'توزین', done: false, flockId: 'f1', note: '۲۰ نمونه تصادفی' },
    { id: 't3', date: J.addDays(today, 3), title: 'خرید ۵۰۰۰ کیلو دان پس‌دان', type: 'خرید', done: false, flockId: 'f1', note: '' },
    { id: 't4', date: J.addDays(today, -2), title: 'تسویه قبض برق', type: 'مالی', done: true, flockId: '', note: '' },
    { id: 't5', date: J.addDays(today, 6), title: 'جلسه شرکا و بررسی صورت‌حساب', type: 'مالی', done: false, flockId: '', note: 'با حضور هر سه شریک' },
  ];
  s.tasks = tasks;

  const inventory: Array<Omit<InventoryItem, 'code' | 'active' | 'note'>> = [
    { id: 'i1', name: 'دان پیش‌دان', unit: 'کیلوگرم', qty: 3200, min: 2000, pricePerKg: 34000, cat: 'خوراک' },
    { id: 'i2', name: 'دان پس‌دان', unit: 'کیلوگرم', qty: 8400, min: 5000, pricePerKg: 30500, cat: 'خوراک' },
    { id: 'i3', name: 'ذرت', unit: 'کیلوگرم', qty: 2600, min: 3000, pricePerKg: 21000, cat: 'مواد اولیه' },
    { id: 'i4', name: 'کنجاله سویا', unit: 'کیلوگرم', qty: 1450, min: 1000, pricePerKg: 48000, cat: 'مواد اولیه' },
    { id: 'i5', name: 'واکسن نیوکاسل', unit: 'ویال', qty: 18, min: 10, pricePerKg: 0, cat: 'دارو' },
    { id: 'i6', name: 'ویتامین AD3E', unit: 'لیتر', qty: 6, min: 8, pricePerKg: 0, cat: 'دارو' },
    { id: 'i7', name: 'گازوئیل', unit: 'لیتر', qty: 180, min: 300, pricePerKg: 55000, cat: 'سوخت' },
  ];
  s.inventory = inventory.map((i, idx) => ({
    ...i,
    code: 'K-' + (1001 + idx),
    active: true,
    note: '',
  }));

  const contributions: Contribution[] = [
    { id: 'c1', partnerId: 'p1', date: J.addDays(today, -60), amount: 500000000, note: 'آورده نقدی اولیه' },
    { id: 'c2', partnerId: 'p2', date: J.addDays(today, -60), amount: 430000000, note: 'آورده نقدی اولیه' },
    { id: 'c3', partnerId: 'p3', date: J.addDays(today, -58), amount: 300000000, note: 'آورده نقدی اولیه' },
    { id: 'c4', partnerId: 'p1', date: J.addDays(today, -20), amount: 150000000, note: 'آورده تکمیلی' },
    { id: 'c5', partnerId: 'p2', date: J.addDays(today, -18), amount: 100000000, note: 'آورده تکمیلی' },
  ];
  s.contributions = contributions;

  const deals: Deal[] = [];
  s.deals = deals;

  /* --- اشخاص (مشتری / تامین‌کننده) --- */
  s.persons = [
    {
      id: 'crm1',
      code: 'P-1001',
      firstName: 'کشتارگاه',
      lastName: 'مرکزی',
      company: 'کشتارگاه مرکزی',
      type: 'customer',
      nationalId: '14001234567',
      phone: '02155443322',
      address: 'تهران، جاده قدیم کرج',
      note: 'خریدار اصلی گوشت',
    },
    {
      id: 'crm2',
      code: 'P-1002',
      firstName: 'خوراک دام',
      lastName: 'پارس',
      company: 'خوراک دام پارس',
      type: 'supplier',
      nationalId: '14009876543',
      phone: '02166778899',
      address: 'کرج، شهرک صنعتی',
      note: 'تامین دان آماده',
    },
  ];

  /* --- معاملات نمونه --- */
  s.transactions = [];
  s.payments = [];

  return s;
}
