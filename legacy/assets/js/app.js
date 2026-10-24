/* ==========================================================================
   app.js — مسیریابی، ناوبری و فرم‌های مشترک
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.Store, UI = A.UI;

  A.Views = A.Views || {};
  A.Forms = A.Forms || {};

  var NAV = [
    { id: 'dashboard', label: 'داشبورد', icon: 'home', group: 'اصلی' },
    { id: 'flocks', label: 'گله‌ها و ثبت روزانه', icon: 'egg', group: 'اصلی' },
    { id: 'expenses', label: 'هزینه‌ها', icon: 'wallet', group: 'مالی' },
    { id: 'sales', label: 'فروش و درآمد', icon: 'tag', group: 'مالی' },
    { id: 'partners', label: 'شرکا و تسویه', icon: 'users', group: 'مالی' },
    { id: 'feed', label: 'خوراک و فرمول', icon: 'feed', group: 'عملیات' },
    { id: 'inventory', label: 'انبار', icon: 'box', group: 'عملیات' },
    { id: 'tasks', label: 'کارها و یادآور', icon: 'check', group: 'عملیات' },
    { id: 'reports', label: 'گزارش‌ها', icon: 'chart', group: 'تحلیل' },
    { id: 'settings', label: 'تنظیمات', icon: 'gear', group: 'تحلیل' }
  ];
  A.NAV = NAV;

  var TITLES = {};
  NAV.forEach(function (n) { TITLES[n.id] = n.label; });
  TITLES.flock = 'جزئیات گله';

  var current = 'dashboard';

  /* -------------------------------- ناوبری -------------------------------- */
  function buildSidebar() {
    var groups = {}, order = [];
    NAV.forEach(function (n) {
      if (!groups[n.group]) { groups[n.group] = []; order.push(n.group); }
      groups[n.group].push(n);
    });
    var st = S.state.settings;
    var html = '<div class="brand"><div class="brand-mark">🦃</div>' +
      '<div><div class="brand-name">' + UI.esc(st.farmName) + '</div>' +
      '<div class="brand-sub">سامانه مدیریت مزرعه بوقلمون</div></div></div>' +
      '<nav class="nav" id="nav-list">';
    order.forEach(function (g) {
      html += '<div class="nav-label">' + g + '</div>';
      groups[g].forEach(function (n) {
        html += '<a class="nav-item" href="#/' + n.id + '" data-nav="' + n.id + '">' +
          UI.icon(n.icon, 19) + '<span>' + n.label + '</span></a>';
      });
    });
    html += '</nav>';
    var t = S.totals();
    html += '<div class="side-foot"><h5>خلاصه مالی مزرعه</h5>' +
      '<p>هزینه: ' + UI.short(t.expenses) + ' — درآمد: ' + UI.short(t.revenue) + '</p>' +
      '<button class="btn" data-act="report">مشاهده گزارش کامل</button></div>';
    document.getElementById('sidebar').innerHTML = html;
    var sb = document.getElementById('sidebar');
    if (!sb.dataset.bound) {
      sb.dataset.bound = '1';
      sb.addEventListener('click', function (e) {
        if (e.target.closest('[data-act="report"]')) location.hash = '#/reports';
      });
    }
  }

  function buildBottomNav() {
    var html = '<a class="bn-item" href="#/dashboard" data-nav="dashboard">' + UI.icon('home', 21) + '<span>خانه</span></a>' +
      '<a class="bn-item" href="#/flocks" data-nav="flocks">' + UI.icon('egg', 21) + '<span>گله‌ها</span></a>' +
      '<div class="bn-gap"></div>' +
      '<a class="bn-item" href="#/expenses" data-nav="expenses">' + UI.icon('wallet', 21) + '<span>هزینه</span></a>' +
      '<button class="bn-item" data-more>' + UI.icon('dots', 21) + '<span>بیشتر</span></button>' +
      '<button class="bn-fab" data-fab aria-label="افزودن">' + UI.icon('plus', 24) + '</button>';
    var el = document.getElementById('bottomnav');
    el.innerHTML = html;
    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-fab]')) { A.quickAdd(); return; }
      if (e.target.closest('[data-more]')) {
        UI.sheet({
          title: 'همه بخش‌ها',
          items: NAV.filter(function (n) { return ['dashboard', 'flocks', 'expenses'].indexOf(n.id) === -1; })
            .map(function (n) { return { act: n.id, label: n.label, icon: UI.icon(n.icon, 18) }; }),
          onPick: function (id) { location.hash = '#/' + id; }
        });
      }
    });
  }

  function buildTopbar() {
    var st = S.state.settings;
    document.getElementById('topbar').innerHTML =
      '<div class="topbar-title"><b>' + UI.esc(st.farmName) + '</b><span>' + J.format(J.today(), 'full') + '</span></div>' +
      '<div class="topbar-actions">' +
      '<button class="icon-btn" data-act="alerts" title="هشدارها">' + UI.icon('bell', 19) + '</button>' +
      '<button class="icon-btn no-print" data-act="print" title="چاپ">' + UI.icon('print', 19) + '</button>' +
      '<button class="btn primary sm no-print" data-act="quick">' + UI.icon('plus', 16) + '<span class="q-label"> ثبت جدید</span></button>' +
      '<span class="avatar" style="background:linear-gradient(140deg,#5B12A8,#8B5CF6);width:36px;height:36px;font-size:15px">' +
      UI.esc((st.owner || 'م').charAt(0)) + '</span>' +
      '</div>';
    var tb = document.getElementById('topbar');
    if (tb.dataset.bound) return;
    tb.dataset.bound = '1';
    tb.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'quick') A.quickAdd();
      if (b.dataset.act === 'print') window.print();
      if (b.dataset.act === 'alerts') A.showAlerts();
    });
  }

  function markNav(id) {
    document.querySelectorAll('[data-nav]').forEach(function (el) {
      el.classList.toggle('active', el.dataset.nav === id);
    });
  }

  A.showAlerts = function () {
    var alerts = S.alerts();
    var m = UI.modal({
      title: 'هشدارها و یادآورها',
      body: alerts.map(function (a) {
        return '<div class="alert-item ' + a.level + '"><span class="ai-ic">' + a.icon + '</span>' +
          '<div><h5>' + UI.esc(a.title) + '</h5><p>' + UI.esc(a.text) + '</p></div></div>';
      }).join(''),
      footer: '<button class="btn ghost" data-close>بستن</button><button class="btn primary" data-tasks>مشاهده کارها</button>'
    });
    m.el.querySelector('[data-tasks]').addEventListener('click', function () {
      m.close();
      location.hash = '#/tasks';
    });
  };

  /* ------------------------------- افزودن سریع ----------------------------- */
  A.quickAdd = function () {
    UI.sheet({
      title: 'ثبت جدید',
      items: [
        { act: 'expense', label: 'ثبت هزینه', icon: '💸' },
        { act: 'sale', label: 'ثبت فروش', icon: '🍗' },
        { act: 'daily', label: 'ثبت روزانه گله', icon: '📝' },
        { act: 'vaccine', label: 'واکسیناسیون', icon: '💉' },
        { act: 'task', label: 'کار / یادآور', icon: '🔔' },
        { act: 'partner', label: 'شریک جدید', icon: '👥' }
      ],
      onPick: function (act) {
        if (A.Forms[act]) A.Forms[act]();
      }
    });
  };

  /* -------------------------------- مسیرها -------------------------------- */
  A.go = function (p) { location.hash = '#/' + p; };

  A.render = function () {
    var hash = (location.hash || '').replace(/^#\/?/, '') || 'dashboard';
    var parts = hash.split('/');
    var name = parts[0] || 'dashboard';
    var param = parts.slice(1).join('/');
    var view = A.Views[name] || A.Views.dashboard;
    var old = document.getElementById('view');
    var el = old.cloneNode(false);   /* گره تازه تا شنونده‌های قبلی باقی نمانند */
    old.parentNode.replaceChild(el, old);
    current = name;
    el.innerHTML = '';
    try {
      view.render(el, param);
    } catch (err) {
      console.error(err);
      el.innerHTML = '<div class="card"><h3>خطا در نمایش صفحه</h3><p style="color:#8B85A0;font-size:12px">' + UI.esc(err.message) + '</p></div>';
    }
    markNav(name);
    buildSidebar();
    buildTopbar();
    markNav(name);
    document.title = (TITLES[name] || 'مزرعه بوقلمون') + ' | ' + S.state.settings.farmName;
    window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
  };

  /* --------------------------------- فرم‌ها -------------------------------- */
  var PAY_OPTIONS = function () {
    return [{ value: 'fund', label: 'صندوق مشترک' }].concat(
      S.state.partners.map(function (p) { return { value: p.id, label: p.name }; }));
  };

  function flockOptions() {
    return [{ value: '', label: 'عمومی مزرعه' }].concat(
      S.state.flocks.map(function (f) { return { value: f.id, label: f.name }; }));
  }
  A.flockOptions = flockOptions;
  A.payOptions = PAY_OPTIONS;

  function sharesEditor(partners, values) {
    return '<div class="field full" id="share-editor" style="display:none">' +
      '<label class="lbl">درصد سهم هر شریک در این هزینه</label>' +
      '<div class="form-grid">' + partners.map(function (p) {
        return '<div class="field"><label class="lbl">' + UI.esc(p.name) + '</label>' +
          '<input class="input num" data-share="' + p.id + '" type="number" min="0" max="100" step="0.1" value="' +
          (values && values[p.id] != null ? values[p.id] : p.share) + '"></div>';
      }).join('') + '</div></div>';
  }

  A.Forms.expense = function (id, preset) {
    var editing = id ? S.find('expenses', id) : null;
    var v = editing ? JSON.parse(JSON.stringify(editing)) : {
      date: J.today(), category: (preset && preset.category) || 'feed', sub: '',
      title: '', amount: '', qty: 1, unit: 'کیلوگرم', vendor: '',
      flockId: (preset && preset.flockId) || '', paidBy: 'fund', split: 'share', note: ''
    };
    var cat = A.CAT_MAP[v.category] || A.CATS[0];

    var fields = [
      { name: 'date', label: 'تاریخ (شمسی)', type: 'date', required: true, col: 'half' },
      { name: 'category', label: 'دسته هزینه', type: 'select', required: true, col: 'half',
        options: A.CATS.map(function (c) { return { value: c.id, label: c.icon + '  ' + c.label }; }) },
      { name: 'sub', label: 'زیر‌دسته', type: 'select', col: 'half', options: cat.subs },
      { name: 'title', label: 'عنوان / شرح', type: 'text', required: true, col: 'half', placeholder: 'مثلاً خرید ۵۰۰۰ کیلو پیش‌دان' },
      { name: 'amount', label: 'مبلغ کل (تومان)', type: 'money', required: true, col: 'half' },
      { name: 'qty', label: 'مقدار', type: 'number', col: 'third' },
      { name: 'unit', label: 'واحد', type: 'select', col: 'third', options: A.UNITS },
      { name: 'flockId', label: 'گله مرتبط', type: 'select', col: 'third', options: flockOptions() },
      { name: 'vendor', label: 'فروشنده / طرف حساب', type: 'text', col: 'half', placeholder: 'اختیاری' },
      { name: 'paidBy', label: 'پرداخت‌کننده', type: 'select', col: 'half', options: PAY_OPTIONS() },
      { name: 'split', label: 'نحوه تقسیم بین شرکا', type: 'select', col: 'half', options: [
        { value: 'share', label: 'بر اساس سهم شرکا' },
        { value: 'equal', label: 'مساوی بین همه' },
        { value: 'custom', label: 'درصد سفارشی' },
        { value: 'single', label: 'فقط پرداخت‌کننده' }
      ] },
      { name: 'note', label: 'یادداشت', type: 'textarea', col: 'full' }
    ];

    var m = UI.form({
      title: editing ? 'ویرایش هزینه' : 'ثبت هزینه جدید',
      fields: fields, values: v,
      extraHtml: sharesEditor(S.state.partners, editing && editing.shares),
      submitText: editing ? 'ذخیره تغییرات' : 'ثبت هزینه',
      onSubmit: function (data) {
        if (data.split === 'custom') {
          var sh = {}, tot = 0;
          m.body.querySelectorAll('[data-share]').forEach(function (inp) {
            var val = S.num(inp.value); sh[inp.dataset.share] = val; tot += val;
          });
          if (Math.abs(tot - 100) > 0.5) { UI.toast('مجموع درصدها باید ۱۰۰ باشد (فعلی: ' + tot + ')', 'error'); return false; }
          data.shares = sh;
        }
        if (editing) { S.update('expenses', id, data); UI.toast('هزینه ویرایش شد'); }
        else { S.add('expenses', data); UI.toast('هزینه ثبت شد'); }
        A.render();
      }
    });

    var catSel = m.body.querySelector('[name="category"]');
    var subSel = m.body.querySelector('[name="sub"]');
    catSel.addEventListener('change', function () {
      var c = A.CAT_MAP[catSel.value];
      subSel.innerHTML = (c ? c.subs : []).map(function (s) { return '<option>' + s + '</option>'; }).join('');
    });
    var splitSel = m.body.querySelector('[name="split"]');
    var ed = m.body.querySelector('#share-editor');
    function syncSplit() { ed.style.display = splitSel.value === 'custom' ? '' : 'none'; }
    splitSel.addEventListener('change', syncSplit); syncSplit();
    return m;
  };

  A.Forms.sale = function (id) {
    var editing = id ? S.find('sales', id) : null;
    var v = editing || {
      date: J.today(), type: 'لاشه کامل', qtyKg: '', pricePerKg: '', amount: 0,
      buyer: '', flockId: '', paidTo: 'fund', note: ''
    };
    var m = UI.form({
      title: editing ? 'ویرایش فروش' : 'ثبت فروش جدید',
      fields: [
        { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'half' },
        { name: 'type', label: 'نوع محصول', type: 'select', required: true, col: 'half', options: A.MEAT_TYPES },
        { name: 'qtyKg', label: 'وزن (کیلوگرم)', type: 'number', required: true, col: 'third' },
        { name: 'pricePerKg', label: 'قیمت هر کیلو', type: 'money', required: true, col: 'third' },
        { name: 'amount', label: 'مبلغ کل', type: 'money', col: 'third', hint: 'خودکار محاسبه می‌شود' },
        { name: 'buyer', label: 'خریدار', type: 'text', col: 'half' },
        { name: 'flockId', label: 'گله', type: 'select', col: 'half', options: flockOptions() },
        { name: 'paidTo', label: 'واریز به', type: 'select', col: 'half', options: PAY_OPTIONS() },
        { name: 'note', label: 'یادداشت', type: 'textarea', col: 'full' }
      ],
      values: v,
      submitText: editing ? 'ذخیره' : 'ثبت فروش',
      onSubmit: function (data) {
        data.amount = data.amount || data.qtyKg * data.pricePerKg;
        if (editing) { S.update('sales', id, data); UI.toast('فروش ویرایش شد'); }
        else { S.add('sales', data); UI.toast('فروش ثبت شد'); }
        A.render();
      }
    });
    var q = m.body.querySelector('[name="qtyKg"]');
    var p = m.body.querySelector('[name="pricePerKg"]');
    var am = m.body.querySelector('[name="amount"]');
    function calc() {
      var val = S.num(q.value) * S.num(p.value);
      am.value = val ? val.toLocaleString('en-US') : '';
    }
    q.addEventListener('input', calc); p.addEventListener('input', calc);
    return m;
  };

  A.Forms.daily = function (id, flockId) {
    var editing = id ? S.find('daily', id) : null;
    var v = editing || {
      date: J.today(), flockId: flockId || (S.activeFlocks()[0] || {}).id || '',
      mortality: 0, culled: 0, feedKg: '', waterL: '', avgWeightG: '', tempC: '', note: ''
    };
    var f = S.flock(v.flockId);
    return UI.form({
      title: editing ? 'ویرایش ثبت روزانه' : 'ثبت روزانه گله',
      fields: [
        { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'half' },
        { name: 'flockId', label: 'گله', type: 'select', required: true, col: 'half',
          options: S.state.flocks.map(function (x) { return { value: x.id, label: x.name }; }) },
        { name: 'mortality', label: 'تلفات (قطعه)', type: 'number', col: 'third' },
        { name: 'culled', label: 'حذفی (قطعه)', type: 'number', col: 'third' },
        { name: 'tempC', label: 'دمای سالن (°C)', type: 'number', col: 'third' },
        { name: 'feedKg', label: 'مصرف دان (کیلوگرم)', type: 'number', col: 'half' },
        { name: 'waterL', label: 'مصرف آب (لیتر)', type: 'number', col: 'half' },
        { name: 'avgWeightG', label: 'وزن میانگین نمونه (گرم)', type: 'number', col: 'half', hint: 'در روزهای توزین ثبت شود' },
        { name: 'note', label: 'یادداشت', type: 'textarea', col: 'full' }
      ],
      values: v,
      submitText: editing ? 'ذخیره' : 'ثبت',
      onSubmit: function (data) {
        data.age = f ? Math.max(0, J.diff(f.startDate, data.date)) : 0;
        if (editing) { S.update('daily', id, data); UI.toast('رکورد ویرایش شد'); }
        else { S.add('daily', data); UI.toast('ثبت روزانه ذخیره شد'); }
        A.render();
      }
    });
  };

  A.Forms.vaccine = function (id, flockId) {
    var editing = id ? S.find('vaccines', id) : null;
    var v = editing || { date: J.today(), flockId: flockId || (S.activeFlocks()[0] || {}).id || '', name: '', method: 'آب آشامیدنی', count: '', cost: '', vet: '' };
    return UI.form({
      title: editing ? 'ویرایش واکسیناسیون' : 'ثبت واکسیناسیون',
      fields: [
        { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'half' },
        { name: 'flockId', label: 'گله', type: 'select', required: true, col: 'half', options: S.state.flocks.map(function (x) { return { value: x.id, label: x.name }; }) },
        { name: 'name', label: 'نام واکسن', type: 'text', required: true, col: 'half', placeholder: 'نیوکاسل، گامبورو ...' },
        { name: 'method', label: 'روش مصرف', type: 'select', col: 'half', options: ['قطره چشمی', 'آب آشامیدنی', 'اسپری', 'تزریق'] },
        { name: 'count', label: 'تعداد (قطعه)', type: 'number', col: 'third' },
        { name: 'cost', label: 'هزینه', type: 'money', col: 'third' },
        { name: 'vet', label: 'دامپزشک', type: 'text', col: 'third' },
        { name: 'note', label: 'یادداشت', type: 'textarea', col: 'full' }
      ],
      values: v,
      onSubmit: function (data) {
        if (editing) S.update('vaccines', id, data); else S.add('vaccines', data);
        if (!editing && data.cost > 0) {
          S.add('expenses', {
            date: data.date, category: 'vaccine', sub: data.name, title: 'واکسن ' + data.name,
            amount: data.cost, qty: data.count || 1, unit: 'قطعه', paidBy: 'fund',
            split: 'share', flockId: data.flockId, note: 'ثبت خودکار از بخش واکسیناسیون'
          });
        }
        UI.toast('واکسیناسیون ثبت شد');
        A.render();
      }
    });
  };

  A.Forms.task = function (id) {
    var editing = id ? S.find('tasks', id) : null;
    var v = editing || { date: J.today(), title: '', type: 'عمومی', flockId: '', note: '', done: false };
    return UI.form({
      title: editing ? 'ویرایش کار' : 'کار / یادآور جدید',
      fields: [
        { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'half' },
        { name: 'type', label: 'نوع', type: 'select', col: 'half', options: ['عمومی', 'واکسن', 'توزین', 'خرید', 'مالی', 'بازدید'] },
        { name: 'title', label: 'عنوان کار', type: 'text', required: true, col: 'full' },
        { name: 'flockId', label: 'گله', type: 'select', col: 'half', options: flockOptions() },
        { name: 'done', label: 'انجام شده', type: 'checkbox', col: 'half' },
        { name: 'note', label: 'توضیح', type: 'textarea', col: 'full' }
      ],
      values: v,
      onSubmit: function (data) {
        if (editing) S.update('tasks', id, data); else S.add('tasks', data);
        UI.toast('ذخیره شد');
        A.render();
      }
    });
  };

  A.Forms.partner = function (id) {
    var editing = id ? S.find('partners', id) : null;
    var v = editing || { name: '', phone: '', share: '', role: '', color: '#7C3AED', joined: J.today() };
    return UI.form({
      title: editing ? 'ویرایش شریک' : 'افزودن شریک',
      fields: [
        { name: 'name', label: 'نام و نام خانوادگی', type: 'text', required: true, col: 'half' },
        { name: 'phone', label: 'موبایل', type: 'text', col: 'half' },
        { name: 'share', label: 'سهم (درصد)', type: 'number', required: true, col: 'third', hint: 'جمع سهم همه شرکا باید ۱۰۰ باشد' },
        { name: 'role', label: 'نقش', type: 'text', col: 'third', placeholder: 'مدیر مالی، فنی ...' },
        { name: 'color', label: 'رنگ', type: 'select', col: 'third', options: [
          { value: '#7C3AED', label: 'بنفش' }, { value: '#06B6D4', label: 'فیروزه‌ای' },
          { value: '#F59E0B', label: 'نارنجی' }, { value: '#10B981', label: 'سبز' },
          { value: '#EC4899', label: 'صورتی' }, { value: '#6366F1', label: 'نیلی' }
        ] },
        { name: 'joined', label: 'تاریخ عضویت', type: 'date', col: 'half' }
      ],
      values: v,
      onSubmit: function (data) {
        var others = S.state.partners.filter(function (p) { return !editing || p.id !== editing.id; });
        var tot = others.reduce(function (a, p) { return a + S.num(p.share); }, 0) + S.num(data.share);
        if (tot > 100.5) { UI.toast('جمع سهم‌ها ' + tot + '٪ می‌شود؛ حداکثر ۱۰۰ مجاز است', 'error'); return false; }
        if (editing) S.update('partners', editing.id, data); else S.add('partners', data);
        UI.toast('شریک ذخیره شد');
        A.render();
      }
    });
  };

  A.Forms.contribution = function (partnerId) {
    return UI.form({
      title: 'ثبت آورده / برداشت شریک',
      fields: [
        { name: 'partnerId', label: 'شریک', type: 'select', required: true, col: 'half',
          options: S.state.partners.map(function (p) { return { value: p.id, label: p.name }; }) },
        { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'half' },
        { name: 'amount', label: 'مبلغ', type: 'money', required: true, col: 'half' },
        { name: 'kind', label: 'نوع', type: 'select', col: 'half', options: [{ value: 'in', label: 'آورده (واریز)' }, { value: 'out', label: 'برداشت' }] },
        { name: 'note', label: 'توضیح', type: 'text', col: 'full' }
      ],
      values: { partnerId: partnerId || (S.state.partners[0] || {}).id, date: J.today(), kind: 'in' },
      onSubmit: function (data) {
        var amt = data.kind === 'out' ? -Math.abs(data.amount) : Math.abs(data.amount);
        S.add('contributions', { partnerId: data.partnerId, date: data.date, amount: amt, note: data.note });
        UI.toast('ثبت شد');
        A.render();
      }
    });
  };

  A.Forms.flock = function (id) {
    var editing = id ? S.find('flocks', id) : null;
    var v = editing || {
      name: '', code: 'F-' + (S.state.flocks.length + 1), breed: 'B.U.T 6', hall: 'سالن ۱',
      startDate: J.today(), startCount: '', chickType: 'جوجه یک‌روزه', status: 'active', endDate: '', soldCount: 0, notes: ''
    };
    return UI.form({
      title: editing ? 'ویرایش گله' : 'ایجاد گله جدید',
      fields: [
        { name: 'name', label: 'نام گله', type: 'text', required: true, col: 'full', placeholder: 'گله ۳ — زمستان ۱۴۰۵' },
        { name: 'code', label: 'کد', type: 'text', col: 'third' },
        { name: 'breed', label: 'نژاد', type: 'text', col: 'third' },
        { name: 'hall', label: 'سالن', type: 'text', col: 'third' },
        { name: 'startDate', label: 'تاریخ شروع', type: 'date', required: true, col: 'half' },
        { name: 'startCount', label: 'تعداد اولیه', type: 'number', required: true, col: 'half' },
        { name: 'chickType', label: 'نوع جوجه', type: 'select', col: 'half', options: ['جوجه یک‌روزه', 'جوجه ۱۵ روزه'] },
        { name: 'status', label: 'وضعیت', type: 'select', col: 'half', options: [{ value: 'active', label: 'در حال پرورش' }, { value: 'closed', label: 'بسته شده' }] },
        { name: 'endDate', label: 'تاریخ پایان', type: 'date', col: 'half' },
        { name: 'soldCount', label: 'تعداد فروش رفته', type: 'number', col: 'half' },
        { name: 'notes', label: 'توضیحات', type: 'textarea', col: 'full' }
      ],
      values: v,
      onSubmit: function (data) {
        if (editing) S.update('flocks', editing.id, data); else S.add('flocks', data);
        UI.toast('گله ذخیره شد');
        A.render();
      }
    });
  };

  /* -------------------------------- شروع ---------------------------------- */
  function init() {
    try {
      localStorage.setItem('__tf_test', '1');
      localStorage.removeItem('__tf_test');
    } catch (e) {
      setTimeout(function () {
        UI.toast('مرورگر اجازه ذخیره‌سازی نمی‌دهد؛ داده‌ها پس از بستن صفحه پاک می‌شوند', 'error');
      }, 900);
    }
    buildSidebar();
    buildBottomNav();
    buildTopbar();
    window.addEventListener('hashchange', A.render);
    A.render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})(window.App = window.App || {});
