/* ==========================================================================
   views/sales.js — فروش و درآمد
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.Store, UI = A.UI, C = A.Charts;

  A.Views.sales = {
    render: function (el) {
      var sales = S.state.sales.slice().sort(function (a, b) { return J.jdn(b.date) - J.jdn(a.date); });
      var total = sales.reduce(function (a, b) { return a + S.num(b.amount); }, 0);
      var kg = sales.reduce(function (a, b) { return a + S.num(b.qtyKg); }, 0);

      var byType = {};
      sales.forEach(function (s) {
        byType[s.type] = byType[s.type] || { kg: 0, amount: 0, count: 0 };
        byType[s.type].kg += S.num(s.qtyKg);
        byType[s.type].amount += S.num(s.amount);
        byType[s.type].count++;
      });
      var types = Object.keys(byType).map(function (k) {
        return { label: k, kg: byType[k].kg, amount: byType[k].amount, count: byType[k].count };
      }).sort(function (a, b) { return b.amount - a.amount; });

      var colors = ['#6D28D9', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#06B6D4', '#F59E0B', '#10B981'];

      var html = UI.pageHead('فروش و درآمد', 'ثبت فروش گوشت، ران، سینه و سایر محصولات',
        '<button class="btn" data-act="export">' + UI.icon('download', 16) + ' خروجی</button>' +
        '<button class="btn primary" data-act="new">' + UI.icon('plus', 16) + ' ثبت فروش</button>');

      html += '<div class="stats">' +
        UI.stat({ icon: '💰', label: 'درآمد کل', value: UI.short(total), unit: 'تومان', sub: UI.n(sales.length) + ' فاکتور' }) +
        UI.stat({ icon: '⚖️', label: 'وزن فروخته‌شده', value: UI.n(kg), unit: 'کیلو' }) +
        UI.stat({ icon: '🏷️', label: 'میانگین هر کیلو', value: UI.short(kg ? total / kg : 0), unit: 'تومان' }) +
        UI.stat({ icon: '📦', label: 'تنوع محصول', value: UI.n(types.length), sub: 'نوع محصول' }) +
        '</div>';

      /* نمودار انواع */
      if (types.length) {
        html += '<div class="grid grid-side mt">' +
          '<div class="card">' + UI.sectionHead('درآمد به تفکیک محصول') +
          C.bars({
            labels: types.map(function (t) { return t.label; }),
            series: [{ values: types.map(function (t) { return t.amount; }), color: '#7C3AED' }],
            height: 200, barWidth: 22
          }) + '</div>' +
          '<div class="card">' + UI.sectionHead('سهم محصولات') +
          C.donut({
            items: types.map(function (t, i) { return { label: t.label, value: t.amount, color: colors[i % colors.length] }; }),
            size: 148, centerLabel: 'درآمد', centerValue: UI.short(total)
          }) +
          '<div class="donut-legend" style="margin-top:10px">' + types.map(function (t, i) {
            return '<div class="dl"><i style="background:' + colors[i % colors.length] + '"></i><span>' + UI.esc(t.label) +
              ' (' + UI.n(t.kg) + ' کیلو)</span><b>' + UI.pct(total ? t.amount / total * 100 : 0, 0) + '</b></div>';
          }).join('') + '</div></div></div>';
      }

      /* لیست */
      html += '<div class="card mt">' + UI.sectionHead('فهرست فروش‌ها', UI.n(sales.length) + ' رکورد') +
        (sales.length ? '<div class="rows">' + sales.map(function (s) {
          return '<div class="row">' +
            '<span class="row-ic" style="background:#ECFDF5">🍗</span>' +
            '<div class="row-main"><div class="row-title">' + UI.esc(s.type) + ' — ' + UI.n(s.qtyKg) + ' کیلو</div>' +
            '<div class="row-sub">' + J.format(s.date, 'long') + ' · ' + UI.esc(s.buyer || 'بدون خریدار') +
            ' · کیلویی ' + UI.n(s.pricePerKg) + ' · ' + UI.esc(S.partnerName(s.paidTo)) + '</div></div>' +
            '<div class="row-side"><div class="row-amt pos">+' + UI.n(s.amount) + '</div><div class="row-date">تومان</div></div>' +
            '<div class="row-acts">' +
            '<button class="icon-btn sm" data-edit="' + s.id + '">' + UI.icon('edit', 15) + '</button>' +
            '<button class="icon-btn sm" data-del="' + s.id + '">' + UI.icon('trash', 15) + '</button>' +
            '</div></div>';
        }).join('') + '</div>' : UI.empty('فروشی ثبت نشده', 'اولین فروش را ثبت کنید')) +
        '</div>';

      /* جدول تجمیعی */
      if (types.length) {
        html += '<div class="card mt">' + UI.sectionHead('جدول تجمیعی محصولات') +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
          '<th>محصول</th><th>تعداد فاکتور</th><th>وزن (کیلو)</th><th>مبلغ (تومان)</th><th>میانگین کیلویی</th>' +
          '</tr></thead><tbody>' + types.map(function (t) {
            return '<tr><td><b>' + UI.esc(t.label) + '</b></td><td>' + UI.n(t.count) + '</td>' +
              '<td class="num-cell">' + UI.n(t.kg) + '</td>' +
              '<td class="num-cell">' + UI.n(t.amount) + '</td>' +
              '<td class="num-cell">' + UI.n(t.kg ? t.amount / t.kg : 0) + '</td></tr>';
          }).join('') + '</tbody></table></div></div>';
      }

      el.innerHTML = html;

      el.addEventListener('click', function (e) {
        var t = e.target;
        if (t.closest('[data-act="new"]')) return A.Forms.sale();
        if (t.closest('[data-act="export"]')) return exportCsv(sales);
        var ed = t.closest('[data-edit]'); if (ed) return A.Forms.sale(ed.dataset.edit);
        var dl = t.closest('[data-del]');
        if (dl) {
          UI.confirm('این رکورد فروش حذف شود؟', { danger: true, ok: 'حذف' }).then(function (ok) {
            if (ok) { S.remove('sales', dl.dataset.del); A.render(); }
          });
        }
      });
    }
  };

  function exportCsv(sales) {
    var rows = [['تاریخ', 'نوع محصول', 'وزن (کیلو)', 'قیمت هر کیلو', 'مبلغ کل', 'خریدار', 'گله', 'واریز به']];
    sales.forEach(function (s) {
      rows.push([s.date, s.type, S.num(s.qtyKg), S.num(s.pricePerKg), S.num(s.amount), s.buyer || '', S.flockLabel(s.flockId), S.partnerName(s.paidTo)]);
    });
    UI.download('sales-' + J.today().replace(/\//g, '-') + '.csv', UI.csv(rows));
    UI.toast('فایل خروجی آماده شد');
  }

})(window.App = window.App || {});
