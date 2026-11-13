/** گله‌ها — فهرست دوره‌های پرورش و سالن‌های فارم */
import { useState } from 'react';
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Bar, Chips, Empty, PageHead, Stat } from '../components/ui';
import { actions, flockStats, num, useApp } from '../data/store';
import { format, today } from '../lib/jalali';
import { money, n, pct } from '../lib/format';
import { DailyForm, ExpenseForm, FlockForm, HallForm, SlaughterForm } from '../forms';
import { DEFAULT_HALLS } from '../data/seed';
import type { Hall, HallStatus } from '../data/types';

type Filter = 'all' | 'active' | 'closed';
type MainTab = 'flocks' | 'halls' | 'slaughter';

const HALL_STATUS_INFO: Record<HallStatus, { label: string; badgeClass: string; icon: string }> = {
  active: { label: 'در حال بهره‌برداری', badgeClass: 'green', icon: '🟢' },
  empty: { label: 'خالی و آماده', badgeClass: 'blue', icon: '🔵' },
  disinfecting: { label: 'شستشو و ضدعفونی', badgeClass: 'warn', icon: '🟡' },
  maintenance: { label: 'تعمیرات و بازسازی', badgeClass: 'gray', icon: '⚪' },
};

export function Flocks() {
  const s = useApp();
  const ui = useUI();
  const [mainTab, setMainTab] = useState<MainTab>('flocks');
  const [filter, setFilter] = useState<Filter>('all');

  let flocks = s.flocks.slice().sort((a, b) => b.startDate.localeCompare(a.startDate));
  if (filter === 'active') flocks = flocks.filter((f) => f.status !== 'closed');
  if (filter === 'closed') flocks = flocks.filter((f) => f.status === 'closed');

  const cycleDays = s.settings.cycleDays || 120;

  // سالن‌ها
  const halls = s.halls || [];
  const totalArea = halls.reduce((sum, h) => sum + num(h.areaM2), 0);
  const totalCapacity = halls.reduce((sum, h) => sum + num(h.capacity), 0);
  const activeHallsCount = halls.filter((h) => h.status === 'active').length;

  // شاخص‌های کشتارگاه و قطعه‌بندی لاشه
  const slaughterBatches = s.slaughterBatches || [];
  const totalSlaughterBirds = slaughterBatches.reduce((sum, b) => sum + num(b.slaughterBirds), 0);
  const totalCarcassWeight = slaughterBatches.reduce((sum, b) => sum + num(b.carcassWeightKg), 0);
  const totalOriginWeight = slaughterBatches.reduce((sum, b) => sum + num(b.originWeightKg), 0);
  const totalDestWeight = slaughterBatches.reduce((sum, b) => sum + num(b.destWeightKg), 0);
  const totalTransportShrink = slaughterBatches.reduce((sum, b) => sum + num(b.transportShrinkKg), 0);
  const avgShrinkPct = totalOriginWeight > 0 ? (totalTransportShrink / totalOriginWeight) * 100 : 0;
  const avgDressingPct = totalDestWeight > 0 ? (totalCarcassWeight / totalDestWeight) * 100 : 0;

  const loadDefaultHalls = () => {
    DEFAULT_HALLS.forEach((dh) => {
      actions.add('halls', dh);
    });
    ui.toast('سالن‌های نمونه با موفقیت در فارم ثبت شدند');
  };

  const openFlockMenu = (id: string) =>
    ui.sheet({
      title: 'عملیات گله',
      items: [
        { act: 'edit', label: 'ویرایش اطلاعات گله', icon: '✏️' },
        { act: 'close', label: 'بستن دوره گله', icon: '🔒' },
        { act: 'del', label: 'حذف گله', icon: '🗑️' },
      ],
      onPick: async (act) => {
        if (act === 'edit') {
          ui.open(<FlockForm id={id} onClose={ui.close} />);
        }
        if (act === 'close') {
          actions.update('flocks', id, { status: 'closed', endDate: today() });
          ui.toast('دوره گله بسته شد');
        }
        if (act === 'del') {
          const ok = await ui.confirm('این گله و همه رکوردهای آن حذف شود؟', {
            danger: true,
            ok: 'حذف',
          });
          if (!ok) return;
          actions.removeFlock(id);
          ui.toast('گله حذف شد');
        }
      },
    });

  const openHallMenu = (hall: Hall) =>
    ui.sheet({
      title: `عملیات سالن ${hall.name}`,
      items: [
        { act: 'edit', label: 'ویرایش مشخصات سالن', icon: '✏️' },
        { act: 'status_active', label: 'تغییر وضعیت به: در حال بهره‌برداری', icon: '🟢' },
        { act: 'status_empty', label: 'تغییر وضعیت به: خالی و آماده', icon: '🔵' },
        { act: 'status_disinfecting', label: 'تغییر وضعیت به: شستشو و ضدعفونی', icon: '🟡' },
        { act: 'del', label: 'حذف سالن', icon: '🗑️' },
      ],
      onPick: async (act) => {
        if (act === 'edit') {
          ui.open(<HallForm id={hall.id} onClose={ui.close} />);
        }
        if (act === 'status_active') {
          actions.update('halls', hall.id, { status: 'active' });
          ui.toast('وضعیت سالن به در حال بهره‌برداری تغییر یافت');
        }
        if (act === 'status_empty') {
          actions.update('halls', hall.id, { status: 'empty' });
          ui.toast('وضعیت سالن به خالی تغییر یافت');
        }
        if (act === 'status_disinfecting') {
          actions.update('halls', hall.id, { status: 'disinfecting', lastDisinfectionDate: today() });
          ui.toast('وضعیت سالن به در حال ضدعفونی تغییر یافت');
        }
        if (act === 'del') {
          const ok = await ui.confirm(`سالن «${hall.name}» حذف شود؟`, {
            danger: true,
            ok: 'حذف سالن',
          });
          if (!ok) return;
          actions.remove('halls', hall.id);
          ui.toast('سالن حذف شد');
        }
      },
    });

  return (
    <>
      <PageHead
        title={
          mainTab === 'flocks'
            ? 'گله‌ها و دوره‌های پرورش'
            : mainTab === 'halls'
              ? 'مدیریت سالن‌ها و تاسیسات فیزیکی فارم'
              : 'عملیات کشتارگاه، افت بار و قطعه‌بندی صنعتی'
        }
        sub={
          mainTab === 'flocks'
            ? 'مدیریت چرخه پرورش، ثبت روزانه و سوابق واکسیناسیون'
            : mainTab === 'halls'
              ? 'پایش ابعاد، ظرفیت، سیستم‌های تهویه و گرمایش، و تاریخچه ضدعفونی سالن‌ها'
              : 'مدیریت توزین مبدا و مقصد، افت بار حمل و نقل، راندمان لاشه، استحصال قطعات گوشت و بهای تمام‌شده فرآورده‌ها'
        }
        actions={
          mainTab === 'flocks' ? (
            <button className="btn primary" onClick={() => ui.open(<FlockForm onClose={ui.close} />)}>
              <Icon name="plus" size={16} /> گله جدید
            </button>
          ) : mainTab === 'halls' ? (
            <button className="btn primary" onClick={() => ui.open(<HallForm onClose={ui.close} />)}>
              <Icon name="plus" size={16} /> سالن جدید
            </button>
          ) : (
            <button className="btn primary" onClick={() => ui.open(<SlaughterForm onClose={ui.close} />)}>
              <Icon name="plus" size={16} /> ثبت اعزام و کشتار جدید
            </button>
          )
        }
      />

      {/* تب‌های اصلی بالای صفحه */}
      <div className="subnav-scroll">
        <button
          className={`btn ${mainTab === 'flocks' ? 'primary' : ''}`}
          onClick={() => setMainTab('flocks')}
        >
          <Icon name="egg" size={16} /> گله‌ها و دوره‌ها ({n(s.flocks.length)})
        </button>
        <button
          className={`btn ${mainTab === 'halls' ? 'primary' : ''}`}
          onClick={() => setMainTab('halls')}
        >
          <Icon name="home" size={16} /> سالن‌ها و تاسیسات ({n(halls.length)})
        </button>
        <button
          className={`btn ${mainTab === 'slaughter' ? 'primary' : ''}`}
          onClick={() => setMainTab('slaughter')}
        >
          <Icon name="truck" size={16} /> کشتارگاه و قطعه‌بندی ({n(slaughterBatches.length)})
        </button>
      </div>

      {mainTab === 'flocks' ? (
        <>
          <Chips
            items={[
              { value: 'all', label: 'همه گله‌ها' },
              { value: 'active', label: 'در حال پرورش' },
              { value: 'closed', label: 'بسته شده' },
            ]}
            active={filter}
            onPick={(v) => setFilter(v as Filter)}
          />

          <div className="grid grid-2 mt">
            {flocks.length ? (
              flocks.map((f) => {
                const st = flockStats(s, f.id);
                if (!st) return null;
                const closed = f.status === 'closed';
                const prog = Math.min(100, (st.age / cycleDays) * 100);
                return (
                  <div className="card flock-card" key={f.id}>
                    <div className="flock-top">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: 15 }}>{f.name}</h3>
                          <span className={'badge ' + (closed ? 'gray' : 'green')}>
                            {closed ? 'بسته شده' : 'در حال پرورش'}
                          </span>
                        </div>
                        <div className="flock-meta">
                          <span>
                            نژاد: <b>{f.breed || '—'}</b>
                          </span>
                          <span>
                            سالن: <b>{f.hall || '—'}</b>
                          </span>
                          <span>
                            شروع: <b>{format(f.startDate, 'long')}</b>
                          </span>
                          <span>
                            سن: <b>{n(st.age)} روز</b>
                          </span>
                          <span>
                            فروش رفته: <b>{n(st.sold)} قطعه</b>
                          </span>
                        </div>
                      </div>
                      <button className="icon-btn sm" onClick={() => openFlockMenu(f.id)}>
                        <Icon name="dots" size={18} />
                      </button>
                    </div>

                    <div className="grid grid-3" style={{ gap: 8, margin: '14px 0 10px' }}>
                      <div className="kv" style={{ display: 'block', padding: 0, border: 0 }}>
                        <span>موجودی زنده</span>
                        <br />
                        <b style={{ fontSize: 15 }}>{n(st.alive)}</b>
                      </div>
                      <div className="kv" style={{ display: 'block', padding: 0, border: 0 }}>
                        <span>تلفات</span>
                        <br />
                        <b
                          style={{
                            fontSize: 15,
                            color: st.mortalityPct > 5 ? '#DC2626' : '#059669',
                          }}
                        >
                          {pct(st.mortalityPct, 2)}
                        </b>
                      </div>
                      <div className="kv" style={{ display: 'block', padding: 0, border: 0 }}>
                        <span>وزن میانگین</span>
                        <br />
                        <b style={{ fontSize: 15 }}>{n(st.avgWeightG / 1000, 2)} kg</b>
                      </div>
                    </div>

                    <div className="progress-row" style={{ marginBottom: 12 }}>
                      <span>پیشرفت دوره</span>
                      <Bar value={prog} />
                      <b>{pct(prog, 0)}</b>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <a className="btn sm primary" href={`#/flock/${f.id}`}>
                        جزئیات گله
                      </a>
                      <button
                        className="btn sm"
                        onClick={() => ui.open(<DailyForm flockId={f.id} onClose={ui.close} />)}
                      >
                        <Icon name="plus" size={14} /> ثبت روزانه
                      </button>
                      <button
                        className="btn sm"
                        onClick={() =>
                          ui.open(<ExpenseForm preset={{ flockId: f.id }} onClose={ui.close} />)
                        }
                      >
                        هزینه
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <Empty title="گله‌ای یافت نشد" text="برای شروع، یک گله جدید ایجاد کنید" />
            )}
          </div>
        </>
      ) : (
        /* تب سالن‌ها و تاسیسات فیزیکی فارم */
        <div>
          {/* کارت‌های خلاصه آماری سالن‌ها */}
          <div className="grid grid-4" style={{ marginBottom: 16 }}>
            <Stat label="تعداد کل سالن‌ها" value={n(halls.length)} sub="واحد پرورشی" />
            <Stat label="کل مساحت مسقف" value={`${n(totalArea)} م²`} sub="مساحت مفید پرورشی" />
            <Stat label="ظرفیت اسمی کل" value={`${n(totalCapacity)} قطعه`} sub="استاندارد تراکم فارم" />
            <Stat label="سالن‌های فعال" value={n(activeHallsCount)} sub="دارای گله در حال پرورش" />
          </div>

          {halls.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>🛖</div>
              <h3>هنوز سالنی در سیستم ثبت نشده است</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 18 }}>
                برای رهگیری دقیق سالن‌ها، ابعاد، تجهیزات تهویه و اتصال به گله‌ها، اولین سالن خود را تعریف کنید
                یا از سالن‌های استاندارد مزرعه استفاده نمایید.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                <button className="btn primary" onClick={() => ui.open(<HallForm onClose={ui.close} />)}>
                  <Icon name="plus" size={16} /> تعریف اولین سالن
                </button>
                <button className="btn" onClick={loadDefaultHalls}>
                  بارگذاری سالن‌های پیشنهادی استاندارد
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-2">
              {halls.map((h) => {
                const sInfo = HALL_STATUS_INFO[h.status] || HALL_STATUS_INFO.empty;
                // گله‌های حاضر در این سالن
                const occupyingFlocks = s.flocks.filter(
                  (f) => f.status === 'active' && (f.hall === h.name || f.hall === h.code),
                );

                return (
                  <div className="card" key={h.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>🛖</span>
                          <h3 style={{ margin: 0, fontSize: 16 }}>{h.name}</h3>
                          <span className="badge gray" style={{ fontSize: '0.8rem' }}>
                            {h.code}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                          {h.farmName || 'فارم مرکزی'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge ${sInfo.badgeClass}`}>
                          {sInfo.label}
                        </span>
                        <button className="icon-btn sm" onClick={() => openHallMenu(h)}>
                          <Icon name="dots" size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-3" style={{ background: 'var(--surface-sunken)', borderRadius: 8, padding: '10px 12px', margin: '4px 0 12px' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ابعاد (طول×عرض)</span>
                        <div style={{ fontWeight: 700, marginTop: 2 }}>
                          {n(h.lengthM)} × {n(h.widthM)} م
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>مساحت مفید</span>
                        <div style={{ fontWeight: 700, marginTop: 2 }}>{n(h.areaM2)} مترمربع</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ظرفیت اسمی</span>
                        <div style={{ fontWeight: 700, marginTop: 2 }}>{n(h.capacity)} قطعه</div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>سیستم تهویه:</span>
                        <span>{h.ventilationType || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>سیستم گرمایش / سرمایش:</span>
                        <span>
                          {h.heatingType || '—'} / {h.coolingType || '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>آخرین تاریخ ضدعفونی:</span>
                        <span>{h.lastDisinfectionDate ? format(h.lastDisinfectionDate, 'short') : '—'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>آمادگی جوجه‌ریزی:</span>
                        <span>{h.readyDate ? format(h.readyDate, 'short') : 'آماده'}</span>
                      </div>

                      {occupyingFlocks.length > 0 && (
                        <div style={{ marginTop: 8, padding: '8px 10px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6 }}>
                          <span style={{ color: '#166534', fontWeight: 600, fontSize: '0.82rem' }}>
                            گله مستقر در این سالن:
                          </span>
                          {occupyingFlocks.map((flock) => (
                            <div key={flock.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                              <a href={`#/flock/${flock.id}`} style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                {flock.name}
                              </a>
                              <span style={{ fontSize: '0.82rem', color: '#166534' }}>
                                ورود: {format(flock.startDate, 'short')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {h.notes && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4, fontStyle: 'italic' }}>
                          {h.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button className="btn sm" onClick={() => ui.open(<HallForm id={h.id} onClose={ui.close} />)}>
                        <Icon name="pencil" size={14} /> ویرایش سالن
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mainTab === 'slaughter' && (
        <div className="space-y-4">
          <div className="grid grid-2 sm:grid-4" style={{ gap: 12 }}>
            <Stat
              label="کل پرنده‌های کشتارشده"
              value={`${n(totalSlaughterBirds)} قطعه`}
              sub={`مجموع ${n(slaughterBatches.length)} اعزام به کشتارگاه`}
              tone="accent"
            />
            <Stat
              label="مجموع گوشت / لاشه استحصالی"
              value={`${n(totalCarcassWeight)} kg`}
              sub={`میانگین لاشه: ${totalSlaughterBirds > 0 ? (totalCarcassWeight / totalSlaughterBirds).toFixed(2) : 0} kg`}
              tone="ok"
            />
            <Stat
              label="راندمان لاشه (Dressing %)"
              value={pct(avgDressingPct)}
              sub="نسبت لاشه به وزن باسکول کشتارگاه"
            />
            <Stat
              label="افت بار کل در حمل و نقل"
              value={`${n(totalTransportShrink)} kg`}
              sub={`میانگین افت مسیر: ${pct(avgShrinkPct)}`}
              tone={avgShrinkPct > 3.5 ? 'warn' : undefined}
            />
          </div>

          {slaughterBatches.length === 0 ? (
            <Empty
              title="کشتارگاه و قطعه‌بندی"
              text="تاکنون محموله کشتارگاه یا قطعه‌بندی ثبت نشده است."
              action={
                <button
                  className="btn primary"
                  onClick={() => ui.open(<SlaughterForm onClose={ui.close} />)}
                >
                  <Icon name="plus" size={16} /> ثبت اولین بچ کشتارگاه
                </button>
              }
            />
          ) : (
            <div className="space-y-4">
              {slaughterBatches.map((batch) => {
                const flock = s.flocks.find((f) => f.id === batch.flockId);
                const hall = s.halls.find((h) => h.id === batch.hallId);
                const warehouse = s.warehouses.find((w) => w.id === batch.targetWarehouseId);
                const totalCutsW = (batch.cuts || []).reduce((sum, c) => sum + num(c.weightKg), 0);

                return (
                  <div key={batch.id} className="card p-4 space-y-4" style={{ border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 20 }}>🚛</span>
                          <h3 style={{ margin: 0, fontSize: 16 }}>بچ کشتار {batch.code}</h3>
                          <span className="badge blue">{batch.date}</span>
                          <span className="badge gray">
                            گله: {flock ? flock.name : 'نامشخص'}
                          </span>
                          {hall && <span className="badge green">سالن: {hall.name}</span>}
                          {batch.stockUpdated && (
                            <span className="badge ok">
                              ✓ موجودی در {warehouse ? warehouse.name : 'سردخانه'} شارژ شد
                            </span>
                          )}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                          {batch.driverName ? `راننده: ${batch.driverName}` : ''}
                          {batch.truckPlate ? ` | پلاک: ${batch.truckPlate}` : ''}
                          {batch.shippingDocNo ? ` | بارنامه: ${batch.shippingDocNo}` : ''}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn sm"
                          onClick={() => ui.open(<SlaughterForm batch={batch} onClose={ui.close} />)}
                        >
                          <Icon name="pencil" size={14} /> ویرایش بچ
                        </button>
                        <button
                          className="btn sm danger"
                          onClick={async () => {
                            const ok = await ui.confirm(`بچ کشتار «${batch.code}» حذف شود؟ موجودی قطعات برگشت داده می‌شود.`, {
                              danger: true,
                              ok: 'حذف',
                            });
                            if (ok) {
                              actions.removeSlaughterBatch(batch.id);
                              ui.toast('بچ کشتار حذف شد');
                            }
                          }}
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>

                    {/* شاخص‌های وزن، افت و راندمان */}
                    <div className="grid grid-2 sm:grid-4" style={{ background: 'var(--surface-sunken)', borderRadius: 8, padding: '10px 12px', gap: 10 }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>تعداد ارسالی / کشتار خالص</span>
                        <div style={{ fontWeight: 700, marginTop: 2 }}>
                          {n(batch.dispatchBirds)} قطعه {batch.doaCount > 0 && <span style={{ color: 'var(--danger)' }}>({n(batch.doaCount)} تلفات مسیر)</span>}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>وزن مبدا / مقصد</span>
                        <div style={{ fontWeight: 700, marginTop: 2 }}>
                          {n(batch.originWeightKg)} kg / {n(batch.destWeightKg)} kg
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>افت بار حین حمل</span>
                        <div style={{ fontWeight: 700, marginTop: 2, color: num(batch.transportShrinkPct) > 3.5 ? 'var(--danger)' : 'inherit' }}>
                          {n(batch.transportShrinkKg)} kg ({pct(batch.transportShrinkPct)})
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>لاشه استحصالی و راندمان</span>
                        <div style={{ fontWeight: 700, marginTop: 2, color: 'var(--primary)' }}>
                          {n(batch.carcassWeightKg)} kg ({pct(batch.dressingYieldPct)})
                        </div>
                      </div>
                    </div>

                    {/* جدول قطعات و تسهیم هزینه */}
                    {batch.cuts && batch.cuts.length > 0 && (
                      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                        <table style={{ width: '100%', fontSize: '0.82rem', textAlign: 'right', borderCollapse: 'collapse' }}>
                          <thead style={{ background: 'var(--surface-sunken)', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                              <th style={{ padding: '6px 10px' }}>نام قطعه / فرآورده</th>
                              <th style={{ padding: '6px 10px' }}>وزن (kg)</th>
                              <th style={{ padding: '6px 10px' }}>راندمان از لاشه</th>
                              <th style={{ padding: '6px 10px' }}>نرخ روز بازار</th>
                              <th style={{ padding: '6px 10px' }}>بهای تمام‌شده هر کیلو</th>
                              <th style={{ padding: '6px 10px' }}>بهای تمام‌شده کل</th>
                            </tr>
                          </thead>
                          <tbody>
                            {batch.cuts.map((c, idx) => {
                              const cutYield = num(batch.carcassWeightKg) > 0 ? (num(c.weightKg) / num(batch.carcassWeightKg)) * 100 : 0;
                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>{c.name}</td>
                                  <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{n(c.weightKg)}</td>
                                  <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{pct(cutYield)}</td>
                                  <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{money(c.marketPricePerKg || 0)}</td>
                                  <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>{money(c.costPerKg || 0)}</td>
                                  <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 700 }}>{money(c.totalCost || 0)} تومان</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot style={{ background: 'var(--surface-sunken)', fontWeight: 700 }}>
                            <tr>
                              <td style={{ padding: '8px 10px' }}>جمع کل قطعات استحصال‌شده:</td>
                              <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: 'var(--primary)' }}>{n(totalCutsW)} kg</td>
                              <td style={{ padding: '8px 10px' }}>{num(batch.carcassWeightKg) > 0 ? pct((totalCutsW / num(batch.carcassWeightKg)) * 100) : '—'}</td>
                              <td style={{ padding: '8px 10px' }}>بهای تمام‌شده کل بچ:</td>
                              <td colSpan={2} style={{ padding: '8px 10px', fontFamily: 'monospace', color: 'var(--primary)' }}>
                                {money(batch.totalSlaughterCost || 0)} تومان
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}

                    {batch.notes && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        یادداشت: {batch.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
