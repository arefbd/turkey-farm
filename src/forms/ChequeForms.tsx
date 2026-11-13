/**
 * فرم‌های مدیریت چک‌های صیادی و عملیات خزانه‌داری (وصول، برگشت، خرج چک)
 */
import { useMemo, useState } from 'react';
import { Modal, useUI } from '../components/Modal';
import { Icon } from '../components/Icon';
import { actions, num, personLabel, useApp } from '../data/store';
import { today } from '../lib/jalali';
import { money } from '../lib/format';
import type { Account, Cheque, ChequeKind, ChequeStatus, Person } from '../data/types';

export const IRAN_BANKS = [
  'بانک کشاورزی',
  'بانک ملی ایران',
  'بانک ملت',
  'بانک صادرات ایران',
  'بانک تجارت',
  'بانک پاسارگاد',
  'بانک سامان',
  'بانک پارسیان',
  'بانک سپه',
  'بانک رفاه کارگران',
  'بانک مسکن',
  'بانک قرض‌الحسنه رسالت',
  'بانک قرض‌الحسنه مهر ایران',
  'بانک خاورمیانه',
  'بانک کارآفرین',
  'بانک سینا',
  'پست بانک ایران',
  'سایر بانک‌ها',
];

export const CHEQUE_STATUS_INFO: Record<ChequeStatus, { label: string; badgeClass: string; icon: string }> = {
  pending: { label: 'در انتظار سررسید / نزد صندوق', badgeClass: 'blue', icon: '⏳' },
  cleared: { label: 'وصول‌شده / واریز به حساب', badgeClass: 'green', icon: '✅' },
  bounced: { label: 'برگشت‌خورده / واخواست', badgeClass: 'red', icon: '❌' },
  passed_on: { label: 'خرج‌شده / انتقال‌یافته', badgeClass: 'warn', icon: '🔄' },
  cancelled: { label: 'باطل‌شده / مسترد', badgeClass: 'gray', icon: '⛔' },
};

export function ChequeForm({
  cheque,
  presetKind = 'in',
  onClose,
}: {
  cheque?: Cheque;
  presetKind?: ChequeKind;
  onClose: () => void;
}) {
  const state = useApp();
  const ui = useUI();

  const [code, setCode] = useState(
    cheque?.code || `CHQ-${today().replace(/\//g, '').slice(2)}-${state.cheques.length + 1}`,
  );
  const [kind, setKind] = useState<ChequeKind>(cheque?.kind || presetKind);
  const [sayadNo, setSayadNo] = useState(cheque?.sayadNo || '');
  const [serialNo, setSerialNo] = useState(cheque?.serialNo || '');
  const [bankName, setBankName] = useState(cheque?.bankName || IRAN_BANKS[0]);
  const [branchName, setBranchName] = useState(cheque?.branchName || '');
  const [accountNo, setAccountNo] = useState(cheque?.accountNo || '');
  const [drawerName, setDrawerName] = useState(cheque?.drawerName || '');
  const [issueDate, setIssueDate] = useState(cheque?.issueDate || today());
  const [dueDate, setDueDate] = useState(cheque?.dueDate || today());
  const [amount, setAmount] = useState(cheque ? String(cheque.amount) : '');
  const [personId, setPersonId] = useState(cheque?.personId || '');
  const [accountId, setAccountId] = useState(cheque?.accountId || '');
  const [notes, setNotes] = useState(cheque?.notes || '');

  const bankAccounts = useMemo(
    () => state.accounts.filter((a: Account) => a.active !== false),
    [state.accounts],
  );

  const handleSave = () => {
    const cleanSayad = sayadNo.replace(/\D/g, '');
    if (cleanSayad.length !== 16) {
      ui.toast('شناسه صیادی چک باید دقیقاً ۱۶ رقم باشد.', 'error');
      return;
    }
    const amt = num(amount);
    if (amt <= 0) {
      ui.toast('مبلغ چک باید بزرگتر از صفر باشد.', 'error');
      return;
    }
    if (!dueDate.trim()) {
      ui.toast('تاریخ سررسید چک الزامی است.', 'error');
      return;
    }

    const selectedPerson = state.persons.find((p: Person) => p.id === personId);

    actions.saveCheque({
      id: cheque?.id,
      code: code.trim(),
      sayadNo: cleanSayad,
      serialNo: serialNo.trim() || undefined,
      bankName,
      branchName: branchName.trim() || undefined,
      accountNo: accountNo.trim() || undefined,
      drawerName: drawerName.trim() || undefined,
      issueDate,
      dueDate,
      amount: amt,
      kind,
      personId: personId || undefined,
      personName: selectedPerson ? personLabel(selectedPerson) : drawerName.trim() || undefined,
      accountId: accountId || undefined,
      status: cheque?.status || 'pending',
      clearDate: cheque?.clearDate,
      destinationAccountId: cheque?.destinationAccountId,
      passedToPersonId: cheque?.passedToPersonId,
      passedToPersonName: cheque?.passedToPersonName,
      passedDate: cheque?.passedDate,
      bounceReason: cheque?.bounceReason,
      reconciled: cheque?.reconciled,
      reconciledDate: cheque?.reconciledDate,
      notes: notes.trim() || undefined,
    });

    ui.toast(cheque ? 'مشخصات چک صیادی ویرایش شد.' : 'چک صیادی با موفقیت ثبت شد.', 'ok');
    onClose();
  };

  return (
    <Modal
      title={cheque ? `ویرایش چک صیادی — ${cheque.code}` : `ثبت چک صیادی ${kind === 'in' ? 'دریافتی' : 'پرداختی'}`}
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-4 text-sm" dir="rtl">
        {/* ۱. نوع و مشخصات صیادی */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-accent">
              <Icon name="tag" className="w-5 h-5" />
              <span>مشخصات سامانه صیاد و نوع سند</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className={`btn btn-xs ${kind === 'in' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setKind('in')}
              >
                چک دریافتی (از مشتری)
              </button>
              <button
                type="button"
                className={`btn btn-xs ${kind === 'out' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setKind('out')}
              >
                چک پرداختی (به فروشنده)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">کد سند سیستم</label>
              <input
                className="input text-left"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">شناسه ۱۶ رقمی صیاد *</label>
              <input
                className="input text-center font-mono font-bold tracking-widest text-accent"
                value={sayadNo}
                onChange={(e) => setSayadNo(e.target.value)}
                placeholder="1234567890123456"
                maxLength={16}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">سری و شماره سریال چک</label>
              <input
                className="input text-left font-mono"
                value={serialNo}
                onChange={(e) => setSerialNo(e.target.value)}
                placeholder="مثلاً ۱۲/۳۴۵۶۷۸"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">بانک صادرکننده *</label>
              <select
                className="select"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              >
                {IRAN_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">شعبه و کد شعبه</label>
              <input
                className="input"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="مثلاً شعبه مرکزی کد ۱۰۲"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">شماره حساب چک</label>
              <input
                className="input text-left font-mono"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                placeholder="شماره حساب صادرکننده"
              />
            </div>
          </div>
        </div>

        {/* ۲. مبالغ و تواریخ سررسید */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-accent">
            <Icon name="calendar" className="w-5 h-5" />
            <span>مبلغ، تاریخ صدور و سررسید چک</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">مبلغ چک (تومان) *</label>
              <input
                type="number"
                className="input font-mono font-bold text-accent"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="مثلاً ۵۰۰۰۰۰۰۰"
              />
              {num(amount) > 0 && (
                <span className="block text-[11px] text-muted mt-1 font-mono">
                  {money(num(amount))} تومان
                </span>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">تاریخ صدور</label>
              <input
                className="input text-center"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">تاریخ سررسید (مبنای راس‌گیری) *</label>
              <input
                className="input text-center font-bold text-foreground"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="۱۴۰۳/۰۹/۱۵"
              />
            </div>
          </div>
        </div>

        {/* ۳. اشخاص، حساب‌ها و یادداشت */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-accent">
            <Icon name="user" className="w-5 h-5" />
            <span>طرف حساب، صاحب حساب و حساب بانکی</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                {kind === 'in' ? 'طرف حساب (واگذارکننده)' : 'دریافت‌کننده چک'}
              </label>
              <select
                className="select"
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
              >
                <option value="">انتخاب شخص از دفتر اشخاص...</option>
                {state.persons.map((p: Person) => (
                  <option key={p.id} value={p.id}>
                    {personLabel(p)} ({p.type || 'شخص'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">نام صاحب حساب / صادرکننده</label>
              <input
                className="input"
                value={drawerName}
                onChange={(e) => setDrawerName(e.target.value)}
                placeholder="نام صاحب چک"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">صندوق یا حساب مبدا</label>
              <select
                className="select"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">صندوق چک‌های نزد صندوق</option>
                {bankAccounts.map((a: Account) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.kind})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">یادداشت و بابت</label>
            <input
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="بابت خرید پارت دان، فاکتور فروش شماره..."
            />
          </div>
        </div>

        {/* دکمه‌های اقدام */}
        <div className="flex items-center justify-between pt-2">
          {cheque ? (
            <button
              type="button"
              className="btn btn-outline text-danger"
              onClick={() => {
                if (confirm(`چک صیادی شماره ${cheque.code} حذف شود؟`)) {
                  actions.removeCheque(cheque.id);
                  ui.toast('چک با موفقیت حذف شد.', 'ok');
                  onClose();
                }
              }}
            >
              حذف این چک
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              انصراف
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              {cheque ? 'ذخیره تغییرات' : 'ثبت چک در خزانه‌داری'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/**
 * مودال تغییر وضعیت چک صیادی (وصول، واخواست/برگشت، خرج‌کردن)
 */
export function ChequeActionModal({
  cheque,
  initialAction = 'clear',
  onClose,
}: {
  cheque: Cheque;
  initialAction?: 'clear' | 'bounce' | 'pass' | 'reset';
  onClose: () => void;
}) {
  const state = useApp();
  const ui = useUI();
  const [action, setAction] = useState<'clear' | 'bounce' | 'pass' | 'reset'>(initialAction);

  // فیلدهای وصول
  const [clearDate, setClearDate] = useState(today());
  const [destinationAccountId, setDestinationAccountId] = useState(cheque.accountId || state.accounts[0]?.id || '');

  // فیلدهای برگشت
  const [bounceReason, setBounceReason] = useState('کسری موجودی حساب');

  // فیلدهای خرج‌کردن
  const [passedToPersonId, setPassedToPersonId] = useState('');
  const [passedDate, setPassedDate] = useState(today());

  const handleApply = () => {
    if (action === 'clear') {
      actions.clearCheque(cheque.id, {
        clearDate,
        destinationAccountId: destinationAccountId || undefined,
      });
      ui.toast(`چک به مبلغ ${money(cheque.amount)} تومان وصول شد.`, 'ok');
    } else if (action === 'bounce') {
      actions.bounceCheque(cheque.id, { reason: bounceReason });
      ui.toast('وضعیت چک به برگشت‌خورده تغییر یافت.', 'error');
    } else if (action === 'pass') {
      if (!passedToPersonId) {
        ui.toast('انتخاب شخص دریافت‌کننده چک الزامی است.', 'error');
        return;
      }
      const p = state.persons.find((x: Person) => x.id === passedToPersonId);
      const targetName = p ? personLabel(p) : 'شخص ثالث';
      actions.passCheque(cheque.id, {
        passedToPersonId,
        passedToPersonName: targetName,
        passedDate,
      });
      ui.toast(`چک به ${targetName} واگذار (خرج) گردید.`, 'ok');
    } else if (action === 'reset') {
      actions.update('cheques', cheque.id, {
        status: 'pending',
        clearDate: undefined,
        destinationAccountId: undefined,
        passedToPersonId: undefined,
        passedToPersonName: undefined,
        passedDate: undefined,
        bounceReason: undefined,
      });
      ui.toast('وضعیت چک به در جریان وصول بازگردانده شد.', 'ok');
    }
    onClose();
  };

  return (
    <Modal title={`عملیات خزانه‌داری — چک ${cheque.code}`} onClose={onClose} size="md">
      <div className="space-y-4 text-sm" dir="rtl">
        {/* خلاصه چک */}
        <div className="rounded-xl border border-border bg-card p-3 space-y-1.5 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-muted">صیاد: {cheque.sayadNo}</span>
            <span className="font-bold text-accent">{money(cheque.amount)} تومان</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>بانک: {cheque.bankName}</span>
            <span>سررسید: {cheque.dueDate}</span>
          </div>
        </div>

        {/* انتخاب عملیات */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            className={`btn btn-sm ${action === 'clear' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setAction('clear')}
          >
            ✅ وصول چک
          </button>
          <button
            type="button"
            className={`btn btn-sm ${action === 'pass' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setAction('pass')}
          >
            🔄 خرج کردن چک
          </button>
          <button
            type="button"
            className={`btn btn-sm ${action === 'bounce' ? 'btn-primary text-danger' : 'btn-outline text-danger'}`}
            onClick={() => setAction('bounce')}
          >
            ❌ برگشت چک
          </button>
        </div>

        {/* فرم وصول */}
        {action === 'clear' && (
          <div className="space-y-3 p-3 rounded-lg bg-muted/15 border border-border">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">تاریخ وصول چک</label>
              <input
                className="input text-center"
                value={clearDate}
                onChange={(e) => setClearDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">واریز / کسر از حساب بانکی</label>
              <select
                className="select"
                value={destinationAccountId}
                onChange={(e) => setDestinationAccountId(e.target.value)}
              >
                {state.accounts.map((a: Account) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.kind})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* فرم خرج کردن */}
        {action === 'pass' && (
          <div className="space-y-3 p-3 rounded-lg bg-muted/15 border border-border">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">تاریخ واگذاری / خرج چک</label>
              <input
                className="input text-center"
                value={passedDate}
                onChange={(e) => setPassedDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">واگذاری به شخص (طلبکار / تامین‌کننده)</label>
              <select
                className="select"
                value={passedToPersonId}
                onChange={(e) => setPassedToPersonId(e.target.value)}
              >
                <option value="">انتخاب شخص...</option>
                {state.persons.map((p: Person) => (
                  <option key={p.id} value={p.id}>
                    {personLabel(p)} ({p.type || 'شخص'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* فرم برگشت */}
        {action === 'bounce' && (
          <div className="space-y-3 p-3 rounded-lg bg-danger/10 border border-danger/30">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">علت برگشت چک</label>
              <select
                className="select"
                value={bounceReason}
                onChange={(e) => setBounceReason(e.target.value)}
              >
                <option value="کسری موجودی حساب">کسری موجودی حساب</option>
                <option value="عدم تطابق امضا">عدم تطابق امضا</option>
                <option value="مسدودی حساب">مسدودی حساب</option>
                <option value="قلم‌خوردگی / نقص مشخصات">قلم‌خوردگی / نقص مشخصات</option>
                <option value="دستور عدم پرداخت مراجع قضایی">دستور عدم پرداخت مراجع قضایی</option>
              </select>
            </div>
          </div>
        )}

        {/* دکمه اقدام */}
        <div className="flex items-center justify-between pt-2">
          {cheque.status !== 'pending' ? (
            <button
              type="button"
              className="btn btn-xs btn-outline text-muted"
              onClick={() => setAction('reset')}
            >
              بازگشت به وضعیت نزد صندوق
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              انصراف
            </button>
            <button type="button" className="btn btn-primary" onClick={handleApply}>
              ثبت تغییر وضعیت
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
