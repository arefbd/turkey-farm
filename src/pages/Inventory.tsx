/** انبار دان، دارو و تجهیزات + کاردکس حرکات و مدیریت انبارهای چندگانه */
import { useMemo, useState } from 'react';
import { Modal, useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Empty, PageHead, SectionHead, Stat } from '../components/ui';
import { actions, num, stockMovesFor, useApp } from '../data/store';
import { format, today } from '../lib/jalali';
import { money, n, short } from '../lib/format';
import { InventoryItemForm, InventoryMoveForm, WarehouseForm, WAREHOUSE_TYPE_LABELS } from '../forms';
import { DEFAULT_WAREHOUSES } from '../data/seed';
import type { StockMove, Warehouse } from '../data/types';

type MainTab = 'items' | 'warehouses' | 'moves';

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
          <input className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field half">
          <label className="lbl">مقدار ({move.unit})</label>
          <input
            className="input"
            type="number"
            value={qty}
            onChange={(e) => setQty(num(e.target.value))}
          />
        </div>
        <div className="field half">
          <label className="lbl">دلیل تراکنش</label>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
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
  const [mainTab, setMainTab] = useState<MainTab>('items');
  const [traceId, setTraceId] = useState<string | null>(null);
  const [editingMove, setEditingMove] = useState<StockMove | null>(null);
  const [catFilter, setCatFilter] = useState<string>('all');
  const [q, setQ] = useState('');

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

  const loadDefaultWarehouses = () => {
    DEFAULT_WAREHOUSES.forEach((dw) => {
      actions.add('warehouses', dw);
    });
    ui.toast('۶ انبار استاندارد مزرعه با موفقیت ایجاد شدند');
  };

  const openWarehouseMenu = (w: Warehouse) =>
    ui.sheet({
      title: `عملیات انبار ${w.name}`,
      items: [
        { act: 'edit', label: 'ویرایش مشخصات انبار', icon: '✏️' },
        { act: 'toggle_active', label: w.active ? 'غیرفعال کردن انبار' : 'فعال‌سازی مجدد انبار', icon: '🔄' },
        { act: 'del', label: 'حذف انبار', icon: '🗑️' },
      ],
      onPick: async (act) => {
        if (act === 'edit') {
          ui.open(<WarehouseForm id={w.id} onClose={ui.close} />);
        }
        if (act === 'toggle_active') {
          actions.update('warehouses', w.id, { active: !w.active });
          ui.toast(`وضعیت انبار ${w.name} تغییر یافت`);
        }
        if (act === 'del') {
          const ok = await ui.confirm(`انبار «${w.name}» حذف شود؟`, {
            danger: true,
            ok: 'حذف انبار',
          });
          if (!ok) return;
          actions.remove('warehouses', w.id);
          ui.toast('انبار حذف شد');
        }
      },
    });

  const rawItems = s.inventory.slice().sort((a, b) => num(a.qty) - num(a.min) - (num(b.qty) - num(b.min)));
  const items = useMemo(() => {
    return rawItems.filter((i) => {
      if (catFilter !== 'all' && i.cat !== catFilter) return false;
      if (!q.trim()) return true;
      const term = q.trim().toLowerCase();
      return (
        (i.name || '').toLowerCase().includes(term) ||
        (i.code || '').toLowerCase().includes(term) ||
        (i.cat || '').toLowerCase().includes(term)
      );
    });
  }, [rawItems, catFilter, q]);

  const low = rawItems.filter((i) => i.active !== false && num(i.qty) <= num(i.min));
  const value = rawItems.reduce((a, i) => a + num(i.qty) * num(i.pricePerKg), 0);

  const traceItem = traceId ? s.inventory.find((i) => i.id === traceId) : null;
  const traceMoves = traceItem ? stockMovesFor(s, traceItem.id) : [];

  const monthKey = today().slice(0, 7);
  const monthMoves = s.stockMoves.filter((m) => m.date.slice(0, 7) === monthKey);
  const recentMoves = s.stockMoves
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, 20);

  // دسته‌های انبار
  const itemCategories = useMemo(() => {
    const set = new Set<string>();
    rawItems.forEach((i) => {
      if (i.cat) set.add(i.cat);
    });
    return Array.from(set);
  }, [rawItems]);

  const warehouses = s.warehouses || [];

  return (
    <>
      <PageHead
        title={
          mainTab === 'items'
            ? 'انبار مزرعه و کاردکس کالاها'
            : mainTab === 'warehouses'
            ? 'مدیریت انبارهای چندگانه فیزیکی'
            : 'آخرین حرکات و دفتر گردش انبار'
        }
        sub={
          mainTab === 'items'
            ? 'موجودی دان، دارو، سوخت و تجهیزات — با کاردکس تفصیلی'
            : mainTab === 'warehouses'
            ? 'تفکیک انبارهای مواد اولیه، دان آماده، انبارک سالن‌ها، دارو و سردخانه'
            : 'رهگیری کلیه ورودها و خروج‌ها با اصلاح آنلاین موجودی'
        }
        actions={
          mainTab === 'warehouses' ? (
            <button className="btn primary" onClick={() => ui.open(<WarehouseForm onClose={ui.close} />)}>
              <Icon name="plus" size={16} /> انبار جدید
            </button>
          ) : (
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
          )
        }
      />

      {/* تب‌های ناوبری بالای صفحه انبار */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn ${mainTab === 'items' ? 'primary' : ''}`}
          onClick={() => setMainTab('items')}
        >
          <Icon name="box" size={16} /> موجودی کالاها ({n(rawItems.length)})
        </button>
        <button
          className={`btn ${mainTab === 'warehouses' ? 'primary' : ''}`}
          onClick={() => setMainTab('warehouses')}
        >
          <Icon name="home" size={16} /> مدیریت انبارها ({n(warehouses.length)})
        </button>
        <button
          className={`btn ${mainTab === 'moves' ? 'primary' : ''}`}
          onClick={() => setMainTab('moves')}
        >
          <Icon name="exchange" size={16} /> گردش و حرکات ({n(s.stockMoves.length)})
        </button>
      </div>

      {mainTab === 'items' && (
        <>
          <div className="stats">
            <Stat icon="📦" label="تعداد اقلام" value={n(rawItems.length)} sub="در انبار" />
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

          {/* فیلتر دسته و جستجو */}
          <div className="card" style={{ padding: '10px 14px', marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="input"
              style={{ flex: 1, minWidth: 180 }}
              placeholder="جستجوی نام یا کد کالا..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="input"
              style={{ width: 170 }}
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
            >
              <option value="all">همه دسته‌ها</option>
              {itemCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

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
                      <th>ارزش (تومان)</th>
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
                          <td className="num-cell">{money(num(i.qty) * num(i.pricePerKg))}</td>
                          <td>
                            <span className={'badge ' + (isLow ? 'red' : 'green')}>
                              {isLow ? 'کم‌موجود' : 'کافی'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 2 }}>
                              <button
                                className="icon-btn sm"
                                title="ورود/خروج سریع"
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
                                title="ویرایش کالا"
                                onClick={() => ui.open(<InventoryItemForm id={i.id} onClose={ui.close} />)}
                              >
                                <Icon name="edit" size={13} />
                              </button>
                              <button
                                className="icon-btn sm"
                                title="حذف"
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
              <Empty title="کالایی یافت نشد" text="اولین کالا را با دکمه «کالای جدید» اضافه کنید" />
            )}
          </div>
        </>
      )}

      {mainTab === 'warehouses' && (
        <div>
          <div className="grid grid-4" style={{ marginBottom: 16 }}>
            <Stat label="کل انبارها" value={n(warehouses.length)} sub="مراکز نگهداری فیزیکی" />
            <Stat
              label="انبارهای خوراک و دان"
              value={n(warehouses.filter((w) => ['raw_feed', 'factory_pellet', 'farm_feed'].includes(w.type)).length)}
              sub="مواد اولیه و پلت"
            />
            <Stat
              label="سردخانه گوشت"
              value={n(warehouses.filter((w) => w.type === 'cold_storage').length)}
              sub="دمای منفی ۱۸ درجه"
            />
            <Stat
              label="انبار دارو و واکسن"
              value={n(warehouses.filter((w) => w.type === 'medicine_vaccine').length)}
              sub="زنجیره سرد"
            />
          </div>

          {warehouses.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>🏢</div>
              <h3>هنوز انباری تعریف نشده است</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 18 }}>
                برای کنترل فیزیکی موجودی‌ها بین انبار مواد اولیه دان، دان آماده کارخانه، انبارک سالن‌ها، دارو و
                سردخانه، اولین انبار را تعریف کنید یا از ۶ انبار پیشنهادی استاندارد صنعت بوقلمون استفاده نمایید.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                <button className="btn primary" onClick={() => ui.open(<WarehouseForm onClose={ui.close} />)}>
                  <Icon name="plus" size={16} /> تعریف اولین انبار
                </button>
                <button className="btn" onClick={loadDefaultWarehouses}>
                  ایجاد ۶ انبار استاندارد مزرعه
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-2">
              {warehouses.map((w) => {
                const tInfo = WAREHOUSE_TYPE_LABELS[w.type] || { label: w.type, icon: '📦' };
                const linkedHall = w.hallId ? s.halls.find((h) => h.id === w.hallId) : null;

                return (
                  <div className="card" key={w.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 26 }}>{tInfo.icon}</span>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 16 }}>{w.name}</h3>
                          <span className="badge gray" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                            {w.code}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge ${w.active ? 'green' : 'gray'}`}>
                          {w.active ? 'فعال' : 'غیرفعال'}
                        </span>
                        <button className="icon-btn sm" onClick={() => openWarehouseMenu(w)}>
                          <Icon name="dots" size={16} />
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: 6, margin: '10px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>نوع کاربری:</span>
                        <span>{tInfo.label}</span>
                      </div>
                      {linkedHall && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>متصل به سالن:</span>
                          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                            {linkedHall.name} ({linkedHall.code})
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>انباردار / مسئول:</span>
                        <span>{w.manager || '—'}</span>
                      </div>
                      {w.temperature != null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>دمای کنترل‌شده:</span>
                          <span style={{ fontWeight: 700, color: w.temperature < 0 ? '#0284C7' : '#059669' }}>
                            {n(w.temperature)} °C
                          </span>
                        </div>
                      )}
                      {w.notes && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
                          {w.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button className="btn sm" onClick={() => ui.open(<WarehouseForm id={w.id} onClose={ui.close} />)}>
                        <Icon name="pencil" size={14} /> ویرایش مشخصات
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mainTab === 'moves' && (
        <div className="card mt">
          <SectionHead
            title="دفتر کل گردش و حرکات انبار"
            sub={`${n(s.stockMoves.length)} سطر تراکنش ثبتی`}
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
                      {m.note ? ` · ${m.note}` : ''}
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
            <Empty title="هنوز حرکتی ثبت نشده است" text="با ثبت ورود یا خروج، سوابق در اینجا ثبت می‌گردند" />
          )}
        </div>
      )}

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
