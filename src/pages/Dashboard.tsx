import { useEffect, useState, useCallback } from 'react';
import {
  Users, CheckCircle2, Wallet, TrendingUp,
  Loader2, Calendar, ChevronDown, ArrowRight, HandCoins,
  Coins, Activity,
} from 'lucide-react';
import {
  supabase, type Member, type Payment, type Loan, type SocialActivity,
  currentMonthStr, formatMonthLabel, formatRwf,
  isFullyPaid, computeLoanInterest,
} from '@/lib/supabase';

type Props = {
  onNavigate: (page: 'kwinjiza') => void;
};

function buildMonthOptions(): string[] {
  const opts: string[] = [];
  const year = 2026;
  for (let m = 0; m < 12; m++) {
    opts.push(`${year}-${String(m + 1).padStart(2, '0')}`);
  }
  return opts;
}

export default function Dashboard({ onNavigate }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [socialActivities, setSocialActivities] = useState<SocialActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthOptions] = useState(buildMonthOptions);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [mRes, pRes, allPRes, lRes, sRes] = await Promise.all([
      supabase.from('members').select('*').order('name'),
      supabase.from('payments').select('*').eq('month', selectedMonth),
      supabase.from('payments').select('*'),
      supabase.from('loans').select('*').order('created_at', { ascending: false }),
      supabase.from('social_activities').select('*').order('activity_date', { ascending: false }),
    ]);
    if (mRes.error) { setError(mRes.error.message); setLoading(false); return; }
    if (pRes.error) { setError(pRes.error.message); setLoading(false); return; }
    if (allPRes.error) { setError(allPRes.error.message); setLoading(false); return; }
    if (lRes.error) { setError(lRes.error.message); setLoading(false); return; }
    if (sRes.error) { setError(sRes.error.message); setLoading(false); return; }
    setMembers(mRes.data || []);
    setPayments(pRes.data || []);
    setAllPayments(allPRes.data || []);
    setLoans(lRes.data || []);
    setSocialActivities(sRes.data || []);
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!monthDropdownOpen) return;
    const handler = () => setMonthDropdownOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [monthDropdownOpen]);

  // Monthly stats
  const paidMemberIds = new Set<string>();
  let monthTotalAmount = 0;
  let monthTotalPenalty = 0;

  for (const p of payments) {
    const sa = Number(p.share_amount);
    const ia = Number(p.ingoboka_amount);
    const pa = Number(p.penalty_amount);
    monthTotalAmount += sa + ia;
    monthTotalPenalty += pa;
    if (isFullyPaid(p)) {
      paidMemberIds.add(p.member_id);
    }
  }

  const paidCount = paidMemberIds.size;
  const monthTotalWithPenalty = monthTotalAmount + monthTotalPenalty;

  // All-time totals
  const allShares = allPayments.reduce((s, p) => s + Number(p.share_amount), 0);
  const allIngoboka = allPayments.reduce((s, p) => s + Number(p.ingoboka_amount), 0);
  const allAmande = allPayments.reduce((s, p) => s + Number(p.penalty_amount), 0);
  const grandTotal = allShares + allIngoboka + allAmande;

  // Ayasohotse Yose = total loans + total social activities
  const totalLoansPrincipal = loans.reduce((s, l) => s + Number(l.amount), 0);
  const totalSocialActivities = socialActivities.reduce((s, a) => s + Number(a.amount), 0);
  const ayasohotseYose = totalLoansPrincipal + totalSocialActivities;

  // Loan interest total
  const loanInterests = loans.map((l) => computeLoanInterest(l));
  const totalLoanInterest = loanInterests.reduce((s, l) => s + l.interest, 0);

  const stats = [
    {
      label: 'Abishyuye uku kwezi',
      value: String(paidCount),
      icon: CheckCircle2,
      color: 'bg-emerald-500',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
    },
    {
      label: 'Abanyamuryango bose',
      value: String(members.length),
      icon: Users,
      color: 'bg-green-600',
      bg: 'bg-green-50',
      text: 'text-green-700',
    },
    {
      label: 'Amafaranga yinjiye uku kwezi',
      value: formatRwf(monthTotalWithPenalty),
      icon: Wallet,
      color: 'bg-teal-600',
      bg: 'bg-teal-50',
      text: 'text-teal-700',
    },
    {
      label: 'Ayasohotse Yose',
      value: formatRwf(ayasohotseYose),
      icon: HandCoins,
      color: 'bg-rose-500',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <p className="text-rose-600 mb-3">Hari ikibazo cyabaye: {error}</p>
        <button
          onClick={load}
          className="px-5 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition"
        >
          Ongera ugerageze
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month banner with selector */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-teal-100 text-sm font-medium mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Ukwezi</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold">{formatMonthLabel(selectedMonth)}</h2>
          </div>

          {/* Month dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMonthDropdownOpen((o) => !o)}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl px-4 py-2.5 text-white font-medium text-sm transition border border-white/20"
            >
              <Calendar className="w-4 h-4" />
              <span>Hitamo Ukwezi</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${monthDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {monthDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[200px] max-h-[320px] overflow-y-auto z-50">
                {monthOptions.map((m) => (
                  <button
                    key={m}
                    onClick={() => { setSelectedMonth(m); setMonthDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition ${
                      m === selectedMonth
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {formatMonthLabel(m)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={`${s.bg} rounded-2xl p-4 sm:p-5 border border-white shadow-sm transition hover:shadow-md`}
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 ${s.color} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <p className={`${s.text} text-xs sm:text-sm font-medium leading-snug`}>{s.label}</p>
              <p className="text-gray-900 text-xl sm:text-2xl font-bold mt-1">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* All-time totals */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-teal-600" />
          Igiteranyo cy'Amezi Yose
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-teal-500" />
              <span className="text-sm text-gray-600">Shares zose</span>
            </div>
            <span className="font-semibold text-gray-900">{formatRwf(allShares)}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-gray-600">Ingoboka zose</span>
            </div>
            <span className="font-semibold text-gray-900">{formatRwf(allIngoboka)}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-gray-600">Amande zose</span>
            </div>
            <span className="font-semibold text-gray-900">{formatRwf(allAmande)}</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <span className="text-base font-bold text-gray-900">Igiteranyo Rusange</span>
            <span className="text-base font-bold text-teal-600">{formatRwf(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Social Activities */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-gray-900">Social Activities</h3>
          </div>
          <button
            onClick={() => onNavigate('kwinjiza')}
            className="flex items-center gap-1.5 bg-teal-50 text-teal-700 rounded-lg px-3 py-2 text-sm font-medium hover:bg-teal-100 transition"
          >
            Ongeraho
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {socialActivities.length === 0 ? (
          <p className="p-5 text-gray-400 text-sm text-center">Nta social activity irimo.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {socialActivities.slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-teal-100">
                    <Activity className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{a.activity}</p>
                    <p className="text-xs text-gray-400">{a.activity_date}</p>
                  </div>
                </div>
                <p className="font-semibold text-rose-600 text-sm">{formatRwf(Number(a.amount))}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action button */}
      <button
        onClick={() => onNavigate('kwinjiza')}
        className="w-full group flex items-center justify-between bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-teal-200 transition text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base sm:text-lg">Kwinjiza</h3>
            <p className="text-gray-500 text-sm">Andika amafaranga, inguzanyo, na social activities</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition" />
      </button>
    </div>
  );
}
