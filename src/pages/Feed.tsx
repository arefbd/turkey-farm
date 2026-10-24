/** خوراک و فرمول ساختگی */
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Empty, PageHead, Row, SectionHead, Stat } from '../components/ui';
import { actions, batchCost, formulaCost, num, useApp } from '../data/store';
import { format } from '../lib/jalali';
import { n, short } from '../lib/format';
import { BatchForm, FormulaForm } from '../forms';

const BAR_COLORS = ['#6D28D9', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE', '#F5F3FF'];

export function Feed() {
  const s = useApp();
  const ui = useUI();

  const formulas = s.formulas;
  const batches = s.batches.slice().sort((a, b) => b.date.localeCompare(a.date));
  const totalKg = batches.reduce((a, b) => a + num(b.qtyKg), 0);
  const totalCost = batches.reduce((a, b) => a + batchCost(s, b), 0);

  return (
    <>
      <PageHead
        title="خوراک و فرمول ساختگی"
        sub="ساخت دان با فرمول اختصاصی (ذرت، سویا، روغن و ...)"
        actions={
          <>
            <button className="btn" onClick={() => ui.open(<BatchForm onClose={ui.close} />)}>
              <Icon name="plus" size={16} /> ثبت بچ تولید
            </button>
            <button className="btn primary" onClick={() => ui.open(<FormulaForm onClose={ui.close} />)}>
              <Icon name="flask" size={16} /> فرمول جدید
            </button>
          </>
        }
      />

      <div className="stats">
        <Stat icon="🧪" label="تعداد فرمول" value={n(formulas.length)} sub="فرمول فعال" />
        <Stat icon="⚖️" label="خوراک تولیدشده" value={n(totalKg)} unit="کیلو" sub={`در ${n(batches.length)} بچ`} />
        <Stat icon="💰" label="ارزش تولید" value={short(totalCost)} unit="تومان" />
        <Stat icon="📉" label="میانگین هر کیلو" value={short(totalKg ? totalCost / totalKg : 0)} unit="تومان" />
      </div>

      <div className="card mt">
        <SectionHead title="فرمول‌های خوراک" sub={`${n(formulas.length)} فرمول`} />
        {formulas.length ? (
          <div className="grid grid-2">
            {formulas.map((fm) => {
              const c = formulaCost(fm);
              return (
                <div
                  className="card"
                  key={fm.id}
                  style={{ boxShadow: 'none', border: '1px solid var(--line)', background: '#FCFAFF' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                    <div>
                      <b style={{ fontSize: 13.5 }}>{fm.name}</b>
                      <div className="hint">{fm.note || ''}</div>
                    </div>
                    <button
                      className="icon-btn sm"
                      onClick={() =>
                        ui.sheet({
                          title: 'عملیات فرمول',
                          items: [
                            { act: 'edit', label: 'ویرایش فرمول', icon: '✏️' },
                            { act: 'dup', label: 'کپی فرمول', icon: '📋' },
                            { act: 'del', label: 'حذف فرمول', icon: '🗑️' },
                          ],
                          onPick: async (act) => {
                            if (act === 'edit') ui.open(<FormulaForm id={fm.id} onClose={ui.close} />);
                            if (act === 'dup') {
                              actions.add('formulas', {
                                name: fm.name + ' (کپی)',
                                note: fm.note,
                                items: fm.items.map((i) => ({ ...i })),
                              });
                              ui.toast('فرمول کپی شد');
                            }
                            if (act === 'del') {
                              const ok = await ui.confirm('این فرمول حذف شود؟', {
                                danger: true,
                                ok: 'حذف',
                              });
                              if (ok) actions.remove('formulas', fm.id);
                            }
                          },
                        })
                      }
                    >
                      <Icon name="dots" size={16} />
                    </button>
                  </div>

                  <div className="grid grid-3" style={{ gap: 6, margin: '12px 0 10px' }}>
                    <div>
                      <div className="hint">هزینه هر کیلو</div>
                      <b style={{ fontSize: 14 }}>{n(c.cost)}</b>
                    </div>
                    <div>
                      <div className="hint">پروتئین</div>
                      <b style={{ fontSize: 14 }}>{n(c.protein, 1)}٪</b>
                    </div>
                    <div>
                      <div className="hint">جمع درصد</div>
                      <b
                        style={{
                          fontSize: 14,
                          color: Math.abs(c.pct - 100) > 0.5 ? '#DC2626' : '#059669',
                        }}
                      >
                        {n(c.pct, 1)}٪
                      </b>
                    </div>
                  </div>

                  <div className="progress-row">
                    <span>ترکیبات</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 4,
                      marginTop: 6,
                      height: 8,
                      borderRadius: 6,
                      overflow: 'hidden',
                    }}
                  >
                    {fm.items.map((it, i) => (
                      <span
                        key={i}
                        title={it.name}
                        style={{ width: num(it.percent) + '%', background: BAR_COLORS[i % BAR_COLORS.length] }}
                      />
                    ))}
                  </div>
                  <div className="hint" style={{ marginTop: 6 }}>
                    {fm.items.length} ماده اولیه · {fm.items[0] ? fm.items[0].name : ''} و ...
                  </div>
                  <button
                    className="btn sm block mt-sm"
                    onClick={() => ui.open(<BatchForm formulaId={fm.id} onClose={ui.close} />)}
                  >
                    ثبت بچ تولید با این فرمول
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty title="فرمولی ثبت نشده" text="اولین فرمول خوراک را بسازید" />
        )}
      </div>

      <div className="card mt">
        <SectionHead title="بچ‌های تولید خوراک" sub={`${n(batches.length)} بچ`} />
        {batches.length ? (
          <div className="rows">
            {batches.map((b) => {
              const fm = s.formulas.find((x) => x.id === b.formulaId);
              return (
                <Row
                  key={b.id}
                  icon="🌾"
                  iconBg="#ECFEFF"
                  title={fm ? fm.name : 'فرمول حذف‌شده'}
                  sub={
                    `${format(b.date, 'long')} · ${n(b.qtyKg)} کیلو` +
                    (b.flockId ? ' · ' + b.flockId : '') +
                    (b.expensed ? ' · ثبت در هزینه‌ها' : ' · ثبت نشده در هزینه')
                  }
                  amount={short(batchCost(s, b))}
                  actions={
                    <button
                      className="icon-btn sm"
                      onClick={async () => {
                        const ok = await ui.confirm('این بچ تولید حذف شود؟', {
                          danger: true,
                          ok: 'حذف',
                        });
                        if (ok) actions.remove('batches', b.id);
                      }}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  }
                />
              );
            })}
          </div>
        ) : (
          <Empty title="بچی ثبت نشده" text="تولید خوراک را ثبت کنید" />
        )}
      </div>
    </>
  );
}
