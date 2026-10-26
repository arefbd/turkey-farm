/** انبار دان، دارو و تجهیزات */
import { useState } from 'react';
import { Modal, useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Empty, PageHead, SectionHead, Stat } from '../components/ui';
import { actions, num, useApp } from '../data/store';
import { TX_TYPE_LABEL } from '../data/categories';
import { format } from '../lib/jalali';
import { n, short } from '../lib/format';
import { InventoryItemForm, InventoryMoveForm } from '../forms';

export function Inventory() {
  const s = useApp();
  const ui = useUI();
  const [traceId, setTraceId] = useState<string | null>(null);
  const traceItem = traceId ? s.inventory.find((i) => i.id === traceId) : null;
  const traceTx = traceItem
    ? s.transactions
        .filter((t) => (t.items || []).some((x) => x.name.trim() === traceItem.name.trim()))
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const items = s.inventory
    .slice()
    .sort((a, b) => num(a.qty) - num(a.min) - (num(b.qty) - num(b.min)));
  const low = items.filter((i) => i.active !== false && num(i.qty) <= num(i.min));
  const value = items.reduce((a, i) => a + num(i.qty) * num(i.pricePerKg), 0);

  return (
    <>
      <PageHead
        title="انبار مزرعه"
        sub="موجودی دان، دارو، سوخت و تجهیزات"
        actions={
          <>
            <button className="btn" onClick={() => ui.open(<InventoryMoveForm onClose={ui.close} />)}>
              <Icon name="upload" size={16} /> ورود / خروج
            </button>
            <button
              className="btn primary"
              onClick={() => ui.open(<InventoryItemForm onClose={ui.close} />)}
            >
              <Icon name="plus" size={16} /> کالای جدید
            </button>
          </>
        }
      />

      <div className="stats">
        <Stat icon="📦" label="تعداد اقلام" value={n(items.length)} sub="در انبار" />
        <Stat icon="💰" label="ارزش موجودی" value={short(value)} unit="تومان" />
        <Stat
          icon="⚠️"
          label="کالاهای کم‌موجود"
          value={n(low.length)}
          sub={low.length ? 'نیاز به خرید' : 'همه کافی است'}
        />
        <Stat icon="🛒" label="پیشنهاد خرید" value={n(low.length)} sub="قلم کالا" />
      </div>

      {low.length ? (
        <div
          className="card mt"
          style={{ background: '#FFFBEB', borderColor: '#FDE68A', boxShadow: 'none' }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Icon name="alert" size={18} />
            <div>
              <b style={{ fontSize: 12.5 }}>{n(low.length)} قلم کالا به حد هشدار رسیده است</b>
              <div className="hint">
                {low.map((i) => `${i.name} (${n(i.qty)} ${i.unit})`).join(' · ')}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card mt">
        <SectionHead title="اقلام انبار" sub={`${n(items.length)} قلم`} />
        {items.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>کد</th>
                  <th>کالا</th>
                  <th>دسته</th>
                  <th>موجودی</th>
                  <th>حد هشدار</th>
                  <th>ارزش</th>
                  <th>وضعیت</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const isLow = num(i.qty) <= num(i.min);
                  return (
                    <tr key={i.id} style={i.active === false ? { opacity: 0.55 } : undefined}>
                      <td className="num-cell">{i.code || '—'}</td>
                      <td>
                        <b>{i.name}</b>
                        {i.active === false ? <div className="hint">غیرفعال</div> : null}
                      </td>
                      <td>{i.cat || '—'}</td>
                      <td className="num-cell">
                        {n(i.qty)} {i.unit}
                      </td>
                      <td className="num-cell">{n(i.min)}</td>
                      <td className="num-cell">{short(num(i.qty) * num(i.pricePerKg))}</td>
                      <td>
                        <span className={'badge ' + (isLow ? 'red' : 'green')}>
                          {isLow ? 'کم‌موجود' : 'کافی'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button
                            className="icon-btn sm"
                            onClick={() => ui.open(<InventoryMoveForm itemId={i.id} onClose={ui.close} />)}
                          >
                            <Icon name="up" size={13} />
                          </button>
                          <button
                            className="icon-btn sm"
                            title="گردش کالا"
                            onClick={() => setTraceId(i.id)}
                          >
                            <Icon name="search" size={13} />
                          </button>
                          <button
                            className="icon-btn sm"
                            onClick={() => ui.open(<InventoryItemForm id={i.id} onClose={ui.close} />)}
                          >
                            <Icon name="edit" size={13} />
                          </button>
                          <button
                            className="icon-btn sm"
                            onClick={async () => {
                              const ok = await ui.confirm('این کالا از انبار حذف شود؟', {
                                danger: true,
                                ok: 'حذف',
                              });
                              if (ok) actions.remove('inventory', i.id);
                            }}
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
          <Empty title="انبار خالی است" text="اولین کالا را اضافه کنید" />
        )}
      </div>

      {traceItem ? (
        <Modal
          title={`گردش کالا — ${traceItem.name}`}
          onClose={() => setTraceId(null)}
          footer={
            <button className="btn primary" type="button" onClick={() => setTraceId(null)}>
              بستن
            </button>
          }
        >
          <div className="kv">
            <span>موجودی فعلی</span>
            <b>
              {n(traceItem.qty)} {traceItem.unit}
            </b>
          </div>
          <div className="kv">
            <span>کد کالا</span>
            <b>{traceItem.code || '—'}</b>
          </div>
          <div className="sec-head" style={{ marginTop: 12 }}>
            <div>
              <h3>معاملات مرتبط</h3>
              <span className="sec-sub">{n(traceTx.length)} سند</span>
            </div>
          </div>
          {traceTx.length ? (
            <div className="rows">
              {traceTx.map((t) => {
                const line = (t.items || []).find(
                  (x) => x.name.trim() === traceItem.name.trim(),
                );
                return (
                  <div className="row" key={t.id}>
                    <span className="row-ic" style={{ background: '#F4EEFF', border: 0 }}>
                      {t.type === 'purchase' ? '📦' : t.type === 'sale' ? '🍗' : '↩️'}
                    </span>
                    <div className="row-main">
                      <div className="row-title">
                        {TX_TYPE_LABEL[t.type] || t.type} · {t.personName || '—'}
                      </div>
                      <div className="row-sub">
                        {t.code} · {format(t.date, 'long')}
                      </div>
                    </div>
                    <div className="row-side">
                      <div className="row-amt">
                        {n(line?.qty || 0)} {line?.unit || traceItem.unit}
                      </div>
                      <div className="row-date">کیلویی {n(line?.price || 0)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="hint" style={{ padding: '8px 2px' }}>
              برای این کالا معامله‌ای ثبت نشده است. با انتخاب نام کالا در فرم معامله، گردش آن اینجا
              ثبت می‌شود.
            </div>
          )}
        </Modal>
      ) : null}
    </>
  );
}
