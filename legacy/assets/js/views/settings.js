/* ==========================================================================
   views/settings.js — تنظیمات، پشتیبان‌گیری و راهنما
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.Store, UI = A.UI;

  A.Views.settings = {
    render: function (el) {
      var st = S.state.settings;
      var counts = [
        { k: 'گله‌ها', v: S.state.flocks.length },
        { k: 'رکورد روزانه', v: S.state.daily.length },
        { k: 'هزینه‌ها', v: S.state.expenses.length },
        { k: 'فروش', v: S.state.sales.length },
        { k: 'واکسیناسیون', v: S.state.vaccines.length },
        { k: 'فرمول خوراک', v: S.state.formulas.length },
        { k: 'شرکا', v: S.state.partners.length },
        { k: 'کارها', v: S.state.tasks.length }
      ];

      var html = UI.pageHead('تنظیمات', 'اطلاعات مزرعه، نمایش و پشتیبان‌گیری داده‌ها');

      html += '<div class="grid grid-2 mt">' +
        '<div class="card">' + UI.sectionHead('اطلاعات مزرعه') +
        '<div class="form-grid">' +
        '<div class="field full"><label class="lbl">نام مزرعه</label><input class="input" id="s-farm" value="' + UI.esc(st.farmName) + '"></div>' +
        '<div class="field half"><label class="lbl">مدیر / مالک</label><input class="input" id="s-owner" value="' + UI.esc(st.owner || '') + '"></div>' +
        '<div class="field half"><label class="lbl">واحد پول</label><input class="input" id="s-currency" value="' + UI.esc(st.currency || 'تومان') + '"></div>' +
        '<div class="field half"><label class="lbl">طول دوره پرورش (روز)</label><input class="input num" id="s-cycle" type="number" value="' + UI.esc(st.cycleDays || 120) + '"></div>' +
        '<div class="field half"><label class="lbl">وزن هدف (گرم)</label><input class="input num" id="s-target" type="number" value="' + UI.esc(st.targetWeightG || 12000) + '"></div>' +
        '<div class="field full"><label class="switch-row"><input type="checkbox" id="s-digits"' + (st.persianDigits !== false ? ' checked' : '') + '>' +
        '<span class="switch"></span><span>نمایش اعداد به فارسی</span></label>' +
        '<div class="hint">تاریخ‌ها و مبالغ با ارقام فارسی نمایش داده می‌شوند.</div></div>' +
        '</div>' +
        '<button class="btn primary block mt" data-act="save">ذخیره تنظیمات</button>' +
        '</div>' +

        '<div class="card">' + UI.sectionHead('پشتیبان‌گیری و بازیابی', 'داده‌ها روی همین دستگاه ذخیره می‌شوند') +
        '<p class="hint" style="margin-bottom:12px">برای انتقال اطلاعات به دستگاه دیگر یا نگهداری نسخه پشتیبان، فایل JSON دریافت کنید.</p>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
        '<button class="btn block" data-act="backup">' + UI.icon('download', 16) + ' دریافت فایل پشتیبان (JSON)</button>' +
        '<button class="btn block" data-act="restore">' + UI.icon('upload', 16) + ' بازیابی از فایل پشتیبان</button>' +
        '<input type="file" id="restore-file" accept=".json,application/json" style="display:none">' +
        '<button class="btn block" data-act="seed">' + UI.icon('flask', 16) + ' بازنشانی با داده نمونه</button>' +
        '<button class="btn danger block" data-act="clear">' + UI.icon('trash', 16) + ' پاک کردن همه داده‌ها</button>' +
        '</div>' +
        '<div class="hint" style="margin-top:10px">آخرین ذخیره‌سازی: خودکار پس از هر تغییر</div>' +
        '</div>' +
        '</div>';

      html += '<div class="card mt">' + UI.sectionHead('داده‌های ثبت‌شده') +
        '<div class="grid grid-4" style="gap:10px">' + counts.map(function (c) {
          return '<div class="kv" style="display:block;padding:10px;border:1px solid var(--line);border-radius:14px">' +
            '<span style="font-size:11px">' + c.k + '</span><br><b style="font-size:16px">' + UI.n(c.v) + '</b></div>';
        }).join('') + '</div></div>';

      html += '<div class="card mt">' + UI.sectionHead('راهنمای سریع', 'قابلیت‌های سامانه') +
        '<div class="grid grid-2" style="gap:10px">' + [
          ['🐣', 'مدیریت گله و دوره پرورش', 'تعریف گله، ثبت روزانه تلفات، دان، آب و وزن'],
          ['💸', '۱۹ دسته هزینه', 'آب، برق، گاز، گازوئیل، جوجه، پروار، گوشت، خوراک، دلالی، واکسن، کارگر، تلفات و ...'],
          ['🧪', 'فرمول خوراک ساختگی', 'ساخت دان با ذرت، سویا، روغن و محاسبه خودکار هزینه هر کیلو'],
          ['🤝', 'شراکت و تسویه', 'درصد سهام، آورده، تقسیم هزینه و پیشنهاد تسویه نهایی'],
          ['📊', 'گزارش و تحلیل', 'سود و زیان، هزینه هر کیلو، FCR، درصد تلفات، مقایسه گله‌ها'],
          ['📦', 'انبار و یادآور', 'کنترل موجودی دان و دارو، کارها و هشدارهای خودکار']
        ].map(function (x) {
          return '<div style="display:flex;gap:9px;padding:10px;background:#FAF8FE;border-radius:14px">' +
            '<span style="font-size:17px">' + x[0] + '</span><div><b style="font-size:12px">' + x[1] + '</b>' +
            '<div class="hint">' + x[2] + '</div></div></div>';
        }).join('') + '</div></div>';

      el.innerHTML = html;

      el.addEventListener('click', function (e) {
        var t = e.target;
        if (t.closest('[data-act="save"]')) {
          S.state.settings.farmName = el.querySelector('#s-farm').value.trim() || 'مزرعه بوقلمون';
          S.state.settings.owner = el.querySelector('#s-owner').value.trim();
          S.state.settings.currency = el.querySelector('#s-currency').value.trim() || 'تومان';
          S.state.settings.cycleDays = S.num(el.querySelector('#s-cycle').value) || 120;
          S.state.settings.targetWeightG = S.num(el.querySelector('#s-target').value) || 12000;
          S.state.settings.persianDigits = el.querySelector('#s-digits').checked;
          S.save(); A.refreshDigits();
          UI.toast('تنظیمات ذخیره شد'); A.render();
          return;
        }
        if (t.closest('[data-act="backup"]')) {
          UI.download('turkey-farm-backup-' + J.today().replace(/\//g, '-') + '.json', S.export(), 'application/json');
          UI.toast('فایل پشتیبان دانلود شد');
          return;
        }
        if (t.closest('[data-act="restore"]')) {
          el.querySelector('#restore-file').click();
          return;
        }
        if (t.closest('[data-act="seed"]')) {
          UI.confirm('داده‌های فعلی با داده نمونه جایگزین شود؟', { danger: true, ok: 'بازنشانی' }).then(function (ok) {
            if (!ok) return;
            S.reset(true); A.refreshDigits(); UI.toast('داده نمونه بازنشانی شد'); A.render();
          });
          return;
        }
        if (t.closest('[data-act="clear"]')) {
          UI.confirm('همه داده‌ها پاک شود؟ این عمل قابل بازگشت نیست.', { danger: true, ok: 'پاک کن' }).then(function (ok) {
            if (!ok) return;
            S.reset(false); A.refreshDigits(); UI.toast('همه داده‌ها پاک شد'); A.render();
          });
        }
      });

      var file = el.querySelector('#restore-file');
      file.addEventListener('change', function () {
        var f = file.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            S.import(reader.result);
            A.refreshDigits();
            UI.toast('داده‌ها بازیابی شد');
            A.render();
          } catch (err) {
            UI.toast('فایل معتبر نیست: ' + err.message, 'error');
          }
        };
        reader.readAsText(f);
      });
    }
  };

})(window.App = window.App || {});
