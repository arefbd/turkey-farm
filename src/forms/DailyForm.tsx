/**
 * فرم هوشمند ثبت روزانه گله (فاز ۳) — تلفات، دان، آب، نسبت آب به دان، اقلیم و کسر خودکار از انبار
 */
import { useMemo, useState } from 'react';
import { Modal, useUI } from '../components/Modal';
import { actions, flockById, flockStats, num, useApp } from '../data/store';
import { diff, today } from '../lib/jalali';
import { n } from '../lib/format';
import type { DailyRecord } from '../data/types';

export function DailyForm({
  id,
  flockId: presetFlockId,
  onClose,
}: {
  id?: string;
  flockId?: string;
  onClose: () => void;
}) {
  const s = useApp();
  const { toast } = useUI();
  const editing = id ? s.daily.find((d) => d.id === id) : null;

  const defaultFlockId =
    presetFlockId ||
    editing?.flockId ||
    s.flocks.find((f) => f.status !== 'closed')?.id ||
    s.flocks[0]?.id ||
    '';

  const [flockId, setFlockId] = useState(defaultFlockId);
  const [date, setDate] = useState(editing?.date || today());
  const [mortality, setMortality] = useState(editing?.mortality ? String(editing.mortality) : '0');
  const [culled, setCulled] = useState(editing?.culled ? String(editing.culled) : '0');
  const [feedKg, setFeedKg] = useState(editing?.feedKg ? String(editing.feedKg) : '');
  const [waterL, setWaterL] = useState(editing?.waterL ? String(editing.waterL) : '');
  const [avgWeightG, setAvgWeightG] = useState(editing?.avgWeightG ? String(editing.avgWeightG) : '');
  const [tempC, setTempC] = useState(editing?.tempC ? String(editing.tempC) : '24');
  const [tempMinC, setTempMinC] = useState(editing?.tempMinC ? String(editing.tempMinC) : '');
  const [tempMaxC, setTempMaxC] = useState(editing?.tempMaxC ? String(editing.tempMaxC) : '');
  const [humidityPct, setHumidityPct] = useState(editing?.humidityPct ? String(editing.humidityPct) : '60');
  const [lightHours, setLightHours] = useState(editing?.lightHours ? String(editing.lightHours) : '18');
  const [treatment, setTreatment] = useState(editing?.treatment || '');
  const [note, setNote] = useState(editing?.note || '');

  // تنظیمات اتصال به انبار خوراک
  const [feedDeducted, setFeedDeducted] = useState(editing?.feedDeducted !== false);
  const [feedWarehouseId, setFeedWarehouseId] = useState(editing?.feedWarehouseId || '');
  const [feedItemId, setFeedItemId] = useState(editing?.feedItemId || '');

  const flock = flockById(s, flockId);
  const st = flock ? flockStats(s, flock.id) : null;

  // محاسبه خودکار سن روزانه
  const currentAge = useMemo(() => {
    if (!flock) return 0;
    return Math.max(0, diff(flock.startDate, date)) + num(flock.chickAge);
  }, [flock, date]);

  // اقلام دان و خوراک موجود در انبار
  const feedItems = useMemo(() => {
    return s.inventory.filter((i) => {
      const cat = (i.cat || '').trim();
      const name = (i.name || '').trim();
      return (
        cat.includes('دان') ||
        cat.includes('خوراک') ||
        name.includes('دان') ||
        name.includes('پلت') ||
        name.includes('استارتر') ||
        name.includes('فینیشر')
      );
    });
  }, [s.inventory]);

  // انتخاب پیش‌فرض قلم دان در صورت خالی بودن
  const selectedFeedItem = s.inventory.find((i) => i.id === feedItemId);

  // شاخص‌های لحظه‌ای
  const fKg = num(feedKg);
  const wL = num(waterL);
  const aliveCount = st ? st.alive : 0;
  const waterFeedRatio = fKg > 0 ? (wL / fKg).toFixed(2) : null;
  const feedPerBirdG = aliveCount > 0 && fKg > 0 ? Math.round((fKg * 1000) / aliveCount) : null;
  const dailyMortPct = aliveCount > 0 ? (((num(mortality) + num(culled)) / aliveCount) * 100).toFixed(2) : null;

  const save = () => {
    if (!flockId) {
      toast('انتخاب گله الزامی است', 'error');
      return;
    }

    const payload: Omit<DailyRecord, 'id' | 'createdAt'> & { id?: string } = {
      id: editing?.id,
      flockId,
      date,
      age: currentAge,
      mortality: num(mortality),
      culled: num(culled),
      feedKg: num(feedKg),
      waterL: num(waterL),
      avgWeightG: num(avgWeightG),
      tempC: num(tempC),
      tempMinC: tempMinC !== '' ? num(tempMinC) : undefined,
      tempMaxC: tempMaxC !== '' ? num(tempMaxC) : undefined,
      humidityPct: humidityPct !== '' ? num(humidityPct) : undefined,
      lightHours: lightHours !== '' ? num(lightHours) : undefined,
      feedDeducted: feedDeducted && !!feedItemId && num(feedKg) > 0,
      feedWarehouseId: feedWarehouseId || undefined,
      feedItemId: feedItemId || undefined,
      feedItemName: selectedFeedItem?.name,
      treatment: treatment.trim(),
      note: note.trim(),
    };

    actions.saveDailyRecord(payload);
    toast(
      editing
        ? 'گزارش روزانه گله با موفقیت ویرایش شد'
        : 'گزارش روزانه ثبت شد' + (payload.feedDeducted ? ' و دان مصرفی از انبار کسر گردید' : ''),
    );
    onClose();
  };

  return (
    <Modal
      title={editing ? `ویرایش ثبت روزانه — ${flock?.name || ''}` : 'ثبت روزانه عملیات و پرورش گله'}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" type="button" onClick={onClose}>
            انصراف
          </button>
          <button className="btn primary" type="button" onClick={save}>
            ذخیره گزارش روزانه
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field half">
          <label className="lbl">گله پرورشی *</label>
          <select className="input" value={flockId} onChange={(e) => setFlockId(e.target.value)}>
            {s.flocks.map((f) => {
              const fSt = flockStats(s, f.id);
              const aliveText = fSt ? ` (موجودی: ${n(fSt.alive)} قطعه)` : '';
              return (
                <option key={f.id} value={f.id}>
                  {f.name} — {f.hall || 'سالن عمومی'} {aliveText}
                </option>
              );
            })}
          </select>
        </div>

        <div className="field half">
          <label className="lbl">تاریخ ثبت</label>
          <input className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* نوار اطلاعات گله در این روز */}
        {flock && (
          <div
            className="field full"
            style={{
              background: 'var(--surface-sunken)',
              padding: '10px 14px',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div style={{ fontSize: '0.85rem' }}>
              سن محاسبه‌شده: <b style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>{n(currentAge)} روزگی</b>
              {flock.hall ? ` · مستقر در ${flock.hall}` : ''}
            </div>
            {st && (
              <div style={{ fontSize: '0.85rem' }}>
                موجودی زنده فعلی: <b>{n(st.alive)} قطعه</b>
              </div>
            )}
          </div>
        )}

        <div className="field third">
          <label className="lbl">تلفات امروز (قطعه)</label>
          <input
            className="input"
            type="number"
            value={mortality}
            onChange={(e) => setMortality(e.target.value)}
            style={{ color: num(mortality) > 0 ? '#DC2626' : undefined, fontWeight: 700 }}
          />
        </div>
        <div className="field third">
          <label className="lbl">حذفی / وازدگی (قطعه)</label>
          <input
            className="input"
            type="number"
            value={culled}
            onChange={(e) => setCulled(e.target.value)}
          />
        </div>
        <div className="field third">
          <label className="lbl">درصد تلفات امروز</label>
          <div
            style={{
              padding: '9px 12px',
              background: '#F9FAFB',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: '0.9rem',
              color: num(dailyMortPct) > 0.5 ? '#DC2626' : '#059669',
              fontWeight: 700,
            }}
          >
            {dailyMortPct ? `${n(dailyMortPct)}٪` : '۰٪'}
          </div>
        </div>

        <div className="field half">
          <label className="lbl">مصرف دان امروز (کیلوگرم)</label>
          <input
            className="input"
            type="number"
            value={feedKg}
            onChange={(e) => setFeedKg(e.target.value)}
            placeholder="مثلاً ۶۵۰"
          />
        </div>
        <div className="field half">
          <label className="lbl">مصرف آب امروز (لیتر)</label>
          <input
            className="input"
            type="number"
            value={waterL}
            onChange={(e) => setWaterL(e.target.value)}
            placeholder="مثلاً ۱۵۰۰"
          />
        </div>

        {/* شاخص‌های زنده مصرف آب و دان */}
        {(waterFeedRatio || feedPerBirdG) && (
          <div
            className="field full"
            style={{
              background: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: 8,
              padding: '8px 12px',
              display: 'flex',
              gap: 20,
              fontSize: '0.85rem',
            }}
          >
            {waterFeedRatio && (
              <div>
                نسبت آب به دان: <b>{n(waterFeedRatio)} لیتر/کیلو</b>
                {num(waterFeedRatio) > 3.0 ? (
                  <span style={{ color: '#D97706', marginRight: 6 }}>⚠️ مصرف آب بالاست (احتمال گرمازدگی یا نشتی)</span>
                ) : num(waterFeedRatio) < 1.5 ? (
                  <span style={{ color: '#DC2626', marginRight: 6 }}>⚠️ مصرف آب پایین است (کنترل نیپل‌ها)</span>
                ) : (
                  <span style={{ color: '#059669', marginRight: 6 }}>✅ نرمال</span>
                )}
              </div>
            )}
            {feedPerBirdG && (
              <div>
                مصرف روزانه هر پرنده: <b>{n(feedPerBirdG)} گرم</b>
              </div>
            )}
          </div>
        )}

        <div className="field half">
          <label className="lbl">میانگین وزن نمونه (گرم)</label>
          <input
            className="input"
            type="number"
            value={avgWeightG}
            onChange={(e) => setAvgWeightG(e.target.value)}
            placeholder="در روزهای وزن‌کشی هفتگی (مثلاً ۲۵۰۰)"
          />
        </div>
        <div className="field half">
          <label className="lbl">دمای سالن (°C)</label>
          <input
            className="input"
            type="number"
            value={tempC}
            onChange={(e) => setTempC(e.target.value)}
            placeholder="۲۴"
          />
        </div>

        <div className="field third">
          <label className="lbl">حداقل دمای شب (°C)</label>
          <input
            className="input"
            type="number"
            value={tempMinC}
            onChange={(e) => setTempMinC(e.target.value)}
            placeholder="مثلاً ۲۰"
          />
        </div>
        <div className="field third">
          <label className="lbl">حداکثر دمای روز (°C)</label>
          <input
            className="input"
            type="number"
            value={tempMaxC}
            onChange={(e) => setTempMaxC(e.target.value)}
            placeholder="مثلاً ۲۶"
          />
        </div>
        <div className="field third">
          <label className="lbl">رطوبت نسبی سالن (٪)</label>
          <input
            className="input"
            type="number"
            value={humidityPct}
            onChange={(e) => setHumidityPct(e.target.value)}
            placeholder="۶۰"
          />
        </div>

        <div className="field half">
          <label className="lbl">ساعات روشنایی (ساعت)</label>
          <input
            className="input"
            type="number"
            value={lightHours}
            onChange={(e) => setLightHours(e.target.value)}
            placeholder="۱۸"
          />
        </div>
        <div className="field half">
          <label className="lbl">دارو، واکسن یا ویتامین تجویز شده</label>
          <input
            className="input"
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
            placeholder="مثلاً مولتی‌ویتامین در آب، واکسن نیوکاسل"
          />
        </div>

        {/* کادر اتصال به انبار خوراک و کسر خودکار */}
        <div
          className="field full"
          style={{
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '12px 14px',
            background: 'var(--surface)',
            marginTop: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={feedDeducted}
                onChange={(e) => setFeedDeducted(e.target.checked)}
              />
              <span>📦 اتصال به انبار: کسر خودکار دان مصرفی از موجودی انبار</span>
            </label>
            {selectedFeedItem && (
              <span className="badge green" style={{ fontSize: '0.8rem' }}>
                موجودی انبار: {n(selectedFeedItem.qty)} {selectedFeedItem.unit}
              </span>
            )}
          </div>

          {feedDeducted && (
            <div className="grid grid-2" style={{ gap: 10, marginTop: 8 }}>
              <div>
                <label className="lbl" style={{ fontSize: '0.82rem' }}>انبار محل کسر</label>
                <select
                  className="input"
                  value={feedWarehouseId}
                  onChange={(e) => setFeedWarehouseId(e.target.value)}
                >
                  <option value="">انبار اصلی دان مزرعه</option>
                  {s.warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="lbl" style={{ fontSize: '0.82rem' }}>نوع دان مصرفی در انبار</label>
                <select
                  className="input"
                  value={feedItemId}
                  onChange={(e) => setFeedItemId(e.target.value)}
                >
                  <option value="">انتخاب قلم دان از انبار...</option>
                  {feedItems.map((fi) => (
                    <option key={fi.id} value={fi.id}>
                      {fi.name} (موجودی: {n(fi.qty)} {fi.unit})
                    </option>
                  ))}
                  {/* اگر کالایی خارج از فیلتر دان بود */}
                  {s.inventory
                    .filter((i) => !feedItems.some((fi) => fi.id === i.id))
                    .map((oi) => (
                      <option key={oi.id} value={oi.id}>
                        {oi.name} ({oi.cat})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="field full">
          <label className="lbl">یادداشت سرپرست سالن و علائم بالینی</label>
          <textarea
            className="input"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="رفتار پرنده، کیفیت بستر، کارکرد فن‌ها و..."
          />
        </div>
      </div>
    </Modal>
  );
}
