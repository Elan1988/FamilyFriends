import { useEffect, useState, useCallback } from 'react';
import {
  Wallet, Calendar, ChevronDown, TrendingUp, LogOut, Lock,
  Loader2, Coins, HandCoins, AlertCircle,
} from 'lucide-react';
import {
  supabase, type Payment, type Loan, type Member,
  currentMonthStr, formatMonthLabel, formatRwf,
  computeLoanInterest,
} from '@/lib/supabase';

type Props = {
  memberId: string;
  onLogout: () => void;
};

function buildMonthOptions(): string[] {
  const opts: string[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return opts;
}

export default function MemberDashboard({ memberId, onLogout }: Props) {
  const [member, setMember] = useState<Member | null>(null);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [monthOptions] = useState(buildMonthOptions);

  // Change password
  const [showChangePass, setShowChangePass] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [mRes, pRes, lRes] = await Promise.all([
      supabase.from('members').select('*').eq('id', memberId).maybeSingle(),
      supabase.from('payments').select('*').eq('member_id', memberId).order('created_at', { ascending: false }),
      supabase.from('loans').select('*').eq('member_id', memberId).order('created_at', { ascending: false }),
    ]);
    if (mRes.error) { setError(mRes.error.message); setLoading(false); return; }
    if (pRes.error) { setError(pRes.error.message); setLoading(false); return; }
    if (lRes.error) { setError(lRes.error.message); setLoading(false); return; }
    setMember(mRes.data || null);
    setAllPayments(pRes.data || []);
    setLoans(lRes.data || []);
    setLoading(false);
  }, [memberId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!monthDropdownOpen) return;
    const handler = () => setMonthDropdownOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [monthDropdownOpen]);

  // Card 1: Total of all payments ever
  const totalPaid = allPayments.reduce((sum, p) => {
    return sum + Number(p.share_amount) + Number(p.ingoboka_amount) + Number(p.penalty_amount);
  }, 0);

  // Card 2: Monthly report
  const monthPayments = allPayments.filter((p) => p.month === selectedMonth);
  const monthShare = monthPayments.reduce((s, p) => s + Number(p.share_amount), 0);
  const monthIngoboka = monthPayments.reduce((s, p) => s + Number(p.ingoboka_amount), 0);
  const monthAmande = monthPayments.reduce((s, p) => s + Number(p.penalty_amount), 0);
  const monthTotal = monthShare + monthIngoboka + monthAmande;

  // Umwenda (debt): check if they have unpaid amount for current month
  const currentMonth = currentMonthStr();
  const currentMonthPayments = allPayments.filter((p) => p.month === currentMonth);
  const currentSharePaid = currentMonthPayments.reduce((s, p) => s + Number(p.share_amount), 0);
  const currentIngobokaPaid = currentMonthPayments.reduce((s, p) => s + Number(p.ingoboka_amount), 0);
  const expShare = member ? member.shares * 5000 : 0;
  const expIngoboka = member ? (member.is_family ? 2000 : 1000) : 0;
  const umwenda = Math.max(0, (expShare - currentSharePaid) + (expIngoboka - currentIngobokaPaid));

  // Card 3: Loans
  const activeLoans = loans.map((l) => {
    const calc = computeLoanInterest(l);
    return { ...l, ...calc };
  });
  const totalLoanDebt = activeLoans.reduce((s, l) => s + l.total, 0);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPassError(null);
    setPassMsg(null);
    if (newPass.length < 4) { setPassError('Ijambobanga rigomba kuba nibura inyuguti 4.'); return; }
    if (newPass !== confirmPass) { setPassError('Ijambo ry\'ibanga ntirihuye.'); return; }
    setPassLoading(true);
    const { error: updErr } = await supabase
      .from('members')
      .update({ password: newPass })
      .eq('id', memberId);
    setPassLoading(false);
    if (updErr) { setPassError(updErr.message); return; }
    setPassMsg('Ijambobanga ryahinduwe neza!');
    setNewPass('');
    setConfirmPass('');
    setTimeout(() => { setPassMsg(null); setShowChangePass(false); }, 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <p className="text-rose-600 mb-3">{error || 'Nta makuru ahari.'}</p>
        <button onClick={load} className="px-5 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition">
          Ongera ugerageze
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-teal-100 rounded-xl flex items-center justify-center">
            <span className="text-teal-700 font-bold text-lg">{member.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h2 className="font-bold text-gray-900">{member.name}</h2>
            <p className="text-xs text-gray-400">{member.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChangePass(true)}
            className="flex items-center gap-1.5 bg-gray-100 text-gray-600 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-200 transition"
          >
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Hindura ijambobanga</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-rose-50 text-rose-600 rounded-lg px-3 py-2 text-sm font-medium hover:bg-rose-100 transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sohoka</span>
          </button>
        </div>
      </div>

      {/* Card 1: Total paid */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-teal-100 text-sm font-medium">Amafaranga yose yishyuye</p>
            <h2 className="text-2xl sm:text-3xl font-bold">{formatRwf(totalPaid)}</h2>
          </div>
        </div>
        <p className="text-teal-100 text-sm mt-2">Ibi ni amafaranga yose washyuye kuva hatangirwa.</p>
      </div>

      {/* Card 2: Monthly report */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-gray-900">Raporo y'Ukwezi</h3>
          </div>
          {/* Month dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMonthDropdownOpen((o) => !o)}
              className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2 text-gray-700 font-medium text-sm transition border border-gray-200"
            >
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{formatMonthLabel(selectedMonth)}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${monthDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {monthDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[200px] max-h-[320px] overflow-y-auto z-50">
                {monthOptions.map((m) => (
                  <button
                    key={m}
                    onClick={() => { setSelectedMonth(m); setMonthDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition ${
                      m === selectedMonth ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {formatMonthLabel(m)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-teal-500" />
              <span className="text-sm text-gray-600">Shares</span>
            </div>
            <span className="font-semibold text-gray-900">{formatRwf(monthShare)}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-gray-600">Ingoboka</span>
            </div>
            <span className="font-semibold text-gray-900">{formatRwf(monthIngoboka)}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-gray-600">Amande</span>
            </div>
            <span className="font-semibold text-amber-600">{formatRwf(monthAmande)}</span>
          </div>
          {umwenda > 0 && selectedMonth === currentMonth && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span className="text-sm text-gray-600">Atarishyuwe</span>
              </div>
              <span className="font-semibold text-rose-600">{formatRwf(umwenda)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <span className="text-base font-bold text-gray-900">Yose</span>
            <span className="text-base font-bold text-teal-600">{formatRwf(monthTotal)}</span>
          </div>
          {monthPayments.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-2">Nta makuru ahari muri {formatMonthLabel(selectedMonth)}.</p>
          )}
        </div>
      </div>

      {/* Card 3: Loans */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <HandCoins className="w-5 h-5 text-amber-600" />
          <h3 className="font-bold text-gray-900">Inguzanyo</h3>
        </div>
        <div className="p-5">
          {activeLoans.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">Nta nguzanyo ufite.</p>
          ) : (
            <div className="space-y-4">
              {activeLoans.map((l) => (
                <div key={l.id} className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Amafaranga yafatiweho</span>
                    <span className="font-semibold text-gray-900">{formatRwf(l.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Itariki yafatiweho</span>
                    <span className="font-medium text-gray-700 text-sm">{l.loan_date}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Inyungu (2.5% × {l.months} azi)</span>
                    <span className="font-semibold text-amber-600">{formatRwf(l.interest)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-amber-200">
                    <span className="text-base font-bold text-gray-900">Yose yo kwishyura</span>
                    <span className="text-base font-bold text-rose-600">{formatRwf(l.total)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="font-bold text-gray-900">Inguzanyo yose</span>
                <span className="font-bold text-rose-600 text-lg">{formatRwf(totalLoanDebt)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change password modal */}
      {showChangePass && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowChangePass(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 sm:p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-teal-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Hindura Ijambobanga</h3>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ijambobanga rishya</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  autoFocus
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Emeza ijambobanga rishya</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
              {passError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <p className="text-rose-600 text-sm">{passError}</p>
                </div>
              )}
              {passMsg && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-emerald-600 text-sm">{passMsg}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={passLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white rounded-xl py-3 font-medium hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {passLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {passLoading ? 'Bika...' : 'Bika'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowChangePass(false)}
                  className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-medium hover:bg-gray-200 transition"
                >
                  Funga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
