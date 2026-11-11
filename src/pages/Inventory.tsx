/** انبار دان، دارو و تجهیزات + کاردکس حرکات */
import { useState } from 'react';
import { Modal, useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Empty, PageHead, SectionHead, Stat } from '../components/ui';
import { actions, num, stockMovesFor, useApp } from '../data/store';
import { format, today } from '../lib/jalali';
import { n, short } from '../lib/format';
import { InventoryItemForm, InventoryMoveForm } from '../forms';
import type { StockMove } from '../data/types';

function EditMoveModal({
  move,
  onClose,
}: {
  move: StockMove;
  onClose: () => void;
}) {
  const { toast } = useUI();
  const [date, setDate] = useState(move.date);
  const [qty, setQty] = useState(move.qty);
  const [kind, setKind] = useState<'in' | 'out'>(move.kind);
  const [reason, setReason] = useState(move.reason || 'سایر');
  const [note, setNote] = useState(move.note || '');

  const save = () => {
    if (num(qty) <= 0) {
      toast('مقدار باید بیشتر از صفر باشد', 'error');
      return;
    }
    actions.updateStockMove(move.id, {
      date,
      qty: num(qty),
      kind,
      reason,
      note,
    });
    toast('حرکت انبار ویرایش شد و موجودی اصلاح گردید');
    onClose();
  };

  return (
    <Modal
      title={`ویرایش گردش کالا — ${move.itemName}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" type="button" onClick={onClose}>
            انصراف
          </button>
          <button className="btn primary" type="button" onClick={save}>
            ذخیره تغییرات
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field half">
          <label className="lbl">نوع تراکنش</label>
          <select
            className="input"
            value={kind}
            onChange={(e) => setKind(e.target.value as 'in' | 'out')}
          >
            <option value="in">ورود به انبار</option>
            <option value="out">خروج از انبار</option>
          </select>
        </div>
        <div className="field half">
          <label className="lbl">تاریخ</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field half">
          <label className="lbl">مقدار ({move.unit})</label>
          <input
            className="input num"
            type="number"
            value={qty}
            onChange={(e) => setQty(num(e.target.value))}
          />
        </div>
        <div className="field half">
          <label className="lbl">دلیل حرکت</label>
          <select
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="خرید">خرید</option>
            <option value="مصرف روزانه">مصرف روزانه</option>
            <option value="مصرف تولید دان">مصرف تولید دان</option>
            <option value="اصلاح شمارش">اصلاح شمارش</option>
            <option value="موجودی اولیه کالا">موجودی اولیه کالا</option>
            <option value="مرجوعی">مرجوعی</option>
            <option value="تلفات / ضایعات">تلفات / ضایعات</option>
            <option value="سایر">سایر</option>
          </select>
        </div>
        <div className="field full">
          <label className="lbl">توضیح</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="یادداشت اختیاری"
          />
        </div>
      </div>
    </Modal>
  );
}

export function Inventory() {
  const s = useApp();
  const ui = useUI();
  const [traceId, setTraceId] = useState<string | null>(null);
  const [editingMove, setEditingMove] = useState<StockMove | null>(null);

  const deleteMove = async (m: StockMove) => {
    const ok = await ui.confirm(
      `این سطر گردش انبار (${m.kind === 'in' ? 'ورود' : 'خروج'} ${n(m.qty)} ${m.unit} ${m.itemName}) حذف شود؟ موجودی کالا بر اساس قبل از این حرکت بازگردانده می‌شود.`,
      { danger: true, ok: 'حذف سطر' },
    );
    if (ok) {
      actions.deleteStockMove(m.id);
      ui.toast('سطر گردش انبار حذف و موجودی کالا اصلاح شد');
    }
  };

  const items = s.inventory
    .slice()
    .sort((a, b) => num(a.qty) - num(a.min) - (num(b.qty) - num(b.min)));
  const low = items.filter((i) => i.active !== false && num(i.qty) <= num(i.min));
  const value = items.reduce((a, i) => a + num(i.qty) * num(i.pricePerKg), 0);

  const traceItem = traceId ? s.inventory.find((i) => i.id === traceId) : null;
  const traceMoves = traceItem ? stockMovesFor(s, traceItem.id) : [];

  const monthKey = today().slice(0, 7);
  const monthMoves = s.stockMoves.filter((m) => m.date.slice(0, 7) === monthKey);
  const recentMoves = s.stockMoves
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, 8);

  return (
    <>
      <PageHead
        title="انبار مزرعه"
        sub="موجودی دان، دارو، سوخت و تجهیزات — با دفتر حرکات"
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
          icon="⬇️"
          label="ورود این ماه"
          value={n(monthMoves.filter((m) => m.kind === 'in').reduce((a, m) => a + num(m.qty), 0))}
          sub={`${n(monthMoves.filter((m) => m.kind === 'in').length)} سطر کاردکس`}
        />
        <Stat
          icon="⬆️"
          label="خروج این ماه"
          value={n(monthMoves.filter((m) => m.kind === 'out').reduce((a, m) => a + num(m.qty), 0))}
          sub={`${n(monthMoves.filter((m) => m.kind === 'out').length)} سطر کاردکس`}
        />
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
                            title="کاردکس کالا"
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

      <div className="card mt">
        <SectionHead
          title="آخرین حرکات انبار"
          sub={`${n(s.stockMoves.length)} سطر در دفتر حرکات`}
        />
        {recentMoves.length ? (
          <div className="rows">
            {recentMoves.map((m) => (
              <div className="row" key={m.id}>
                <span
                  className="row-ic"
                  style={{
                    background: m.kind === 'in' ? '#ECFDF5' : '#FEF2F2',
                    border: 0,
                  }}
                >
                  {m.kind === 'in' ? '⬇️' : '⬆️'}
                </span>
                <div className="row-main">
                  <div className="row-title">{m.itemName}</div>
                  <div className="row-sub">
                    {format(m.date, 'long')} · {m.reason}
                    {m.refId ? ` · سند ${m.refId}` : ''}
                  </div>
                </div>
                <div className="row-side" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div>
                    <div className={'row-amt ' + (m.kind === 'in' ? 'pos' : 'neg')}>
                      {m.kind === 'in' ? '+' : '−'}
                      {n(m.qty)} {m.unit}
                    </div>
                    <div className="row-date">
                      {n(m.before)} → {n(m.after)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button
                      className="icon-btn sm"
                      title="ویرایش این حرکت انبار"
                      onClick={() => setEditingMove(m)}
                    >
                      <Icon name="edit" size={13} />
                    </button>
                    <button
                      className="icon-btn sm"
                      title="حذف این حرکت انبار"
                      onClick={() => deleteMove(m)}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="hint" style={{ padding: '8px 2px' }}>
            هنوز حرکتی ثبت نشده است. با «ورود / خروج» یا ثبت معامله، کاردکس پر می‌شود.
          </div>
        )}
      </div>

      {traceItem ? (
        <Modal
          title={`کاردکس کالا — ${traceItem.name}`}
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
          <div className="kv">
            <span>تعداد حرکات ثبت‌شده</span>
            <b>{n(traceMoves.length)}</b>
          </div>

          <div className="sec-head" style={{ marginTop: 12 }}>
            <div>
              <h3>گردش کالا</h3>
              <span className="sec-sub">جدیدترین اول</span>
            </div>
          </div>

          {traceMoves.length ? (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>تاریخ</th>
                    <th>نوع</th>
                    <th>مقدار</th>
                    <th>موجودی</th>
                    <th>دلیل</th>
                    <th style={{ width: 64 }}>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {traceMoves.map((m) => (
                    <tr key={m.id}>
                      <td>{format(m.date, 'short')}</td>
                      <td>
                        <span className={'badge ' + (m.kind === 'in' ? 'green' : 'red')}>
                          {m.kind === 'in' ? 'ورود' : 'خروج'}
                        </span>
                      </td>
                      <td className="num-cell">
                        {n(m.qty)} {m.unit}
                      </td>
                      <td className="num-cell">
                        {n(m.before)} → <b>{n(m.after)}</b>
                      </td>
                      <td>
                        {m.reason}
                        {m.refId ? <span className="hint"> · {m.refId}</span> : null}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button
                            className="icon-btn sm"
                            title="ویرایش"
                            onClick={() => setEditingMove(m)}
                          >
                            <Icon name="edit" size={12} />
                          </button>
                          <button
                            className="icon-btn sm"
                            title="حذف"
                            onClick={() => deleteMove(m)}
                          >
                            <Icon name="trash" size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="hint" style={{ padding: '8px 2px' }}>
              برای این کالا حرکتی ثبت نشده است. از دکمه «ورود / خروج» یا با ثبت معامله، کاردکس پر
              می‌شود.
            </div>
          )}
        </Modal>
      ) : null}

      {editingMove ? (
        <EditMoveModal
          move={editingMove}
          onClose={() => setEditingMove(null)}
        />
      ) : null}
    </>
  );
}
