/* ==========================================================================
   views/flocks.js — گله‌ها، ثبت روزانه و واکسیناسیون
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.Store, UI = A.UI, C = A.Charts;
  var filter = 'all';
  var tab = 'daily';

  /* ------------------------------- لیست گله‌ها ------------------------------ */
  A.Views.flocks = {
    render: function (el) {
      var flocks = S.state.flocks.slice().sort(function (a, b) { return J.jdn(b.startDate) - J.jdn(a.startDate); });
      if (filter === 'active') flocks = flocks.filter(function (f) { return f.status !== 'closed'; });
      if (filter === 'closed') flocks = flocks.filter(function (f) { return f.status === 'closed'; });

      var html = UI.pageHead('گله‌ها و دوره‌های پرورش', 'مدیریت چرخه پرورش، ثبت روزانه و سوابق واکسیناسیون',
        '<button class="btn primary" data-act="new-flock">' + UI.icon('plus', 16) + ' گله جدید</button>') +
        UI.chips([
          { value: 'all', label: 'همه گله‌ها' },
          { value: 'active', label: 'در حال پرورش' },
          { value: 'closed', label: 'بسته شده' }
        ], filter, 'flock-filter');

      html += '<div class="grid grid-2 mt">' + (flocks.length ? flocks.map(function (f) {
        var st = S.flockStats(f.id);
        var closed = f.status === 'closed';
        var prog = Math.min(100, st.age / (S.state.settings.cycleDays || 120) * 100);
        return '<div class="card flock-card">' +
          '<div class="flock-top"><div>' +
          '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">' +
          '<h3 style="font-size:15px">' + UI.esc(f.name) + '</h3>' +
          '<span class="badge ' + (closed ? 'gray' : 'green') + '">' + (closed ? 'بسته شده' : 'در حال پرورش') + '</span>' +
          '</div>' +
          '<div class="flock-meta"><span>نژاد: <b>' + UI.esc(f.breed || '—') + '</b></span>' +
          '<span>شروع: <b>' + J.format(f.startDate, 'long') + '</b></span>' +
          '<span>سن: <b>' + UI.n(st.age) + ' روز</b></span></div>' +
          '</div>' +
          '<button class="icon-btn sm" data-menu="' + f.id + '">' + UI.icon('dots', 18) + '</button>' +
          '</div>' +

          '<div class="grid grid-3" style="gap:8px;margin:14px 0 10px">' +
          '<div class="kv" style="display:block;padding:0;border:0"><span>موجودی زنده</span><br><b style="font-size:15px">' + UI.n(st.alive) + '</b></div>' +
          '<div class="kv" style="display:block;padding:0;border:0"><span>تلفات</span><br><b style="font-size:15px;color:' + (st.mortalityPct > 5 ? '#DC2626' : '#059669') + '">' + UI.pct(st.mortalityPct, 2) + '</b></div>' +
          '<div class="kv" style="display:block;padding:0;border:0"><span>وزن میانگین</span><br><b style="font-size:15px">' + UI.n(st.avgWeightG / 1000, 2) + ' kg</b></div>' +
          '</div>' +

          '<div class="progress-row" style="margin-bottom:12px"><span>پیشرفت دوره</span>' + UI.bar(prog) + '<b>' + UI.pct(prog, 0) + '</b></div>' +

          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<a class="btn sm primary" href="#/flock/' + f.id + '">جزئیات گله</a>' +
          '<button class="btn sm" data-daily="' + f.id + '">' + UI.icon('plus', 14) + ' ثبت روزانه</button>' +
          '<button class="btn sm" data-expense="' + f.id + '">هزینه</button>' +
          '</div>' +
          '</div>';
      }).join('') : UI.empty('گله‌ای یافت نشد', 'برای شروع، یک گله جدید ایجاد کنید')) + '</div>';

      el.innerHTML = html;

      el.addEventListener('click', function (e) {
        var t = e.target;
        if (t.closest('[data-act="new-flock"]')) { A.Forms.flock(); return; }
        var cf = t.closest('[data-flock-filter]');
        if (cf) { filter = cf.dataset.flockFilter; A.render(); return; }
        var d = t.closest('[data-daily]');
        if (d) { A.Forms.daily(null, d.dataset.daily); return; }
        var ex = t.closest('[data-expense]');
        if (ex) { A.Forms.expense(null, { flockId: ex.dataset.expense }); return; }
        var mu = t.closest('[data-menu]');
        if (mu) {
          var id = mu.dataset.menu;
          UI.sheet({
            title: 'عملیات گله',
            items: [
              { act: 'edit', label: 'ویرایش اطلاعات گله', icon: '✏️' },
              { act: 'close', label: 'بستن دوره گله', icon: '🔒' },
              { act: 'del', label: 'حذف گله', icon: '🗑️' }
            ],
            onPick: function (act) {
              if (act === 'edit') A.Forms.flock(id);
              if (act === 'close') {
                S.update('flocks', id, { status: 'closed', endDate: J.today() });
                UI.toast('دوره گله بسته شد'); A.render();
              }
              if (act === 'del') {
                UI.confirm('این گله و همه رکوردهای آن حذف شود؟', { danger: true, ok: 'حذف' }).then(function (ok) {
                  if (!ok) return;
                  S.remove('flocks', id);
                  S.state.daily = S.state.daily.filter(function (x) { return x.flockId !== id; });
                  S.save(); UI.toast('گله حذف شد'); A.render();
                });
              }
            }
          });
        }
      });
    }
  };

  /* ------------------------------ جزئیات گله ------------------------------- */
  A.Views.flock = {
    render: function (el, id) {
      var f = S.flock(id);
      if (!f) { el.innerHTML = UI.empty('گله یافت نشد', ''); return; }
      var st = S.flockStats(id);
      var closed = f.status === 'closed';
      var prog = Math.min(100, st.age / (S.state.settings.cycleDays || 120) * 100);

      var recs = S.state.daily.filter(function (d) { return d.flockId === id; }).sort(function (a, b) { return J.jdn(a.date) - J.jdn(b.date); });
      var weights = recs.filter(function (r) { return S.num(r.avgWeightG) > 0; });
      var expenses = S.state.expenses.filter(function (e) { return e.flockId === id; }).sort(function (a, b) { return J.jdn(b.date) - J.jdn(a.date); });
      var sales = S.state.sales.filter(function (s) { return s.flockId === id; }).sort(function (a, b) { return J.jdn(b.date) - J.jdn(a.date); });
      var vacs = S.state.vaccines.filter(function (v) { return v.flockId === id; }).sort(function (a, b) { return J.jdn(b.date) - J.jdn(a.date); });

      var html = '<div style="margin-bottom:10px"><a class="btn sm ghost" href="#/flocks">' + UI.icon('chevron', 15) + ' بازگشت به گله‌ها</a></div>';

      html += '<div class="hero" style="padding-bottom:20px">' +
        '<div class="hero-top"><div class="hero-user"><div>' +
        '<b style="font-size:15px">' + UI.esc(f.name) + '</b>' +
        '<span>' + UI.esc(f.breed || '') + ' · ' + UI.esc(f.hall || '') + ' · کد ' + UI.esc(f.code || '—') + '</span>' +
        '</div></div>' +
        '<span class="hero-chip">' + (closed ? 'بسته شده' : 'در حال پرورش') + '</span></div>' +
        '<div class="hero-body">' +
        '<div class="hero-label">موجودی زنده</div>' +
        '<div class="hero-value">' + UI.n(st.alive) + ' <small>قطعه</small></div>' +
        '<div class="hero-sub">' + UI.n(st.age) + ' روز از شروع · ' + J.format(f.startDate, 'long') +
        (f.endDate ? ' تا ' + J.format(f.endDate, 'long') : '') + '</div>' +
        '<div style="max-width:320px;margin:14px auto 0">' +
        '<div class="progress-row" style="color:#fff"><span>' + UI.pct(prog, 0) + '</span>' +
        '<div class="bar" style="background:rgba(255,255,255,.2)"><span style="width:' + prog + '%;background:#fff"></span></div>' +
        '<span>' + UI.n(S.state.settings.cycleDays || 120) + ' روز</span></div></div>' +
        '</div></div>';

      html += '<div class="stats">' +
        UI.stat({ icon: '⚠️', label: 'تلفات', value: UI.pct(st.mortalityPct, 2), sub: UI.n(st.mortality) + ' قطعه' }) +
        UI.stat({ icon: '⚖️', label: 'وزن میانگین', value: UI.n(st.avgWeightG / 1000, 2), unit: 'کیلو', sub: st.weightDate ? 'توزین ' + J.format(st.weightDate, 'long') : 'ثبت نشده' }) +
        UI.stat({ icon: '🔄', label: 'ضریب تبدیل FCR', value: UI.n(st.fcr, 2), sub: 'دان ' + UI.n(st.feedKg) + ' کیلو' }) +
        UI.stat({ icon: '💰', label: 'هزینه هر کیلو', value: UI.short(st.costPerKg), unit: 'تومان', sub: 'کل هزینه ' + UI.short(st.expenses) }) +
        '</div>';

      /* نمودار وزن */
      if (weights.length > 1) {
        html += '<div class="card mt">' + UI.sectionHead('روند رشد وزن', 'گرم') +
          C.line({
            labels: weights.map(function (w) { return UI.n(w.age); }),
            values: weights.map(function (w) { return S.num(w.avgWeightG); }),
            color: '#7C3AED', height: 180
          }) + '</div>';
      }

      /* تب‌ها */
      html += '<div class="tabs mt" id="flock-tabs">' +
        ['daily:ثبت روزانه', 'vaccine:واکسیناسیون', 'expense:هزینه‌ها', 'sale:فروش'].map(function (x) {
          var p = x.split(':');
          return '<button class="tab' + (tab === p[0] ? ' active' : '') + '" data-tab="' + p[0] + '">' + p[1] + '</button>';
        }).join('') + '</div>';

      html += '<div class="card">';

      if (tab === 'daily') {
        html += UI.sectionHead('رکوردهای روزانه', UI.n(recs.length) + ' رکورد',
          '<button class="btn sm primary" data-act="add-daily">' + UI.icon('plus', 14) + ' ثبت</button>');
        if (!recs.length) html += UI.empty('رکوردی ثبت نشده', 'اولین ثبت روزانه را انجام دهید');
        else {
          html += '<div class="rows">' + recs.slice().reverse().slice(0, 60).map(function (r) {
            return '<div class="row">' +
              '<span class="row-ic" style="background:#F4EEFF;color:#6D28D9;font-size:12px;font-weight:800">' + UI.n(r.age) + '</span>' +
              '<div class="row-main"><div class="row-title">' + J.format(r.date, 'long') + '</div>' +
              '<div class="row-sub">تلفات ' + UI.n(r.mortality) + ' · دان ' + UI.n(r.feedKg) + ' کیلو' +
              (S.num(r.avgWeightG) ? ' · وزن ' + UI.n(r.avgWeightG) + ' گرم' : '') +
              (r.note ? ' · ' + UI.esc(r.note) : '') + '</div></div>' +
              '<div class="row-side"><div class="row-amt" style="color:' + (S.num(r.mortality) > 4 ? '#DC2626' : '#1B1230') + '">' +
              UI.n(r.mortality) + '</div><div class="row-date">تلفات</div></div>' +
              '<div class="row-acts"><button class="icon-btn sm" data-edit-daily="' + r.id + '">' + UI.icon('edit', 15) + '</button>' +
              '<button class="icon-btn sm" data-del-daily="' + r.id + '">' + UI.icon('trash', 15) + '</button></div>' +
              '</div>';
          }).join('') + '</div>';
        }
      }

      if (tab === 'vaccine') {
        html += UI.sectionHead('واکسیناسیون', UI.n(vacs.length) + ' نوبت',
          '<button class="btn sm primary" data-act="add-vac">' + UI.icon('plus', 14) + ' ثبت</button>');
        html += vacs.length ? '<div class="rows">' + vacs.map(function (v) {
          return '<div class="row"><span class="row-ic" style="background:#FDF2F8">💉</span>' +
            '<div class="row-main"><div class="row-title">' + UI.esc(v.name) + '</div>' +
            '<div class="row-sub">' + J.format(v.date, 'long') + ' · ' + UI.esc(v.method || '') + ' · ' + UI.n(v.count) + ' قطعه</div></div>' +
            '<div class="row-side"><div class="row-amt">' + UI.short(v.cost) + '</div><div class="row-date">تومان</div></div>' +
            '<div class="row-acts"><button class="icon-btn sm" data-del-vac="' + v.id + '">' + UI.icon('trash', 15) + '</button></div>' +
            '</div>';
        }).join('') + '</div>' : UI.empty('واکسنی ثبت نشده', 'نوبت‌های واکسیناسیون را ثبت کنید');
      }

      if (tab === 'expense') {
        var tot = expenses.reduce(function (a, b) { return a + S.num(b.amount); }, 0);
        html += UI.sectionHead('هزینه‌های این گله', 'جمع: ' + UI.money(tot),
          '<button class="btn sm primary" data-act="add-exp">' + UI.icon('plus', 14) + ' ثبت</button>');
        html += expenses.length ? '<div class="rows">' + expenses.map(function (x) {
          var c = A.CAT_MAP[x.category] || { icon: '📦', label: x.category, color: '#94A3B8' };
          return '<div class="row"><span class="row-ic" style="background:' + c.color + '18">' + c.icon + '</span>' +
            '<div class="row-main"><div class="row-title">' + UI.esc(x.title) + '</div>' +
            '<div class="row-sub">' + c.label + ' · ' + J.format(x.date, 'long') + ' · ' + UI.esc(S.partnerName(x.paidBy)) + '</div></div>' +
            '<div class="row-side"><div class="row-amt neg">' + UI.n(x.amount) + '</div><div class="row-date">تومان</div></div>' +
            '<div class="row-acts"><button class="icon-btn sm" data-edit-exp="' + x.id + '">' + UI.icon('edit', 15) + '</button></div>' +
            '</div>';
        }).join('') + '</div>' : UI.empty('هزینه‌ای ثبت نشده', '');
      }

      if (tab === 'sale') {
        var rev = sales.reduce(function (a, b) { return a + S.num(b.amount); }, 0);
        html += UI.sectionHead('فروش این گله', 'جمع: ' + UI.money(rev),
          '<button class="btn sm primary" data-act="add-sale">' + UI.icon('plus', 14) + ' ثبت</button>');
        html += sales.length ? '<div class="rows">' + sales.map(function (x) {
          return '<div class="row"><span class="row-ic" style="background:#ECFDF5">🍗</span>' +
            '<div class="row-main"><div class="row-title">' + UI.esc(x.type) + ' — ' + UI.n(x.qtyKg) + ' کیلو</div>' +
            '<div class="row-sub">' + J.format(x.date, 'long') + ' · ' + UI.esc(x.buyer || '—') + ' · کیلویی ' + UI.n(x.pricePerKg) + '</div></div>' +
            '<div class="row-side"><div class="row-amt pos">' + UI.n(x.amount) + '</div><div class="row-date">تومان</div></div>' +
            '<div class="row-acts"><button class="icon-btn sm" data-edit-sale="' + x.id + '">' + UI.icon('edit', 15) + '</button></div>' +
            '</div>';
        }).join('') + '</div>' : UI.empty('فروشی ثبت نشده', '');
      }

      html += '</div>';

      html += '<div class="grid grid-2 mt">' +
        '<div class="card">' + UI.sectionHead('خلاصه مالی گله') +
        '<div class="kv"><span>هزینه کل</span><b>' + UI.money(st.expenses) + '</b></div>' +
        '<div class="kv"><span>درآمد فروش</span><b>' + UI.money(st.revenue) + '</b></div>' +
        '<div class="kv"><span>سود / زیان</span><b style="color:' + (st.profit >= 0 ? '#059669' : '#DC2626') + '">' + UI.money(st.profit) + '</b></div>' +
        '<div class="kv"><span>هزینه هر کیلو وزن زنده</span><b>' + UI.money(st.costPerKg) + '</b></div>' +
        '</div>' +
        '<div class="card">' + UI.sectionHead('شاخص‌های فنی') +
        '<div class="kv"><span>تعداد اولیه</span><b>' + UI.n(f.startCount) + ' قطعه</b></div>' +
        '<div class="kv"><span>تلفات + حذفی</span><b>' + UI.n(st.mortality + st.culled) + ' قطعه</b></div>' +
        '<div class="kv"><span>مصرف دان کل</span><b>' + UI.n(st.feedKg) + ' کیلو</b></div>' +
        '<div class="kv"><span>دان به ازای هر پرنده</span><b>' + UI.n(st.feedPerBird, 1) + ' کیلو</b></div>' +
        '<div class="kv"><span>وزن زنده کل</span><b>' + UI.n(st.biomass, 0) + ' کیلو</b></div>' +
        '</div></div>';

      el.innerHTML = html;

      el.addEventListener('click', function (e) {
        var t = e.target;
        var tb = t.closest('[data-tab]');
        if (tb) { tab = tb.dataset.tab; A.render(); return; }
        if (t.closest('[data-act="add-daily"]')) return A.Forms.daily(null, id);
        if (t.closest('[data-act="add-vac"]')) return A.Forms.vaccine(null, id);
        if (t.closest('[data-act="add-exp"]')) return A.Forms.expense(null, { flockId: id });
        if (t.closest('[data-act="add-sale"]')) return A.Forms.sale();
        var ed = t.closest('[data-edit-daily]'); if (ed) return A.Forms.daily(ed.dataset.editDaily);
        var ee = t.closest('[data-edit-exp]'); if (ee) return A.Forms.expense(ee.dataset.editExp);
        var es = t.closest('[data-edit-sale]'); if (es) return A.Forms.sale(es.dataset.editSale);
        var dd = t.closest('[data-del-daily]');
        if (dd) {
          UI.confirm('این رکورد روزانه حذف شود؟', { danger: true, ok: 'حذف' }).then(function (ok) {
            if (ok) { S.remove('daily', dd.dataset.delDaily); A.render(); }
          });
        }
        var dv = t.closest('[data-del-vac]');
        if (dv) {
          UI.confirm('این نوبت واکسیناسیون حذف شود؟', { danger: true, ok: 'حذف' }).then(function (ok) {
            if (ok) { S.remove('vaccines', dv.dataset.delVac); A.render(); }
          });
        }
      });
    }
  };

})(window.App = window.App || {});
