/** ثبت روزانه گله‌ها — آمار تلفات، مصرف دان و آب و وزن‌کشی */
import { useState } from 'react';
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Empty, PageHead, SectionHead, Stat } from '../components/ui';
import { actions, flockById, num, useApp } from '../data/store';
import { format } from '../lib/jalali';
import { n } from '../lib/format';
import { DailyForm } from '../forms';

export function Daily() {
  const s = useApp();
  const ui = useUI();
  const [selectedFlockId, setSelectedFlockId] = useState<string>('all');

  const targetFlocks = selectedFlockId === 'all'
    ? s.flocks
    : s.flocks.filter((f) => f.id === selectedFlockId);

  const targetFlockIds = new Set(targetFlocks.map((f) => f.id));

  const records = s.daily
    .filter((d) => targetFlockIds.has(d.flockId))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? 0) - (a.createdAt ?? 0));

  const totalMortality = records.reduce((sum, r) => sum + num(r.mortality) + num(r.culled), 0);
  const totalFeed = records.reduce((sum, r) => sum + num(r.feedKg), 0);
  const totalWater = records.reduce((sum, r) => sum + num(r.waterL), 0);

  const removeRecord = async (id: string, date: string) => {
    const ok = await ui.confirm(`رکورد ثبت روزانه مورخ ${date} حذف شود؟`, {
      danger: true,
      ok: 'حذف',
    });
    if (ok) {
      actions.remove('daily', id);
      ui.toast('رکورد ثبت روزانه حذف شد');
    }
  };

  return (
    <>
      <PageHead
        title="ثبت روزانه"
        sub="ثبت آمار تلفات، مصرف دان و آب، وزن‌کشی و سلامت گله‌ها"
        actions={
          <button className="btn primary" onClick={() => ui.open(<DailyForm onClose={ui.close} />)}>
            <Icon name="plus" size={16} /> ثبت روزانه جدید
          </button>
        }
      />

      {/* نوار انتخاب گله */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>🎯 فیلتر گله:</span>
            <span className="badge purple" style={{ fontSize: 12, padding: '4px 10px' }}>
              {selectedFlockId === 'all'
                ? 'همه گله‌ها'
                : `گله ${s.flocks.find((f) => f.id === selectedFlockId)?.name || ''}`}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <button
            type="button"
            className={`btn sm ${selectedFlockId === 'all' ? 'primary' : ''}`}
            onClick={() => setSelectedFlockId('all')}
            style={{ borderRadius: 20 }}
          >
            🌐 همه گله‌ها
          </button>
          {s.flocks.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`btn sm ${selectedFlockId === f.id ? 'primary' : ''}`}
              style={{
                borderRadius: 20,
                border: selectedFlockId === f.id ? 'none' : '1px solid var(--border)',
                background: selectedFlockId === f.id ? undefined : '#FFF',
              }}
              onClick={() => setSelectedFlockId(f.id)}
            >
              🐥 {f.name}
              {f.status === 'closed' ? ' (خاتمه‌یافته)' : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="stats">
        <Stat icon="📝" label="تعداد ثبت‌ها" value={n(records.length)} sub="گزارش روزانه" />
        <Stat icon="⚠️" label="مجموع تلفات و حذفی" value={n(totalMortality)} unit="قطعه" />
        <Stat icon="🌾" label="مجموع دان مصرفی" value={n(totalFeed)} unit="کیلو" />
        <Stat icon="💧" label="مجموع آب مصرفی" value={n(totalWater)} unit="لیتر" />
      </div>

      <div className="card mt">
        <SectionHead title="تاریخچه ثبت‌های روزانه" sub={`${n(records.length)} سطر ثبت‌شده`} />
        {records.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>گله</th>
                  <th>تلفات</th>
                  <th>حذفی</th>
                  <th>دان (کیلو)</th>
                  <th>آب (لیتر)</th>
                  <th>میانگین وزن</th>
                  <th>یادداشت / علائم</th>
                  <th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const f = flockById(s, r.flockId);
                  return (
                    <tr key={r.id}>
                      <td>
                        <b>{format(r.date, 'short')}</b>
                      </td>
                      <td>
                        <span className="badge purple">{f?.name || '—'}</span>
                      </td>
                      <td className="num-cell" style={{ color: num(r.mortality) > 0 ? '#DC2626' : undefined }}>
                        {n(r.mortality)}
                      </td>
                      <td className="num-cell">{n(r.culled)}</td>
                      <td className="num-cell">{n(r.feedKg)}</td>
                      <td className="num-cell">{n(r.waterL)}</td>
                      <td className="num-cell">
                        {num(r.avgWeightG) > 0 ? `${n(r.avgWeightG)} گرم` : '—'}
                      </td>
                      <td>
                        <span className="hint">{r.note || '—'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="icon-btn sm"
                            title="ویرایش"
                            onClick={() => ui.open(<DailyForm id={r.id} onClose={ui.close} />)}
                          >
                            <Icon name="edit" size={13} />
                          </button>
                          <button
                            className="icon-btn sm"
                            title="حذف"
                            onClick={() => removeRecord(r.id, r.date)}
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="هیچ ثبت روزانه‌ای یافت نشد" text="با دکمه «ثبت روزانه جدید» اولین گزارش را ثبت کنید" />
        )}
      </div>
    </>
  );
}
