/** تنظیمات، پشتیبان‌گیری و راهنما */
import { useRef, useState } from 'react';
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { PageHead, SectionHead } from '../components/ui';
import { actions, num, useApp } from '../data/store';
import { today } from '../lib/jalali';
import { download, n } from '../lib/format';

export function Settings() {
  const s = useApp();
  const ui = useUI();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    farmName: s.settings.farmName,
    owner: s.settings.owner || '',
    currency: s.settings.currency || 'تومان',
    cycleDays: s.settings.cycleDays || 120,
    targetWeightG: s.settings.targetWeightG || 12000,
    persianDigits: s.settings.persianDigits !== false,
  });

  const counts = [
    { k: 'گله‌ها', v: s.flocks.length },
    { k: 'رکورد روزانه', v: s.daily.length },
    { k: 'هزینه‌ها', v: s.expenses.length },
    { k: 'فروش', v: s.sales.length },
    { k: 'واکسیناسیون', v: s.vaccines.length },
    { k: 'فرمول خوراک', v: s.formulas.length },
    { k: 'شرکا', v: s.partners.length },
    { k: 'کارها', v: s.tasks.length },
  ];

  const guide = [
    ['🐣', 'مدیریت گله و دوره پرورش', 'تعریف گله، ثبت روزانه تلفات، دان، آب و وزن'],
    ['💸', '۱۹ دسته هزینه', 'آب، برق، گاز، گازوئیل، جوجه، پروار، گوشت، خوراک، دلالی، واکسن، کارگر، تلفات و ...'],
    ['🧪', 'فرمول خوراک ساختگی', 'ساخت دان با ذرت، سویا، روغن و محاسبه خودکار هزینه هر کیلو'],
    ['🤝', 'شراکت و تسویه', 'درصد سهام، آورده، تقسیم هزینه و پیشنهاد تسویه نهایی'],
    ['📊', 'گزارش و تحلیل', 'سود و زیان، هزینه هر کیلو، FCR، درصد تلفات، مقایسه گله‌ها'],
    ['📦', 'انبار و یادآور', 'کنترل موجودی دان و دارو، کارها و هشدارهای خودکار'],
  ];

  const save = () => {
    actions.setSettings({
      farmName: form.farmName.trim() || 'مزرعه بوقلمون',
      owner: form.owner.trim(),
      currency: form.currency.trim() || 'تومان',
      cycleDays: num(form.cycleDays) || 120,
      targetWeightG: num(form.targetWeightG) || 12000,
      persianDigits: form.persianDigits,
    });
    ui.toast('تنظیمات ذخیره شد');
  };

  const backup = () => {
    download(
      `turkey-farm-backup-${today().replace(/\//g, '-')}.json`,
      actions.exportJSON(),
      'application/json',
    );
    ui.toast('فایل پشتیبان دانلود شد');
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        actions.importJSON(String(reader.result));
        ui.toast('داده‌ها بازیابی شد');
      } catch (e) {
        ui.toast('فایل معتبر نیست: ' + (e as Error).message, 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <PageHead title="تنظیمات" sub="اطلاعات مزرعه، نمایش و پشتیبان‌گیری داده‌ها" />

      <div className="grid grid-2 mt">
        <div className="card">
          <SectionHead title="اطلاعات مزرعه" />
          <div className="form-grid">
            <div className="field full">
              <label className="lbl">نام مزرعه</label>
              <input
                className="input"
                value={form.farmName}
                onChange={(e) => setForm({ ...form, farmName: e.target.value })}
              />
            </div>
            <div className="field half">
              <label className="lbl">مدیر / مالک</label>
              <input
                className="input"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
              />
            </div>
            <div className="field half">
              <label className="lbl">واحد پول</label>
              <input
                className="input"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </div>
            <div className="field half">
              <label className="lbl">طول دوره پرورش (روز)</label>
              <input
                className="input num"
                type="number"
                value={form.cycleDays}
                onChange={(e) => setForm({ ...form, cycleDays: num(e.target.value) })}
              />
            </div>
            <div className="field half">
              <label className="lbl">وزن هدف (گرم)</label>
              <input
                className="input num"
                type="number"
                value={form.targetWeightG}
                onChange={(e) => setForm({ ...form, targetWeightG: num(e.target.value) })}
              />
            </div>
            <div className="field full">
              <label className="switch-row">
                <input
                  type="checkbox"
                  checked={form.persianDigits}
                  onChange={(e) => setForm({ ...form, persianDigits: e.target.checked })}
                />
                <span className="switch" />
                <span>نمایش اعداد به فارسی</span>
              </label>
              <div className="hint">تاریخ‌ها و مبالغ با ارقام فارسی نمایش داده می‌شوند.</div>
            </div>
          </div>
          <button className="btn primary block mt" onClick={save}>
            ذخیره تنظیمات
          </button>
        </div>

        <div className="card">
          <SectionHead title="پشتیبان‌گیری و بازیابی" sub="داده‌ها روی Supabase ذخیره می‌شوند" />
          <p className="hint" style={{ marginBottom: 12 }}>
            داده‌ها روی حساب Supabase شما ذخیره می‌شوند و در هر دستگاه دیگری هم در دسترس‌اند. برای
            نگهداری نسخه آفلاین، فایل JSON بگیرید.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn block" onClick={backup}>
              <Icon name="download" size={16} /> دریافت فایل پشتیبان (JSON)
            </button>
            <button className="btn block" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={16} /> بازیابی از فایل پشتیبان
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = '';
              }}
            />
            <button
              className="btn block"
              onClick={async () => {
                const ok = await ui.confirm('داده‌های فعلی با داده نمونه جایگزین شود؟', {
                  danger: true,
                  ok: 'بازنشانی',
                });
                if (!ok) return;
                actions.reset(true);
                ui.toast('داده نمونه بازنشانی شد');
              }}
            >
              <Icon name="flask" size={16} /> بازنشانی با داده نمونه
            </button>
            <button
              className="btn danger block"
              onClick={async () => {
                const ok = await ui.confirm('همه داده‌ها پاک شود؟ این عمل قابل بازگشت نیست.', {
                  danger: true,
                  ok: 'پاک کن',
                });
                if (!ok) return;
                actions.reset(false);
                ui.toast('همه داده‌ها پاک شد');
              }}
            >
              <Icon name="trash" size={16} /> پاک کردن همه داده‌ها
            </button>
          </div>
          <div className="hint" style={{ marginTop: 10 }}>
            آخرین ذخیره‌سازی: خودکار پس از هر تغییر
          </div>
        </div>
      </div>

      <div className="card mt">
        <SectionHead title="داده‌های ثبت‌شده" />
        <div className="grid grid-4" style={{ gap: 10 }}>
          {counts.map((c) => (
            <div
              className="kv"
              key={c.k}
              style={{ display: 'block', padding: 10, border: '1px solid var(--line)', borderRadius: 14 }}
            >
              <span style={{ fontSize: 11 }}>{c.k}</span>
              <br />
              <b style={{ fontSize: 16 }}>{n(c.v)}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt">
        <SectionHead title="راهنمای سریع" sub="قابلیت‌های سامانه" />
        <div className="grid grid-2" style={{ gap: 10 }}>
          {guide.map(([icon, title, desc]) => (
            <div
              key={title}
              style={{ display: 'flex', gap: 9, padding: 10, background: '#FAF8FE', borderRadius: 14 }}
            >
              <span style={{ fontSize: 17 }}>{icon}</span>
              <div>
                <b style={{ fontSize: 12 }}>{title}</b>
                <div className="hint">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
