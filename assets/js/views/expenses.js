/* ==========================================================================
   views/expenses.js — مدیریت هزینه‌ها
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.Store, UI = A.UI, C = A.Charts;

  var f = { cat: '', flockId: '', from: '', to: '', q: '' };
  var limit = 40;

  A.Views.expenses = {
    render: function (el) {
      var list = S.filterExpenses(f);
      var total = list.reduce(function (a, b) { return a + S.num(b.amount); }, 0);
      var byCat = S.byCategory(f).slice(0, 4);
      var avg = list.length ? total / list.length : 0;

      var html = UI.pageHead('هزینه‌ها', 'ثبت و پیگیری تمام هزینه‌های مزرعه',
        '<button class="btn" data-act="export">' + UI.icon('download', 16) + ' خروجی اکسل</button>' +
        '<button class="btn primary" data-act="new">' + UI.icon('plus', 16) + ' هزینه جدید</button>');

      html += '<div class="stats">' +
        UI.stat({ icon: '💸', label: 'جمع هزینه‌های فیلتر', value: UI.short(total), unit: 'تومان', sub: UI.n(list.length) + ' رکورد' }) +
        UI.stat({ icon: '📊', label: 'میانگین هر رکورد', value: UI.short(avg), unit: 'تومان' }) +
        UI.stat({ icon: byCat[0] ? byCat[0].icon : '📦', label: 'بیشترین دسته', value: byCat[0] ? byCat[0].label : '—', sub: byCat[0] ? UI.short(byCat[0].value) + ' تومان' : '' }) +
        UI.stat({ icon: '🧾', label: 'تعداد دسته‌های فعال', value: UI.n(S.byCategory(f).length), sub: 'از ' + UI.n(A.CATS.length) + ' دسته' }) +
        '</div>';

      /* فیلترها */
      html += '<div class="card mt">' +
        '<div class="filters">' +
        '<div class="search-box">' + UI.icon('search', 17) +
        '<input id="q" placeholder="جستجوی عنوان، طرف حساب یا یادداشت..." value="' + UI.esc(f.q) + '"></div>' +
        '<select class="input" id="flt-flock" style="width:auto;min-width:150px">' +
        '<option value="">همه گله‌ها</option>' +
        S.state.flocks.map(function (x) {
          return '<option value="' + x.id + '"' + (f.flockId === x.id ? ' selected' : '') + '>' + UI.esc(x.name) + '</option>';
        }).join('') + '</select>' +
        '<button class="btn sm" data-act="range">' + UI.icon('calendar', 15) + ' بازه تاریخ</button>' +
        (f.cat || f.flockId || f.from || f.q ? '<button class="btn sm ghost" data-act="reset">حذف فیلترها</button>' : '') +
        '</div>' +
        '<div class="mt-sm">' + UI.chips([{ value: '', label: 'همه دسته‌ها' }].concat(
          A.CATS.map(function (c) { return { value: c.id, label: c.icon + ' ' + c.label }; })
        ), f.cat, 'cat') + '</div>' +
        (f.from || f.to ? '<div class="hint" style="margin-top:6px">بازه: ' +
          (f.from ? J.format(f.from, 'long') : 'ابتدا') + ' تا ' + (f.to ? J.format(f.to, 'long') : 'اکنون') + '</div>' : '') +
        '</div>';

      /* لیست */
      html += '<div class="card mt">' + UI.sectionHead('فهرست هزینه‌ها', UI.n(list.length) + ' رکورد') +
        (list.length ? '<div class="rows">' + list.slice(0, limit).map(function (x) {
          var c = A.CAT_MAP[x.category] || { icon: '📦', label: x.category, color: '#94A3B8' };
          return '<div class="row">' +
            '<span class="row-ic" style="background:' + c.color + '1A">' + c.icon + '</span>' +
            '<div class="row-main"><div class="row-title">' + UI.esc(x.title) + '</div>' +
            '<div class="row-sub">' + UI.esc(c.label) + (x.sub ? ' / ' + UI.esc(x.sub) : '') +
            ' · ' + UI.esc(S.partnerName(x.paidBy)) +
            (x.flockId ? ' · ' + UI.esc(S.flockLabel(x.flockId)) : '') + '</div></div>' +
            '<div class="row-side"><div class="row-amt neg">' + UI.n(x.amount) + '</div>' +
            '<div class="row-date">' + J.format(x.date, 'long') + '</div></div>' +
            '<div class="row-acts">' +
            '<button class="icon-btn sm" data-edit="' + x.id + '">' + UI.icon('edit', 15) + '</button>' +
            '<button class="icon-btn sm" data-del="' + x.id + '">' + UI.icon('trash', 15) + '</button>' +
            '</div></div>';
        }).join('') + '</div>' : UI.empty('هزینه‌ای یافت نشد', 'با تغییر فیلترها دوباره تلاش کنید')) +
        (list.length > limit ? '<button class="btn block mt" data-act="more">نمایش بیشتر (' + UI.n(list.length - limit) + ' مورد)</button>' : '') +
        '</div>';

      /* نمودار */
      var allCats = S.byCategory(f).slice(0, 5);
      var restCats = S.byCategory(f).slice(5).reduce(function (a, c) { return a + c.value; }, 0);
      if (restCats > 0) allCats.push({ label: 'سایر', value: restCats, color: '#CBD5E1' });
      if (allCats.length) {
        html += '<div class="card mt">' + UI.sectionHead('نمودار دسته‌ها') +
          '<div class="donut-wrap">' + C.donut({ items: allCats, size: 150, centerLabel: 'جمع', centerValue: UI.short(total) }) +
          '<div class="donut-legend">' + allCats.map(function (c) {
            return '<div class="dl"><i style="background:' + c.color + '"></i><span>' + UI.esc(c.label) + '</span><b>' + UI.short(c.value) + '</b></div>';
          }).join('') + '</div></div></div>';
      }

      el.innerHTML = html;

      var qEl = el.querySelector('#q');
      var timer;
      qEl.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { f.q = qEl.value; limit = 40; A.render(); }, 320);
      });
      el.querySelector('#flt-flock').addEventListener('change', function (e) {
        f.flockId = e.target.value; A.render();
      });

      el.addEventListener('click', function (e) {
        var t = e.target;
        if (t.closest('[data-act="new"]')) return A.Forms.expense();
        if (t.closest('[data-act="export"]')) return exportCsv(list);
        if (t.closest('[data-act="more"]')) { limit += 40; A.render(); return; }
        if (t.closest('[data-act="reset"]')) { f = { cat: '', flockId: '', from: '', to: '', q: '' }; A.render(); return; }
        if (t.closest('[data-act="range"]')) return rangeModal();
        var ch = t.closest('[data-cat]');
        if (ch) { f.cat = ch.dataset.cat; limit = 40; A.render(); return; }
        var ed = t.closest('[data-edit]'); if (ed) return A.Forms.expense(ed.dataset.edit);
        var dl = t.closest('[data-del]');
        if (dl) {
          UI.confirm('این هزینه حذف شود؟ این عمل قابل بازگشت نیست.', { danger: true, ok: 'حذف' }).then(function (ok) {
            if (ok) { S.remove('expenses', dl.dataset.del); UI.toast('هزینه حذف شد'); A.render(); }
          });
        }
      });
    }
  };

  function rangeModal() {
    var m = UI.form({
      title: 'فیلتر بازه تاریخ',
      fields: [
        { name: 'from', label: 'از تاریخ', type: 'date', col: 'half' },
        { name: 'to', label: 'تا تاریخ', type: 'date', col: 'half' }
      ],
      values: { from: f.from, to: f.to },
      submitText: 'اعمال فیلتر',
      onSubmit: function (d) { f.from = d.from; f.to = d.to; A.render(); }
    });
    var body = m.body;
    var quick = document.createElement('div');
    quick.className = 'chips';
    quick.style.marginTop = '10px';
    quick.innerHTML = '<button class="chip" data-q="7">۷ روز اخیر</button>' +
      '<button class="chip" data-q="30">۳۰ روز اخیر</button>' +
      '<button class="chip" data-q="90">۳ ماه اخیر</button>';
    body.appendChild(quick);
    quick.addEventListener('click', function (e) {
      var b = e.target.closest('[data-q]');
      if (!b) return;
      var days = +b.dataset.q;
      body.querySelector('[name="from"]').value = J.toFa(J.addDays(J.today(), -days));
      body.querySelector('[name="to"]').value = J.toFa(J.today());
    });
  }

  function exportCsv(list) {
    var rows = [['تاریخ', 'دسته', 'زیردسته', 'عنوان', 'مبلغ', 'مقدار', 'واحد', 'پرداخت‌کننده', 'گله', 'طرف حساب', 'یادداشت']];
    list.forEach(function (x) {
      var c = A.CAT_MAP[x.category] || { label: x.category };
      rows.push([x.date, c.label, x.sub || '', x.title, S.num(x.amount), x.qty || '', x.unit || '',
      S.partnerName(x.paidBy), S.flockLabel(x.flockId), x.vendor || '', x.note || '']);
    });
    UI.download('expenses-' + J.today().replace(/\//g, '-') + '.csv', UI.csv(rows));
    UI.toast('فایل خروجی آماده شد');
  }

})(window.App = window.App || {});
