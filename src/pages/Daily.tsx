/** ثبت روزانه گله‌ها — آمار تلفات، مصرف دان و آب، وزن‌کشی، نسبت آب به دان و پایش FCR (فاز ۳) */
import { useMemo, useState } from 'react';
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Empty, PageHead, SectionHead, Stat } from '../components/ui';
import { actions, flockById, flockStats, num, useApp } from '../data/store';
import { format } from '../lib/jalali';
import { n, pct } from '../lib/format';
import { DailyForm } from '../forms';
import type { DailyRecord } from '../data/types';

type DailyTab = 'records' | 'kpis';

export function Daily() {
  const s = useApp();
  const ui = useUI();
  const [tab, setTab] = useState<DailyTab>('records');
  const [selectedFlockId, setSelectedFlockId] = useState<string>('all');

  const targetFlocks = selectedFlockId === 'all'
    ? s.flocks
    : s.flocks.filter((f) => f.id === selectedFlockId);

  const targetFlockIds = new Set(targetFlocks.map((f) => f.id));

  const records = useMemo(() => {
    return s.daily
      .filter((d) => targetFlockIds.has(d.flockId))
      .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [s.daily, targetFlockIds]);

  const totalMortality = records.reduce((sum, r) => sum + num(r.mortality) + num(r.culled), 0);
  const totalFeed = records.reduce((sum, r) => sum + num(r.feedKg), 0);
  const totalWater = records.reduce((sum, r) => sum + num(r.waterL), 0);
  const avgWaterFeedRatio = totalFeed > 0 ? (totalWater / totalFeed).toFixed(2) : '—';

  // آماره‌های گله انتخاب‌شده (اگر یک گله فیلتر شده باشد)
  const singleFlock = selectedFlockId !== 'all' ? flockById(s, selectedFlockId) : null;
  const singleFlockStats = singleFlock ? flockStats(s, singleFlock.id) : null;

  // هشدارهای فنی روزانه
  const alerts = useMemo(() => {
    const list: Array<{ level: 'warn' | 'danger'; text: string; date: string; flockName: string }> = [];
    records.slice(0, 30).forEach((r) => {
      const f = flockById(s, r.flockId);
      const fName = f ? f.name : 'گله';
      const fKg = num(r.feedKg);
      const wL = num(r.waterL);
      if (fKg > 0 && wL > 0) {
        const ratio = wL / fKg;
        if (ratio > 3.2) {
          list.push({
            level: 'warn',
            date: r.date,
            flockName: fName,
            text: `نسبت آب به دان در ${fName} بالا است (${ratio.toFixed(2)} برابر). احتمال گرمازدگی یا نشتی آبخوری وجود دارد.`,
          });
        } else if (ratio < 1.4) {
          list.push({
            level: 'danger',
            date: r.date,
            flockName: fName,
            text: `مصرف آب در ${fName} نسبت به دان کاهش یافته (${ratio.toFixed(2)} برابر). خطوط آبخوری و فشار نیپل‌ها را بررسی کنید.`,
          });
        }
      }
      if (num(r.mortality) > 20) {
        list.push({
          level: 'danger',
          date: r.date,
          flockName: fName,
          text: `تلفات غیرعادی (${n(r.mortality)} قطعه) در ${fName} ثبت شده است. نیاز به معاینه دامپزشک.`,
        });
      }
    });
    return list;
  }, [records, s]);

  const removeRecord = async (r: DailyRecord) => {
    const ok = await ui.confirm(
      `رکورد روزانه مورخ ${r.date} حذف شود؟` +
        (r.feedDeducted ? ' دان مصرفی کسرشده مجدداً به موجودی انبار بازگردانده می‌شود.' : ''),
      {
        danger: true,
        ok: 'حذف رکورد',
      },
    );
    if (ok) {
      actions.removeDailyRecord(r.id);
      ui.toast('رکورد ثبت روزانه حذف شد و موجودی انبار اصلاح گردید');
    }
  };

  return (
    <>
      <PageHead
        title="ثبت روزانه و پایش فنی گله‌ها"
        sub="آمار تلفات، مصرف دان و آب، نسبت آب به دان، اقلیم سالن و اتصال مستقیم به انبار"
        actions={
          <button
            className="btn primary"
            onClick={() =>
              ui.open(
                <DailyForm
                  flockId={selectedFlockId !== 'all' ? selectedFlockId : undefined}
                  onClose={ui.close}
                />,
              )
            }
          >
            <Icon name="plus" size={16} /> ثبت روزانه جدید
          </button>
        }
      />

      {/* تب‌های بالای صفحه روزنگار */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          className={`btn ${tab === 'records' ? 'primary' : ''}`}
          onClick={() => setTab('records')}
        >
          <Icon name="calendar" size={16} /> دفتر ثبت روزانه ({n(records.length)})
        </button>
        <button
          className={`btn ${tab === 'kpis' ? 'primary' : ''}`}
          onClick={() => setTab('kpis')}
        >
          <Icon name="chart" size={16} /> پایش فنی، FCR و راندمان
        </button>
      </div>

      {/* نوار فیلتر گله */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>🎯 فیلتر گله و سالن:</span>
            <span className="badge purple" style={{ fontSize: 12, padding: '4px 10px' }}>
              {selectedFlockId === 'all'
                ? 'همه گله‌های فارم'
                : `گله ${s.flocks.find((f) => f.id === selectedFlockId)?.name || ''}`}
            </span>
          </div>
          {singleFlock && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              سالن مستقر: <b>{singleFlock.hall || 'نامشخص'}</b> · شروع: <b>{format(singleFlock.startDate, 'short')}</b>
            </div>
          )}
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
              🦃 {f.name} {f.status === 'closed' ? '(بسته)' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* هشدارهای انحراف فنی */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {alerts.slice(0, 3).map((a, idx) => (
            <div
              key={idx}
              className={`alert-item ${a.level === 'danger' ? 'danger' : 'warn'}`}
              style={{ margin: 0, padding: '10px 14px' }}
            >
              <span className="ai-ic">{a.level === 'danger' ? '🚨' : '⚠️'}</span>
              <div>
                <h5>هشدار فنی مورخ {format(a.date, 'short')} — {a.flockName}</h5>
                <p>{a.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* خلاصه آماری */}
      <div className="stats">
        <Stat icon="📝" label="تعداد ثبت‌ها" value={n(records.length)} sub="گزارش روزانه" />
        <Stat icon="⚠️" label="مجموع تلفات و حذفی" value={n(totalMortality)} unit="قطعه" />
        <Stat icon="🌾" label="مجموع دان مصرفی" value={n(totalFeed)} unit="کیلو" />
        <Stat icon="💧" label="مجموع آب مصرفی" value={n(totalWater)} unit="لیتر" />
        <Stat icon="🔄" label="میانگین نسبت آب:دان" value={n(avgWaterFeedRatio)} unit="لیتر/کیلو" />
      </div>

      {tab === 'records' && (
        <div className="card mt">
          <SectionHead title="دفتر ثبت‌های روزانه" sub={`${n(records.length)} سطر ثبت‌شده`} />
          {records.length ? (
            <div className="tbl-wrap">
              <table className="tbl" style={{ fontSize: '0.86rem' }}>
                <thead>
                  <tr>
                    <th>تاریخ و سن</th>
                    <th>گله / سالن</th>
                    <th>تلفات (قطعه)</th>
                    <th>حذفی</th>
                    <th>دان (کیلو)</th>
                    <th>آب (لیتر)</th>
                    <th>نسبت آب:دان</th>
                    <th>میانگین وزن</th>
                    <th>اقلیم (دما/رطوبت)</th>
                    <th>درمان / دارو</th>
                    <th>یادداشت سرپرست</th>
                    <th style={{ width: 75 }} />
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const f = flockById(s, r.flockId);
                    const fKg = num(r.feedKg);
                    const wL = num(r.waterL);
                    const ratio = fKg > 0 ? (wL / fKg).toFixed(1) : null;
                    const isMortHigh = num(r.mortality) > 10;

                    return (
                      <tr key={r.id}>
                        <td>
                          <b>{format(r.date, 'short')}</b>
                          <div style={{ color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 600 }}>
                            سن {n(r.age)} روز
                          </div>
                        </td>
                        <td>
                          <span className="badge purple">{f?.name || '—'}</span>
                          {f?.hall && (
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {f.hall}
                            </div>
                          )}
                        </td>
                        <td className="num-cell" style={{ color: isMortHigh ? '#DC2626' : undefined, fontWeight: isMortHigh ? 700 : 400 }}>
                          {n(r.mortality)}
                        </td>
                        <td className="num-cell">{n(r.culled)}</td>
                        <td className="num-cell">
                          <b>{n(r.feedKg)}</b>
                          {r.feedDeducted && (
                            <span title="از انبار کسر شد" style={{ fontSize: '0.72rem', color: '#059669', display: 'block' }}>
                              ✓ کسر از انبار
                            </span>
                          )}
                        </td>
                        <td className="num-cell">{n(r.waterL)}</td>
                        <td className="num-cell">
                          {ratio ? (
                            <span
                              style={{
                                color: num(ratio) > 3.0 || num(ratio) < 1.5 ? '#D97706' : '#059669',
                                fontWeight: 600,
                              }}
                            >
                              {n(ratio)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="num-cell">
                          {num(r.avgWeightG) > 0 ? (
                            <b style={{ color: 'var(--primary)' }}>{n(r.avgWeightG)} گرم</b>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          {num(r.tempC) > 0 ? `${n(r.tempC)}°C` : '—'}
                          {r.humidityPct ? ` · ${n(r.humidityPct)}٪` : ''}
                        </td>
                        <td>
                          {r.treatment ? (
                            <span className="badge blue" style={{ fontSize: '0.78rem' }}>
                              {r.treatment}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <span className="hint" style={{ fontSize: '0.8rem' }}>
                            {r.note || '—'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="icon-btn sm"
                              title="ویرایش"
                              onClick={() => ui.open(<DailyForm id={r.id} onClose={ui.close} />)}
                            >
                              <Icon name="pencil" size={13} />
                            </button>
                            <button
                              className="icon-btn sm"
                              title="حذف"
                              onClick={() => removeRecord(r)}
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
      )}

      {tab === 'kpis' && (
        <div>
          {singleFlockStats ? (
            <>
              <div className="card" style={{ marginBottom: 14 }}>
                <SectionHead
                  title={`شاخص‌های کلیدی عملکرد (KPIs) — گله ${singleFlockStats.flock.name}`}
                  sub={`سن فعلی: ${n(singleFlockStats.age)} روز · نژاد ${singleFlockStats.flock.breed || 'بوقلمون'}`}
                />
                <div className="grid grid-4" style={{ gap: 12 }}>
                  <Stat
                    icon="🔄"
                    label="ضریب تبدیل دان (FCR)"
                    value={n(singleFlockStats.fcr, 2)}
                    sub="کیلو دان به ازای هر کیلو افزایش وزن"
                  />
                  <Stat
                    icon="🏆"
                    label="شاخص کارایی اروپایی (EPEF)"
                    value={n(singleFlockStats.epef, 0)}
                    sub="استاندارد بهره‌وری جهانی"
                  />
                  <Stat
                    icon="❤️"
                    label="درصد ماندگاری (Livability)"
                    value={pct(singleFlockStats.survivalPct, 1)}
                    sub={`${n(singleFlockStats.alive)} قطعه زنده`}
                  />
                  <Stat
                    icon="📈"
                    label="میانگین افزایش وزن روزانه (ADG)"
                    value={`${n(singleFlockStats.adgG, 1)} گرم`}
                    sub="رشد روزانه به ازای هر پرنده"
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="card">
                  <SectionHead title="موازنه آب و خوراک" sub="تحلیل سلامت دستگاه گوارش و شرایط آسایش پرنده" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>کل دان مصرف‌شده:</span>
                      <b>{n(singleFlockStats.feedKg)} کیلوگرم</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>کل آب مصرف‌شده:</span>
                      <b>{n(singleFlockStats.waterL)} لیتر</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>نسبت مصرف آب به دان:</span>
                      <b style={{ color: singleFlockStats.waterFeedRatio > 2.8 ? '#D97706' : '#059669' }}>
                        {n(singleFlockStats.waterFeedRatio, 2)} لیتر به ازای هر کیلو دان
                      </b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>سرانه دان روزانه هر پرنده:</span>
                      <b>{n(singleFlockStats.feedPerBirdDailyG, 0)} گرم در روز</b>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <SectionHead title="پیش‌بینی و وضعیت وزنی" sub="سنجش با وزن هدف پایان دوره" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>آخرین میانگین توزین:</span>
                      <b>{singleFlockStats.avgWeightG > 0 ? `${n(singleFlockStats.avgWeightG)} گرم (${n(singleFlockStats.avgWeightG / 1000, 2)} کیلو)` : 'ثبت نشده'}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>وزن هدف پایان دوره:</span>
                      <b>{n(s.settings.targetWeightG || 12000)} گرم</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>فاصله تا وزن هدف:</span>
                      <b>
                        {singleFlockStats.avgWeightG > 0
                          ? `${n(Math.max(0, (s.settings.targetWeightG || 12000) - singleFlockStats.avgWeightG))} گرم`
                          : '—'}
                      </b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>بیومس کل موجودی در سالن:</span>
                      <b style={{ color: 'var(--primary)' }}>{n(singleFlockStats.biomass, 1)} کیلوگرم</b>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
              <h3>برای مشاهده شاخص‌های تخصصی FCR و EPEF، یک گله را انتخاب کنید</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
                در نوار بالای صفحه، روی نام یکی از گله‌ها کلیک نمایید تا شاخص‌های فنی دوره پرورش همان گله محاسبه و نمایش داده شود.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
