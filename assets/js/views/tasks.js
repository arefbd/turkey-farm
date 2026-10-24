/* ==========================================================================
   views/tasks.js — کارها، یادآورها و تقویم عملیات
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.Store, UI = A.UI;

  A.Views.tasks = {
    render: function (el) {
      var today = J.today();
      var all = S.state.tasks.slice().sort(function (a, b) { return J.jdn(a.date) - J.jdn(b.date); });
      var overdue = all.filter(function (t) { return !t.done && J.jdn(t.date) < J.jdn(today); });
      var todays = all.filter(function (t) { return !t.done && t.date === today; });
      var upcoming = all.filter(function (t) { return !t.done && J.jdn(t.date) > J.jdn(today); });
      var done = all.filter(function (t) { return t.done; }).reverse();

      var html = UI.pageHead('کارها و یادآورها', 'برنامه عملیات روزانه مزرعه را از دست ندهید',
        '<button class="btn primary" data-act="new">' + UI.icon('plus', 16) + ' کار جدید</button>');

      html += '<div class="stats">' +
        UI.stat({ icon: '⏰', label: 'عقب‌افتاده', value: UI.n(overdue.length), sub: 'نیازمند رسیدگی' }) +
        UI.stat({ icon: '📅', label: 'امروز', value: UI.n(todays.length), sub: J.format(today, 'long') }) +
        UI.stat({ icon: '🔜', label: 'پیش‌رو', value: UI.n(upcoming.length), sub: 'برنامه آینده' }) +
        UI.stat({ icon: '✅', label: 'انجام‌شده', value: UI.n(done.length), sub: 'کل دوره' }) +
        '</div>';

      function group(title, items, tone, emptyText) {
        if (!items.length && !emptyText) return '';
        return '<div class="card mt">' + UI.sectionHead(title, UI.n(items.length) + ' مورد') +
          (items.length ? '<div class="rows">' + items.map(row).join('') + '</div>'
            : '<div class="hint" style="padding:8px 2px">' + emptyText + '</div>') + '</div>';
      }

      function row(t) {
        var flock = t.flockId ? S.flockLabel(t.flockId) : '';
        var late = !t.done && J.jdn(t.date) < J.jdn(today);
        return '<div class="row">' +
          '<button class="row-ic" data-toggle="' + t.id + '" style="background:' + (t.done ? '#ECFDF5' : '#F4EEFF') +
          ';color:' + (t.done ? '#059669' : '#6D28D9') + ';border:0">' + UI.icon(t.done ? 'check' : 'bell', 17) + '</button>' +
          '<div class="row-main"><div class="row-title" style="' + (t.done ? 'text-decoration:line-through;opacity:.6' : '') + '">' +
          UI.esc(t.title) + '</div>' +
          '<div class="row-sub">' + J.format(t.date, 'long') + (late ? ' · <span style="color:#DC2626">عقب‌افتاده</span>' : '') +
          (flock ? ' · ' + UI.esc(flock) : '') + (t.note ? ' · ' + UI.esc(t.note) : '') + '</div></div>' +
          '<div class="row-side"><span class="badge ' + (t.done ? 'green' : late ? 'red' : 'gray') + '">' +
          (t.done ? 'انجام شد' : UI.esc(t.type || 'عمومی')) + '</span></div>' +
          '<div class="row-acts">' +
          '<button class="icon-btn sm" data-edit="' + t.id + '">' + UI.icon('edit', 15) + '</button>' +
          '<button class="icon-btn sm" data-del="' + t.id + '">' + UI.icon('trash', 15) + '</button>' +
          '</div></div>';
      }

      html += group('عقب‌افتاده', overdue, 'red', 'همه کارها به‌موقع انجام شده‌اند.');
      html += group('امروز', todays, 'brand', 'برای امروز کاری ثبت نشده است.');
      html += group('پیش‌رو', upcoming, 'brand', '');
      html += group('انجام‌شده', done.slice(0, 12), 'green', '');

      el.innerHTML = html;

      el.addEventListener('click', function (e) {
        var t = e.target;
        if (t.closest('[data-act="new"]')) return A.Forms.task();
        var tg = t.closest('[data-toggle]');
        if (tg) {
          var o = S.find('tasks', tg.dataset.toggle);
          S.update('tasks', o.id, { done: !o.done });
          A.render(); return;
        }
        var ed = t.closest('[data-edit]'); if (ed) return A.Forms.task(ed.dataset.edit);
        var dl = t.closest('[data-del]');
        if (dl) {
          UI.confirm('این کار حذف شود؟', { danger: true, ok: 'حذف' }).then(function (ok) {
            if (ok) { S.remove('tasks', dl.dataset.del); A.render(); }
          });
        }
      });
    }
  };

})(window.App = window.App || {});
