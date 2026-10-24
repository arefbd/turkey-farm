/* ==========================================================================
   views/partners.js — شرکا، آورده‌ها، تسویه حساب و معاملات دلالی
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.Store, UI = A.UI, C = A.Charts;

  function dealProfit(d) {
    return (S.num(d.sellPrice) - S.num(d.buyPrice)) * S.num(d.qty) + S.num(d.commission);
  }

  A.Views.partners = {
    render: function (el) {
      var partners = S.state.partners;
      var settle = S.settlement();
      var totalShare = S.totalShare();
      var totalCapital = settle.rows.reduce(function (a, r) { return a + r.capital; }, 0);
      var totalExp = settle.totalExp;
      var deals = S.state.deals.slice().sort(function (a, b) { return J.jdn(b.date) - J.jdn(a.date); });
      var totalDealProfit = deals.reduce(function (a, d) { return a + dealProfit(d); }, 0);

      var html = UI.pageHead('شرکا و تسویه حساب', 'مدیریت سهام، آورده‌ها و تقسیم هزینه‌ها بین شرکا',
        '<button class="btn" data-act="contrib">' + UI.icon('money', 16) + ' ثبت آورده</button>' +
        '<button class="btn primary" data-act="new">' + UI.icon('users', 16) + ' شریک جدید</button>');

      if (Math.abs(totalShare - 100) > 0.5) {
        html += '<div class="card" style="background:#FFFBEB;border-color:#FDE68A;box-shadow:none">' +
          '<div style="display:flex;gap:8px;align-items:center">' + UI.icon('alert', 18) +
          '<div><b style="font-size:12.5px">جمع سهم شرکا ' + UI.n(totalShare, 1) + '٪ است</b>' +
          '<div class="hint">برای تقسیم دقیق هزینه‌ها، مجموع درصدها باید ۱۰۰ باشد.</div></div></div></div>';
      }

      html += '<div class="stats">' +
        UI.stat({ icon: '👥', label: 'تعداد شرکا', value: UI.n(partners.length), sub: 'جمع سهام ' + UI.n(totalShare, 0) + '٪' }) +
        UI.stat({ icon: '💰', label: 'سرمایه آورده‌شده', value: UI.short(totalCapital), unit: 'تومان' }) +
        UI.stat({ icon: '💸', label: 'هزینه‌های تقسیم‌شده', value: UI.short(totalExp), unit: 'تومان' }) +
        UI.stat({ icon: '🤝', label: 'سود معاملات دلالی', value: UI.short(totalDealProfit), unit: 'تومان', sub: UI.n(deals.length) + ' معامله' }) +
        '</div>';

      /* کارت شرکا */
      html += '<div class="grid grid-2 mt">' + partners.map(function (p) {
        var row = settle.rows.filter(function (r) { return r.id === p.id; })[0] || { balance: 0, capital: 0, paidDirect: 0, shareExp: 0 };
        var pos = row.balance >= 0;
        var pDeals = deals.filter(function (d) { return d.partnerId === p.id; });
        return '<div class="card partner-card">' +
          '<div class="partner-head">' + UI.avatar(p.name, p.color, 44) +
          '<div><b>' + UI.esc(p.name) + '</b><span>' + UI.esc(p.role || 'شریک') + (p.phone ? ' · ' + UI.esc(p.phone) : '') + '</span></div>' +
          '<span class="share-pill">' + UI.n(p.share) + '٪</span></div>' +

          '<div class="progress-row">' + UI.bar(p.share, p.color) + '</div>' +

          '<div class="grid grid-2" style="gap:8px">' +
          '<div><div class="hint">آورده نقدی</div><b style="font-size:13px">' + UI.short(row.capital) + '</b></div>' +
          '<div><div class="hint">پرداخت مستقیم</div><b style="font-size:13px">' + UI.short(row.paidDirect) + '</b></div>' +
          '<div><div class="hint">سهم از هزینه</div><b style="font-size:13px">' + UI.short(row.shareExp) + '</b></div>' +
          '<div><div class="hint">معاملات دلالی</div><b style="font-size:13px">' + UI.n(pDeals.length) + ' مورد</b></div>' +
          '</div>' +

          '<div class="card" style="box-shadow:none;background:' + (pos ? '#F1FCF6' : '#FEF4F4') + ';border:1px solid ' + (pos ? '#D1FAE5' : '#FEE2E2') + ';padding:11px 13px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<span style="font-size:11.5px;color:var(--muted)">مانده حساب</span>' +
          '<b style="font-size:14px;color:' + (pos ? '#059669' : '#DC2626') + '">' + UI.short(Math.abs(row.balance)) + ' تومان ' + (pos ? 'طلب' : 'بدهی') + '</b>' +
          '</div></div>' +

          '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
          '<button class="btn sm" data-contrib="' + p.id + '">آورده</button>' +
          '<button class="btn sm" data-edit="' + p.id + '">ویرایش</button>' +
          '<button class="btn sm ghost" data-del="' + p.id + '">' + UI.icon('trash', 14) + '</button>' +
          '</div></div>';
      }).join('') + '</div>';

      /* جدول تسویه */
      html += '<div class="card mt">' + UI.sectionHead('جدول تسویه حساب', 'بر اساس هزینه‌های پرداخت‌شده و سهم هر شریک') +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th>شریک</th><th>سهم</th><th>آورده</th><th>پرداخت مستقیم</th><th>سهم از هزینه‌ها</th><th>مانده</th><th>وضعیت</th>' +
        '</tr></thead><tbody>' + settle.rows.map(function (r) {
          var pos = r.balance >= 0;
          return '<tr><td><b>' + UI.esc(r.name) + '</b></td>' +
            '<td>' + UI.n(r.share) + '٪</td>' +
            '<td class="num-cell">' + UI.n(r.capital) + '</td>' +
            '<td class="num-cell">' + UI.n(r.paidDirect) + '</td>' +
            '<td class="num-cell">' + UI.n(r.shareExp) + '</td>' +
            '<td class="num-cell" style="color:' + (pos ? '#059669' : '#DC2626') + '">' + UI.n(r.balance) + '</td>' +
            '<td><span class="badge ' + (pos ? 'green' : 'red') + '">' + (pos ? 'طلبکار' : 'بدهکار') + '</span></td></tr>';
        }).join('') +
        '<tr style="background:#FBF9FF"><td><b>جمع</b></td><td>' + UI.n(totalShare) + '٪</td>' +
        '<td class="num-cell">' + UI.n(totalCapital) + '</td><td class="num-cell">—</td>' +
        '<td class="num-cell">' + UI.n(totalExp) + '</td>' +
        '<td class="num-cell" style="color:' + (settle.surplus >= 0 ? '#059669' : '#DC2626') + '">' + UI.n(settle.surplus) + '</td>' +
        '<td><span class="badge gray">موجودی صندوق</span></td></tr>' +
        '</tbody></table></div>' +
        '<div class="hint" style="margin-top:8px">مانده هر شریک = آورده + پرداخت مستقیم − سهم او از هزینه‌ها. عدد جمع، نقدینگی باقی‌مانده در صندوق مشترک است.</div></div>';

      /* پیشنهاد تسویه */
      var transfers = suggestTransfers(settle.rows, settle.surplus);
      html += '<div class="card mt">' + UI.sectionHead('پیشنهاد تسویه نهایی', 'برای برابر شدن مانده حساب شرکا') +
        (transfers.length ? transfers.map(function (t) {
          return '<div class="alert-item" style="background:#F7F4FF"><span class="ai-ic">💸</span>' +
            '<div><h5>' + UI.esc(t.from) + ' → ' + UI.esc(t.to) + '</h5>' +
            '<p>مبلغ <b>' + UI.money(t.amount) + '</b> پرداخت شود.</p></div></div>';
        }).join('') : '<div class="alert-item ok"><span class="ai-ic">✅</span><div><h5>حساب‌ها متوازن است</h5><p>هیچ پرداختی بین شرکا لازم نیست.</p></div></div>') +
        '<div class="hint" style="margin-top:8px">موجودی نقدی صندوق (' + UI.money(settle.surplus) + ') پیش از این تسویه، به نسبت سهم بین شرکا لحاظ شده است.</div>' +
        '<button class="btn sm block mt-sm no-print" data-act="print">' + UI.icon('print', 15) + ' چاپ صورت‌حساب شرکا</button>' +
        '</div>';

      /* آورده‌ها */
      var contribs = S.state.contributions.slice().sort(function (a, b) { return J.jdn(b.date) - J.jdn(a.date); });
      html += '<div class="card mt">' + UI.sectionHead('سابقه آورده‌ها و برداشت‌ها', UI.n(contribs.length) + ' رکورد',
        '<button class="btn sm" data-act="contrib">' + UI.icon('plus', 14) + ' ثبت</button>') +
        (contribs.length ? '<div class="rows">' + contribs.map(function (c) {
          var p = S.partner(c.partnerId) || { name: '—', color: '#999' };
          return '<div class="row"><span class="row-ic" style="background:' + p.color + '1A">' +
            UI.avatar(p.name, p.color, 30) + '</span>' +
            '<div class="row-main"><div class="row-title">' + UI.esc(p.name) + '</div>' +
            '<div class="row-sub">' + J.format(c.date, 'long') + (c.note ? ' · ' + UI.esc(c.note) : '') + '</div></div>' +
            '<div class="row-side"><div class="row-amt ' + (c.amount >= 0 ? 'pos' : 'neg') + '">' +
            (c.amount >= 0 ? '+' : '−') + UI.n(Math.abs(c.amount)) + '</div><div class="row-date">تومان</div></div>' +
            '<div class="row-acts"><button class="icon-btn sm" data-del-contrib="' + c.id + '">' + UI.icon('trash', 15) + '</button></div></div>';
        }).join('') + '</div>' : UI.empty('آورده‌ای ثبت نشده', '')) + '</div>';

      /* معاملات دلالی */
      html += '<div class="card mt">' + UI.sectionHead('معاملات جداگانه و دلالی', 'هر معامله به نام شریک انجام‌دهنده ثبت می‌شود',
        '<button class="btn sm primary" data-act="new-deal">' + UI.icon('plus', 14) + ' معامله جدید</button>') +
        (deals.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
          '<th>تاریخ</th><th>دلال</th><th>کالا</th><th>مقدار</th><th>خرید</th><th>فروش</th><th>کمیسیون</th><th>سود</th><th></th>' +
          '</tr></thead><tbody>' + deals.map(function (d) {
            var p = S.partner(d.partnerId) || { name: '—' };
            var prof = dealProfit(d);
            return '<tr><td>' + J.format(d.date, 'short') + '</td><td><b>' + UI.esc(p.name) + '</b></td>' +
              '<td>' + UI.esc(d.item || '—') + '</td><td class="num-cell">' + UI.n(d.qty) + ' ' + UI.esc(d.unit || '') + '</td>' +
              '<td class="num-cell">' + UI.n(d.buyPrice) + '</td><td class="num-cell">' + UI.n(d.sellPrice) + '</td>' +
              '<td class="num-cell">' + UI.n(d.commission) + '</td>' +
              '<td class="num-cell" style="color:' + (prof >= 0 ? '#059669' : '#DC2626') + '">' + UI.n(prof) + '</td>' +
              '<td><button class="icon-btn sm" data-del-deal="' + d.id + '">' + UI.icon('trash', 13) + '</button></td></tr>';
          }).join('') + '</tbody></table></div>' : UI.empty('معامله‌ای ثبت نشده', 'معاملات دلالی هر شریک را جداگانه ثبت کنید')) +
        '</div>';

      el.innerHTML = html;

      el.addEventListener('click', function (e) {
        var t = e.target;
        if (t.closest('[data-act="new"]')) return A.Forms.partner();
        if (t.closest('[data-act="contrib"]')) return A.Forms.contribution();
        if (t.closest('[data-act="print"]')) return window.print();
        if (t.closest('[data-act="new-deal"]')) return dealForm();
        var c = t.closest('[data-contrib]'); if (c) return A.Forms.contribution(c.dataset.contrib);
        var ed = t.closest('[data-edit]'); if (ed) return A.Forms.partner(ed.dataset.edit);
        var dc = t.closest('[data-del-contrib]');
        if (dc) {
          UI.confirm('این رکورد آورده حذف شود؟', { danger: true, ok: 'حذف' }).then(function (ok) {
            if (ok) { S.remove('contributions', dc.dataset.delContrib); A.render(); }
          });
          return;
        }
        var dd = t.closest('[data-del-deal]');
        if (dd) {
          UI.confirm('این معامله حذف شود؟', { danger: true, ok: 'حذف' }).then(function (ok) {
            if (ok) { S.remove('deals', dd.dataset.delDeal); A.render(); }
          });
          return;
        }
        var dl = t.closest('[data-del]');
        if (dl) {
          UI.confirm('این شریک حذف شود؟ سابقه هزینه‌های او حفظ می‌شود.', { danger: true, ok: 'حذف' }).then(function (ok) {
            if (ok) { S.remove('partners', dl.dataset.del); A.render(); }
          });
        }
      });
    }
  };

  /* محاسبه حداقل انتقالات برای تسویه */
  function suggestTransfers(rows, surplus) {
    surplus = surplus || 0;
    var bal = rows.map(function (r) {
      return { name: r.name, v: r.balance - surplus * S.num(r.share) / 100 };
    }).filter(function (r) { return Math.abs(r.v) > 1000; });
    var debtors = bal.filter(function (r) { return r.v < 0; }).sort(function (a, b) { return a.v - b.v; });
    var creditors = bal.filter(function (r) { return r.v > 0; }).sort(function (a, b) { return b.v - a.v; });
    var out = [], i = 0, j = 0, guard = 0;
    while (i < debtors.length && j < creditors.length && guard++ < 50) {
      var amt = Math.min(-debtors[i].v, creditors[j].v);
      if (amt > 1000) out.push({ from: debtors[i].name, to: creditors[j].name, amount: Math.round(amt) });
      debtors[i].v += amt; creditors[j].v -= amt;
      if (Math.abs(debtors[i].v) < 1000) i++;
      if (Math.abs(creditors[j].v) < 1000) j++;
    }
    return out;
  }

  /* فرم معامله دلالی */
  function dealForm(id) {
    var editing = id ? S.find('deals', id) : null;
    var v = editing || { date: J.today(), partnerId: (S.state.partners[0] || {}).id, item: '', qty: '', unit: 'کیلوگرم', buyPrice: '', sellPrice: '', commission: '', note: '' };
    var m = UI.form({
      title: editing ? 'ویرایش معامله' : 'ثبت معامله / دلالی',
      fields: [
        { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'half' },
        { name: 'partnerId', label: 'شریک انجام‌دهنده', type: 'select', required: true, col: 'half', options: S.state.partners.map(function (p) { return { value: p.id, label: p.name }; }) },
        { name: 'item', label: 'کالا / موضوع', type: 'text', required: true, col: 'full', placeholder: 'مثلاً ۵ تن ذرت' },
        { name: 'qty', label: 'مقدار', type: 'number', col: 'third' },
        { name: 'unit', label: 'واحد', type: 'select', col: 'third', options: A.UNITS },
        { name: 'commission', label: 'کمیسیون', type: 'money', col: 'third' },
        { name: 'buyPrice', label: 'قیمت خرید (واحد)', type: 'money', col: 'half' },
        { name: 'sellPrice', label: 'قیمت فروش (واحد)', type: 'money', col: 'half' },
        { name: 'note', label: 'یادداشت', type: 'textarea', col: 'full' }
      ],
      values: v,
      extraHtml: '<div class="hint" id="deal-profit" style="margin-top:8px"></div>',
      onSubmit: function (d) {
        if (editing) S.update('deals', editing.id, d); else S.add('deals', d);
        UI.toast('معامله ثبت شد');
        A.render();
      }
    });
    function upd() {
      var q = S.num(m.body.querySelector('[name="qty"]').value);
      var b = S.num(m.body.querySelector('[name="buyPrice"]').value);
      var s = S.num(m.body.querySelector('[name="sellPrice"]').value);
      var c = S.num(m.body.querySelector('[name="commission"]').value);
      var prof = (s - b) * q + c;
      m.body.querySelector('#deal-profit').innerHTML = 'سود تخمینی این معامله: <b style="color:' +
        (prof >= 0 ? '#059669' : '#DC2626') + '">' + UI.money(prof) + '</b>';
    }
    m.body.addEventListener('input', upd);
    upd();
  }

  A.dealProfit = dealProfit;

})(window.App = window.App || {});
