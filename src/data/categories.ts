/** دسته‌بندی هزینه‌ها، واحدها و انواع محصول — داده ثابت برنامه */

export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
  subs: string[];
}

export const CATEGORIES: Category[] = [
  { id: 'water', label: 'آب', icon: '💧', color: '#38BDF8', subs: ['حساب آب', 'پمپ و لوله', 'تصفیه آب'] },
  { id: 'power', label: 'برق', icon: '⚡', color: '#FBBF24', subs: ['حساب برق', 'ژنراتور', 'سیم‌کشی و لوازم'] },
  { id: 'gas', label: 'گاز', icon: '🔥', color: '#F97316', subs: ['حساب گاز', 'سیلندر', 'هیتر و شعله'] },
  { id: 'diesel', label: 'گازوئیل', icon: '🛢️', color: '#64748B', subs: ['خرید گازوئیل', 'حمل سوخت', 'مخزن سوخت'] },
  { id: 'chick1', label: 'جوجه یک‌روزه', icon: '🐣', color: '#8B5CF6', subs: ['خرید جوجه', 'حمل جوجه', 'بیمه جوجه'] },
  { id: 'chick15', label: 'جوجه ۱۵ روزه', icon: '🐤', color: '#C4B5FD', subs: ['خرید جوجه', 'حمل جوجه', 'بیمه جوجه'] },
  { id: 'fatten', label: 'پروار', icon: '📈', color: '#F59E0B', subs: ['دست‌مزد پروار', 'افزایش وزن', 'سایر'] },
  { id: 'meat', label: 'گوشت', icon: '🍗', color: '#EF4444', subs: ['ران', 'سینه', 'بال', 'فیله', 'لاشه کامل', 'چرخ‌کرده', 'جگر'] },
  { id: 'feed', label: 'خوراک آماده', icon: '🌾', color: '#10B981', subs: ['پیش‌دان', 'پس‌دان', 'استارتر', 'گروور', 'فینیشر', 'کنسانتره'] },
  { id: 'mix', label: 'خوراک ساختگی', icon: '🧪', color: '#14B8A6', subs: ['ذرت', 'سویا', 'روغن', 'سبوس', 'پودر ماهی', 'افزودنی'] },
  { id: 'deal', label: 'معاملات / دلالی', icon: '🤝', color: '#6366F1', subs: ['دلالی خرید', 'دلالی فروش', 'کمیسیون', 'سایر'] },
  { id: 'vaccine', label: 'واکسیناسیون', icon: '💉', color: '#DB2777', subs: ['نیوکاسل', 'برونشیت', 'گامبورو', 'آنفلوانزا', 'سایر'] },
  { id: 'labor', label: 'کارگر', icon: '👷', color: '#0EA5E9', subs: ['حقوق ماهانه', 'اضافه‌کاری', 'بیمه', 'غذا و ایاب'] },
  { id: 'loss', label: 'تلفات و کسری', icon: '⚠️', color: '#DC2626', subs: ['تلفات گله', 'کسری دان', 'کسری وزنی', 'سرقت'] },
  { id: 'med', label: 'دارو و درمان', icon: '💊', color: '#22C55E', subs: ['آنتی‌بیوتیک', 'ویتامین', 'ضدعفونی', 'مشاوره دامپزشک'] },
  { id: 'equip', label: 'تجهیزات', icon: '🔧', color: '#7C3AED', subs: ['دان‌خوری', 'آب‌خوری', 'هیتر', 'فن و تهویه', 'تعمیرات'] },
  { id: 'transport', label: 'حمل و نقل', icon: '🚚', color: '#0891B2', subs: ['حمل دان', 'حمل گوشت', 'حمل سوخت'] },
  { id: 'rent', label: 'اجاره', icon: '🏠', color: '#A16207', subs: ['اجاره سالن', 'اجاره زمین'] },
  { id: 'other', label: 'سایر', icon: '📦', color: '#94A3B8', subs: ['متفرقه'] },
];

export const CAT_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

export const MEAT_TYPES = [
  'لاشه کامل',
  'ران',
  'سینه',
  'بال',
  'فیله',
  'چرخ‌کرده',
  'جگر',
  'کله‌پاچه',
];

export const UNITS = ['کیلوگرم', 'قطعه', 'کیسه', 'لیتر', 'عدد', 'ساعت', 'نفر', 'متر'];

export const PARTNER_COLORS = [
  { value: '#7C3AED', label: 'بنفش' },
  { value: '#06B6D4', label: 'فیروزه‌ای' },
  { value: '#F59E0B', label: 'نارنجی' },
  { value: '#10B981', label: 'سبز' },
  { value: '#EC4899', label: 'صورتی' },
  { value: '#6366F1', label: 'نیلی' },
];

export const INVENTORY_CATS = ['خوراک', 'مواد اولیه', 'دارو', 'سوخت', 'تجهیزات', 'سایر'];

export const INVENTORY_CAT_TO_EXPENSE: Record<string, string> = {
  'خوراک': 'feed',
  'مواد اولیه': 'mix',
  'دارو': 'med',
  'سوخت': 'diesel',
  'تجهیزات': 'equip',
};

export const TASK_TYPES = ['عمومی', 'واکسن', 'توزین', 'خرید', 'مالی', 'بازدید'];
