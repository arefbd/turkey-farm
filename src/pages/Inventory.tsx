/** انبار دان، دارو و تجهیزات + کاردکس حرکات و مدیریت انبارهای چندگانه */
import { useMemo, useState } from 'react';
import { Modal, useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Empty, PageHead, SectionHead, Stat } from '../components/ui';
import { actions, num, stockMovesFor, itemWarehouseQty, useApp } from '../data/store';
import type { InventoryItem } from '../data/types';
import { format, today } from '../lib/jalali';
import { money, n, short } from '../lib/format';
import { InventoryItemForm, InventoryMoveForm, WarehouseForm, WAREHOUSE_TYPE_LABELS, TradeLotForm, LotSaleForm } from '../forms';
import { DEFAULT_WAREHOUSES } from '../data/seed';
import { getLotFefoStatus, lotProfitSummary } from '../data/store';
import type { StockMove, Warehouse, TradeLot } from '../data/types';

type MainTab = 'items' | 'warehouses' | 'lots' | 'moves';

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
  const [kind, setKind] = useState<'in' | 'out'>(move.kind === 'transfer' ? 'in' : move.kind);
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

function CardexModal({
  item,
  onClose,
  onEditMove,
  onDeleteMove,
}: {
  item: InventoryItem;
  onClose: () => void;
  onEditMove: (m: StockMove) => void;
  onDeleteMove: (m: StockMove) => void;
}) {
  const s = useApp();
  const [selectedWh, setSelectedWh] = useState<string>('all');

  const moves = useMemo(
    () => stockMovesFor(s, item.id, selectedWh),
    [s, item.id, selectedWh],
  );

  const currentStock = useMemo(() => {
    if (selectedWh === 'all') return num(item.qty);
    return num(item.warehouseQuantities?.[selectedWh] || 0);
  }, [item, selectedWh]);

  const stats = useMemo(() => {
    const purchaseIn = moves
      .filter((m) => m.kind === 'in' && (m.refType === 'transaction' || m.reason.includes('خرید')))
      .reduce((a, m) => a + num(m.qty), 0);
    const nonPurchaseIn = moves
      .filter(
        (m) =>
          m.kind === 'in' &&
          m.refType !== 'transaction' &&
          !m.reason.includes('خرید') &&
          m.reason !== 'دریافت از انبار دیگر',
      )
      .reduce((a, m) => a + num(m.qty), 0);
    const consumptionOut = moves
      .filter(
        (m) =>
          m.kind === 'out' &&
          (m.reason.includes('مصرف') || m.refType === 'consumption'),
      )
      .reduce((a, m) => a + num(m.qty), 0);
    const salesOut = moves
      .filter(
        (m) =>
          m.kind === 'out' &&
          (m.reason.includes('فروش') || (m.refType === 'transaction' && !m.reason.includes('خرید'))),
      )
      .reduce((a, m) => a + num(m.qty), 0);
    const transfers = moves
      .filter(
        (m) =>
          m.refType === 'transfer' ||
          m.reason.includes('انتقال') ||
          m.reason.includes('دریافت'),
      )
      .reduce((a, m) => a + num(m.qty), 0);

    return { purchaseIn, nonPurchaseIn, consumptionOut, salesOut, transfers };
  }, [moves]);

  return (
    <Modal
      title={`کاردکس تفصیلی کالا — ${item.name}`}
      onClose={onClose}
      size="lg"
      footer={
        <button className="btn primary" type="button" onClick={onClose}>
          بستن
        </button>
      }
    >
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="lbl" style={{ marginBottom: 4 }}>
            فیلتر کاردکس بر اساس انبار:
          </label>
          <select
            className="input"
            value={selectedWh}
            onChange={(e) => setSelectedWh(e.target.value)}
          >
            <option value="all">🏢 کل انبارهای مزرعه (مجموع)</option>
            {s.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            className="card"
            style={{ padding: '6px 12px', background: '#F8FAFC', textAlign: 'center' }}
          >
            <span style={{ fontSize: 11, color: '#64748B' }}>موجودی فعلی:</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
              {n(currentStock)} {item.unit}
            </div>
          </div>
          <div
            className="card"
            style={{ padding: '6px 12px', background: '#F8FAFC', textAlign: 'center' }}
          >
            <span style={{ fontSize: 11, color: '#64748B' }}>کد کالا:</span>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{item.code || '—'}</div>
          </div>
        </div>
      </div>

      {/* خلاصه آماری تفکیک ورودی و خروجی کالا */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 8,
            padding: '6px 10px',
          }}
        >
          <div style={{ fontSize: 11, color: '#166534' }}>📥 ورودی خرید</div>
          <b style={{ fontSize: 13, color: '#15803D' }}>
            +{n(stats.purchaseIn)} {item.unit}
          </b>
        </div>
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 8,
            padding: '6px 10px',
          }}
        >
          <div style={{ fontSize: 11, color: '#166534' }}>✨ ورودی غیرخرید</div>
          <b style={{ fontSize: 13, color: '#15803D' }}>
            +{n(stats.nonPurchaseIn)} {item.unit}
          </b>
        </div>
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            padding: '6px 10px',
          }}
        >
          <div style={{ fontSize: 11, color: '#991B1B' }}>🌾 خروجی مصرف</div>
          <b style={{ fontSize: 13, color: '#B91C1C' }}>
            −{n(stats.consumptionOut)} {item.unit}
          </b>
        </div>
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            padding: '6px 10px',
          }}
        >
          <div style={{ fontSize: 11, color: '#991B1B' }}>💰 خروجی فروش</div>
          <b style={{ fontSize: 13, color: '#B91C1C' }}>
            −{n(stats.salesOut)} {item.unit}
          </b>
        </div>
        <div
          style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: 8,
            padding: '6px 10px',
          }}
        >
          <div style={{ fontSize: 11, color: '#1E40AF' }}>🔄 انتقال انبارها</div>
          <b style={{ fontSize: 13, color: '#1D4ED8' }}>
            {n(stats.transfers)} {item.unit}
          </b>
        </div>
      </div>

      {moves.length ? (
        <div className="tbl-wrap" style={{ maxHeight: 380, overflowY: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>تاریخ</th>
                <th>عملیات</th>
                <th>انبار</th>
                <th>مقدار</th>
                <th>مانده</th>
                <th>علت / سند</th>
                <th>شماره بچ</th>
                <th style={{ width: 64 }}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => {
                const whDisplayName =
                  m.warehouseName ||
                  (m.warehouseId
                    ? s.warehouses.find((w) => w.id === m.warehouseId)?.name
                    : 'عمومی');
                return (
                  <tr key={m.id}>
                    <td>{format(m.date, 'short')}</td>
                    <td>
                      <span
                        className={
                          'badge ' +
                          (m.refType === 'transfer'
                            ? 'blue'
                            : m.kind === 'in'
                            ? 'green'
                            : 'red')
                        }
                      >
                        {m.refType === 'transfer'
                          ? m.kind === 'in'
                            ? 'دریافت انتقال'
                            : 'ارسال انتقال'
                          : m.kind === 'in'
                          ? 'ورود'
                          : 'خروج'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 11.5, fontWeight: 500 }}>{whDisplayName}</span>
                    </td>
                    <td className="num-cell">
                      <b style={{ color: m.kind === 'in' ? '#16A34A' : '#DC2626' }}>
                        {m.kind === 'in' ? '+' : '−'}
                        {n(m.qty)}
                      </b>{' '}
                      <span style={{ fontSize: 11 }}>{m.unit}</span>
                    </td>
                    <td className="num-cell">
                      {n(m.before)} → <b>{n(m.after)}</b>
                    </td>
                    <td>
                      <div>{m.reason}</div>
                      {m.refId && (
                        <div style={{ fontSize: 11, color: '#64748B' }}>سند: {m.refId}</div>
                      )}
                      {m.note && (
                        <div style={{ fontSize: 10.5, color: '#94A3B8' }}>{m.note}</div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 11, color: '#475569' }}>
                        {m.batchNo || '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button
                          className="icon-btn sm"
                          title="ویرایش"
                          onClick={() => onEditMove(m)}
                        >
                          <Icon name="edit" size={12} />
                        </button>
                        <button
                          className="icon-btn sm"
                          title="حذف"
                          onClick={() => onDeleteMove(m)}
                        >
                          <Icon name="trash" size={12} />
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
        <div className="hint" style={{ padding: '16px', textAlign: 'center' }}>
          برای این کالا در انبار انتخاب‌شده، هنوز حرکتی ثبت نشده است.
        </div>
      )}
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
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [q, setQ] = useState('');

  // پارت‌های بازرگانی گوشت منجمد و FEFO
  const [sellingLot, setSellingLot] = useState<TradeLot | null>(null);
  const [lotStatusFilter, setLotStatusFilter] = useState<'all' | 'active' | 'sold_out' | 'expired'>('all');

  const tradeLots = s.tradeLots || [];
  const sortedLots = useMemo(() => {
    return tradeLots
      .slice()
      .sort((a, b) => (a.expiryDate || '9999').localeCompare(b.expiryDate || '9999'));
  }, [tradeLots]);

  const filteredLots = useMemo(() => {
    if (lotStatusFilter === 'all') return sortedLots;
    return sortedLots.filter((l) => l.status === lotStatusFilter);
  }, [sortedLots, lotStatusFilter]);

  const totalLotTonnage = tradeLots.reduce((sum, l) => sum + num(l.initialWeightKg), 0);
  const totalSoldTonnage = tradeLots.reduce((sum, l) => sum + num(l.soldWeightKg), 0);
  const totalRemainingTonnage = Math.max(0, totalLotTonnage - totalSoldTonnage);

  const totalTradeRevenue = tradeLots.reduce((sum, l) => {
    return sum + (l.sales || []).reduce((sSum, sale) => sSum + num(sale.qtyKg) * num(sale.pricePerKg), 0);
  }, 0);

  const totalTradeCogs = tradeLots.reduce((sum, l) => {
    const prof = lotProfitSummary(l);
    return sum + prof.cogs;
  }, 0);

  const totalTradeGrossProfit = totalTradeRevenue - totalTradeCogs;
  const overallTradeMarginPct = totalTradeRevenue > 0 ? (totalTradeGrossProfit / totalTradeRevenue) * 100 : 0;

  const criticalExpiryLots = tradeLots.filter((l) => {
    const f = getLotFefoStatus(l.expiryDate);
    return (f.status === 'critical' || f.status === 'expired') && num(l.soldWeightKg) < num(l.initialWeightKg);
  });

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
            : mainTab === 'lots'
            ? 'پارت‌های بازرگانی گوشت منجمد و ردیابی FEFO'
            : 'آخرین حرکات و دفتر گردش انبار'
        }
        sub={
          mainTab === 'items'
            ? 'موجودی دان، دارو، سوخت و تجهیزات — با کاردکس تفصیلی'
            : mainTab === 'warehouses'
            ? 'تفکیک انبارهای مواد اولیه، دان آماده، انبارک سالن‌ها، دارو و سردخانه'
            : mainTab === 'lots'
            ? 'ردیابی سری‌های ساخت گوشت منجمد، کنترل تاریخ انقضا بر اساس FEFO و سودآوری بازرگانی'
            : 'رهگیری کلیه ورودها و خروج‌ها با اصلاح آنلاین موجودی'
        }
        actions={
          mainTab === 'warehouses' ? (
            <button className="btn primary" onClick={() => ui.open(<WarehouseForm onClose={ui.close} />)}>
              <Icon name="plus" size={16} /> انبار جدید
            </button>
          ) : mainTab === 'lots' ? (
            <button className="btn primary" onClick={() => ui.open(<TradeLotForm onClose={ui.close} />)}>
              <Icon name="plus" size={16} /> پارت بازرگانی جدید
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
      <div className="subnav-scroll">
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
          className={`btn ${mainTab === 'lots' ? 'primary' : ''}`}
          onClick={() => setMainTab('lots')}
        >
          <Icon name="truck" size={16} /> پارت‌های گوشت و FEFO ({n((s.tradeLots || []).length)})
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

          {/* فیلتر دسته، انبار و جستجو */}
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
            <select
              className="input"
              style={{ width: 190 }}
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <option value="all">🏢 همه انبارها (مجموع)</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
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
                      <th>{warehouseFilter === 'all' ? 'موجودی کل' : 'موجودی در انبار انتخابی'}</th>
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
                            {warehouseFilter === 'all' ? (
                              <>
                                <b>{n(i.qty)}</b> {i.unit}
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                                  {warehouses.map((w) => {
                                    const whQ = num(i.warehouseQuantities?.[w.id] || 0);
                                    if (whQ <= 0) return null;
                                    return (
                                      <span
                                        key={w.id}
                                        style={{
                                          fontSize: 10,
                                          background: '#F1F5F9',
                                          padding: '1px 5px',
                                          borderRadius: 4,
                                          color: '#334155',
                                        }}
                                      >
                                        {w.name}: <b>{n(whQ)}</b>
                                      </span>
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <>
                                <b style={{ color: '#2563EB', fontSize: 13.5 }}>
                                  {n(itemWarehouseQty(i, warehouseFilter))}
                                </b>{' '}
                                {i.unit}
                                <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>
                                  مجموع کل مزرعه: {n(i.qty)} {i.unit}
                                </div>
                              </>
                            )}
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

          {/* گزارش جامع تفکیکی گردش و مانده انبارها (User Requirement 7) */}
          <div className="card mt">
            <SectionHead
              title="گزارش جامع گردش و مانده انبارها"
              sub="تفکیک ورودی‌های خرید، غیرخرید، مصرف، فروش، انتقالات بین انبارها و مانده نهایی"
            />
            {items.length ? (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>کالا</th>
                      <th>موجودی تفکیکی در انبارها</th>
                      <th>ورودی خرید</th>
                      <th>ورودی غیرخرید</th>
                      <th>خروجی مصرف</th>
                      <th>خروجی فروش</th>
                      <th>گردش انتقال</th>
                      <th>مانده نهایی کل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => {
                      const itemMoves = s.stockMoves.filter((m) => m.itemId === i.id);
                      const purchaseIn = itemMoves
                        .filter(
                          (m) =>
                            m.kind === 'in' &&
                            (m.refType === 'transaction' || m.reason.includes('خرید')),
                        )
                        .reduce((a, m) => a + num(m.qty), 0);
                      const nonPurchaseIn = itemMoves
                        .filter(
                          (m) =>
                            m.kind === 'in' &&
                            m.refType !== 'transaction' &&
                            !m.reason.includes('خرید') &&
                            m.reason !== 'دریافت از انبار دیگر',
                        )
                        .reduce((a, m) => a + num(m.qty), 0);
                      const consumptionOut = itemMoves
                        .filter(
                          (m) =>
                            m.kind === 'out' &&
                            (m.reason.includes('مصرف') || m.refType === 'consumption'),
                        )
                        .reduce((a, m) => a + num(m.qty), 0);
                      const salesOut = itemMoves
                        .filter(
                          (m) =>
                            m.kind === 'out' &&
                            (m.reason.includes('فروش') ||
                              (m.refType === 'transaction' && !m.reason.includes('خرید'))),
                        )
                        .reduce((a, m) => a + num(m.qty), 0);
                      const transfers = itemMoves
                        .filter(
                          (m) =>
                            m.refType === 'transfer' ||
                            m.reason.includes('انتقال') ||
                            m.reason.includes('دریافت'),
                        )
                        .reduce((a, m) => a + num(m.qty), 0);

                      return (
                        <tr key={i.id}>
                          <td>
                            <b>{i.name}</b>
                            <div style={{ fontSize: 10.5, color: '#64748B' }}>
                              {i.code || i.cat}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {warehouses.map((w) => {
                                const whQ = num(i.warehouseQuantities?.[w.id] || 0);
                                if (whQ <= 0) return null;
                                return (
                                  <div key={w.id} style={{ fontSize: 11 }}>
                                    <span style={{ color: '#475569' }}>{w.name}:</span>{' '}
                                    <b>{n(whQ)}</b> {i.unit}
                                  </div>
                                );
                              })}
                              {(!i.warehouseQuantities ||
                                Object.values(i.warehouseQuantities).every((v) => num(v) <= 0)) && (
                                <span style={{ fontSize: 11, color: '#94A3B8' }}>
                                  ثبت‌نشده تفکیکی ({n(i.qty)} {i.unit} کل)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="num-cell" style={{ color: '#16A34A', fontWeight: 600 }}>
                            {purchaseIn > 0 ? `+${n(purchaseIn)}` : '۰'}
                          </td>
                          <td className="num-cell" style={{ color: '#0D9488', fontWeight: 600 }}>
                            {nonPurchaseIn > 0 ? `+${n(nonPurchaseIn)}` : '۰'}
                          </td>
                          <td className="num-cell" style={{ color: '#DC2626', fontWeight: 600 }}>
                            {consumptionOut > 0 ? `−${n(consumptionOut)}` : '۰'}
                          </td>
                          <td className="num-cell" style={{ color: '#EA580C', fontWeight: 600 }}>
                            {salesOut > 0 ? `−${n(salesOut)}` : '۰'}
                          </td>
                          <td className="num-cell" style={{ color: '#2563EB', fontWeight: 600 }}>
                            {transfers > 0 ? n(transfers) : '۰'}
                          </td>
                          <td className="num-cell">
                            <b style={{ fontSize: 13 }}>{n(i.qty)}</b> {i.unit}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
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

      {mainTab === 'lots' && (
        <div className="space-y-4">
          <div className="stats">
            <Stat
              icon="❄️"
              label="موجودی گوشت در سردخانه"
              value={`${n(totalRemainingTonnage)} kg`}
              sub={`از کل ${n(totalLotTonnage)} kg ورودی` }
            />
            <Stat
              icon="💰"
              label="درآمد کل فروش پارت‌ها"
              value={short(totalTradeRevenue)}
              unit="تومان"
              sub={`فروش ${n(totalSoldTonnage)} kg گوشت` }
            />
            <Stat
              icon="📈"
              label="سود ناخالص بازرگانی"
              value={short(totalTradeGrossProfit)}
              unit="تومان"
              sub={`حاشیه سود: ${overallTradeMarginPct.toFixed(1)}%` }
              tone={totalTradeGrossProfit >= 0 ? 'green' : 'red'}
            />
            <Stat
              icon="⏳"
              label="هشدار انقضا (FEFO)"
              value={n(criticalExpiryLots.length)}
              sub={criticalExpiryLots.length ? 'پارت نزدیک به انقضا!' : 'تمام پارت‌ها سالم'}
              tone={criticalExpiryLots.length ? 'red' : 'green'}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div className="subnav-scroll" style={{ paddingBottom: 2, marginBottom: 0 }}>
              {(['all', 'active', 'sold_out', 'expired'] as const).map((filterKey) => {
                const labels: Record<string, string> = {
                  all: `همه پارت‌ها (${tradeLots.length})`,
                  active: 'موجود در سردخانه',
                  sold_out: 'تسویه‌شده / فروش کامل',
                  expired: 'منقضی‌شده',
                };
                return (
                  <button
                    key={filterKey}
                    type="button"
                    className={`btn sm ${lotStatusFilter === filterKey ? 'primary' : ''}`}
                    onClick={() => setLotStatusFilter(filterKey)}
                  >
                    {labels[filterKey]}
                  </button>
                );
              })}
            </div>
            <button
              className="btn primary sm"
              onClick={() => ui.open(<TradeLotForm onClose={ui.close} />)}
            >
              <Icon name="plus" size={14} /> تعریف پارت جدید
            </button>
          </div>

          {filteredLots.length === 0 ? (
            <Empty
              title="پارت بازرگانی یافت نشد"
              text="تاکنون پارت گوشت منجمد با این مشخصات در سردخانه ثبت نشده است."
              action={
                <button
                  className="btn primary"
                  onClick={() => ui.open(<TradeLotForm onClose={ui.close} />)}
                >
                  <Icon name="plus" size={16} /> ثبت اولین پارت بازرگانی
                </button>
              }
            />
          ) : (
            <div className="grid grid-2" style={{ gap: 16 }}>
              {filteredLots.map((lot) => {
                const fefo = getLotFefoStatus(lot.expiryDate);
                const prof = lotProfitSummary(lot);
                const remainingPct = num(lot.initialWeightKg) > 0 ? (prof.remainingKg / num(lot.initialWeightKg)) * 100 : 0;
                const wh = s.warehouses.find((w) => w.id === lot.warehouseId);

                return (
                  <div key={lot.id} className="card p-4 space-y-3" style={{ border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 20 }}>❄️</span>
                          <h3 style={{ margin: 0, fontSize: 16 }}>{lot.productName}</h3>
                          <span className="badge blue font-mono">{lot.code}</span>
                          <span className={`badge ${fefo.badgeClass} font-bold`}>
                            {fefo.label}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                          {lot.supplierName ? `تامین‌کننده: ${lot.supplierName} | ` : ''}
                          {wh ? `انبار: ${wh.name} | ` : ''}
                          دمای نگهداری: {lot.temperatureC ?? -18}°C
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn sm"
                          onClick={() => ui.open(<TradeLotForm lot={lot} onClose={ui.close} />)}
                        >
                          <Icon name="pencil" size={14} /> ویرایش
                        </button>
                      </div>
                    </div>

                    {/* نوار پیشرفت خروج / فروش */}
                    <div style={{ background: 'var(--surface-sunken)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                        <span>
                          موجودی سردخانه: <b className="font-mono text-accent">{n(prof.remainingKg)} kg</b> ({remainingPct.toFixed(0)}%)
                        </span>
                        <span>
                          فروخته‌شده: <b className="font-mono">{n(prof.soldKg)} kg</b> از {n(lot.initialWeightKg)} kg
                        </span>
                      </div>
                      <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${100 - remainingPct}%`,
                            background: 'var(--primary)',
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    </div>

                    {/* اطلاعات مالی و بهای تمام‌شده */}
                    <div className="grid grid-3" style={{ background: 'var(--surface-sunken)', borderRadius: 8, padding: '10px 12px', gap: 8 }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>بهای مؤثر هر کیلو</span>
                        <div style={{ fontWeight: 700, marginTop: 2, fontFamily: 'monospace' }}>
                          {money(prof.effectiveCostPerKg)} تومان
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>میانگین نرخ فروش</span>
                        <div style={{ fontWeight: 700, marginTop: 2, fontFamily: 'monospace', color: 'var(--primary)' }}>
                          {lot.avgSellPricePerKg ? `${money(lot.avgSellPricePerKg)} تومان` : '—'}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>سود ناخالص فروش</span>
                        <div style={{ fontWeight: 700, marginTop: 2, fontFamily: 'monospace', color: prof.grossProfit >= 0 ? '#166534' : '#991B1B' }}>
                          {money(prof.grossProfit)} تومان ({prof.profitMarginPct}%)
                        </div>
                      </div>
                    </div>

                    {/* سوابق فروش‌های انجام‌شده */}
                    {lot.sales && lot.sales.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          آخرین فروش‌های ثبت‌شده از این پارت:
                        </span>
                        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {lot.sales.slice(-3).reverse().map((sale, sIdx) => (
                            <div
                              key={sIdx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.8rem',
                                padding: '4px 8px',
                                background: 'var(--surface-sunken)',
                                borderRadius: 6,
                              }}
                            >
                              <span>{sale.date} — {sale.buyerName || 'مشتری'}</span>
                              <span className="font-mono">
                                {n(sale.qtyKg)} kg @ {money(sale.pricePerKg)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* دکمه‌های اقدام زیر کارت */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        تاریخ ورود: {lot.entryDate} | انقضا: {lot.expiryDate}
                      </span>
                      <button
                        className="btn primary sm"
                        disabled={prof.remainingKg <= 0}
                        onClick={() => setSellingLot(lot)}
                      >
                        <Icon name="upload" size={14} /> ثبت فروش از پارت
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {sellingLot && (
        <LotSaleForm lot={sellingLot} onClose={() => setSellingLot(null)} />
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
        <CardexModal
          item={traceItem}
          onClose={() => setTraceId(null)}
          onEditMove={(m) => setEditingMove(m)}
          onDeleteMove={(m) => deleteMove(m)}
        />
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
