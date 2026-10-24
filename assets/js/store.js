/* ==========================================================================
   store.js — داده‌ها، ذخیره‌سازی محلی، محاسبات و داده نمونه
   ========================================================================== */
(function (A) {
  'use strict';

  var KEY = 'turkeyFarm.v2';

  /* ---------------------------- دسته‌بندی هزینه‌ها --------------------------- */
  A.CATS = [
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
    { id: 'other', label: 'سایر', icon: '📦', color: '#94A3B8', subs: ['متفرقه'] }
  ];
  A.CAT_MAP = {};
  A.CATS.forEach(function (c) { A.CAT_MAP[c.id] = c; });

  A.MEAT_TYPES = ['لاشه کامل', 'ران', 'سینه', 'بال', 'فیله', 'چرخ‌کرده', 'جگر', 'کله‌پاچه'];
  A.UNITS = ['کیلوگرم', 'قطعه', 'کیسه', 'لیتر', 'عدد', 'ساعت', 'نفر', 'متر'];

  var S = A.Store = {};
  A.Views = A.Views || {};
  A.Forms = A.Forms || {};
  var state = null;

  /* ------------------------------ ابزارهای پایه ----------------------------- */
  function uid() {
    return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var raw = String(v == null ? 0 : v);
    if (typeof J !== 'undefined' && J.toEn) raw = J.toEn(raw);
    var n = parseFloat(raw.replace(/[^\d.\-]/g, ''));
    return isFinite(n) ? n : 0;
  }
  function sum(arr, key) {
    return arr.reduce(function (a, o) { return a + (key ? num(o[key]) : num(o)); }, 0);
  }
  function byDateAsc(a, b) { return J.jdn(a.date) - J.jdn(b.date); }
  function byDateDesc(a, b) { return J.jdn(b.date) - J.jdn(a.date); }

  S.uid = uid;
  S.num = num;
  S.sum = sum;

  /* ---------------------------------- ذخیره --------------------------------- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.partners) return null;
      return s;
    } catch (e) { return null; }
  }

  S.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('ذخیره‌سازی ناموفق', e); }
  };

  S.reset = function (withSeed) {
    state = withSeed ? seed() : blank();
    S.save();
  };

  S.export = function () { return JSON.stringify(state, null, 2); };

  S.import = function (json) {
    var s = typeof json === 'string' ? JSON.parse(json) : json;
    if (!s || !s.partners) throw new Error('ساختار فایل معتبر نیست');
    state = s;
    S.save();
  };

  Object.defineProperty(S, 'state', { get: function () { return state; } });

  /* ------------------------------ CRUD عمومی -------------------------------- */
  S.all = function (col) { return state[col] || []; };

  S.find = function (col, id) {
    var arr = state[col] || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  };

  S.add = function (col, obj) {
    obj.id = obj.id || uid();
    obj.createdAt = obj.createdAt || Date.now();
    state[col].unshift(obj);
    S.save();
    return obj;
  };

  S.update = function (col, id, patch) {
    var o = S.find(col, id);
    if (!o) return null;
    Object.keys(patch).forEach(function (k) { o[k] = patch[k]; });
    S.save();
    return o;
  };

  S.remove = function (col, id) {
    var i = (state[col] || []).findIndex(function (o) { return o.id === id; });
    if (i > -1) { state[col].splice(i, 1); S.save(); }
  };

  S.setting = function (k, v) {
    if (v === undefined) return state.settings[k];
    state.settings[k] = v; S.save(); return v;
  };

  /* ---------------------------------- شرکا ---------------------------------- */
  S.partner = function (id) {
    return state.partners.filter(function (p) { return p.id === id; })[0] || null;
  };

  S.partnerName = function (id) {
    if (!id || id === 'fund') return 'صندوق مشترک';
    var p = S.partner(id);
    return p ? p.name : '—';
  };

  S.totalShare = function () {
    return sum(state.partners, 'share');
  };

  /* سهم هر شریک از یک هزینه */
  S.expenseShares = function (exp) {
    var partners = state.partners, total = num(exp.amount), out = {};
    if (!partners.length) return out;
    if (exp.split === 'custom' && exp.shares) {
      partners.forEach(function (p) { out[p.id] = total * num(exp.shares[p.id]) / 100; });
    } else if (exp.split === 'equal') {
      partners.forEach(function (p) { out[p.id] = total / partners.length; });
    } else if (exp.split === 'single') {
      partners.forEach(function (p) { out[p.id] = p.id === exp.paidBy ? total : 0; });
    } else {
      var t = S.totalShare() || 100;
      partners.forEach(function (p) { out[p.id] = total * num(p.share) / t; });
    }
    return out;
  };

  /* تسویه حساب شرکا */
  S.settlement = function (filter) {
    var exps = S.filterExpenses(filter || {});
    var totalExp = sum(exps, 'amount');
    var rows = state.partners.map(function (p) {
      var shareExp = 0, paidDirect = 0;
      exps.forEach(function (e) {
        shareExp += num(S.expenseShares(e)[p.id]);
        if (e.paidBy === p.id) paidDirect += num(e.amount);
      });
      var capital = sum(state.contributions.filter(function (c) { return c.partnerId === p.id; }), 'amount');
      return {
        id: p.id, name: p.name, share: num(p.share), color: p.color,
        capital: capital, paidDirect: paidDirect, shareExp: shareExp,
        balance: capital + paidDirect - shareExp
      };
    });
    var surplus = rows.reduce(function (a, r) { return a + r.balance; }, 0);
    return { rows: rows, totalExp: totalExp, surplus: surplus };
  };

  /* ------------------------------- گله و آمار ------------------------------- */
  S.flock = function (id) { return S.find('flocks', id); };

  S.activeFlocks = function () {
    return state.flocks.filter(function (f) { return f.status !== 'closed'; });
  };

  S.flockLabel = function (id) {
    var f = S.flock(id);
    return f ? f.name : 'عمومی مزرعه';
  };

  S.flockStats = function (id) {
    var f = S.flock(id);
    if (!f) return null;
    var recs = state.daily.filter(function (d) { return d.flockId === id; }).sort(byDateAsc);
    var mort = 0, culled = 0, feed = 0, lastW = 0, lastRec = null, water = 0;
    recs.forEach(function (r) {
      mort += num(r.mortality);
      culled += num(r.culled);
      feed += num(r.feedKg);
      water += num(r.waterL);
      if (num(r.avgWeightG) > 0) { lastW = num(r.avgWeightG); lastRec = r; }
    });
    var sold = num(f.soldCount);
    var alive = Math.max(0, num(f.startCount) - mort - culled - sold);
    var end = f.endDate || J.today();
    var age = Math.max(0, J.diff(f.startDate, end));
    var biomass = alive * lastW / 1000;
    var gainKg = biomass - num(f.startCount) * 0.06;
    var exp = sum(state.expenses.filter(function (e) { return e.flockId === id; }), 'amount');
    var rev = sum(state.sales.filter(function (s) { return s.flockId === id; }), 'amount');
    return {
      flock: f, age: age, records: recs.length,
      mortality: mort, culled: culled, alive: alive, sold: sold,
      mortalityPct: num(f.startCount) ? (mort + culled) / num(f.startCount) * 100 : 0,
      survivalPct: num(f.startCount) ? alive / num(f.startCount) * 100 : 0,
      feedKg: feed, waterL: water,
      avgWeightG: lastW, weightDate: lastRec ? lastRec.date : null,
      biomass: biomass, fcr: gainKg > 0 ? feed / gainKg : 0,
      expenses: exp, revenue: rev, profit: rev - exp,
      costPerKg: biomass > 0 ? exp / biomass : 0,
      feedPerBird: alive ? feed / alive : 0
    };
  };

  /* هزینه‌ها با فیلتر */
  S.filterExpenses = function (f) {
    var list = state.expenses.slice();
    if (f.cat) list = list.filter(function (e) { return e.category === f.cat; });
    if (f.flockId) list = list.filter(function (e) { return e.flockId === f.flockId; });
    if (f.partnerId) list = list.filter(function (e) { return e.paidBy === f.partnerId; });
    if (f.from) list = list.filter(function (e) { return J.jdn(e.date) >= J.jdn(f.from); });
    if (f.to) list = list.filter(function (e) { return J.jdn(e.date) <= J.jdn(f.to); });
    if (f.q) {
      var q = f.q.trim();
      list = list.filter(function (e) {
        return (e.title || '').indexOf(q) > -1 || (e.sub || '').indexOf(q) > -1 || (e.note || '').indexOf(q) > -1;
      });
    }
    return list.sort(byDateDesc);
  };

  S.totals = function (filter) {
    var exps = S.filterExpenses(filter || {});
    var sales = state.sales.slice();
    if (filter && filter.flockId) sales = sales.filter(function (s) { return s.flockId === filter.flockId; });
    if (filter && filter.from) sales = sales.filter(function (s) { return J.jdn(s.date) >= J.jdn(filter.from); });
    if (filter && filter.to) sales = sales.filter(function (s) { return J.jdn(s.date) <= J.jdn(filter.to); });
    var exp = sum(exps, 'amount');
    var rev = sum(sales, 'amount');
    return {
      expenses: exp, revenue: rev, profit: rev - exp,
      count: exps.length, salesCount: sales.length,
      salesKg: sum(sales, 'qtyKg'),
      margin: rev > 0 ? (rev - exp) / rev * 100 : 0
    };
  };

  /* هزینه به تفکیک دسته */
  S.byCategory = function (filter) {
    var exps = S.filterExpenses(filter || {});
    var map = {};
    exps.forEach(function (e) {
      map[e.category] = (map[e.category] || 0) + num(e.amount);
    });
    return Object.keys(map).map(function (k) {
      var c = A.CAT_MAP[k] || { label: k, color: '#94A3B8', icon: '📦' };
      return { id: k, label: c.label, color: c.color, icon: c.icon, value: map[k] };
    }).sort(function (a, b) { return b.value - a.value; });
  };

  /* سری ماهانه هزینه و فروش */
  S.monthlySeries = function (n) {
    var months = J.lastMonths(n || 6);
    return months.map(function (m) {
      var e = state.expenses.filter(function (x) { return x.date.slice(0, 7) === m.key; });
      var s = state.sales.filter(function (x) { return x.date.slice(0, 7) === m.key; });
      return { key: m.key, label: m.label, expense: sum(e, 'amount'), income: sum(s, 'amount') };
    });
  };

  /* گردش‌های اخیر */
  S.recent = function (n) {
    var items = [];
    state.expenses.slice(0, 40).forEach(function (e) {
      items.push({ kind: 'expense', date: e.date, title: e.title, sub: A.CAT_MAP[e.category] ? A.CAT_MAP[e.category].label : '', amount: -num(e.amount), icon: '💸', color: '#EF4444' });
    });
    state.sales.slice(0, 40).forEach(function (s) {
      items.push({ kind: 'sale', date: s.date, title: 'فروش ' + s.type, sub: (num(s.qtyKg) + ' کیلو'), amount: num(s.amount), icon: '🍗', color: '#10B981' });
    });
    items.sort(function (a, b) { return J.jdn(b.date) - J.jdn(a.date); });
    return items.slice(0, n || 6);
  };

  /* هشدارها */
  S.alerts = function () {
    var out = [];
    S.activeFlocks().forEach(function (f) {
      var st = S.flockStats(f.id);
      var recs = state.daily.filter(function (d) { return d.flockId === f.id; }).sort(byDateAsc).slice(-7);
      var m7 = sum(recs, 'mortality');
      if (st.alive && m7 / st.alive > 0.012) {
        out.push({ level: 'danger', icon: '⚠️', title: 'تلفات بالای گله ' + f.name, text: 'در ۷ روز گذشته ' + m7 + ' قطعه تلف شده است.' });
      }
      if (recs.length === 0) {
        out.push({ level: 'warn', icon: '📝', title: 'ثبت روزانه انجام نشده', text: 'برای گله ' + f.name + ' هیچ رکورد روزانه‌ای ثبت نشده است.' });
      } else {
        var gap = J.diff(recs[recs.length - 1].date, J.today());
        if (gap > 2) out.push({ level: 'warn', icon: '⏰', title: 'ثبت روزانه عقب افتاده', text: f.name + ' — آخرین ثبت ' + J.ago(recs[recs.length - 1].date) });
      }
      if (st.avgWeightG && st.age > 28 && st.avgWeightG < st.age * 60) {
        out.push({ level: 'warn', icon: '⚖️', title: 'وزن گله عقب‌تر از انتظار', text: f.name + ' — وزن میانگین ' + st.avgWeightG + ' گرم در روز ' + st.age });
      }
    });
    state.tasks.filter(function (t) { return !t.done && J.diff(t.date, J.today()) >= 0; }).slice(0, 3)
      .forEach(function (t) {
        out.push({ level: 'info', icon: '🔔', title: t.title, text: 'موعد: ' + J.format(t.date, 'long') });
      });
    var st2 = S.settlement();
    st2.rows.forEach(function (r) {
      if (r.balance < -1000000) {
        out.push({ level: 'info', icon: '🧾', title: 'بدهی ' + r.name, text: 'مانده حساب منفی: ' + Math.round(Math.abs(r.balance)).toLocaleString('en-US') + ' تومان' });
      }
    });
    if (!out.length) out.push({ level: 'ok', icon: '✅', title: 'همه چیز مرتب است', text: 'هشدار فعالی وجود ندارد.' });
    return out.slice(0, 5);
  };

  /* ---------------------------------- داده نمونه ---------------------------- */
  function blank() {
    return {
      version: 2,
      settings: {
        farmName: 'مزرعه بوقلمون پارس',
        owner: 'مدیریت مزرعه',
        currency: 'تومان',
        persianDigits: true,
        cycleDays: 120,
        targetWeightG: 12000,
        chickWeightG: 60
      },
      partners: [], flocks: [], daily: [], expenses: [], sales: [],
      formulas: [], batches: [], tasks: [], vaccines: [],
      inventory: [], contributions: [], deals: []
    };
  }

  function seed() {
    var s = blank();
    var today = J.today();
    var rs = 987654321;
    function rnd() { rs = (rs * 1103515245 + 12345) % 2147483648; return rs / 2147483648; }
    function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }

    s.partners = [
      { id: 'p1', name: 'علی رضایی', phone: '0912 345 6789', share: 40, color: '#7C3AED', role: 'مدیر مالی', joined: J.addDays(today, -220) },
      { id: 'p2', name: 'محمد کریمی', phone: '0913 222 4455', share: 35, color: '#06B6D4', role: 'مدیر فنی', joined: J.addDays(today, -220) },
      { id: 'p3', name: 'حسین موسوی', phone: '0915 777 1122', share: 25, color: '#F59E0B', role: 'بازار و فروش', joined: J.addDays(today, -200) }
    ];

    s.flocks = [
      {
        id: 'f1', name: 'گله ۱ — پاییز ۱۴۰۵', code: 'F-1405-01', breed: 'B.U.T 6', hall: 'سالن ۱',
        startDate: J.addDays(today, -42), startCount: 5000, chickType: 'جوجه یک‌روزه',
        status: 'active', endDate: '', soldCount: 0, notes: 'دوره پروار ۱۲۰ روزه، تهویه سالن کنترل شود.'
      },
      {
        id: 'f2', name: 'گله ۲ — تابستان ۱۴۰۵', code: 'F-1405-02', breed: 'Hybrid Converter', hall: 'سالن ۲',
        startDate: J.addDays(today, -175), startCount: 4200, chickType: 'جوجه ۱۵ روزه',
        status: 'closed', endDate: J.addDays(today, -25), soldCount: 4200,
        notes: 'دوره تکمیل شده — میانگین وزن نهایی ۱۱.۸ کیلوگرم.'
      }
    ];

    /* --- رکوردهای روزانه گله ۱ --- */
    var mortAcc = 0;
    for (var d = 0; d <= 42; d++) {
      var date = J.addDays(today, -(42 - d));
      var mort = d < 7 ? ri(0, 3) : (d % 11 === 0 ? ri(2, 6) : ri(0, 2));
      mortAcc += mort;
      var alive = 5000 - mortAcc;
      var feedPerBird = 0.025 + d * 0.0042;
      var feedKg = Math.round(alive * feedPerBird * (0.95 + rnd() * 0.1));
      var water = Math.round(feedKg * 1.8);
      var w = (d % 7 === 0 || d === 42) ? Math.round(60 + d * 75) : 0;
      s.daily.push({
        id: 'd1-' + d, flockId: 'f1', date: date, age: d,
        mortality: mort, culled: d === 21 ? 6 : 0,
        feedKg: feedKg, waterL: water, avgWeightG: w,
        tempC: Math.max(22, Math.round(34 - d * 0.28)),
        note: d === 21 ? 'حذف ۶ قطعه لنگ' : ''
      });
    }

    /* --- رکوردهای گله ۲ (هر ۷ روز) --- */
    var m2 = 0;
    for (var k = 0; k <= 150; k += 7) {
      var m = ri(2, 9); m2 += m;
      s.daily.push({
        id: 'd2-' + k, flockId: 'f2', date: J.addDays(today, -(175 - k)), age: k,
        mortality: m, culled: 0, feedKg: Math.round((4200 - m2) * (0.03 + k * 0.0038)),
        waterL: 0, avgWeightG: Math.round(60 + k * 78), tempC: 24, note: ''
      });
    }

    /* --- هزینه‌ها --- */
    function E(daysAgo, category, sub, title, amount, extra) {
      var o = {
        id: uid(), date: J.addDays(today, -daysAgo), category: category, sub: sub || '',
        title: title, amount: amount, qty: 1, unit: 'عدد',
        paidBy: 'fund', split: 'share', flockId: 'f1', note: '', vendor: ''
      };
      if (extra) Object.keys(extra).forEach(function (kk) { o[kk] = extra[kk]; });
      s.expenses.push(o);
    }

    /* گله ۱ — ۴۲ روز اخیر */
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

    /* گله ۲ — دوره گذشته */
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

    /* --- فروش --- */
    function SALE(daysAgo, type, kg, price, extra) {
      var o = {
        id: uid(), date: J.addDays(today, -daysAgo), type: type, qtyKg: kg,
        pricePerKg: price, amount: kg * price, buyer: 'کشتارگاه مرکزی',
        flockId: 'f1', note: '', paidTo: 'fund'
      };
      if (extra) Object.keys(extra).forEach(function (kk) { o[kk] = extra[kk]; });
      s.sales.push(o);
    }
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

    /* --- فرمول‌های خوراک --- */
    s.formulas = [
      {
        id: 'fm1', name: 'فرمول استارتر (۰ تا ۲۸ روز)', note: 'پروتئین بالا برای شروع رشد',
        items: [
          { name: 'ذرت', percent: 45, pricePerKg: 21000, protein: 8.5 },
          { name: 'کنجاله سویا', percent: 38, pricePerKg: 48000, protein: 44 },
          { name: 'روغن گیاهی', percent: 4, pricePerKg: 62000, protein: 0 },
          { name: 'پودر ماهی', percent: 5, pricePerKg: 95000, protein: 60 },
          { name: 'سبوس گندم', percent: 4, pricePerKg: 14000, protein: 15 },
          { name: 'دی‌کلسیم فسفات', percent: 2, pricePerKg: 38000, protein: 0 },
          { name: 'پیش‌مخلوط ویتامین', percent: 2, pricePerKg: 180000, protein: 0 }
        ]
      },
      {
        id: 'fm2', name: 'فرمول گروور (۲۸ تا ۸۰ روز)', note: 'تعادل انرژی و پروتئین',
        items: [
          { name: 'ذرت', percent: 52, pricePerKg: 21000, protein: 8.5 },
          { name: 'کنجاله سویا', percent: 30, pricePerKg: 48000, protein: 44 },
          { name: 'روغن گیاهی', percent: 5, pricePerKg: 62000, protein: 0 },
          { name: 'سبوس گندم', percent: 8, pricePerKg: 14000, protein: 15 },
          { name: 'دی‌کلسیم فسفات', percent: 2, pricePerKg: 38000, protein: 0 },
          { name: 'پیش‌مخلوط ویتامین', percent: 2, pricePerKg: 180000, protein: 0 },
          { name: 'متیونین', percent: 1, pricePerKg: 240000, protein: 0 }
        ]
      },
      {
        id: 'fm3', name: 'فرمول فینیشر (۸۰ روز به بعد)', note: 'افزایش انرژی برای وزن‌گیری',
        items: [
          { name: 'ذرت', percent: 62, pricePerKg: 21000, protein: 8.5 },
          { name: 'کنجاله سویا', percent: 22, pricePerKg: 48000, protein: 44 },
          { name: 'روغن گیاهی', percent: 6, pricePerKg: 62000, protein: 0 },
          { name: 'سبوس گندم', percent: 5, pricePerKg: 14000, protein: 15 },
          { name: 'دی‌کلسیم فسفات', percent: 2, pricePerKg: 38000, protein: 0 },
          { name: 'پیش‌مخلوط ویتامین', percent: 3, pricePerKg: 180000, protein: 0 }
        ]
      }
    ];

    s.batches = [
      { id: 'b1', date: J.addDays(today, -26), formulaId: 'fm1', qtyKg: 3000, flockId: 'f1', note: 'مخلوط کن اصلی', expensed: true },
      { id: 'b2', date: J.addDays(today, -12), formulaId: 'fm2', qtyKg: 4500, flockId: 'f1', note: '', expensed: true },
      { id: 'b3', date: J.addDays(today, -3), formulaId: 'fm2', qtyKg: 2500, flockId: 'f1', note: '', expensed: false }
    ];

    /* --- واکسیناسیون --- */
    s.vaccines = [
      { id: 'v1', flockId: 'f1', date: J.addDays(today, -38), name: 'نیوکاسل (B1)', method: 'قطره چشمی', count: 5000, cost: 3200000, vet: 'دکتر صادقی' },
      { id: 'v2', flockId: 'f1', date: J.addDays(today, -27), name: 'گامبورو', method: 'آب آشامیدنی', count: 4950, cost: 4300000, vet: 'دکتر صادقی' },
      { id: 'v3', flockId: 'f1', date: J.addDays(today, -9), name: 'برونشیت', method: 'اسپری', count: 4880, cost: 2800000, vet: 'دکتر امینی' }
    ];

    /* --- کارها --- */
    s.tasks = [
      { id: 't1', date: J.today(), title: 'واکسن نیوکاسل نوبت سوم', type: 'واکسن', done: false, flockId: 'f1', note: 'ساعت ۹ صبح' },
      { id: 't2', date: J.addDays(today, 1), title: 'توزین هفتگی گله', type: 'توزین', done: false, flockId: 'f1', note: '۲۰ نمونه تصادفی' },
      { id: 't3', date: J.addDays(today, 3), title: 'خرید ۵۰۰۰ کیلو دان پس‌دان', type: 'خرید', done: false, flockId: 'f1', note: '' },
      { id: 't4', date: J.addDays(today, -2), title: 'تسویه قبض برق', type: 'مالی', done: true, flockId: '', note: '' },
      { id: 't5', date: J.addDays(today, 6), title: 'جلسه شرکا و بررسی صورت‌حساب', type: 'مالی', done: false, flockId: '', note: 'با حضور هر سه شریک' }
    ];

    /* --- انبار --- */
    s.inventory = [
      { id: 'i1', name: 'دان پیش‌دان', unit: 'کیلوگرم', qty: 3200, min: 2000, pricePerKg: 34000, cat: 'خوراک' },
      { id: 'i2', name: 'دان پس‌دان', unit: 'کیلوگرم', qty: 8400, min: 5000, pricePerKg: 30500, cat: 'خوراک' },
      { id: 'i3', name: 'ذرت', unit: 'کیلوگرم', qty: 2600, min: 3000, pricePerKg: 21000, cat: 'مواد اولیه' },
      { id: 'i4', name: 'کنجاله سویا', unit: 'کیلوگرم', qty: 1450, min: 1000, pricePerKg: 48000, cat: 'مواد اولیه' },
      { id: 'i5', name: 'واکسن نیوکاسل', unit: 'ویال', qty: 18, min: 10, pricePerKg: 0, cat: 'دارو' },
      { id: 'i6', name: 'ویتامین AD3E', unit: 'لیتر', qty: 6, min: 8, pricePerKg: 0, cat: 'دارو' },
      { id: 'i7', name: 'گازوئیل', unit: 'لیتر', qty: 180, min: 300, pricePerKg: 55000, cat: 'سوخت' }
    ];

    /* --- آورده شرکا --- */
    s.contributions = [
      { id: 'c1', partnerId: 'p1', date: J.addDays(today, -60), amount: 500000000, note: 'آورده نقدی اولیه' },
      { id: 'c2', partnerId: 'p2', date: J.addDays(today, -60), amount: 430000000, note: 'آورده نقدی اولیه' },
      { id: 'c3', partnerId: 'p3', date: J.addDays(today, -58), amount: 300000000, note: 'آورده نقدی اولیه' },
      { id: 'c4', partnerId: 'p1', date: J.addDays(today, -20), amount: 150000000, note: 'آورده تکمیلی' },
      { id: 'c5', partnerId: 'p2', date: J.addDays(today, -18), amount: 100000000, note: 'آورده تکمیلی' }
    ];

    return s;
  }

  /* --------------------------------- شروع ---------------------------------- */
  state = load();
  if (!state) { state = seed(); S.save(); }
  if (state.settings && state.settings.persianDigits === false) J.faDigits = false;
  else J.faDigits = true;

  A.refreshDigits = function () {
    J.faDigits = state.settings.persianDigits !== false;
  };

  /* تاریخ‌ها را نرمال کن */
  S.normalize = function () {
    ['expenses', 'sales', 'daily', 'tasks', 'vaccines', 'batches', 'contributions'].forEach(function (col) {
      (state[col] || []).forEach(function (o) { if (o.date) o.date = J.norm(o.date) || o.date; });
    });
    (state.flocks || []).forEach(function (f) {
      f.startDate = J.norm(f.startDate) || f.startDate;
      if (f.endDate) f.endDate = J.norm(f.endDate) || f.endDate;
    });
  };
  S.normalize();

})(window.App = window.App || {});
