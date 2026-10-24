/* ==========================================================================
   views/reports.js — گزارش‌های تحلیلی و مالی
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.Store, UI = A.UI, C = A.Charts;
  var period = 'all';

  function filter() {
    var t = J.parse(J.today());
    if (period === 'month') return { from: J.pad(t.jy) + '/' + J.pad(t.jm) + '/01' };
    if (period === '3m') {
      var m = t.jm - 3, y = t.jy;
      while (m <= 0) { m += 12; y--; }
      return { from: J.pad(y) + '/' + J.pad(m) + '/01' };
    }
    if (period === 'year') return { from: J.pad(t.jy) + '/01/01' };
    return {};
  }

  A.Views.reports = {
    render: function (el) {
      var fl = filter();
      var t = S.totals(fl);
      var cats = S.byCategory(fl);
      var series = S.monthlySeries(6);
      var settle = S.settlement(fl);
      var active = S.activeFlocks()[0];
      var fs = active ? S.flockStats(active.id) : null;

      var periodLabel = { all: 'کل دوره', month: 'ماه جاری', '3m': '۳ ماه اخیر', year: 'سال جاری' }[period];

      var html = UI.pageHead('گزارش‌ها و تحلیل مالی', 'تصویر کامل عملکرد مالی و فنی مزرعه',
        '<button class="btn" data-act="export">' + UI.icon('download', 16) + ' خروجی گزارش</button>' +
        '<button class="btn primary" data-act="print">' + UI.icon('print', 16) + ' چاپ / PDF</button>');

      html += UI.chips([
        { value: 'all', label: 'کل دوره' },
        { value: 'month', label: 'ماه جاری' },
        { value: '3m', label: '۳ ماه اخیر' },
        { value: 'year', label: 'سال جاری' }
      ], period, 'period');

      /* سود و زیان */
      html += '<div class="card mt">' +
        UI.sectionHead('صورت سود و زیان', periodLabel) +
        '<div class="grid grid-3" style="gap:10px">' +
        '<div class="stat" style="box-shadow:none;background:#F1FCF6;border-color:#D1FAE5">' +
        '<div class="stat-label">درآمد فروش</div><div class="stat-value" style="color:#059669">' + UI.short(t.revenue) + '</div>' +
        '<div class="stat-sub">' + UI.n(t.salesKg) + ' کیلو در ' + UI.n(t.salesCount) + ' فاکتور</div></div>' +
        '<div class="stat" style="box-shadow:none;background:#FEF4F4;border-color:#FEE2E2">' +
        '<div class="stat-label">جمع هزینه‌ها</div><div class="stat-value" style="color:#DC2626">' + UI.short(t.expenses) + '</div>' +
        '<div class="stat-sub">' + UI.n(t.count) + ' رکورد هزینه</div></div>' +
        '<div class="stat" style="box-shadow:none;background:#F7F4FF;border-color:#E4D6FF">' +
        '<div class="stat-label">' + (t.profit >= 0 ? 'سود' : 'زیان') + ' ناخالص</div>' +
        '<div class="stat-value" style="color:' + (t.profit >= 0 ? '#6D28D9' : '#DC2626') + '">' + UI.short(t.profit) + '</div>' +
        '<div class="stat-sub">حاشیه سود ' + UI.pct(t.margin) + '</div></div>' +
        '</div>' +
        '<div class="mt" style="display:flex;gap:6px;height:10px;border-radius:8px;overflow:hidden;background:#F0ECFA">' +
        '<span style="width:' + (t.revenue + t.expenses ? t.revenue / (t.revenue + t.expenses) * 100 : 0) + '%;background:#10B981"></span>' +
        '<span style="flex:1;background:#EF4444"></span></div>' +
        '<div class="chart-legend"><span><i style="background:#10B981"></i>درآمد</span><span><i style="background:#EF4444"></i>هزینه</span></div>' +
        '</div>';

      /* KPI فنی */
      if (fs) {
        html += '<div class="stats">' +
          UI.stat({ icon: '⚖️', label: 'هزینه هر کیلو وزن زنده', value: UI.short(fs.costPerKg), unit: 'تومان', sub: 'گله ' + UI.esc(active.name) }) +
          UI.stat({ icon: '🔄', label: 'ضریب تبدیل (FCR)', value: UI.n(fs.fcr, 2), sub: 'دان / افزایش وزن' }) +
          UI.stat({ icon: '⚠️', label: 'درصد تلفات', value: UI.pct(fs.mortalityPct, 2), sub: UI.n(fs.mortality) + ' قطعه' }) +
          UI.stat({ icon: '🌾', label: 'دان به ازای هر پرنده', value: UI.n(fs.feedPerBird, 1), unit: 'کیلو' }) +
          '</div>';
      }

      /* نمودار ماهانه */
      html += '<div class="card mt">' + UI.sectionHead('مقایسه ماهانه', '۶ ماه اخیر') +
        C.bars({
          labels: series.map(function (s) { return s.label; }),
          series: [
            { values: series.map(function (s) { return s.income; }), color: '#6D28D9' },
            { values: series.map(function (s) { return s.expense; }), color: '#DDD6FE' }
          ], height: 220
        }) +
        '<div class="chart-legend"><span><i style="background:#6D28D9"></i>درآمد</span><span><i style="background:#DDD6FE"></i>هزینه</span></div>' +
        '<div class="tbl-wrap mt"><table class="tbl"><thead><tr><th>ماه</th><th>درآمد</th><th>هزینه</th><th>سود / زیان</th></tr></thead><tbody>' +
        series.map(function (s) {
          var p = s.income - s.expense;
          return '<tr><td><b>' + s.label + '</b></td><td class="num-cell">' + UI.n(s.income) + '</td>' +
            '<td class="num-cell">' + UI.n(s.expense) + '</td>' +
            '<td class="num-cell" style="color:' + (p >= 0 ? '#059669' : '#DC2626') + '">' + UI.n(p) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '</div>';

      /* تفکیک دسته‌ها */
      html += '<div class="card mt">' + UI.sectionHead('تفکیک هزینه بر اساس دسته', UI.n(cats.length) + ' دسته') +
        (cats.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
          '<th>دسته</th><th>تعداد</th><th>مبلغ (تومان)</th><th>سهم</th><th style="width:120px">نمودار</th>' +
          '</tr></thead><tbody>' + cats.map(function (c) {
            var cnt = S.filterExpenses(Object.assign({}, fl, { cat: c.id })).length;
            var pct = t.expenses ? c.value / t.expenses * 100 : 0;
            return '<tr><td><b>' + c.icon + ' ' + UI.esc(c.label) + '</b></td>' +
              '<td>' + UI.n(cnt) + '</td><td class="num-cell">' + UI.n(c.value) + '</td>' +
              '<td>' + UI.pct(pct) + '</td>' +
              '<td>' + UI.bar(pct, c.color) + '</td></tr>';
          }).join('') +
          '<tr style="background:#FBF9FF"><td><b>جمع</b></td><td>' + UI.n(t.count) + '</td>' +
          '<td class="num-cell">' + UI.n(t.expenses) + '</td><td>۱۰۰٪</td><td></td></tr>' +
          '</tbody></table></div>' : UI.empty('داده‌ای نیست', '')) +
        '</div>';

      /* تقسیم سود بین شرکا */
      var profit = t.profit;
      html += '<div class="card mt">' + UI.sectionHead('تقسیم سود و زیان بین شرکا', 'بر اساس درصد سهم') +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th>شریک</th><th>سهم</th><th>سهم از هزینه</th><th>سهم از درآمد</th><th>سود / زیان سهم</th><th>مانده حساب</th>' +
        '</tr></thead><tbody>' + settle.rows.map(function (r) {
          var shareProfit = profit * r.share / 100;
          var shareRev = t.revenue * r.share / 100;
          return '<tr><td><b>' + UI.esc(r.name) + '</b></td><td>' + UI.n(r.share) + '٪</td>' +
            '<td class="num-cell">' + UI.n(r.shareExp) + '</td>' +
            '<td class="num-cell">' + UI.n(shareRev) + '</td>' +
            '<td class="num-cell" style="color:' + (shareProfit >= 0 ? '#059669' : '#DC2626') + '"><b>' + UI.n(shareProfit) + '</b></td>' +
            '<td class="num-cell" style="color:' + (r.balance >= 0 ? '#059669' : '#DC2626') + '">' + UI.n(r.balance) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="hint" style="margin-top:8px">سود به نسبت درصد سهام بین شرکا تقسیم می‌شود. مانده حساب بر اساس آورده و پرداخت‌های واقعی هر شریک محاسبه شده است.</div>' +
        '</div>';

      /* مقایسه گله‌ها */
      html += '<div class="card mt">' + UI.sectionHead('مقایسه عملکرد گله‌ها') +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th>گله</th><th>سن</th><th>موجودی</th><th>تلفات</th><th>FCR</th><th>هزینه</th><th>درآمد</th><th>سود</th>' +
        '</tr></thead><tbody>' + S.state.flocks.map(function (f) {
          var st = S.flockStats(f.id);
          return '<tr><td><b>' + UI.esc(f.name) + '</b></td><td>' + UI.n(st.age) + ' روز</td>' +
            '<td class="num-cell">' + UI.n(st.alive) + '</td><td>' + UI.pct(st.mortalityPct, 2) + '</td>' +
            '<td class="num-cell">' + UI.n(st.fcr, 2) + '</td>' +
            '<td class="num-cell">' + UI.short(st.expenses) + '</td>' +
            '<td class="num-cell">' + UI.short(st.revenue) + '</td>' +
            '<td class="num-cell" style="color:' + (st.profit >= 0 ? '#059669' : '#DC2626') + '">' + UI.short(st.profit) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';

      el.innerHTML = html;

      el.addEventListener('click', function (e) {
        var t2 = e.target;
        if (t2.closest('[data-act="print"]')) return window.print();
        if (t2.closest('[data-act="export"]')) return exportReport(fl, t, cats, settle);
        var p = t2.closest('[data-period]');
        if (p) { period = p.dataset.period; A.render(); }
      });
    }
  };

  function exportReport(fl, t, cats, settle) {
    var rows = [];
    rows.push(['گزارش مالی مزرعه', S.state.settings.farmName]);
    rows.push(['تاریخ گزارش', J.today()]);
    rows.push([]);
    rows.push(['درآمد کل', t.revenue]);
    rows.push(['هزینه کل', t.expenses]);
    rows.push(['سود / زیان', t.profit]);
    rows.push(['حاشیه سود (٪)', t.margin.toFixed(2)]);
    rows.push([]);
    rows.push(['دسته هزینه', 'مبلغ', 'درصد']);
    cats.forEach(function (c) {
      rows.push([c.label, Math.round(c.value), (t.expenses ? c.value / t.expenses * 100 : 0).toFixed(1)]);
    });
    rows.push([]);
    rows.push(['شریک', 'سهم٪', 'آورده', 'سهم از هزینه', 'مانده']);
    settle.rows.forEach(function (r) {
      rows.push([r.name, r.share, Math.round(r.capital), Math.round(r.shareExp), Math.round(r.balance)]);
    });
    UI.download('report-' + J.today().replace(/\//g, '-') + '.csv', UI.csv(rows));
    UI.toast('گزارش دانلود شد');
  }

})(window.App = window.App || {});
