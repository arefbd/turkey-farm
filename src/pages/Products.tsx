/** کالاها و محصولات — کاتالوگ جامع کالاهای مزرعه (جوجه، گوشت، خوراک، دارو و ...) */
import { useMemo, useState } from 'react';
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Chips, Empty, PageHead, SectionHead, Stat } from '../components/ui';
import { actions, useApp } from '../data/store';
import { money, n } from '../lib/format';
import { ProductForm } from '../forms';
import type { Product } from '../data/types';

export function Products() {
  const s = useApp();
  const ui = useUI();
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [q, setQ] = useState('');

  const products: Product[] = s.products || [];

  // استخراج دسته‌های متمایز موجود
  const categories = useMemo(() => {
    const set = new Set<string>();
    const defaults =
      s.settings.productCategories && s.settings.productCategories.length
        ? s.settings.productCategories
        : ['جوجه', 'گوشت', 'دان و خوراک', 'دارو و واکسن', 'لوازم و تجهیزات', 'بسته‌بندی'];
    defaults.forEach((c) => {
      if (c) set.add(c.trim());
    });
    products.forEach((p) => {
      if (p.category) set.add(p.category.trim());
    });
    return Array.from(set);
  }, [products, s.settings.productCategories]);

  const promptNewCategory = () => {
    const name = window.prompt('نام دسته جدید را وارد کنید: (مثلاً آلایش، پر، مکمل، تجهیزات)');
    if (!name || !name.trim()) return;
    const cat = name.trim();
    const updated = Array.from(new Set([...categories, cat]));
    actions.setSettings({ productCategories: updated });
    setSelectedCat(cat);
    ui.toast(`دسته «${cat}» ایجاد و اضافه شد`);
  };

  // فیلتر و جستجو
  const list = useMemo(() => {
    return products.filter((p) => {
      if (selectedCat !== 'all' && p.category !== selectedCat) return false;
      if (!q.trim()) return true;
      const term = q.trim().toLowerCase();
      return (
        (p.name || '').toLowerCase().includes(term) ||
        (p.category || '').toLowerCase().includes(term) ||
        (p.unit || '').toLowerCase().includes(term) ||
        (p.code || '').toLowerCase().includes(term) ||
        (p.note || '').toLowerCase().includes(term)
      );
    });
  }, [products, selectedCat, q]);

  const stats = useMemo(() => {
    const total = products.length;
    const chickCount = products.filter((p) => p.category === 'جوجه').length;
    const meatCount = products.filter((p) => p.category === 'گوشت').length;
    const feedCount = products.filter((p) => p.category === 'دان و خوراک' || p.category === 'دان').length;
    return { total, chickCount, meatCount, feedCount };
  }, [products]);

  const removeProduct = async (p: Product) => {
    const ok = await ui.confirm(`کالای «${p.name}» (دسته ${p.category}) حذف شود؟`, {
      danger: true,
      ok: 'حذف',
    });
    if (ok) {
      actions.remove('products', p.id);
      ui.toast('کالا حذف شد');
    }
  };

  const toggleActive = (p: Product) => {
    const nextState = p.active === false ? true : false;
    actions.update('products', p.id, { active: nextState });
    ui.toast(nextState ? 'کالا فعال شد' : 'کالا غیرفعال شد');
  };

  return (
    <>
      <PageHead
        title="کالاها و محصولات"
        sub="تعریف و دسته‌بندی کالاها و محصولات مزرعه (جوجه، گوشت، دان، دارو و ...) با واحد سنجش"
        actions={
          <button
            className="btn primary"
            onClick={() => ui.open(<ProductForm onClose={ui.close} />)}
          >
            <Icon name="plus" size={16} /> کالا و محصول جدید
          </button>
        }
      />

      <div className="stats">
        <Stat icon="📦" label="کل کالاها و محصولات" value={n(stats.total)} sub="کالای تعریف‌شده" />
        <Stat icon="🐣" label="محصولات جوجه" value={n(stats.chickCount)} sub="یک روزه، نیمچه و..." />
        <Stat icon="🍗" label="محصولات گوشت" value={n(stats.meatCount)} sub="لاشه، ران، سینه و..." />
        <Stat icon="🌾" label="دان و خوراک" value={n(stats.feedCount)} sub="پیش‌دان، ذرت و..." />
      </div>

      <div className="card mt">
        <div className="filters">
          <div className="search-box">
            <Icon name="search" size={17} />
            <input
              placeholder="جستجوی نام کالا، دسته، واحد یا کد..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-sm" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Chips
              items={[{ value: 'all', label: `همه (${n(products.length)})` }].concat(
                categories.map((c) => ({
                  value: c,
                  label: `${c} (${n(products.filter((p) => p.category === c).length)})`,
                })),
              )}
              active={selectedCat}
              onPick={(v) => setSelectedCat(v)}
            />
          </div>
          <button className="btn sm ghost" onClick={promptNewCategory} title="افزودن دسته جدید">
            <Icon name="plus" size={14} /> تعریف دسته جدید
          </button>
        </div>
      </div>

      <div className="card mt">
        <SectionHead
          title="فهرست کالاها و محصولات"
          sub={`${n(list.length)} کالا در این نما`}
          action={
            <button
              className="btn sm"
              onClick={() => ui.open(<ProductForm onClose={ui.close} />)}
            >
              <Icon name="plus" size={14} /> افزودن کالا
            </button>
          }
        />

        {list.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>کد</th>
                  <th>دسته</th>
                  <th>نام کالا / محصول</th>
                  <th style={{ width: 110 }}>واحد</th>
                  <th style={{ width: 130 }}>قیمت واحد پیش‌فرض</th>
                  <th style={{ width: 100 }}>وضعیت</th>
                  <th style={{ width: 110 }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const isActive = p.active !== false;
                  return (
                    <tr key={p.id} style={{ opacity: isActive ? 1 : 0.6 }}>
                      <td>
                        <span className="mono" style={{ fontSize: 12 }}>
                          {p.code || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="badge brand" style={{ fontSize: 12 }}>
                          {p.category}
                        </span>
                      </td>
                      <td>
                        <b>{p.name}</b>
                        {p.note ? (
                          <div className="hint" style={{ fontSize: 11, marginTop: 2 }}>
                            {p.note}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <span className="badge gray">{p.unit}</span>
                      </td>
                      <td className="num-cell">
                        {p.defaultPrice ? money(p.defaultPrice) : '—'}
                      </td>
                      <td>
                        <button
                          className={`badge ${isActive ? 'green' : 'gray'}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          title="کلیک برای تغییر وضعیت"
                          onClick={() => toggleActive(p)}
                        >
                          {isActive ? 'فعال' : 'غیرفعال'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="icon-btn sm"
                            title="ویرایش"
                            onClick={() => ui.open(<ProductForm id={p.id} onClose={ui.close} />)}
                          >
                            <Icon name="edit" size={14} />
                          </button>
                          <button
                            className="icon-btn sm"
                            title="حذف"
                            onClick={() => removeProduct(p)}
                          >
                            <Icon name="trash" size={14} />
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
          <Empty
            title="کالایی یافت نشد"
            text={q ? 'با عبارت جستجوی فعلی کالایی پیدا نشد' : 'هنوز کالایی در این دسته تعریف نشده است'}
            action={
              <button
                className="btn primary sm"
                onClick={() => ui.open(<ProductForm onClose={ui.close} />)}
              >
                <Icon name="plus" size={14} /> تعریف اولین کالا
              </button>
            }
          />
        )}
      </div>
    </>
  );
}
