/* ==========================================================================
   ui.js — کامپوننت‌ها و ابزارهای رابط کاربری
   ========================================================================== */
(function (A) {
  'use strict';
  var UI = A.UI = {};
  var S = A.Store;

  /* --------------------------------- آیکن‌ها -------------------------------- */
  var ICONS = {
    home: '<path d="M3 10.6 12 3l9 7.6V20a1 1 0 0 1-1 1h-5v-6.5H9V21H4a1 1 0 0 1-1-1z"/>',
    egg: '<path d="M12 3c3.6 0 6.2 4.6 6.2 9.2A6.2 6.2 0 0 1 12 21a6.2 6.2 0 0 1-6.2-8.8C5.8 7.6 8.4 3 12 3z"/><path d="M9.4 15.4c.5 1.2 1.5 1.9 2.8 1.9"/>',
    wallet: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5z"/><path d="M3 9h17"/><circle cx="16.5" cy="13.5" r="1.2"/>',
    feed: '<path d="M7 8h10l1.2 12H5.8z"/><path d="M9.2 8V5.5A2.5 2.5 0 0 1 11.7 3h.6A2.5 2.5 0 0 1 14.8 5.5V8"/><path d="M9.5 12.5h5M9.8 16h4.4"/>',
    tag: '<path d="M20.5 12.5 12.6 20.4a1.5 1.5 0 0 1-2.1 0l-7-7a1.5 1.5 0 0 1-.4-1.1l.5-7a1.5 1.5 0 0 1 1.4-1.4l7-.5a1.5 1.5 0 0 1 1.1.4l7 7a1.5 1.5 0 0 1 0 2.1z"/><circle cx="8" cy="8" r="1.4"/>',
    users: '<path d="M15.5 20v-1.8a3.7 3.7 0 0 0-3.7-3.7H6.2A3.7 3.7 0 0 0 2.5 18v2"/><circle cx="9" cy="7.5" r="3.6"/><path d="M21.5 20v-1.8a3.7 3.7 0 0 0-2.8-3.6"/><path d="M16.4 4a3.6 3.6 0 0 1 0 7"/>',
    chart: '<path d="M3 20h18"/><rect x="4.5" y="11" width="3.4" height="6.4" rx="1"/><rect x="10.3" y="5" width="3.4" height="12.4" rx="1"/><rect x="16.1" y="8.5" width="3.4" height="8.9" rx="1"/>',
    check: '<path d="M9 12.2 11.6 15 20 5.5"/><path d="M20 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',
    box: '<path d="M20.5 8.2 12 3.2 3.5 8.2v7.6L12 20.8l8.5-5z"/><path d="M3.5 8.2 12 13.2l8.5-5M12 13.2v7.6"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/><path d="M5.5 6 6.6 20a1.6 1.6 0 0 0 1.6 1.4h7.6A1.6 1.6 0 0 0 17.4 20L18.5 6"/><path d="M10 11v6M14 11v6"/>',
    chevron: '<path d="M15 6l-6 6 6 6"/>',
    chevronLeft: '<path d="M9 6l6 6-6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
    download: '<path d="M12 3v12"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M4 20h16"/>',
    upload: '<path d="M12 16V4"/><path d="M7.5 8.5 12 4l4.5 4.5"/><path d="M4 20h16"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    bell: '<path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5z"/><path d="M10.3 19a2 2 0 0 0 3.4 0"/>',
    up: '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    print: '<path d="M6.5 8V3h11v5"/><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M6.5 16h11v5h-11z"/>',
    dots: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
    scale: '<path d="M12 3v18"/><path d="M6 21h12"/><path d="M4 8h16"/><path d="M7 8l-3 6h6z"/><path d="M17 8l-3 6h6z"/>',
    drop: '<path d="M12 3s6 6.4 6 10.4A6 6 0 0 1 6 13.4C6 9.4 12 3 12 3z"/>',
    flask: '<path d="M9 3h6"/><path d="M10 3v6L5.5 18a2 2 0 0 0 1.7 3h9.6a2 2 0 0 0 1.7-3L14 9V3"/><path d="M7.5 14h9"/>',
    truck: '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
    money: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>',
    alert: '<path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5M12 17h.01"/>'
  };

  UI.icon = function (name, size) {
    var p = ICONS[name] || ICONS.dots;
    var s = size || 20;
    return '<svg class="ic" viewBox="0 0 24 24" width="' + s + '" height="' + s +
      '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  };

  /* -------------------------------- قالب‌بندی ------------------------------- */
  UI.n = function (v, dec) {
    var n = typeof v === 'number' ? v : S.num(v);
    var s = n.toLocaleString('en-US', {
      maximumFractionDigits: dec == null ? 0 : dec,
      minimumFractionDigits: 0
    });
    return J.faDigits ? J.toFa(s) : s;
  };

  UI.money = function (v) {
    return UI.n(v) + ' ' + (S.state.settings.currency || 'تومان');
  };

  UI.short = function (v) {
    var n = Math.abs(v), sign = v < 0 ? '−' : '';
    var out;
    if (n >= 1e9) out = (n / 1e9).toFixed(1).replace(/\.0$/, '') + ' میلیارد';
    else if (n >= 1e6) out = (n / 1e6).toFixed(1).replace(/\.0$/, '') + ' میلیون';
    else if (n >= 1e3) out = (n / 1e3).toFixed(0) + ' هزار';
    else out = String(Math.round(n));
    return sign + (J.faDigits ? J.toFa(out) : out);
  };

  UI.pct = function (v, dec) {
    return UI.n(v, dec == null ? 1 : dec) + '٪';
  };

  UI.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  UI.date = function (d, style) { return J.format(d, style || 'short'); };

  /* --------------------------------- توست ---------------------------------- */
  UI.toast = function (msg, type) {
    var root = document.getElementById('toast-root');
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'ok');
    el.innerHTML = '<span class="toast-dot"></span><span>' + UI.esc(msg) + '</span>';
    root.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('in'); });
    setTimeout(function () {
      el.classList.remove('in');
      setTimeout(function () { el.remove(); }, 250);
    }, 2600);
  };

  /* --------------------------------- مودال --------------------------------- */
  UI.modal = function (opts) {
    var root = document.getElementById('modal-root');
    var wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML =
      '<div class="modal ' + (opts.size || '') + '" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><h3>' + UI.esc(opts.title || '') + '</h3>' +
      '<button class="icon-btn" data-close aria-label="بستن">' + UI.icon('close', 18) + '</button></div>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      (opts.footer ? '<div class="modal-foot">' + opts.footer + '</div>' : '') +
      '</div>';
    root.appendChild(wrap);
    document.body.classList.add('no-scroll');
    requestAnimationFrame(function () { wrap.classList.add('open'); });

    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      wrap.classList.remove('open');
      document.body.classList.remove('no-scroll');
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { wrap.remove(); }, 200);
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('[data-close]')) close();
    });

    UI.moneyInputs(wrap);
    UI.dateInputs(wrap);
    return { el: wrap, body: wrap.querySelector('.modal-body'), close: close };
  };

  UI.moneyInputs = function (scope) {
    scope.querySelectorAll('[data-money]').forEach(function (inp) {
      if (inp.dataset.ready) return;
      inp.dataset.ready = '1';
      inp.addEventListener('focus', function () {
        inp.value = J.toEn(inp.value).replace(/[^\d]/g, '');
      });
      inp.addEventListener('blur', function () {
        var v = S.num(inp.value);
        inp.value = v ? v.toLocaleString('en-US') : '';
      });
    });
  };

  UI.dateInputs = function (scope) {
    scope.querySelectorAll('[data-date]').forEach(function (inp) {
      if (inp.dataset.ready) return;
      inp.dataset.ready = '1';
      inp.addEventListener('blur', function () {
        var n = J.norm(inp.value);
        if (n) inp.value = J.faDigits ? J.toFa(n) : n;
      });
    });
  };

  /* ------------------------------- فرم ساز -------------------------------- */
  UI.field = function (f, values) {
    var v = values && values[f.name] != null ? values[f.name] : (f.value != null ? f.value : '');
    var col = f.col === 'half' ? 'half' : (f.col === 'third' ? 'third' : 'full');
    var label = '<label class="lbl" for="fld-' + f.name + '">' + UI.esc(f.label) +
      (f.required ? ' <span class="req">*</span>' : '') + '</label>';
    var hint = f.hint ? '<div class="hint">' + f.hint + '</div>' : '';
    var input = '';

    if (f.type === 'select') {
      input = '<select class="input" id="fld-' + f.name + '" name="' + f.name + '">' +
        (f.placeholder ? '<option value="">' + UI.esc(f.placeholder) + '</option>' : '') +
        (f.options || []).map(function (o) {
          var ov = typeof o === 'object' ? o.value : o;
          var ol = typeof o === 'object' ? o.label : o;
          return '<option value="' + UI.esc(ov) + '"' + (String(v) === String(ov) ? ' selected' : '') + '>' + UI.esc(ol) + '</option>';
        }).join('') + '</select>';
    } else if (f.type === 'textarea') {
      input = '<textarea class="input" id="fld-' + f.name + '" name="' + f.name + '" rows="2" placeholder="' +
        UI.esc(f.placeholder || '') + '">' + UI.esc(v) + '</textarea>';
    } else if (f.type === 'checkbox') {
      return '<div class="field ' + col + '"><label class="switch-row"><input type="checkbox" name="' + f.name + '"' +
        (v ? ' checked' : '') + '><span class="switch"></span><span>' + UI.esc(f.label) + '</span></label>' + hint + '</div>';
    } else if (f.type === 'money') {
      var mv = S.num(v);
      input = '<input class="input num" id="fld-' + f.name + '" name="' + f.name + '" data-money inputmode="numeric" ' +
        'value="' + (mv ? mv.toLocaleString('en-US') : '') + '" placeholder="' + UI.esc(f.placeholder || '۰') + '">';
    } else if (f.type === 'date') {
      var dv = v ? J.norm(v) : '';
      input = '<div class="date-wrap"><input class="input num" id="fld-' + f.name + '" name="' + f.name + '" data-date ' +
        'inputmode="numeric" value="' + (dv ? (J.faDigits ? J.toFa(dv) : dv) : '') + '" placeholder="۱۴۰۵/۰۸/۰۲">' +
        '<button type="button" class="date-now" data-today>امروز</button></div>';
    } else if (f.type === 'number') {
      input = '<input class="input num" id="fld-' + f.name + '" name="' + f.name + '" type="number" step="' +
        (f.step || 'any') + '" value="' + UI.esc(v) + '" placeholder="' + UI.esc(f.placeholder || '') + '">';
    } else if (f.type === 'custom') {
      return '<div class="field ' + col + '">' + (f.label ? label : '') + (f.html || '') + hint + '</div>';
    } else {
      input = '<input class="input" id="fld-' + f.name + '" name="' + f.name + '" type="text" value="' +
        UI.esc(v) + '" placeholder="' + UI.esc(f.placeholder || '') + '">';
    }
    return '<div class="field ' + col + '">' + label + input + hint + '</div>';
  };

  UI.fields = function (fields, values) {
    return '<form class="form-grid" autocomplete="off" onsubmit="return false">' +
      fields.map(function (f) { return UI.field(f, values); }).join('') + '</form>';
  };

  UI.readForm = function (scope, fields) {
    var out = {};
    fields.forEach(function (f) {
      if (f.type === 'custom' || f.type === 'html') return;
      var el = scope.querySelector('[name="' + f.name + '"]');
      if (!el) return;
      if (f.type === 'checkbox') out[f.name] = el.checked;
      else if (f.type === 'money' || f.type === 'number') out[f.name] = S.num(el.value);
      else if (f.type === 'date') out[f.name] = J.norm(el.value);
      else out[f.name] = el.value.trim();
    });
    return out;
  };

  UI.form = function (opts) {
    var body = UI.fields(opts.fields, opts.values || {}) + (opts.extraHtml || '');
    var m = UI.modal({
      title: opts.title, size: opts.size || '', body: body,
      footer: '<button class="btn ghost" data-close>انصراف</button>' +
        '<button class="btn primary" data-submit>' + (opts.submitText || 'ذخیره') + '</button>'
    });
    m.body.querySelectorAll('[data-today]').forEach(function (b) {
      b.addEventListener('click', function () {
        var inp = b.parentNode.querySelector('input');
        inp.value = J.faDigits ? J.toFa(J.today()) : J.today();
      });
    });
    m.el.querySelector('[data-submit]').addEventListener('click', function () {
      var data = UI.readForm(m.body, opts.fields);
      for (var i = 0; i < opts.fields.length; i++) {
        var f = opts.fields[i];
        if (f.required && (data[f.name] === '' || data[f.name] == null || (f.type === 'money' && !data[f.name]))) {
          UI.toast('فیلد «' + f.label + '» الزامی است', 'error');
          var el = m.body.querySelector('[name="' + f.name + '"]');
          if (el) { el.focus(); el.classList.add('err'); setTimeout(function () { el.classList.remove('err'); }, 1600); }
          return;
        }
        if (f.type === 'date' && data[f.name] === '') {
          UI.toast('تاریخ «' + f.label + '» معتبر نیست', 'error'); return;
        }
      }
      if (opts.onSubmit) {
        var r = opts.onSubmit(data, m);
        if (r === false) return;
      }
      m.close();
    });
    return m;
  };

  /* ------------------------------- تاییدیه --------------------------------- */
  UI.confirm = function (msg, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var m = UI.modal({
        title: opts.title || 'تایید عملیات',
        body: '<p class="confirm-text">' + msg + '</p>',
        footer: '<button class="btn ghost" data-close>انصراف</button>' +
          '<button class="btn ' + (opts.danger ? 'danger' : 'primary') + '" data-ok>' + (opts.ok || 'تایید') + '</button>',
        onClose: function () { resolve(false); }
      });
      m.el.querySelector('[data-ok]').addEventListener('click', function () {
        resolve(true);
        m.close();
      });
    });
  };

  /* -------------------------------- شیت پایین ------------------------------ */
  UI.sheet = function (opts) {
    var body = '<div class="sheet-list">' + opts.items.map(function (it) {
      return '<button class="sheet-item" data-act="' + it.act + '"><span class="sheet-ic" style="background:' +
        (it.color || '#EEE7FB') + '">' + (it.icon || '') + '</span><span>' + it.label + '</span></button>';
    }).join('') + '</div>';
    var m = UI.modal({ title: opts.title, body: body, size: 'sheet-modal' });
    m.body.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (b) { m.close(); if (opts.onPick) opts.onPick(b.dataset.act); }
    });
    return m;
  };

  /* -------------------------------- اجزای صفحه ----------------------------- */
  UI.empty = function (title, text, action) {
    return '<div class="empty"><div class="empty-ic">' + UI.icon('box', 30) + '</div>' +
      '<h4>' + UI.esc(title) + '</h4><p>' + UI.esc(text || '') + '</p>' + (action || '') + '</div>';
  };

  UI.sectionHead = function (title, sub, action) {
    return '<div class="sec-head"><div><h3>' + title + '</h3>' +
      (sub ? '<span class="sec-sub">' + sub + '</span>' : '') + '</div>' + (action || '') + '</div>';
  };

  UI.bar = function (pct, color) {
    return '<div class="bar"><span style="width:' + Math.max(0, Math.min(100, pct)) + '%;background:' +
      (color || 'var(--brand)') + '"></span></div>';
  };

  UI.avatar = function (name, color, size) {
    var ch = (name || '؟').trim().charAt(0);
    return '<span class="avatar" style="background:' + (color || '#7C3AED') + ';width:' + (size || 40) +
      'px;height:' + (size || 40) + 'px;font-size:' + ((size || 40) * 0.42) + 'px">' + UI.esc(ch) + '</span>';
  };

  UI.stat = function (o) {
    return '<div class="stat ' + (o.tone || '') + '">' +
      '<div class="stat-top"><span class="stat-ic">' + (o.icon || '') + '</span>' +
      (o.delta ? '<span class="stat-delta ' + (o.delta > 0 ? 'up' : 'down') + '">' + (o.delta > 0 ? '▲' : '▼') + ' ' + UI.pct(Math.abs(o.delta), 1) + '</span>' : '') +
      '</div>' +
      '<div class="stat-label">' + o.label + '</div>' +
      '<div class="stat-value">' + o.value + (o.unit ? ' <small>' + o.unit + '</small>' : '') + '</div>' +
      (o.sub ? '<div class="stat-sub">' + o.sub + '</div>' : '') +
      '</div>';
  };

  /* تیتر صفحه */
  UI.pageHead = function (title, sub, actions) {
    return '<div class="page-head"><div><h1>' + title + '</h1>' +
      (sub ? '<p>' + sub + '</p>' : '') + '</div>' +
      (actions ? '<div class="page-actions">' + actions + '</div>' : '') + '</div>';
  };

  /* دکمه‌های فیلتر */
  UI.chips = function (items, active, attr) {
    return '<div class="chips">' + items.map(function (it) {
      return '<button class="chip' + (String(active) === String(it.value) ? ' active' : '') +
        '" data-' + (attr || 'chip') + '="' + UI.esc(it.value) + '">' + UI.esc(it.label) + '</button>';
    }).join('') + '</div>';
  };

  /* CSV */
  UI.download = function (filename, content, mime) {
    var blob = new Blob(['\ufeff' + content], { type: mime || 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
  };

  UI.csv = function (rows) {
    return rows.map(function (r) {
      return r.map(function (c) {
        var s = String(c == null ? '' : c).replace(/"/g, '""');
        return '"' + s + '"';
      }).join(',');
    }).join('\r\n');
  };

})(window.App = window.App || {});
