/** حساب‌ها — صندوق مشترک، بانک و جیب شرکا */
import { useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Empty, PageHead, SectionHead, Stat } from '../components/ui';
import { accountBalance, actions, partnerById, useApp } from '../data/store';
import { n, short } from '../lib/format';
import { AccountForm } from '../forms/crm';

const KIND_ICON: Record<string, string> = {
  'صندوق مشترک': '💵',
  بانک: '🏦',
  'جیب شریک': '👤',
};

export function Accounts() {
  const s = useApp();
  const ui = useUI();

  const accounts = s.accounts
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code));
  const total = accounts.reduce((a, x) => a + accountBalance(s, x.id), 0);
  const banks = accounts.filter((a) => a.kind === 'بانک').length;
  const pockets = accounts.filter((a) => a.kind === 'جیب شریک').length;

  const remove = async (id: string, name: string) => {
    const ok = await ui.confirm(`حساب «${name}» حذف شود؟ اسناد مرتبط دست‌نخورده می‌مانند.`, {
      danger: true,
      ok: 'حذف',
    });
    if (ok) {
      actions.remove('accounts', id);
      ui.toast('حساب حذف شد');
    }
  };

  return (
    <>
      <PageHead
        title="حساب‌ها"
        sub="صندوق مشترک، حساب بانکی و جیب هر شریک"
        actions={
          <button className="btn primary" onClick={() => ui.open(<AccountForm onClose={ui.close} />)}>
            <Icon name="plus" size={16} /> حساب جدید
          </button>
        }
      />

      <div className="stats">
        <Stat icon="🧾" label="تعداد حساب" value={n(accounts.length)} sub="فعال و غیرفعال" />
        <Stat icon="💰" label="جمع موجودی" value={short(total)} unit="تومان" />
        <Stat icon="🏦" label="حساب بانکی" value={n(banks)} />
        <Stat icon="👤" label="جیب شریک" value={n(pockets)} />
      </div>

      <div className="card mt">
        <SectionHead title="فهرست حساب‌ها" sub={`${n(accounts.length)} حساب`} />
        {accounts.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>کد</th>
                  <th>نوع حساب</th>
                  <th>نام حساب</th>
                  <th>شریک</th>
                  <th>موجودی اولیه</th>
                  <th>موجودی فعلی</th>
                  <th>وضعیت</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => {
                  const bal = accountBalance(s, a.id);
                  const p = a.partnerId ? partnerById(s, a.partnerId) : null;
                  return (
                    <tr key={a.id} style={a.active === false ? { opacity: 0.55 } : undefined}>
                      <td className="num-cell">{a.code}</td>
                      <td>
                        <span className="badge gray">
                          {KIND_ICON[a.kind] || '🧾'} {a.kind}
                        </span>
                      </td>
                      <td>
                        <b>{a.name}</b>
                        {a.note ? <div className="hint">{a.note}</div> : null}
                      </td>
                      <td>{p ? p.name : '—'}</td>
                      <td className="num-cell">{n(a.opening)}</td>
                      <td className="num-cell">
                        <b style={{ color: bal >= 0 ? '#059669' : '#DC2626' }}>{n(bal)}</b>
                      </td>
                      <td>
                        <span className={'badge ' + (a.active === false ? 'gray' : 'green')}>
                          {a.active === false ? 'غیرفعال' : 'فعال'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button
                            className="icon-btn sm"
                            onClick={() => ui.open(<AccountForm id={a.id} onClose={ui.close} />)}
                          >
                            <Icon name="edit" size={13} />
                          </button>
                          <button className="icon-btn sm" onClick={() => remove(a.id, a.name)}>
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
          <Empty title="حسابی تعریف نشده" text="اولین حساب را اضافه کنید" />
        )}
      </div>
    </>
  );
}
