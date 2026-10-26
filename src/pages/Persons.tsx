/** اشخاص — مشتریان و تامین‌کنندگان (CRM) */
import { useState } from 'react';
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Chips, Empty, PageHead, SectionHead, Stat } from '../components/ui';
import { actions, personLabel, useApp } from '../data/store';
import { PERSON_TYPES, PERSON_TYPE_LABEL } from '../data/categories';
import { n } from '../lib/format';
import { PersonForm } from '../forms/crm';

type Filter = 'all' | 'customer' | 'supplier' | 'both';

export function Persons() {
  const s = useApp();
  const ui = useUI();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const all = s.persons.slice().sort((a, b) => a.code.localeCompare(b.code));
  const list = all.filter((p) => {
    if (filter !== 'all' && p.type !== filter) return false;
    if (!q.trim()) return true;
    const t = q.trim();
    return (
      personLabel(p).includes(t) ||
      p.code.includes(t) ||
      (p.phone || '').includes(t) ||
      (p.nationalId || '').includes(t)
    );
  });

  const counts = {
    customers: all.filter((p) => p.type === 'customer' || p.type === 'both').length,
    suppliers: all.filter((p) => p.type === 'supplier' || p.type === 'both').length,
  };

  const remove = async (id: string, name: string) => {
    const ok = await ui.confirm(`«${name}» حذف شود؟ سابقه معاملات حفظ می‌شود.`, {
      danger: true,
      ok: 'حذف',
    });
    if (ok) {
      actions.remove('persons', id);
      ui.toast('شخص حذف شد');
    }
  };

  return (
    <>
      <PageHead
        title="اشخاص"
        sub="مشتریان و تامین‌کنندگان — دفترچه طرف حساب‌ها"
        actions={
          <button className="btn primary" onClick={() => ui.open(<PersonForm onClose={ui.close} />)}>
            <Icon name="plus" size={16} /> شخص جدید
          </button>
        }
      />

      <div className="stats">
        <Stat icon="👥" label="کل اشخاص" value={n(all.length)} sub="در دفترچه" />
        <Stat icon="🛒" label="مشتریان" value={n(counts.customers)} />
        <Stat icon="🚚" label="تامین‌کنندگان" value={n(counts.suppliers)} />
        <Stat
          icon="🤝"
          label="هر دو"
          value={n(all.filter((p) => p.type === 'both').length)}
        />
      </div>

      <div className="card mt">
        <div className="filters">
          <div className="search-box">
            <Icon name="search" size={17} />
            <input
              placeholder="جستجوی نام، کد، تلفن یا کد ملی..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-sm">
          <Chips
            items={[{ value: 'all', label: 'همه' }].concat(PERSON_TYPES)}
            active={filter}
            onPick={(v) => setFilter(v as Filter)}
          />
        </div>
      </div>

      <div className="card mt">
        <SectionHead title="فهرست اشخاص" sub={`${n(list.length)} نفر`} />
        {list.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>کد</th>
                  <th>نام / شرکت</th>
                  <th>نوع</th>
                  <th>تماس</th>
                  <th>کد ملی</th>
                  <th>آدرس</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <b>{p.code}</b>
                    </td>
                    <td>
                      <b>{personLabel(p)}</b>
                      {p.company && (p.firstName || p.lastName) ? (
                        <div className="hint">
                          {p.firstName} {p.lastName}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span
                        className={
                          'badge ' + (p.type === 'supplier' ? 'gray' : p.type === 'both' ? 'brand' : 'green')
                        }
                      >
                        {PERSON_TYPE_LABEL[p.type] || p.type}
                      </span>
                    </td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>
                      {p.phone || '—'}
                    </td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>
                      {p.nationalId || '—'}
                    </td>
                    <td className="hint">{p.address || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button
                          className="icon-btn sm"
                          onClick={() => ui.open(<PersonForm id={p.id} onClose={ui.close} />)}
                        >
                          <Icon name="edit" size={13} />
                        </button>
                        <button className="icon-btn sm" onClick={() => remove(p.id, personLabel(p))}>
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="شخصی ثبت نشده" text="اولین مشتری یا تامین‌کننده را اضافه کنید" />
        )}
      </div>
    </>
  );
}
