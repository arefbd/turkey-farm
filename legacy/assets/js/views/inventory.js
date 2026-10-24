/* ==========================================================================
   views/inventory.js — انبار دان، دارو و تجهیزات
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.Store, UI = A.UI;

  var CAT_TO_EXPENSE = { 'خوراک': 'feed', 'مواد اولیه': 'mix', 'دارو': 'med', 'سوخت': 'diesel', 'تجهیزات': 'equip' };

  A.Views.inventory = {
    render: function (el) {
      var items = S.state.inventory.slice().sort(function (a, b) { return (a.qty - a.min) - (b.qty - b.min); });
      var low = items.filter(function (i) { return S.num(i.qty) <= S.num(i.min); });
      var value = items.reduce(function (a, i) { return a + S.num(i.qty) * S.num(i.pricePerKg); }, 0);

      var html = UI.pageHead('انبار مزرعه', 'موجودی دان، دارو، سوخت و تجهیزات',
        '<button class="btn" data-act="move">' + UI.icon('upload', 16) + ' ورود / خروج</button>' +
        '<button class="btn primary" data-act="new">' + UI.icon('plus', 16) + ' کالای جدید</button>');

      html += '<div class="stats">' +
        UI.stat({ icon: '📦', label: 'تعداد اقلام', value: UI.n(items.length), sub: 'در انبار' }) +
        UI.stat({ icon: '💰', label: 'ارزش موجودی', value: UI.short(value), unit: 'تومان' }) +
        UI.stat({ icon: '⚠️', label: 'کالاهای کم‌موجود', value: UI.n(low.length), sub: low.length ? 'نیاز به خرید' : 'همه کافی است' }) +
        UI.stat({ icon: '🛒', label: 'پیشنهاد خرید', value: UI.n(low.length), sub: 'قلم کالا' }) +
        '</div>';

      if (low.length) {
        html += '<div class="card mt" style="background:#FFFBEB;border-color:#FDE68A;box-shadow:none">' +
          '<div style="display:flex;gap:8px;align-items:flex-start">' + UI.icon('alert', 18) +
          '<div><b style="font-size:12.5px">' + UI.n(low.length) + ' قلم کالا به حد هشدار رسیده است</b>' +
          '<div class="hint">' + low.map(function (i) { return UI.esc(i.name) + ' (' + UI.n(i.qty) + ' ' + UI.esc(i.unit) + ')'; }).join(' · ') + '</div></div></div></div>';
      }

      html += '<div class="card mt">' + UI.sectionHead('اقلام انبار', UI.n(items.length) + ' قلم') +
        (items.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
          '<th>کالا</th><th>دسته</th><th>موجودی</th><th>حد هشدار</th><th>ارزش</th><th>وضعیت</th><th></th>' +
          '</tr></thead><tbody>' + items.map(function (i) {
            var isLow = S.num(i.qty) <= S.num(i.min);
            return '<tr><td><b>' + UI.esc(i.name) + '</b></td><td>' + UI.esc(i.cat || '—') + '</td>' +
              '<td class="num-cell">' + UI.n(i.qty) + ' ' + UI.esc(i.unit) + '</td>' +
              '<td class="num-cell">' + UI.n(i.min) + '</td>' +
              '<td class="num-cell">' + UI.short(S.num(i.qty) * S.num(i.pricePerKg)) + '</td>' +
              '<td><span class="badge ' + (isLow ? 'red' : 'green') + '">' + (isLow ? 'کم‌موجود' : 'کافی') + '</span></td>' +
              '<td><div style="display:flex;gap:2px">' +
              '<button class="icon-btn sm" data-move="' + i.id + '">' + UI.icon('up', 13) + '</button>' +
              '<button class="icon-btn sm" data-edit="' + i.id + '">' + UI.icon('edit', 13) + '</button>' +
              '<button class="icon-btn sm" data-del="' + i.id + '">' + UI.icon('trash', 13) + '</button>' +
              '</div></td></tr>';
          }).join('') + '</tbody></table></div>' : UI.empty('انبار خالی است', 'اولین کالا را اضافه کنید')) +
        '</div>';

      el.innerHTML = html;

      el.addEventListener('click', function (e) {
        var t = e.target;
        if (t.closest('[data-act="new"]')) return itemForm();
        if (t.closest('[data-act="move"]')) return moveForm();
        var mv = t.closest('[data-move]'); if (mv) return moveForm(mv.dataset.move);
        var ed = t.closest('[data-edit]'); if (ed) return itemForm(ed.dataset.edit);
        var dl = t.closest('[data-del]');
        if (dl) {
          UI.confirm('این کالا از انبار حذف شود؟', { danger: true, ok: 'حذف' }).then(function (ok) {
            if (ok) { S.remove('inventory', dl.dataset.del); A.render(); }
          });
        }
      });
    }
  };

  function itemForm(id) {
    var editing = id ? S.find('inventory', id) : null;
    var v = editing || { name: '', cat: 'خوراک', unit: 'کیلوگرم', qty: 0, min: 0, pricePerKg: 0 };
    return UI.form({
      title: editing ? 'ویرایش کالا' : 'افزودن کالای جدید',
      fields: [
        { name: 'name', label: 'نام کالا', type: 'text', required: true, col: 'half' },
        { name: 'cat', label: 'دسته', type: 'select', col: 'half', options: ['خوراک', 'مواد اولیه', 'دارو', 'سوخت', 'تجهیزات', 'سایر'] },
        { name: 'qty', label: 'موجودی فعلی', type: 'number', col: 'third' },
        { name: 'unit', label: 'واحد', type: 'select', col: 'third', options: A.UNITS },
        { name: 'min', label: 'حد هشدار', type: 'number', col: 'third' },
        { name: 'pricePerKg', label: 'قیمت واحد (تومان)', type: 'money', col: 'half' }
      ],
      values: v,
      onSubmit: function (d) {
        if (editing) S.update('inventory', editing.id, d); else S.add('inventory', d);
        UI.toast('کالا ذخیره شد');
        A.render();
      }
    });
  }

  function moveForm(itemId) {
    var m = UI.form({
      title: 'ورود / خروج انبار',
      fields: [
        { name: 'itemId', label: 'کالا', type: 'select', required: true, col: 'half', options: S.state.inventory.map(function (i) { return { value: i.id, label: i.name }; }) },
        { name: 'kind', label: 'نوع تراکنش', type: 'select', col: 'half', options: [{ value: 'in', label: 'ورود به انبار' }, { value: 'out', label: 'خروج از انبار' }] },
        { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'half' },
        { name: 'qty', label: 'مقدار', type: 'number', required: true, col: 'half' },
        { name: 'cost', label: 'مبلغ کل (اختیاری)', type: 'money', col: 'half', hint: 'در صورت ورود، به عنوان هزینه ثبت می‌شود' },
        { name: 'flockId', label: 'گله', type: 'select', col: 'half', options: A.flockOptions() },
        { name: 'note', label: 'توضیح', type: 'text', col: 'full' }
      ],
      values: { itemId: itemId || (S.state.inventory[0] || {}).id, kind: 'in', date: J.today() },
      onSubmit: function (d) {
        var it = S.find('inventory', d.itemId);
        if (!it) return false;
        var q = S.num(d.qty);
        if (d.kind === 'out' && q > S.num(it.qty)) {
          UI.toast('موجودی کافی نیست (موجودی: ' + UI.n(it.qty) + ')', 'error'); return false;
        }
        S.update('inventory', it.id, { qty: S.num(it.qty) + (d.kind === 'in' ? q : -q) });
        if (d.kind === 'in' && S.num(d.cost) > 0) {
          S.add('expenses', {
            date: d.date, category: CAT_TO_EXPENSE[it.cat] || 'other', sub: it.name,
            title: 'خرید ' + UI.n(q) + ' ' + it.unit + ' ' + it.name,
            amount: S.num(d.cost), qty: q, unit: it.unit, paidBy: 'fund', split: 'share',
            flockId: d.flockId || '', note: 'ثبت خودکار از انبار'
          });
        }
        UI.toast('تراکنش انبار ثبت شد');
        A.render();
      }
    });
    return m;
  }

})(window.App = window.App || {});
