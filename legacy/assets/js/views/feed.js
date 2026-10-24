/* ==========================================================================
   views/feed.js — فرمول خوراک ساختگی و بچ‌های تولید
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.Store, UI = A.UI, C = A.Charts;

  function formulaCost(fm) {
    var cost = 0, protein = 0, pct = 0;
    (fm.items || []).forEach(function (it) {
      var p = S.num(it.percent);
      pct += p;
      cost += p / 100 * S.num(it.pricePerKg);
      protein += p / 100 * S.num(it.protein);
    });
    return { cost: cost, protein: protein, pct: pct };
  }

  A.formulaCost = formulaCost;

  A.Views.feed = {
    render: function (el) {
      var formulas = S.state.formulas;
      var batches = S.state.batches.slice().sort(function (a, b) { return J.jdn(b.date) - J.jdn(a.date); });
      var totalKg = batches.reduce(function (a, b) { return a + S.num(b.qtyKg); }, 0);
      var totalCost = batches.reduce(function (a, b) {
        var fm = S.find('formulas', b.formulaId);
        return a + S.num(b.qtyKg) * (fm ? formulaCost(fm).cost : 0);
      }, 0);

      var html = UI.pageHead('خوراک و فرمول ساختگی', 'ساخت دان با فرمول اختصاصی (ذرت، سویا، روغن و ...)',
        '<button class="btn" data-act="new-batch">' + UI.icon('plus', 16) + ' ثبت بچ تولید</button>' +
        '<button class="btn primary" data-act="new-formula">' + UI.icon('flask', 16) + ' فرمول جدید</button>');

      html += '<div class="stats">' +
        UI.stat({ icon: '🧪', label: 'تعداد فرمول', value: UI.n(formulas.length), sub: 'فرمول فعال' }) +
        UI.stat({ icon: '⚖️', label: 'خوراک تولیدشده', value: UI.n(totalKg), unit: 'کیلو', sub: 'در ' + UI.n(batches.length) + ' بچ' }) +
        UI.stat({ icon: '💰', label: 'ارزش تولید', value: UI.short(totalCost), unit: 'تومان' }) +
        UI.stat({ icon: '📉', label: 'میانگین هر کیلو', value: UI.short(totalKg ? totalCost / totalKg : 0), unit: 'تومان' }) +
        '</div>';

      /* فرمول‌ها */
      html += '<div class="card mt">' + UI.sectionHead('فرمول‌های خوراک', UI.n(formulas.length) + ' فرمول') +
        (formulas.length ? '<div class="grid grid-2">' + formulas.map(function (fm) {
          var c = formulaCost(fm);
          return '<div class="card" style="box-shadow:none;border:1px solid var(--line);background:#FCFAFF">' +
            '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">' +
            '<div><b style="font-size:13.5px">' + UI.esc(fm.name) + '</b>' +
            '<div class="hint">' + UI.esc(fm.note || '') + '</div></div>' +
            '<button class="icon-btn sm" data-fm-menu="' + fm.id + '">' + UI.icon('dots', 16) + '</button></div>' +
            '<div class="grid grid-3" style="gap:6px;margin:12px 0 10px">' +
            '<div><div class="hint">هزینه هر کیلو</div><b style="font-size:14px">' + UI.n(c.cost) + '</b></div>' +
            '<div><div class="hint">پروتئین</div><b style="font-size:14px">' + UI.n(c.protein, 1) + '٪</b></div>' +
            '<div><div class="hint">جمع درصد</div><b style="font-size:14px;color:' + (Math.abs(c.pct - 100) > 0.5 ? '#DC2626' : '#059669') + '">' + UI.n(c.pct, 1) + '٪</b></div>' +
            '</div>' +
            '<div class="progress-row"><span>ترکیبات</span></div>' +
            '<div style="display:flex;gap:4px;margin-top:6px;height:8px;border-radius:6px;overflow:hidden">' +
            fm.items.map(function (it, i) {
              var colors = ['#6D28D9', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE', '#F5F3FF'];
              return '<span title="' + UI.esc(it.name) + '" style="width:' + S.num(it.percent) + '%;background:' + colors[i % colors.length] + '"></span>';
            }).join('') + '</div>' +
            '<div class="hint" style="margin-top:6px">' + fm.items.length + ' ماده اولیه · ' + UI.esc(fm.items[0] ? fm.items[0].name : '') + ' و ...</div>' +
            '<button class="btn sm block mt-sm" data-batch="' + fm.id + '">ثبت بچ تولید با این فرمول</button>' +
            '</div>';
        }).join('') + '</div>' : UI.empty('فرمولی ثبت نشده', 'اولین فرمول خوراک را بسازید')) +
        '</div>';

      /* بچ‌ها */
      html += '<div class="card mt">' + UI.sectionHead('بچ‌های تولید خوراک', UI.n(batches.length) + ' بچ') +
        (batches.length ? '<div class="rows">' + batches.map(function (b) {
          var fm = S.find('formulas', b.formulaId);
          var cost = fm ? formulaCost(fm).cost * S.num(b.qtyKg) : 0;
          return '<div class="row">' +
            '<span class="row-ic" style="background:#ECFEFF">🌾</span>' +
            '<div class="row-main"><div class="row-title">' + UI.esc(fm ? fm.name : 'فرمول حذف‌شده') + '</div>' +
            '<div class="row-sub">' + J.format(b.date, 'long') + ' · ' + UI.n(b.qtyKg) + ' کیلو' +
            (b.flockId ? ' · ' + UI.esc(S.flockLabel(b.flockId)) : '') +
            (b.expensed ? ' · <span style="color:#059669">ثبت در هزینه‌ها</span>' : ' · <span style="color:#B45309">ثبت نشده در هزینه</span>') + '</div></div>' +
            '<div class="row-side"><div class="row-amt">' + UI.short(cost) + '</div><div class="row-date">تومان</div></div>' +
            '<div class="row-acts"><button class="icon-btn sm" data-del-batch="' + b.id + '">' + UI.icon('trash', 15) + '</button></div>' +
            '</div>';
        }).join('') + '</div>' : UI.empty('بچی ثبت نشده', 'تولید خوراک را ثبت کنید')) +
        '</div>';

      el.innerHTML = html;

      el.addEventListener('click', function (e) {
        var t = e.target;
        if (t.closest('[data-act="new-formula"]')) return editor(null);
        if (t.closest('[data-act="new-batch"]')) return batchForm(null, null);
        var fm = t.closest('[data-fm-menu]');
        if (fm) {
          var id = fm.dataset.fmMenu;
          UI.sheet({
            title: 'عملیات فرمول',
            items: [
              { act: 'edit', label: 'ویرایش فرمول', icon: '✏️' },
              { act: 'dup', label: 'کپی فرمول', icon: '📋' },
              { act: 'del', label: 'حذف فرمول', icon: '🗑️' }
            ],
            onPick: function (act) {
              if (act === 'edit') editor(id);
              if (act === 'dup') {
                var o = S.find('formulas', id);
                var copy = JSON.parse(JSON.stringify(o));
                copy.id = undefined; copy.name = o.name + ' (کپی)';
                S.add('formulas', copy); UI.toast('فرمول کپی شد'); A.render();
              }
              if (act === 'del') {
                UI.confirm('این فرمول حذف شود؟', { danger: true, ok: 'حذف' }).then(function (ok) {
                  if (ok) { S.remove('formulas', id); A.render(); }
                });
              }
            }
          });
          return;
        }
        var b = t.closest('[data-batch]');
        if (b) return batchForm(null, b.dataset.batch);
        var db = t.closest('[data-del-batch]');
        if (db) {
          UI.confirm('این بچ تولید حذف شود؟', { danger: true, ok: 'حذف' }).then(function (ok) {
            if (ok) { S.remove('batches', db.dataset.delBatch); A.render(); }
          });
        }
      });
    }
  };

  /* ---------------------------- ویرایشگر فرمول ----------------------------- */
  function editor(id) {
    var src = id ? S.find('formulas', id) : { name: '', note: '', items: [{ name: 'ذرت', percent: 0, pricePerKg: 0, protein: 0 }] };
    var items = JSON.parse(JSON.stringify(src.items || []));
    if (!items.length) items = [{ name: '', percent: 0, pricePerKg: 0, protein: 0 }];

    var body = '<div class="form-grid">' +
      '<div class="field full"><label class="lbl">نام فرمول</label>' +
      '<input class="input" id="fm-name" value="' + UI.esc(src.name) + '" placeholder="فرمول رشد — دوره دوم"></div>' +
      '<div class="field full"><label class="lbl">توضیح</label>' +
      '<input class="input" id="fm-note" value="' + UI.esc(src.note || '') + '" placeholder="اختیاری"></div>' +
      '</div>' +
      '<div class="formula-head" style="display:grid;grid-template-columns:1fr 70px 90px 90px 34px;gap:6px;margin:12px 0 6px">' +
      '<span>ماده اولیه</span><span>درصد</span><span>قیمت هر کیلو</span><span>پروتئین٪</span><span></span></div>' +
      '<div id="fm-rows"></div>' +
      '<button class="btn sm mt-sm" data-add-row>' + UI.icon('plus', 14) + ' افزودن ماده اولیه</button>' +
      '<div class="card mt" style="box-shadow:none;background:#FAF8FE;border:1px solid var(--line)">' +
      '<div class="kv"><span>جمع درصدها</span><b id="fm-pct">—</b></div>' +
      '<div class="kv"><span>هزینه هر کیلو خوراک</span><b id="fm-cost">—</b></div>' +
      '<div class="kv"><span>پروتئین تخمینی</span><b id="fm-prot">—</b></div>' +
      '</div>';

    var m = UI.modal({
      title: id ? 'ویرایش فرمول خوراک' : 'فرمول خوراک جدید',
      body: body,
      footer: '<button class="btn ghost" data-close>انصراف</button>' +
        '<button class="btn primary" data-save>ذخیره فرمول</button>'
    });

    function draw() {
      m.body.querySelector('#fm-rows').innerHTML = items.map(function (it, i) {
        return '<div class="formula-item formula-row" data-row="' + i + '" style="margin-bottom:6px">' +
          '<input class="input" data-k="name" value="' + UI.esc(it.name) + '" placeholder="نام ماده">' +
          '<input class="input num" data-k="percent" type="number" step="0.1" value="' + (it.percent || '') + '">' +
          '<input class="input num" data-k="pricePerKg" type="number" step="100" value="' + (it.pricePerKg || '') + '">' +
          '<input class="input num" data-k="protein" type="number" step="0.1" value="' + (it.protein || '') + '">' +
          '<button class="icon-btn sm" data-del-row="' + i + '">' + UI.icon('trash', 14) + '</button></div>';
      }).join('');
      calc();
    }

    function collect() {
      m.body.querySelectorAll('[data-row]').forEach(function (row) {
        var i = +row.dataset.row;
        row.querySelectorAll('[data-k]').forEach(function (inp) {
          var k = inp.dataset.k;
          items[i][k] = k === 'name' ? inp.value : S.num(inp.value);
        });
      });
    }

    function calc() {
      var cost = 0, prot = 0, pct = 0;
      items.forEach(function (it) {
        pct += S.num(it.percent);
        cost += S.num(it.percent) / 100 * S.num(it.pricePerKg);
        prot += S.num(it.percent) / 100 * S.num(it.protein);
      });
      var pctEl = m.body.querySelector('#fm-pct');
      pctEl.textContent = UI.n(pct, 1) + '٪';
      pctEl.style.color = Math.abs(pct - 100) > 0.5 ? '#DC2626' : '#059669';
      m.body.querySelector('#fm-cost').textContent = UI.money(cost);
      m.body.querySelector('#fm-prot').textContent = UI.n(prot, 1) + '٪';
    }

    m.body.addEventListener('input', function (e) {
      if (e.target.matches('[data-k]')) { collect(); calc(); }
    });
    m.body.addEventListener('click', function (e) {
      var del = e.target.closest('[data-del-row]');
      if (del) { items.splice(+del.dataset.delRow, 1); draw(); return; }
      if (e.target.closest('[data-add-row]')) {
        items.push({ name: '', percent: 0, pricePerKg: 0, protein: 0 }); draw();
      }
    });
    m.el.querySelector('[data-save]').addEventListener('click', function () {
      collect();
      var name = m.body.querySelector('#fm-name').value.trim();
      if (!name) { UI.toast('نام فرمول را وارد کنید', 'error'); return; }
      items = items.filter(function (it) { return it.name.trim(); });
      if (!items.length) { UI.toast('حداقل یک ماده اولیه لازم است', 'error'); return; }
      var data = { name: name, note: m.body.querySelector('#fm-note').value.trim(), items: items };
      if (id) S.update('formulas', id, data); else S.add('formulas', data);
      m.close();
      UI.toast('فرمول ذخیره شد');
      A.render();
    });

    draw();
  }

  /* ------------------------------ ثبت بچ ---------------------------------- */
  function batchForm(id, formulaId) {
    var editing = id ? S.find('batches', id) : null;
    var v = editing || { date: J.today(), formulaId: formulaId || (S.state.formulas[0] || {}).id, qtyKg: '', flockId: '', note: '', expensed: false };
    var m = UI.form({
      title: editing ? 'ویرایش بچ تولید' : 'ثبت بچ تولید خوراک',
      fields: [
        { name: 'date', label: 'تاریخ', type: 'date', required: true, col: 'half' },
        { name: 'formulaId', label: 'فرمول', type: 'select', required: true, col: 'half', options: S.state.formulas.map(function (f) { return { value: f.id, label: f.name }; }) },
        { name: 'qtyKg', label: 'مقدار تولید (کیلوگرم)', type: 'number', required: true, col: 'half' },
        { name: 'flockId', label: 'گله مصرف‌کننده', type: 'select', col: 'half', options: A.flockOptions() },
        { name: 'note', label: 'توضیح', type: 'text', col: 'full' },
        { name: 'expensed', label: 'به عنوان هزینه در دفتر ثبت شود', type: 'checkbox', col: 'full' }
      ],
      values: v,
      extraHtml: '<div class="hint" id="batch-cost" style="margin-top:8px"></div>',
      onSubmit: function (d) {
        var fm = S.find('formulas', d.formulaId);
        var cost = fm ? formulaCost(fm).cost * S.num(d.qtyKg) : 0;
        if (editing) S.update('batches', editing.id, d); else S.add('batches', d);
        if (!editing && d.expensed && cost > 0) {
          S.add('expenses', {
            date: d.date, category: 'mix', sub: fm ? fm.name : 'خوراک ساختگی',
            title: 'تولید ' + UI.n(d.qtyKg) + ' کیلو ' + (fm ? fm.name : 'خوراک'),
            amount: Math.round(cost), qty: d.qtyKg, unit: 'کیلوگرم',
            paidBy: 'fund', split: 'share', flockId: d.flockId, note: 'ثبت خودکار از بچ خوراک'
          });
        }
        UI.toast('بچ تولید ثبت شد');
        A.render();
      }
    });
    function upd() {
      var fm = S.find('formulas', m.body.querySelector('[name="formulaId"]').value);
      var qty = S.num(m.body.querySelector('[name="qtyKg"]').value);
      var c = fm ? formulaCost(fm).cost * qty : 0;
      m.body.querySelector('#batch-cost').innerHTML = 'هزینه تخمینی: <b>' + UI.money(c) + '</b>';
    }
    m.body.addEventListener('input', upd);
    m.body.addEventListener('change', upd);
    upd();
  }

})(window.App = window.App || {});
