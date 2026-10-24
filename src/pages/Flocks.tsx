/** گله‌ها — فهرست دوره‌های پرورش */
import { useState } from 'react';
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Bar, Chips, Empty, PageHead } from '../components/ui';
import { actions, flockStats, useApp } from '../data/store';
import { format, today } from '../lib/jalali';
import { n, pct } from '../lib/format';
import { DailyForm, ExpenseForm, FlockForm } from '../forms';

type Filter = 'all' | 'active' | 'closed';

export function Flocks() {
  const s = useApp();
  const ui = useUI();
  const [filter, setFilter] = useState<Filter>('all');

  let flocks = s.flocks.slice().sort((a, b) => b.startDate.localeCompare(a.startDate));
  if (filter === 'active') flocks = flocks.filter((f) => f.status !== 'closed');
  if (filter === 'closed') flocks = flocks.filter((f) => f.status === 'closed');

  const cycleDays = s.settings.cycleDays || 120;

  const openMenu = (id: string) =>
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

  return (
    <>
      <PageHead
        title="گله‌ها و دوره‌های پرورش"
        sub="مدیریت چرخه پرورش، ثبت روزانه و سوابق واکسیناسیون"
        actions={
          <button className="btn primary" onClick={() => ui.open(<FlockForm onClose={ui.close} />)}>
            <Icon name="plus" size={16} /> گله جدید
          </button>
        }
      />

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
                        شروع: <b>{format(f.startDate, 'long')}</b>
                      </span>
                      <span>
                        سن: <b>{n(st.age)} روز</b>
                      </span>
                    </div>
                  </div>
                  <button className="icon-btn sm" onClick={() => openMenu(f.id)}>
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
  );
}
