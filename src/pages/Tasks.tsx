/** کارها، یادآورها و تقویم عملیات */
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { PageHead, SectionHead, Stat } from '../components/ui';
import { actions, flockLabel, useApp } from '../data/store';
import { format, jdn, today } from '../lib/jalali';
import { n } from '../lib/format';
import { TaskForm } from '../forms';
import type { Task } from '../data/types';

export function Tasks() {
  const s = useApp();
  const ui = useUI();

  const t0 = today();
  const all = s.tasks.slice().sort((a, b) => jdn(a.date) - jdn(b.date));
  const overdue = all.filter((x) => !x.done && jdn(x.date) < jdn(t0));
  const todays = all.filter((x) => !x.done && x.date === t0);
  const upcoming = all.filter((x) => !x.done && jdn(x.date) > jdn(t0));
  const done = all.filter((x) => x.done).reverse();

  const row = (t: Task) => {
    const flock = t.flockId ? flockLabel(s, t.flockId) : '';
    const late = !t.done && jdn(t.date) < jdn(t0);
    return (
      <div className="row" key={t.id}>
        <button
          className="row-ic"
          style={{
            background: t.done ? '#ECFDF5' : '#F4EEFF',
            color: t.done ? '#059669' : '#6D28D9',
            border: 0,
          }}
          onClick={() => actions.update('tasks', t.id, { done: !t.done })}
          aria-label="تغییر وضعیت"
        >
          <Icon name={t.done ? 'check' : 'bell'} size={17} />
        </button>
        <div className="row-main">
          <div
            className="row-title"
            style={t.done ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}
          >
            {t.title}
          </div>
          <div className="row-sub">
            {format(t.date, 'long')}
            {late ? <span style={{ color: '#DC2626' }}> · عقب‌افتاده</span> : null}
            {flock ? ' · ' + flock : ''}
            {t.note ? ' · ' + t.note : ''}
          </div>
        </div>
        <div className="row-side">
          <span className={'badge ' + (t.done ? 'green' : late ? 'red' : 'gray')}>
            {t.done ? 'انجام شد' : t.type || 'عمومی'}
          </span>
        </div>
        <div className="row-acts">
          <button className="icon-btn sm" onClick={() => ui.open(<TaskForm id={t.id} onClose={ui.close} />)}>
            <Icon name="edit" size={15} />
          </button>
          <button
            className="icon-btn sm"
            onClick={async () => {
              const ok = await ui.confirm('این کار حذف شود؟', { danger: true, ok: 'حذف' });
              if (ok) actions.remove('tasks', t.id);
            }}
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      </div>
    );
  };

  const group = (title: string, items: Task[], emptyText?: string) => {
    if (!items.length && !emptyText) return null;
    return (
      <div className="card mt">
        <SectionHead title={title} sub={`${n(items.length)} مورد`} />
        {items.length ? (
          <div className="rows">{items.map(row)}</div>
        ) : (
          <div className="hint" style={{ padding: '8px 2px' }}>
            {emptyText}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <PageHead
        title="کارها و یادآورها"
        sub="برنامه عملیات روزانه مزرعه را از دست ندهید"
        actions={
          <button className="btn primary" onClick={() => ui.open(<TaskForm onClose={ui.close} />)}>
            <Icon name="plus" size={16} /> کار جدید
          </button>
        }
      />

      <div className="stats">
        <Stat icon="⏰" label="عقب‌افتاده" value={n(overdue.length)} sub="نیازمند رسیدگی" />
        <Stat icon="📅" label="امروز" value={n(todays.length)} sub={format(t0, 'long')} />
        <Stat icon="🔜" label="پیش‌رو" value={n(upcoming.length)} sub="برنامه آینده" />
        <Stat icon="✅" label="انجام‌شده" value={n(done.length)} sub="کل دوره" />
      </div>

      {group('عقب‌افتاده', overdue, 'همه کارها به‌موقع انجام شده‌اند.')}
      {group('امروز', todays, 'برای امروز کاری ثبت نشده است.')}
      {group('پیش‌رو', upcoming)}
      {group('انجام‌شده', done.slice(0, 12))}
    </>
  );
}
