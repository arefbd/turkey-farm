/** خوراک، فرمولاسیون صنعتی جیره، و بچ‌های تولید در آسیاب‌میکسر مزرعه (فاز ۴) */
import { useMemo, useState } from 'react';
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Chips, Empty, PageHead, SectionHead, Stat } from '../components/ui';
import { actions, batchCost, flockById, formulaCost, num, useApp } from '../data/store';
import { format } from '../lib/jalali';
import { money, n, short } from '../lib/format';
import { BatchForm, FEED_STAGE_LABELS, FormulaForm } from '../forms';
import type { FeedStage, Formula } from '../data/types';

type FeedTab = 'formulas' | 'batches' | 'matrix';

const BAR_COLORS = [
  '#7C3AED',
  '#0284C7',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#84CC16',
  '#EC4899',
  '#6366F1',
];

const STANDARD_STAGES: Array<{
  stage: FeedStage;
  title: string;
  period: string;
  cp: number;
  me: number;
  ca: number;
  p: number;
  description: string;
}> = [
  {
    stage: 'pre_starter',
    title: 'پیش‌دان (سوپراستارتر)',
    period: 'هفته ۱ تا ۴',
    cp: 28.0,
    me: 2850,
    ca: 1.4,
    p: 0.75,
    description: 'تقویت سیستم گوارش، کیسه زرده و ایمنی جوجه یک‌روزه',
  },
  {
    stage: 'starter',
    title: 'استارتر (آغازین)',
    period: 'هفته ۵ تا ۸',
    cp: 26.0,
    me: 2950,
    ca: 1.3,
    p: 0.7,
    description: 'توسعه اسکلت استخوانی و چارچوب اولیه پرنده',
  },
  {
    stage: 'grower1',
    title: 'میان‌دان ۱ (رشد اولیه)',
    period: 'هفته ۹ تا ۱۲',
    cp: 22.5,
    me: 3050,
    ca: 1.15,
    p: 0.65,
    description: 'رشد سریع توده عضلانی ران و سینه',
  },
  {
    stage: 'grower2',
    title: 'میان‌دان ۲ (رشد تکمیلی)',
    period: 'هفته ۱۳ تا ۱۶',
    cp: 19.5,
    me: 3150,
    ca: 1.0,
    p: 0.6,
    description: 'تثبیت رشد و وزن‌گیری سنگین بوقلمون',
  },
  {
    stage: 'finisher',
    title: 'پس‌دان (فینیشر پایان دوره)',
    period: 'هفته ۱۷ تا کشتار',
    cp: 16.5,
    me: 3250,
    ca: 0.85,
    p: 0.5,
    description: 'کاهش پروتئین و حداکثر انرژی جهت پرواربندی و جلای لاشه',
  },
];

export function Feed() {
  const s = useApp();
  const ui = useUI();
  const [tab, setTab] = useState<FeedTab>('formulas');
  const [stageFilter, setStageFilter] = useState<string>('all');

  const formulas = s.formulas;
  const filteredFormulas = useMemo(() => {
    if (stageFilter === 'all') return formulas;
    return formulas.filter((f) => f.stage === stageFilter);
  }, [formulas, stageFilter]);

  const batches = s.batches.slice().sort((a, b) => b.date.localeCompare(a.date));
  const totalKg = batches.reduce((a, b) => a + num(b.qtyKg), 0);
  const totalCost = batches.reduce((a, b) => a + batchCost(s, b), 0);
  const avgCostPerKg = totalKg > 0 ? Math.round(totalCost / totalKg) : 0;

  const copyFormula = (fm: Formula) => {
    actions.add('formulas', {
      name: fm.name + ' (کپی)',
      code: `FRM-${String(s.formulas.length + 1).padStart(2, '0')}`,
      stage: fm.stage || 'grower1',
      shareMode: fm.shareMode || 'percent',
      targetProtein: fm.targetProtein,
      targetEnergy: fm.targetEnergy,
      note: fm.note,
      items: (fm.items || []).map((i) => ({ ...i })),
    });
    ui.toast('فرمول جیره کپی شد');
  };

  const removeFormula = async (fm: Formula) => {
    const ok = await ui.confirm(`فرمول «${fm.name}» حذف شود؟`, {
      danger: true,
      ok: 'حذف',
    });
    if (ok) {
      actions.remove('formulas', fm.id);
      ui.toast('فرمول جیره حذف شد');
    }
  };

  const removeBatchRecord = async (b: (typeof batches)[number]) => {
    const ok = await ui.confirm(
      `این بچ تولید (${n(b.qtyKg)} کیلوگرم) حذف شود؟` +
        (b.stockDeducted ? ' مواد اولیه کسرشده به انبار بازگردانده شده و خوراک ساخته‌شده حذف می‌گردد.' : ''),
      { danger: true, ok: 'حذف بچ' },
    );
    if (ok) {
      actions.removeBatch(b.id);
      ui.toast('بچ تولید حذف شد و موجودی انبار اصلاح گردید');
    }
  };

  return (
    <>
      <PageHead
        title="خوراک و فرمولاسیون صنعتی جیره"
        sub="فرمولاسیون مراحل ۵‌گانه رشد، بچ‌های تولید آسیاب‌میکسر و بهای تمام‌شده هر کیلو دان"
        actions={
          <>
            <button className="btn" onClick={() => ui.open(<BatchForm onClose={ui.close} />)}>
              <Icon name="plus" size={16} /> ثبت بچ تولید دان
            </button>
            <button className="btn primary" onClick={() => ui.open(<FormulaForm onClose={ui.close} />)}>
              <Icon name="flask" size={16} /> فرمول جیره جدید
            </button>
          </>
        }
      />

      {/* تب‌های بالای صفحه */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          className={`btn ${tab === 'formulas' ? 'primary' : ''}`}
          onClick={() => setTab('formulas')}
        >
          <Icon name="flask" size={16} /> فرمول‌های جیره غذایی ({n(formulas.length)})
        </button>
        <button
          className={`btn ${tab === 'batches' ? 'primary' : ''}`}
          onClick={() => setTab('batches')}
        >
          <Icon name="box" size={16} /> بچ‌های تولید آسیاب‌میکسر ({n(batches.length)})
        </button>
        <button
          className={`btn ${tab === 'matrix' ? 'primary' : ''}`}
          onClick={() => setTab('matrix')}
        >
          <Icon name="chart" size={16} /> ماتریس استاندارد رشد بوقلمون
        </button>
      </div>

      {/* آمار خلاصه خوراک */}
      <div className="stats">
        <Stat icon="🧪" label="فرمول‌های فعال" value={n(formulas.length)} sub="طراحی جیره" />
        <Stat
          icon="⚖️"
          label="کل خوراک تولیدشده"
          value={totalKg >= 1000 ? `${n((totalKg / 1000).toFixed(2))} تن` : `${n(totalKg)} کیلو`}
          sub={`در ${n(batches.length)} بچ تولیدی`}
        />
        <Stat icon="💰" label="ارزش ریالی تولید" value={short(totalCost)} unit="تومان" />
        <Stat
          icon="📉"
          label="میانگین بهای تمام‌شده دان"
          value={money(avgCostPerKg)}
          unit="تومان/کیلو"
          sub="شامل مواد خام و تبدیل"
        />
      </div>

      {tab === 'formulas' && (
        <>
          {/* فیلتر مراحل رشد */}
          <div className="card" style={{ padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>مرحله رشد:</span>
              <Chips
                items={[
                  { value: 'all', label: 'همه مراحل' },
                  { value: 'pre_starter', label: 'پیش‌دان (۱-۴ هفته)' },
                  { value: 'starter', label: 'استارتر (۵-۸ هفته)' },
                  { value: 'grower1', label: 'میان‌دان ۱ (۹-۱۲ هفته)' },
                  { value: 'grower2', label: 'میان‌دان ۲ (۱۳-۱۶ هفته)' },
                  { value: 'finisher', label: 'پس‌دان (۱۷+ هفته)' },
                ]}
                active={stageFilter}
                onPick={(v) => setStageFilter(v)}
              />
            </div>
          </div>

          <div className="card">
            <SectionHead
              title="فرمول‌های جیره غذایی"
              sub={`${n(filteredFormulas.length)} فرمول ثبت‌شده`}
              action={
                <button className="btn sm primary" onClick={() => ui.open(<FormulaForm onClose={ui.close} />)}>
                  <Icon name="plus" size={14} /> فرمول جدید
                </button>
              }
            />
            {filteredFormulas.length ? (
              <div className="grid grid-2">
                {filteredFormulas.map((fm) => {
                  const c = formulaCost(fm);
                  const stageInfo = fm.stage ? FEED_STAGE_LABELS[fm.stage] : null;
                  const isBalanced = Math.abs(c.pct - 100) < 0.5;

                  return (
                    <div
                      className="card"
                      key={fm.id}
                      style={{
                        boxShadow: 'none',
                        border: '1px solid var(--border)',
                        background: '#FAF8FF',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 22 }}>{stageInfo?.icon || '🧪'}</span>
                            <h3 style={{ margin: 0, fontSize: 16 }}>{fm.name}</h3>
                            {fm.code && (
                              <span className="badge gray" style={{ fontSize: '0.78rem' }}>
                                {fm.code}
                              </span>
                            )}
                          </div>
                          {stageInfo && (
                            <div style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, marginTop: 4 }}>
                              {stageInfo.label} ({stageInfo.period})
                            </div>
                          )}
                          {fm.note && <div className="hint" style={{ marginTop: 2 }}>{fm.note}</div>}
                        </div>
                        <button
                          className="icon-btn sm"
                          onClick={() =>
                            ui.sheet({
                              title: `عملیات فرمول ${fm.name}`,
                              items: [
                                { act: 'batch', label: 'ثبت بچ تولید با این فرمول', icon: '🌾' },
                                { act: 'edit', label: 'ویرایش فرمول', icon: '✏️' },
                                { act: 'dup', label: 'کپی فرمول', icon: '📋' },
                                { act: 'del', label: 'حذف فرمول', icon: '🗑️' },
                              ],
                              onPick: (act) => {
                                if (act === 'batch') ui.open(<BatchForm formulaId={fm.id} onClose={ui.close} />);
                                if (act === 'edit') ui.open(<FormulaForm id={fm.id} onClose={ui.close} />);
                                if (act === 'dup') copyFormula(fm);
                                if (act === 'del') removeFormula(fm);
                              },
                            })
                          }
                        >
                          <Icon name="dots" size={16} />
                        </button>
                      </div>

                      <div
                        className="grid grid-3"
                        style={{
                          gap: 6,
                          margin: '12px 0 10px',
                          background: 'var(--surface-sunken)',
                          borderRadius: 8,
                          padding: '10px 12px',
                        }}
                      >
                        <div>
                          <div className="hint" style={{ fontSize: '0.78rem' }}>بهای هر کیلو</div>
                          <b style={{ fontSize: '0.98rem', color: 'var(--primary)' }}>{money(c.cost)} تومان</b>
                        </div>
                        <div>
                          <div className="hint" style={{ fontSize: '0.78rem' }}>پروتئین خام (CP)</div>
                          <b style={{ fontSize: '0.98rem' }}>{n(c.protein, 1)}٪</b>
                        </div>
                        <div>
                          <div className="hint" style={{ fontSize: '0.78rem' }}>موازنه ترکیب</div>
                          <b style={{ fontSize: '0.98rem', color: isBalanced ? '#059669' : '#DC2626' }}>
                            {n(c.pct, 1)}٪ {isBalanced ? '✓' : '⚠️'}
                          </b>
                        </div>
                      </div>

                      {/* نوار رنگی مواد اولیه */}
                      <div style={{ marginTop: 'auto' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                          ترکیبات ({n(fm.items.length)} ماده اولیه):
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            gap: 3,
                            height: 8,
                            borderRadius: 6,
                            overflow: 'hidden',
                          }}
                        >
                          {fm.items.map((it, i) => (
                            <span
                              key={i}
                              title={`${it.name}: ${n(it.percent)}٪`}
                              style={{
                                width: `${Math.max(1, num(it.percent))}%`,
                                background: BAR_COLORS[i % BAR_COLORS.length],
                              }}
                            />
                          ))}
                        </div>
                        <div className="hint" style={{ marginTop: 6, fontSize: '0.78rem' }}>
                          {fm.items.slice(0, 3).map((it) => `${it.name} (${n(it.percent)}٪)`).join(' · ')}
                          {fm.items.length > 3 ? ' ...' : ''}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <button
                            className="btn sm primary block"
                            onClick={() => ui.open(<BatchForm formulaId={fm.id} onClose={ui.close} />)}
                          >
                            <Icon name="plus" size={14} /> ثبت بچ تولید با این فرمول
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty title="فرمولی ثبت نشده است" text="با دکمه «فرمول جیره جدید» اولین فرمول غذایی را بسازید" />
            )}
          </div>
        </>
      )}

      {tab === 'batches' && (
        <div className="card">
          <SectionHead
            title="بچ‌های تولید خوراک (آسیاب‌میکسر مزرعه)"
            sub={`${n(batches.length)} بچ ثبت‌شده`}
            action={
              <button className="btn sm primary" onClick={() => ui.open(<BatchForm onClose={ui.close} />)}>
                <Icon name="plus" size={14} /> ثبت بچ جدید
              </button>
            }
          />
          {batches.length ? (
            <div className="tbl-wrap">
              <table className="tbl" style={{ fontSize: '0.87rem' }}>
                <thead>
                  <tr>
                    <th>کد و تاریخ</th>
                    <th>فرمول جیره</th>
                    <th>مقدار تولید</th>
                    <th>گله / سالن</th>
                    <th>انبار مبدأ ➔ مقصد</th>
                    <th>نرخ هر کیلو</th>
                    <th>ارزش کل بچ</th>
                    <th>انبار و حسابداری</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => {
                    const fm = s.formulas.find((x) => x.id === b.formulaId);
                    const flock = b.flockId ? flockById(s, b.flockId) : null;
                    const bCost = batchCost(s, b);
                    const perKg = num(b.qtyKg) > 0 ? Math.round(bCost / num(b.qtyKg)) : 0;
                    const srcW = b.sourceWarehouseId ? s.warehouses.find((w) => w.id === b.sourceWarehouseId) : null;
                    const tgtW = b.targetWarehouseId ? s.warehouses.find((w) => w.id === b.targetWarehouseId) : null;

                    return (
                      <tr key={b.id}>
                        <td>
                          <b>{b.code || 'BATCH'}</b>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {format(b.date, 'short')}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{fm ? fm.name : 'فرمول حذف‌شده'}</span>
                        </td>
                        <td className="num-cell">
                          <b>{n(b.qtyKg)} کیلو</b>
                        </td>
                        <td>
                          {flock ? (
                            <span className="badge purple" style={{ fontSize: '0.78rem' }}>
                              {flock.name}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>عمومی مزرعه</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>
                          <span>{srcW?.name || 'انبار خام'}</span>
                          <span style={{ color: 'var(--primary)', margin: '0 4px' }}>➔</span>
                          <span>{tgtW?.name || 'انبار خوراک'}</span>
                        </td>
                        <td className="num-cell">{money(perKg)} تومان</td>
                        <td className="num-cell" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {money(bCost)} تومان
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {b.stockDeducted && (
                              <span style={{ color: '#059669', fontSize: '0.75rem' }}>✓ کسر مواد اولیه</span>
                            )}
                            {b.expensed && (
                              <span style={{ color: '#0284C7', fontSize: '0.75rem' }}>✓ ثبت در هزینه</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            className="icon-btn sm"
                            title="حذف بچ"
                            onClick={() => removeBatchRecord(b)}
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="هنوز بچ تولیدی ثبت نشده است" text="با کلید «ثبت بچ تولید دان» گزارش تولید خود را ثبت کنید" />
          )}
        </div>
      )}

      {tab === 'matrix' && (
        <div className="card">
          <SectionHead
            title="راهنمای استانداردهای تغذیه‌ای و نیازهای رشد بوقلمون گوشتی"
            sub="بر مبنای استاندارد جهانی نژادهای B.U.T 6 و Hybrid Converter"
          />
          <div className="tbl-wrap">
            <table className="tbl" style={{ fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th>مرحله جیره</th>
                  <th>دوره سنی</th>
                  <th>پروتئین خام استاندارد (CP)</th>
                  <th>انرژی متابولیسمی (ME)</th>
                  <th>کلسیم (Ca)</th>
                  <th>فسفر در دسترس (P)</th>
                  <th>هدف و توصیه‌های فیزیولوژیک</th>
                  <th style={{ width: 130 }} />
                </tr>
              </thead>
              <tbody>
                {STANDARD_STAGES.map((st) => (
                  <tr key={st.stage}>
                    <td>
                      <b style={{ color: 'var(--primary)' }}>{st.title}</b>
                    </td>
                    <td>{st.period}</td>
                    <td className="num-cell">
                      <b>{n(st.cp, 1)}٪</b>
                    </td>
                    <td className="num-cell">{n(st.me)} kcal/kg</td>
                    <td className="num-cell">{n(st.ca, 2)}٪</td>
                    <td className="num-cell">{n(st.p, 2)}٪</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{st.description}</td>
                    <td>
                      <button
                        className="btn sm"
                        onClick={() => {
                          ui.open(
                            <FormulaForm
                              onClose={ui.close}
                            />,
                          );
                        }}
                      >
                        طراحی فرمول
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
