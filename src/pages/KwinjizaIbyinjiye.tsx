import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, Save, Send, Loader2, CheckCircle2, User,
  Calendar, AlertCircle, UserPlus, HandCoins, Coins, Activity,
  Pencil, Trash2, X,
} from 'lucide-react';
import {
  supabase, type Member, type Loan, type Payment, type SocialActivity,
  currentMonthStr, formatMonthLabel, formatRwf,
  SHARE_UNIT_PRICE,
  PENALTY_AMOUNT,
  expectedShareAmount, expectedIngoboka,
  computeLoanInterest,
} from '@/lib/supabase';

type Props = {
  onBack: () => void;
  onGoToMembers: () => void;
};

type Tab = 'ishyura' | 'inguzanyo' | 'social';

export default function KwinjizaIbyinjiye({ onBack, onGoToMembers }: Props) {
  const [tab, setTab] = useState<Tab>('ishyura');

  // --- Shared state ---
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = currentMonthStr();

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Payment tab state ---
  const [memberId, setMemberId] = useState('');
  const [month, setMonth] = useState(currentMonth);
  const [shareAmount, setShareAmount] = useState('');
  const [ingobokaAmount, setIngobokaAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(today);
  const [amandeAmount, setAmandeAmount] = useState('0');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [showSendPrompt, setShowSendPrompt] = useState(false);
  const [savedMember, setSavedMember] = useState<Member | null>(null);
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState<string | null>(null);

  // Transactions list + edit/delete
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [editTarget, setEditTarget] = useState<Payment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [deletingTx, setDeletingTx] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // --- Loan tab state ---
  const [loanMemberId, setLoanMemberId] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanDate, setLoanDate] = useState(today);
  const [loanSaving, setLoanSaving] = useState(false);
  const [loanSavedMsg, setLoanSavedMsg] = useState<string | null>(null);
  const [loanError, setLoanError] = useState<string | null>(null);
  const [loans, setLoans] = useState<(Loan & { months: number; interest: number; total: number })[]>([]);

  // --- Social activity tab state ---
  const [activityName, setActivityName] = useState('');
  const [activityDate, setActivityDate] = useState(today);
  const [activityAmount, setActivityAmount] = useState('');
  const [activitySaving, setActivitySaving] = useState(false);
  const [activitySavedMsg, setActivitySavedMsg] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activities, setActivities] = useState<SocialActivity[]>([]);

  // Edit social activity
  const [editActivity, setEditActivity] = useState<SocialActivity | null>(null);
  const [deleteActivity, setDeleteActivity] = useState<SocialActivity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    const { data, error } = await supabase.from('members').select('*').order('name');
    if (error) { setError(error.message); setLoadingMembers(false); return; }
    setMembers(data || []);
    setLoadingMembers(false);
  }, []);

  const loadLoans = useCallback(async () => {
    const { data } = await supabase.from('loans').select('*').order('created_at', { ascending: false });
    if (data) {
      setLoans(data.map((l: Loan) => ({ ...l, ...computeLoanInterest(l) })));
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    const { data } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
    if (data) setTransactions(data);
  }, []);

  const loadActivities = useCallback(async () => {
    const { data } = await supabase.from('social_activities').select('*').order('activity_date', { ascending: false });
    if (data) setActivities(data);
  }, []);

  useEffect(() => { loadMembers(); loadLoans(); loadTransactions(); loadActivities(); }, [loadMembers, loadLoans, loadTransactions, loadActivities]);

  const monthOptions: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const selectedMember = members.find((m) => m.id === memberId) || null;
  const sa = parseFloat(shareAmount) || 0;
  const ia = parseFloat(ingobokaAmount) || 0;
  const pa = parseInt(amandeAmount, 10) || 0;
  const totalAmount = sa + ia + pa;

  // Auto-set amande based on payment date day
  function handlePaymentDateChange(value: string) {
    setPaymentDate(value);
    const day = parseInt(value.split('-')[2], 10);
    if (day > 5) {
      setAmandeAmount('2000');
    } else {
      setAmandeAmount('0');
    }
  }

  function resetForm() {
    setMemberId('');
    setShareAmount('');
    setIngobokaAmount('');
    setPaymentDate(today);
    setAmandeAmount('0');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedMsg(null);

    if (!memberId) { setError('Hitamo umunyamuryango.'); return; }
    if (sa <= 0 && ia <= 0) { setError("Andika niba njwa amafaranga y'ishare cyangwa ingoboka."); return; }

    const m = members.find((mm) => mm.id === memberId);
    if (!m) { setError('Umunyamuryango ntabonetse.'); return; }

    const fullyPaid = sa >= expectedShareAmount(m) && ia >= expectedIngoboka(m);

    setSaving(true);
    const { error: insErr } = await supabase.from('payments').insert({
      member_id: memberId,
      month,
      year: parseInt(month.split('-')[0], 10),
      type: 'share',
      amount: sa + ia,
      share_amount: sa,
      ingoboka_amount: ia,
      penalty_amount: pa,
      status: fullyPaid ? 'yarishyuye' : 'atarishyuye',
      payment_date: paymentDate,
    });
    setSaving(false);

    if (insErr) { setError(insErr.message); return; }

    setSavedMember(m);
    setSavedMsg('Byabitswe neza!');
    setShowSendPrompt(true);
    setSentMsg(null);
    resetForm();
    loadTransactions();
  }

  async function handleSendMessage() {
    if (!savedMember) return;
    setSending(true);
    const msg = `Muraho ${savedMember.name}, kwishyura kwawe kwa ${formatMonthLabel(month)} kwakiriwe neza. Murakoze!`;

    const { error: nErr } = await supabase.from('notifications').insert({
      member_id: savedMember.id,
      message: msg,
      channel: 'message',
      status: 'sent',
    });
    setSending(false);

    if (nErr) { setError(nErr.message); return; }
    setSentMsg('Message yoherejwe neza!');
    setTimeout(() => {
      setShowSendPrompt(false);
      setSavedMsg(null);
      setSentMsg(null);
      setSavedMember(null);
    }, 2000);
  }

  function handleSkipSend() {
    setShowSendPrompt(false);
    setSavedMsg(null);
    setSentMsg(null);
    setSavedMember(null);
  }

  // --- Edit transaction ---
  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditSaving(true);
    const editSa = parseFloat(shareAmount) || 0;
    const editIa = parseFloat(ingobokaAmount) || 0;
    const editPa = parseInt(amandeAmount, 10) || 0;
    const { error: updErr } = await supabase.from('payments').update({
      share_amount: editSa,
      ingoboka_amount: editIa,
      penalty_amount: editPa,
      amount: editSa + editIa,
      payment_date: paymentDate,
      month,
    }).eq('id', editTarget.id);
    setEditSaving(false);
    if (updErr) { setError(updErr.message); return; }
    setEditTarget(null);
    resetForm();
    loadTransactions();
  }

  async function handleDeleteTx() {
    if (!deleteTarget) return;
    setDeletingTx(true);
    const { error: delErr } = await supabase.from('payments').delete().eq('id', deleteTarget.id);
    setDeletingTx(false);
    if (delErr) { setError(delErr.message); return; }
    setDeleteTarget(null);
    loadTransactions();
  }

  // --- Loan handlers ---
  const loanAmountNum = parseFloat(loanAmount) || 0;
  const loanMember = members.find((m) => m.id === loanMemberId) || null;

  async function handleSaveLoan(e: React.FormEvent) {
    e.preventDefault();
    setLoanError(null);
    setLoanSavedMsg(null);

    if (!loanMemberId) { setLoanError('Hitamo umunyamuryango.'); return; }
    if (loanAmountNum <= 0) { setLoanError("Andika amafaranga y'inguzanyo."); return; }

    setLoanSaving(true);
    const { error: insErr } = await supabase.from('loans').insert({
      member_id: loanMemberId,
      amount: loanAmountNum,
      loan_date: loanDate,
    });
    setLoanSaving(false);

    if (insErr) { setLoanError(insErr.message); return; }

    setLoanSavedMsg('Inguzanyo yanditswe neza!');
    setLoanMemberId('');
    setLoanAmount('');
    setLoanDate(today);
    setTimeout(() => setLoanSavedMsg(null), 3000);
    loadLoans();
  }

  // --- Social activity handlers ---
  const activityAmountNum = parseFloat(activityAmount) || 0;

  async function handleSaveActivity(e: React.FormEvent) {
    e.preventDefault();
    setActivityError(null);
    setActivitySavedMsg(null);

    if (!activityName.trim()) { setActivityError('Andika igikorwa.'); return; }
    if (activityAmountNum <= 0) { setActivityError('Andika amafaranga yakoreshejwe.'); return; }

    setActivitySaving(true);
    const { error: insErr } = await supabase.from('social_activities').insert({
      activity: activityName.trim(),
      activity_date: activityDate,
      amount: activityAmountNum,
    });
    setActivitySaving(false);

    if (insErr) { setActivityError(insErr.message); return; }

    setActivitySavedMsg('Social activity yanditswe neza!');
    setActivityName('');
    setActivityAmount('');
    setActivityDate(today);
    setTimeout(() => setActivitySavedMsg(null), 3000);
    loadActivities();
  }

  async function handleEditActivitySave(e: React.FormEvent) {
    e.preventDefault();
    if (!editActivity) return;
    setActivitySaving(true);
    const { error: updErr } = await supabase.from('social_activities').update({
      activity: activityName.trim(),
      activity_date: activityDate,
      amount: activityAmountNum,
    }).eq('id', editActivity.id);
    setActivitySaving(false);
    if (updErr) { setActivityError(updErr.message); return; }
    setEditActivity(null);
    setActivityName('');
    setActivityAmount('');
    setActivityDate(today);
    loadActivities();
  }

  async function handleDeleteActivity() {
    if (!deleteActivity) return;
    setDeletingActivity(true);
    const { error: delErr } = await supabase.from('social_activities').delete().eq('id', deleteActivity.id);
    setDeletingActivity(false);
    if (delErr) { setActivityError(delErr.message); return; }
    setDeleteActivity(null);
    loadActivities();
  }

  const noMembers = !loadingMembers && members.length === 0;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kwinjiza</h1>
          <p className="text-sm text-gray-500">Andika amafaranga, inguzanyo, na social activities</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1">
        <button
          onClick={() => setTab('ishyura')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs sm:text-sm font-medium transition ${
            tab === 'ishyura' ? 'bg-teal-600 text-white' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Coins className="w-4 h-4" />
          Kwishyura
        </button>
        <button
          onClick={() => setTab('inguzanyo')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs sm:text-sm font-medium transition ${
            tab === 'inguzanyo' ? 'bg-teal-600 text-white' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <HandCoins className="w-4 h-4" />
          Inguzanyo
        </button>
        <button
          onClick={() => setTab('social')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs sm:text-sm font-medium transition ${
            tab === 'social' ? 'bg-teal-600 text-white' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          Social
        </button>
      </div>

      {/* === PAYMENT TAB === */}
      {tab === 'ishyura' && (
        <>
          {savedMsg && !showSendPrompt && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-emerald-700 text-sm font-medium">{savedMsg}</p>
            </div>
          )}

          {showSendPrompt && savedMember && (
            <div className="bg-white rounded-2xl border-2 border-teal-200 shadow-md p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Send className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Kohereza Message?</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Waba ushaka kohereza message kuri <span className="font-medium text-gray-700">{savedMember.name}</span> ({savedMember.phone}) umenyesha ko kwishyura kwawe kwakiriwe?
                  </p>
                </div>
              </div>
              {sentMsg ? (
                <div className="flex items-center gap-2 bg-emerald-50 rounded-lg p-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <p className="text-emerald-700 text-sm font-medium">{sentMsg}</p>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={handleSendMessage} disabled={sending} className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white rounded-xl py-3 font-medium hover:bg-teal-700 transition disabled:opacity-50">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sending ? 'Kohereza...' : 'Yego, Kohereza'}
                  </button>
                  <button onClick={handleSkipSend} className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-medium hover:bg-gray-200 transition">
                    Oya, bihagaze
                  </button>
                </div>
              )}
            </div>
          )}

          {noMembers ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 text-center">
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Nta banyamuryango bihari</h3>
              <p className="text-gray-500 text-sm mb-5 max-w-sm mx-auto">
                Ongeraho umunyamuryango wa mbere ku page y'Abanyamuryango kugirango ubashe kwandika amafaranga y'ishyura.
              </p>
              <button onClick={onGoToMembers} className="inline-flex items-center gap-2 bg-teal-600 text-white rounded-xl px-5 py-3 font-medium hover:bg-teal-700 transition">
                <UserPlus className="w-5 h-5" />
                Gura ku Page y'Abanyamuryango
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 text-gray-400" />
                  Umunyamuryango
                </label>
                <select value={memberId} onChange={(e) => setMemberId(e.target.value)} disabled={loadingMembers}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition">
                  <option value="">{loadingMembers ? 'Gufungura...' : 'Hitamo umunyamuryango'}</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.shares} share{m.shares > 1 ? 's' : ''}{m.is_family ? ' (Family)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMember && (
                <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 space-y-1.5">
                  <p className="text-sm text-teal-700 font-medium">{selectedMember.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-teal-600">
                    <span>Shares: {selectedMember.shares} × {SHARE_UNIT_PRICE.toLocaleString()} = {formatRwf(expectedShareAmount(selectedMember))}</span>
                    <span>Ingoboka: {formatRwf(expectedIngoboka(selectedMember))}{selectedMember.is_family ? ' (Family)' : ''}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Ukwezi
                </label>
                <select value={month} onChange={(e) => setMonth(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition">
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>{formatMonthLabel(m)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amafaranga ya Share (RWF)
                  {selectedMember && <span className="text-gray-400 font-normal"> — Tekereza: {formatRwf(expectedShareAmount(selectedMember))}</span>}
                </label>
                <input type="number" inputMode="numeric" value={shareAmount} onChange={(e) => setShareAmount(e.target.value)} placeholder="0"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amafaranga ya Ingoboka (RWF)
                  {selectedMember && <span className="text-gray-400 font-normal"> — Tekereza: {formatRwf(expectedIngoboka(selectedMember))}</span>}
                </label>
                <input type="number" inputMode="numeric" value={ingobokaAmount} onChange={(e) => setIngobokaAmount(e.target.value)} placeholder="0"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Itariki y'ishyura
                </label>
                <input type="date" value={paymentDate} onChange={(e) => handlePaymentDateChange(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amande (RWF)</label>
                <select value={amandeAmount} onChange={(e) => setAmandeAmount(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition">
                  <option value="0">0 RWF</option>
                  <option value="2000">2,000 RWF</option>
                </select>
                <p className="text-xs text-gray-400 mt-1.5">
                  Niba itariki arenga 5, amande aba 2000. Mbere ya 5, amande aba 0.
                </p>
              </div>

              {(sa > 0 || ia > 0 || pa > 0) && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-600"><span>Share</span><span>{formatRwf(sa)}</span></div>
                  <div className="flex justify-between text-sm text-gray-600"><span>Ingoboka</span><span>{formatRwf(ia)}</span></div>
                  {pa > 0 && <div className="flex justify-between text-sm text-amber-600"><span>Amande</span><span>{formatRwf(pa)}</span></div>}
                  <div className="flex justify-between text-base font-bold text-gray-900 pt-1.5 border-t border-gray-200"><span>Yose</span><span>{formatRwf(totalAmount)}</span></div>
                </div>
              )}

              {error && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5"><p className="text-rose-600 text-sm">{error}</p></div>}

              <button type="submit" disabled={saving || loadingMembers}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white rounded-xl py-3.5 font-bold hover:bg-teal-700 transition disabled:opacity-50 shadow-sm">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Bika...' : 'Bika'}
              </button>
            </form>
          )}

          {/* Transactions list with Edit/Delete */}
          {transactions.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Ibyinjiwe byose</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {transactions.map((p) => {
                  const m = members.find((mm) => mm.id === p.member_id);
                  const tSa = Number(p.share_amount);
                  const tIa = Number(p.ingoboka_amount);
                  const tPa = Number(p.penalty_amount);
                  const tTotal = tSa + tIa + tPa;
                  return (
                    <div key={p.id} className="p-4 hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-gray-900 text-sm">{m?.name || '—'}</p>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditTarget(p);
                              setShareAmount(String(tSa));
                              setIngobokaAmount(String(tIa));
                              setAmandeAmount(String(tPa));
                              setPaymentDate(p.payment_date || today);
                              setMonth(p.month);
                            }}
                            className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-gray-100 transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Hindura
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-rose-100 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">
                        {formatMonthLabel(p.month)} • {p.payment_date} — Share: {formatRwf(tSa)} • Ingoboka: {formatRwf(tIa)}
                        {tPa > 0 && ` • Amande: ${formatRwf(tPa)}`}
                      </p>
                      <p className="font-semibold text-emerald-600 text-sm mt-1">{formatRwf(tTotal)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Edit transaction modal */}
          {editTarget && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditTarget(null)}>
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-lg">Hindura Ibyinjiwe</h3>
                  <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleEditSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Amafaranga ya Share (RWF)</label>
                    <input type="number" inputMode="numeric" value={shareAmount} onChange={(e) => setShareAmount(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Amafaranga ya Ingoboka (RWF)</label>
                    <input type="number" inputMode="numeric" value={ingobokaAmount} onChange={(e) => setIngobokaAmount(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Amande (RWF)</label>
                    <select value={amandeAmount} onChange={(e) => setAmandeAmount(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition">
                      <option value="0">0 RWF</option>
                      <option value="2000">2,000 RWF</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Itariki y'ishyura</label>
                    <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Ukwezi</label>
                    <select value={month} onChange={(e) => setMonth(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition">
                      {monthOptions.map((m) => (
                        <option key={m} value={m}>{formatMonthLabel(m)}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" disabled={editSaving}
                    className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white rounded-xl py-3 font-medium hover:bg-teal-700 transition disabled:opacity-50">
                    {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {editSaving ? 'Bika...' : 'Bika'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Delete transaction confirmation */}
          {deleteTarget && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteTarget(null)}>
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 sm:p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold text-gray-900 text-lg">Futa Ibyinjiwe</h3>
                <p className="text-sm text-gray-600">Urabyeho ko ushaka gufuta iyi makuru? Iki kibazo ntikizagaruka.</p>
                <div className="flex gap-3">
                  <button onClick={handleDeleteTx} disabled={deletingTx}
                    className="flex-1 flex items-center justify-center gap-2 bg-rose-600 text-white rounded-xl py-3 font-medium hover:bg-rose-700 transition disabled:opacity-50">
                    {deletingTx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {deletingTx ? 'Futa...' : 'Yego, Futa'}
                  </button>
                  <button onClick={() => setDeleteTarget(null)}
                    className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-medium hover:bg-gray-200 transition">
                    Oya
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* === LOAN TAB === */}
      {tab === 'inguzanyo' && (
        <>
          {loanSavedMsg && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-emerald-700 text-sm font-medium">{loanSavedMsg}</p>
            </div>
          )}

          {noMembers ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 text-center">
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Nta banyamuryango bihari</h3>
              <p className="text-gray-500 text-sm mb-5 max-w-sm mx-auto">
                Ongeraho umunyamuryango wa mbere ku page y'Abanyamuryango kugirango ubashe kwandika inguzanyo.
              </p>
              <button onClick={onGoToMembers} className="inline-flex items-center gap-2 bg-teal-600 text-white rounded-xl px-5 py-3 font-medium hover:bg-teal-700 transition">
                <UserPlus className="w-5 h-5" />
                Gura ku Page y'Abanyamuryango
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveLoan} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 text-gray-400" />
                  Umunyamuryango
                </label>
                <select value={loanMemberId} onChange={(e) => setLoanMemberId(e.target.value)} disabled={loadingMembers}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition">
                  <option value="">{loadingMembers ? 'Gufungura...' : 'Hitamo umunyamuryango'}</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} — {m.phone}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amafaranga y'Inguzanyo (RWF)</label>
                <input type="number" inputMode="numeric" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="0"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Itariki yafatiweho
                </label>
                <input type="date" value={loanDate} onChange={(e) => setLoanDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
              </div>

              {loanMember && loanAmountNum > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-1.5">
                  <p className="text-sm text-amber-700 font-medium">{loanMember.name}</p>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Inyungu (2.5% ku kwezi)</span>
                    <span>{formatRwf(loanAmountNum * 0.025)} / kwezi</span>
                  </div>
                </div>
              )}

              {loanError && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5"><p className="text-rose-600 text-sm">{loanError}</p></div>}

              <button type="submit" disabled={loanSaving || loadingMembers}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white rounded-xl py-3.5 font-bold hover:bg-teal-700 transition disabled:opacity-50 shadow-sm">
                {loanSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <HandCoins className="w-5 h-5" />}
                {loanSaving ? 'Bika...' : 'Bika Inguzanyo'}
              </button>
            </form>
          )}

          {loans.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Inguzanyo zisanzwe</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {loans.map((l) => {
                  const m = members.find((mm) => mm.id === l.member_id);
                  return (
                    <div key={l.id} className="p-4 hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900 text-sm">{m?.name || '—'}</p>
                        <span className="text-xs text-gray-400">{l.loan_date}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>Amafaranga: {formatRwf(l.amount)}</span>
                        <span>Inyungu ({l.months} azi): {formatRwf(l.interest)}</span>
                        <span className="font-semibold text-rose-600">Yose: {formatRwf(l.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* === SOCIAL ACTIVITY TAB === */}
      {tab === 'social' && (
        <>
          {activitySavedMsg && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-emerald-700 text-sm font-medium">{activitySavedMsg}</p>
            </div>
          )}

          <form onSubmit={handleSaveActivity} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Activity className="w-4 h-4 text-gray-400" />
                Igikorwa
              </label>
              <input type="text" value={activityName} onChange={(e) => setActivityName(e.target.value)} placeholder="Andika igikorwa"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                Itariki
              </label>
              <input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amafaranga (RWF)</label>
              <input type="number" inputMode="numeric" value={activityAmount} onChange={(e) => setActivityAmount(e.target.value)} placeholder="0"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
            </div>

            {activityError && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5"><p className="text-rose-600 text-sm">{activityError}</p></div>}

            <button type="submit" disabled={activitySaving}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white rounded-xl py-3.5 font-bold hover:bg-teal-700 transition disabled:opacity-50 shadow-sm">
              {activitySaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
              {activitySaving ? 'Bika...' : 'Bika Social Activity'}
            </button>
          </form>

          {/* Activities list with Edit/Delete */}
          {activities.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Social Activities zisanzwe</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {activities.map((a) => (
                  <div key={a.id} className="p-4 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900 text-sm">{a.activity}</p>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditActivity(a);
                            setActivityName(a.activity);
                            setActivityDate(a.activity_date);
                            setActivityAmount(String(a.amount));
                          }}
                          className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-gray-100 transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Hindura
                        </button>
                        <button
                          onClick={() => setDeleteActivity(a)}
                          className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-rose-100 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{a.activity_date}</p>
                    <p className="font-semibold text-rose-600 text-sm mt-1">{formatRwf(Number(a.amount))}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit activity modal */}
          {editActivity && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditActivity(null)}>
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 sm:p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-lg">Hindura Social Activity</h3>
                  <button onClick={() => setEditActivity(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleEditActivitySave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Igikorwa</label>
                    <input type="text" value={activityName} onChange={(e) => setActivityName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Itariki</label>
                    <input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Amafaranga (RWF)</label>
                    <input type="number" inputMode="numeric" value={activityAmount} onChange={(e) => setActivityAmount(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
                  </div>
                  <button type="submit" disabled={activitySaving}
                    className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white rounded-xl py-3 font-medium hover:bg-teal-700 transition disabled:opacity-50">
                    {activitySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {activitySaving ? 'Bika...' : 'Bika'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Delete activity confirmation */}
          {deleteActivity && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteActivity(null)}>
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 sm:p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold text-gray-900 text-lg">Futa Social Activity</h3>
                <p className="text-sm text-gray-600">Urabyeho ko ushaka gufuta iyi makuru? Iki kibazo ntikizagaruka.</p>
                <div className="flex gap-3">
                  <button onClick={handleDeleteActivity} disabled={deletingActivity}
                    className="flex-1 flex items-center justify-center gap-2 bg-rose-600 text-white rounded-xl py-3 font-medium hover:bg-rose-700 transition disabled:opacity-50">
                    {deletingActivity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {deletingActivity ? 'Futa...' : 'Yego, Futa'}
                  </button>
                  <button onClick={() => setDeleteActivity(null)}
                    className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-medium hover:bg-gray-200 transition">
                    Oya
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
