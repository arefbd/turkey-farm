/* ==========================================================================
   views/dashboard.js — داشبورد اصلی
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.Store, UI = A.UI, C = A.Charts;

  A.Views.dashboard = {
    render: function (el) {
      var active = S.activeFlocks()[0];
      var fs = active ? S.flockStats(active.id) : null;
      var t = S.totals();
      var series = S.monthlySeries(6);
      var allCats = S.byCategory();
      var cats = allCats.slice(0, 4);
      var restCats = allCats.slice(4).reduce(function (a, c) { return a + c.value; }, 0);
      if (restCats > 0) cats.push({ label: 'سایر دسته‌ها', value: restCats, color: '#CBD5E1', icon: '📦' });
      var alerts = S.alerts().slice(0, 3);
      var recent = S.recent(5);
      var settle = S.settlement();
      var maxShare = Math.max.apply(null, settle.rows.map(function (r) { return Math.abs(r.balance); }).concat([1]));

      var html = '';

      /* ------------------------------- هیرو ------------------------------- */
      html += '<section class="hero">' +
        '<div class="hero-top">' +
        '<div class="hero-user">' +
        UI.avatar(S.state.settings.owner || 'م', 'rgba(255,255,255,.25)', 40) +
        '<div><b>' + UI.esc(S.state.settings.farmName) + '</b><span>' + J.format(J.today(), 'full') + '</span></div>' +
        '</div>' +
        '<span class="hero-chip">' + UI.icon('egg', 13) + (active ? UI.esc(active.hall || 'سالن') : 'بدون گله فعال') + '</span>' +
        '</div>' +
        '<div class="hero-body">' +
        '<div class="hero-label">موجودی زنده گله فعال</div>' +
        '<div class="hero-value">' + UI.n(fs ? fs.alive : 0) + ' <small>قطعه</small></div>' +
        '<div class="hero-sub">' + (active
          ? UI.esc(active.name) + ' · ' + UI.n(fs.age) + ' روزه · وزن میانگین ' + UI.n(fs.avgWeightG / 1000, 2) + ' کیلو'
          : 'برای شروع یک گله جدید ثبت کنید') + '</div>' +
        '</div>' +
        '</section>';

      html += '<div class="hero-actions">' +
        '<button class="hero-act" data-act="expense"><span class="ic-wrap">' + UI.icon('wallet', 19) + '</span>هزینه</button>' +
        '<button class="hero-act" data-act="sale"><span class="ic-wrap">' + UI.icon('tag', 19) + '</span>فروش</button>' +
        '<button class="hero-act" data-act="daily"><span class="ic-wrap">' + UI.icon('feed', 19) + '</span>ثبت روزانه</button>' +
        '<button class="hero-act" data-act="vaccine"><span class="ic-wrap">' + UI.icon('flask', 19) + '</span>واکسن</button>' +
        '</div>';

      /* ------------------------------ آمارها ------------------------------ */
      html += '<div class="stats">' +
        UI.stat({ icon: '💸', label: 'هزینه کل', value: UI.short(t.expenses), unit: 'تومان', sub: UI.n(t.count) + ' رکورد هزینه' }) +
        UI.stat({ icon: '🍗', label: 'درآمد فروش', value: UI.short(t.revenue), unit: 'تومان', sub: UI.n(t.salesKg) + ' کیلو فروش' }) +
        UI.stat({ icon: t.profit >= 0 ? '📈' : '📉', label: t.profit >= 0 ? 'سود ناخالص' : 'زیان', value: UI.short(t.profit), unit: 'تومان', sub: 'حاشیه ' + UI.pct(t.margin) }) +
        UI.stat({ icon: '⚠️', label: 'تلفات گله فعال', value: fs ? UI.pct(fs.mortalityPct, 2) : '—', sub: fs ? UI.n(fs.mortality) + ' قطعه از ' + UI.n(active.startCount) : '' }) +
        '</div>';

      /* ------------------------------- نمودارها ---------------------------- */
      html += '<div class="grid grid-side mt">' +
        '<div class="card">' +
        UI.sectionHead('روند هزینه و درآمد', '۶ ماه اخیر',
          '<a class="sec-link" href="#/reports">گزارش کامل ' + UI.icon('chevronLeft', 13) + '</a>') +
        C.bars({
          labels: series.map(function (s) { return s.label; }),
          series: [
            { values: series.map(function (s) { return s.income; }), color: '#6D28D9' },
            { values: series.map(function (s) { return s.expense; }), color: '#C4B5FD' }
          ], height: 210
        }) +
        '<div class="chart-legend"><span><i style="background:#6D28D9"></i>درآمد</span>' +
        '<span><i style="background:#C4B5FD"></i>هزینه</span></div>' +
        '</div>' +

        '<div class="card">' +
        UI.sectionHead('ترکیب هزینه‌ها', 'بر اساس دسته') +
        '<div class="donut-wrap">' +
        C.donut({
          items: cats, size: 150, centerLabel: 'کل هزینه', centerValue: UI.short(t.expenses)
        }) +
        '<div class="donut-legend">' + cats.map(function (c) {
          return '<div class="dl"><i style="background:' + c.color + '"></i><span>' + UI.esc(c.label) + '</span>' +
            '<b>' + UI.pct(t.expenses ? c.value / t.expenses * 100 : 0, 0) + '</b></div>';
        }).join('') + '</div>' +
        '</div></div>' +
        '</div>';

      /* ------------------------------- هشدارها ---------------------------- */
      html += '<div class="grid grid-side mt">' +
        '<div class="card">' +
        UI.sectionHead('هشدارها و یادآورها', '',
          '<a class="sec-link" href="#/tasks">همه کارها</a>') +
        alerts.map(function (a) {
          return '<div class="alert-item ' + a.level + '"><span class="ai-ic">' + a.icon + '</span>' +
            '<div><h5>' + UI.esc(a.title) + '</h5><p>' + UI.esc(a.text) + '</p></div></div>';
        }).join('') +
        '</div>' +

        '<div class="card">' +
        UI.sectionHead('سهم شرکا', UI.n(S.state.partners.length) + ' شریک') +
        settle.rows.map(function (r) {
          var pct = Math.abs(r.balance) / maxShare * 100;
          return '<div style="margin-bottom:11px">' +
            '<div class="progress-row"><span style="width:74px;font-weight:700">' + UI.esc(r.name.split(' ')[0]) + '</span>' +
            UI.bar(r.share, r.color) + '<b style="width:38px;text-align:end">' + UI.n(r.share) + '٪</b></div>' +
            '<div class="hint" style="margin-top:3px">مانده: ' +
            '<b style="color:' + (r.balance >= 0 ? '#059669' : '#DC2626') + '">' + UI.short(r.balance) + '</b> تومان' +
            (r.balance >= 0 ? ' طلب' : ' بدهی') + '</div>' +
            '</div>';
        }).join('') +
        '<a class="btn sm block" href="#/partners" style="margin-top:4px">مدیریت و تسویه حساب</a>' +
        '</div>' +
        '</div>';

      /* ------------------------------ گله فعال ---------------------------- */
      if (active && fs) {
        var prog = Math.min(100, fs.age / (S.state.settings.cycleDays || 120) * 100);
        html += '<div class="card mt">' +
          UI.sectionHead('وضعیت گله فعال', UI.esc(active.breed || ''),
            '<a class="sec-link" href="#/flock/' + active.id + '">جزئیات گله ' + UI.icon('chevronLeft', 13) + '</a>') +
          '<div class="progress-row" style="margin-bottom:6px">' +
          '<span>' + UI.n(fs.age) + ' / ' + UI.n(S.state.settings.cycleDays || 120) + ' روز</span>' +
          UI.bar(prog) +
          '<b>' + UI.pct(prog, 0) + '</b></div>' +
          '<div class="grid grid-4" style="gap:10px;margin-top:12px">' +
          '<div class="kv" style="display:block"><span>وزن زنده کل</span><br><b>' + UI.n(fs.biomass, 0) + ' کیلو</b></div>' +
          '<div class="kv" style="display:block"><span>ضریب تبدیل (FCR)</span><br><b>' + UI.n(fs.fcr, 2) + '</b></div>' +
          '<div class="kv" style="display:block"><span>دان مصرفی</span><br><b>' + UI.n(fs.feedKg) + ' کیلو</b></div>' +
          '<div class="kv" style="display:block"><span>هزینه هر کیلو</span><br><b>' + UI.short(fs.costPerKg) + '</b></div>' +
          '</div></div>';
      }

      /* --------------------------- گردش اخیر ------------------------------ */
      html += '<div class="card mt">' +
        UI.sectionHead('آخرین تراکنش‌ها', '', '<a class="sec-link" href="#/expenses">همه هزینه‌ها</a>') +
        '<div class="rows">' + (recent.length ? recent.map(function (r) {
          return '<div class="row">' +
            '<span class="row-ic" style="background:' + (r.amount > 0 ? '#ECFDF5' : '#FEF2F2') + '">' + r.icon + '</span>' +
            '<div class="row-main"><div class="row-title">' + UI.esc(r.title) + '</div>' +
            '<div class="row-sub">' + UI.esc(r.sub) + ' · ' + J.format(r.date, 'long') + '</div></div>' +
            '<div class="row-side"><div class="row-amt ' + (r.amount > 0 ? 'pos' : 'neg') + '">' +
            (r.amount > 0 ? '+' : '−') + UI.n(Math.abs(r.amount)) + '</div>' +
            '<div class="row-date">تومان</div></div>' +
            '</div>';
        }).join('') : UI.empty('تراکنشی ثبت نشده', 'اولین هزینه یا فروش را ثبت کنید')) +
        '</div></div>';

      el.innerHTML = html;

      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b) return;
        var act = b.dataset.act;
        if (act === 'expense') A.Forms.expense();
        if (act === 'sale') A.Forms.sale();
        if (act === 'daily') A.Forms.daily();
        if (act === 'vaccine') A.Forms.vaccine();
      });
    }
  };

})(window.App = window.App || {});
