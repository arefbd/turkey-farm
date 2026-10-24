/** هزینه‌ها — فیلتر، جستجو، خروجی و نمودار دسته‌ها */
import { useEffect, useMemo, useState } from 'react';
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Donut } from '../components/Charts';
import { Chips, Empty, PageHead, Row, SectionHead, Stat } from '../components/ui';
import { FormModal } from '../components/Form';
import { actions, byCategory, filterExpenses, partnerName, flockLabel, num, useApp } from '../data/store';
import { CATEGORIES, CAT_MAP } from '../data/categories';
import { addDays, format, today } from '../lib/jalali';
import { download, n, short, toCsv } from '../lib/format';
import { ExpenseForm } from '../forms';

const EMPTY_FILTER = { cat: '', flockId: '', from: '', to: '', q: '' };

export function Expenses() {
  const s = useApp();
  const ui = useUI();

  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(40);

  useEffect(() => {
    const id = setTimeout(() => {
      setFilter((f) => ({ ...f, q: query }));
      setLimit(40);
    }, 320);
    return () => clearTimeout(id);
  }, [query]);

  const list = useMemo(() => filterExpenses(s, filter), [s, filter]);
  const total = list.reduce((a, b) => a + num(b.amount), 0);
  const allCats = byCategory(s, filter);
  const byCat = allCats.slice(0, 4);
  const avg = list.length ? total / list.length : 0;
  const hasFilter = !!(filter.cat || filter.flockId || filter.from || filter.q);

  const chartCats = allCats.slice(0, 5).map((c) => ({ label: c.label, value: c.value, color: c.color }));
  const restCats = allCats.slice(5).reduce((a, c) => a + c.value, 0);
  if (restCats > 0) chartCats.push({ label: 'سایر', value: restCats, color: '#CBD5E1' });

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [
      ['تاریخ', 'دسته', 'زیردسته', 'عنوان', 'مبلغ', 'مقدار', 'واحد', 'پرداخت‌کننده', 'گله', 'طرف حساب', 'یادداشت'],
    ];
    list.forEach((x) => {
      const c = CAT_MAP[x.category] || { label: x.category };
      rows.push([
        x.date,
        c.label,
        x.sub || '',
        x.title,
        num(x.amount),
        x.qty || '',
        x.unit || '',
        partnerName(s, x.paidBy),
        flockLabel(s, x.flockId),
        x.vendor || '',
        x.note || '',
      ]);
    });
    download(`expenses-${today().replace(/\//g, '-')}.csv`, toCsv(rows));
    ui.toast('فایل خروجی آماده شد');
  };

  const openRange = () => {
    ui.open(
      <FormModal
        title="فیلتر بازه تاریخ"
        fields={[
          { name: 'from', label: 'از تاریخ', type: 'date', col: 'half' },
          { name: 'to', label: 'تا تاریخ', type: 'date', col: 'half' },
        ]}
        initial={{ from: filter.from, to: filter.to }}
        submitText="اعمال فیلتر"
        onClose={ui.close}
        extra={(_v, setValue) => (
          <div className="chips" style={{ marginTop: 10 }}>
            {[
              { days: 7, label: '۷ روز اخیر' },
              { days: 30, label: '۳۰ روز اخیر' },
              { days: 90, label: '۳ ماه اخیر' },
            ].map((q) => (
              <button
                key={q.days}
                type="button"
                className="chip"
                onClick={() => {
                  setValue('from', addDays(today(), -q.days));
                  setValue('to', today());
                }}
              >
                {q.label}
              </button>
            ))}
          </div>
        )}
        onSubmit={(v) => {
          setFilter((f) => ({ ...f, from: String(v.from || ''), to: String(v.to || '') }));
          setLimit(40);
        }}
      />,
    );
  };

  return (
    <>
      <PageHead
        title="هزینه‌ها"
        sub="ثبت و پیگیری تمام هزینه‌های مزرعه"
        actions={
          <>
            <button className="btn" onClick={exportCsv}>
              <Icon name="download" size={16} /> خروجی اکسل
            </button>
            <button className="btn primary" onClick={() => ui.open(<ExpenseForm onClose={ui.close} />)}>
              <Icon name="plus" size={16} /> هزینه جدید
            </button>
          </>
        }
      />

      <div className="stats">
        <Stat icon="💸" label="جمع هزینه‌های فیلتر" value={short(total)} unit="تومان" sub={`${n(list.length)} رکورد`} />
        <Stat icon="📊" label="میانگین هر رکورد" value={short(avg)} unit="تومان" />
        <Stat
          icon={byCat[0] ? byCat[0].icon : '📦'}
          label="بیشترین دسته"
          value={byCat[0] ? byCat[0].label : '—'}
          sub={byCat[0] ? short(byCat[0].value) + ' تومان' : ''}
        />
        <Stat
          icon="🧾"
          label="تعداد دسته‌های فعال"
          value={n(allCats.length)}
          sub={`از ${n(CATEGORIES.length)} دسته`}
        />
      </div>

      <div className="card mt">
        <div className="filters">
          <div className="search-box">
            <Icon name="search" size={17} />
            <input
              placeholder="جستجوی عنوان، طرف حساب یا یادداشت..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="input"
            style={{ width: 'auto', minWidth: 150 }}
            value={filter.flockId}
            onChange={(e) => {
              setFilter((f) => ({ ...f, flockId: e.target.value }));
              setLimit(40);
            }}
          >
            <option value="">همه گله‌ها</option>
            {s.flocks.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <button className="btn sm" onClick={openRange}>
            <Icon name="calendar" size={15} /> بازه تاریخ
          </button>
          {hasFilter ? (
            <button
              className="btn sm ghost"
              onClick={() => {
                setFilter(EMPTY_FILTER);
                setQuery('');
                setLimit(40);
              }}
            >
              حذف فیلترها
            </button>
          ) : null}
        </div>

        <div className="mt-sm">
          <Chips
            items={[{ value: '', label: 'همه دسته‌ها' }].concat(
              CATEGORIES.map((c) => ({ value: c.id, label: `${c.icon} ${c.label}` })),
            )}
            active={filter.cat}
            onPick={(v) => {
              setFilter((f) => ({ ...f, cat: v }));
              setLimit(40);
            }}
          />
        </div>

        {filter.from || filter.to ? (
          <div className="hint" style={{ marginTop: 6 }}>
            بازه: {filter.from ? format(filter.from, 'long') : 'ابتدا'} تا{' '}
            {filter.to ? format(filter.to, 'long') : 'اکنون'}
          </div>
        ) : null}
      </div>

      <div className="card mt">
        <SectionHead title="فهرست هزینه‌ها" sub={`${n(list.length)} رکورد`} />
        {list.length ? (
          <div className="rows">
            {list.slice(0, limit).map((x) => {
              const c = CAT_MAP[x.category] || { icon: '📦', label: x.category, color: '#94A3B8' };
              return (
                <Row
                  key={x.id}
                  icon={c.icon}
                  iconBg={c.color + '1A'}
                  title={x.title}
                  sub={
                    `${c.label}${x.sub ? ' / ' + x.sub : ''} · ${partnerName(s, x.paidBy)}` +
                    (x.flockId ? ' · ' + flockLabel(s, x.flockId) : '')
                  }
                  amount={n(x.amount)}
                  amountTone="neg"
                  amountSub={format(x.date, 'long')}
                  actions={
                    <>
                      <button
                        className="icon-btn sm"
                        onClick={() => ui.open(<ExpenseForm id={x.id} onClose={ui.close} />)}
                      >
                        <Icon name="edit" size={15} />
                      </button>
                      <button
                        className="icon-btn sm"
                        onClick={async () => {
                          const ok = await ui.confirm(
                            'این هزینه حذف شود؟ این عمل قابل بازگشت نیست.',
                            { danger: true, ok: 'حذف' },
                          );
                          if (ok) {
                            actions.remove('expenses', x.id);
                            ui.toast('هزینه حذف شد');
                          }
                        }}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </>
                  }
                />
              );
            })}
          </div>
        ) : (
          <Empty title="هزینه‌ای یافت نشد" text="با تغییر فیلترها دوباره تلاش کنید" />
        )}

        {list.length > limit ? (
          <button className="btn block mt" onClick={() => setLimit((l) => l + 40)}>
            نمایش بیشتر ({n(list.length - limit)} مورد)
          </button>
        ) : null}
      </div>

      {chartCats.length ? (
        <div className="card mt">
          <SectionHead title="نمودار دسته‌ها" />
          <div className="donut-wrap">
            <Donut items={chartCats} size={150} centerLabel="جمع" centerValue={short(total)} />
            <div className="donut-legend">
              {chartCats.map((c, i) => (
                <div className="dl" key={i}>
                  <i style={{ background: c.color }} />
                  <span>{c.label}</span>
                  <b>{short(c.value)}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
