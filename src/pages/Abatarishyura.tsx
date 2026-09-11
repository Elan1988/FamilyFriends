import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, Phone, Send, Loader2, CheckCircle2,
  Search, X, MessageSquare, Trash2, ChevronDown, User,
  AlertTriangle, Wallet,
} from 'lucide-react';
import {
  supabase, type Member, type Payment,
  currentMonthStr, formatMonthLabel, formatRwf,
  computeUnpaidAmount, expectedShareAmount, expectedIngoboka,
  SHARE_UNIT_PRICE, PENALTY_AMOUNT,
} from '@/lib/supabase';

type Props = {
  onBack: () => void;
};

export default function Abatarishyura({ onBack }: Props) {
  const currentMonth = currentMonthStr();
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Member detail dropdown
  const [detailMemberId, setDetailMemberId] = useState('');
  const [detailDropdownOpen, setDetailDropdownOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [mRes, pRes] = await Promise.all([
      supabase.from('members').select('*').order('name'),
      supabase.from('payments').select('*'),
    ]);
    if (mRes.error) { setError(mRes.error.message); setLoading(false); return; }
    if (pRes.error) { setError(pRes.error.message); setLoading(false); return; }
    setMembers(mRes.data || []);
    setPayments(pRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!detailDropdownOpen) return;
    const handler = () => setDetailDropdownOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [detailDropdownOpen]);

  // Compute unpaid members for current month
  const unpaidMembers = members
    .filter((m) => {
      const result = computeUnpaidAmount(m, payments, currentMonth);
      return !result.fullyPaid;
    })
    .map((m) => ({
      ...m,
      ...computeUnpaidAmount(m, payments, currentMonth),
    }));

  const filtered = unpaidMembers.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search)
  );

  // Detail member info
  const detailMember = members.find((m) => m.id === detailMemberId) || null;
  const detailResult = detailMember
    ? computeUnpaidAmount(detailMember, payments, currentMonth)
    : null;

  async function handleSendSms(member: Member) {
    setSendingId(member.id);
    const result = computeUnpaidAmount(member, payments, currentMonth);
    const msg = `Muraho ${member.name}, wibagiye kwishyura kwa ${formatMonthLabel(currentMonth)}. Ibigusebya: ${formatRwf(result.unpaidTotal)}. Ugira ngombwa kwishyura byihuse. Murakoze!`;

    const { error: nErr } = await supabase.from('notifications').insert({
      member_id: member.id,
      message: msg,
      channel: 'sms',
      status: 'sent',
    });

    setSendingId(null);

    if (nErr) {
      setError(nErr.message);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSentIds((prev) => new Set(prev).add(member.id));
    setToast(`SMS yoherejwe kuri ${member.name}`);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: delErr } = await supabase
      .from('members')
      .delete()
      .eq('id', deleteTarget.id);
    setDeleting(false);

    if (delErr) {
      setError(delErr.message);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setToast(`${deleteTarget.name} yakurwemo.`);
    setDeleteTarget(null);
    setTimeout(() => setToast(null), 3000);
    load();
  }

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
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Abatarishyura</h1>
          <p className="text-sm text-gray-500">{formatMonthLabel(currentMonth)} • {unpaidMembers.length} batarishyuye</p>
        </div>
      </div>

      {/* Member detail dropdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 text-gray-400" />
            Reba amafaranga atarishyura y'umunyamuryango
          </label>
          <button
            onClick={() => setDetailDropdownOpen((o) => !o)}
            className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
          >
            <span className={detailMember ? 'text-gray-900' : 'text-gray-400'}>
              {detailMember ? detailMember.name : 'Hitamo umunyamuryango'}
            </span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${detailDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {detailDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 max-h-[280px] overflow-y-auto z-50">
              {members.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">Nta banyamuryango bihari.</p>
              ) : (
                members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setDetailMemberId(m.id); setDetailDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition ${
                      m.id === detailMemberId
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {m.name} — {m.shares} share{m.shares > 1 ? 's' : ''}{m.is_family ? ' (Family)' : ''}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Detail breakdown */}
        {detailMember && detailResult && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <Wallet className="w-4 h-4 text-teal-600" />
              <p className="font-bold text-gray-900 text-sm">{detailMember.name} — {formatMonthLabel(currentMonth)}</p>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shares ({detailMember.shares} × {SHARE_UNIT_PRICE.toLocaleString()})</span>
              <span className="text-gray-900 font-medium">{formatRwf(expectedShareAmount(detailMember))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Ingoboka {detailMember.is_family ? '(Family)' : ''}
              </span>
              <span className="text-gray-900 font-medium">{formatRwf(expectedIngoboka(detailMember))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Byamaze kwishyura</span>
              <span className="text-emerald-600 font-medium">
                {formatRwf(detailResult.sharePaid + detailResult.ingobokaPaid)}
              </span>
            </div>
            {detailResult.penalty > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-amber-600">Amande (atarishyuye ku gihe)</span>
                <span className="text-amber-600 font-medium">{formatRwf(detailResult.penalty)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Amafaranga atarishyura</span>
              <span className={detailResult.unpaidTotal > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                {formatRwf(detailResult.unpaidTotal)}
              </span>
            </div>
            {detailResult.fullyPaid && (
              <div className="flex items-center gap-2 bg-emerald-50 rounded-lg p-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-emerald-700 text-sm font-medium">Yishyuye byose!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Shakisha izina cyangwa telefoni..."
          className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-10 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition shadow-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white rounded-xl px-5 py-3 shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <p className="text-sm font-medium">{toast}</p>
        </div>
      )}

      {/* Unpaid list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-gray-700 font-medium">
            {search ? 'Nta munyamuryango ubonetse uku shakishwa.' : 'Abanyamuryango bose barishyuye uku kwezi!'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-5 text-sm font-medium text-gray-500">Izina</th>
                  <th className="text-left py-3 px-5 text-sm font-medium text-gray-500">Telefoni</th>
                  <th className="text-right py-3 px-5 text-sm font-medium text-gray-500">Atarishyura</th>
                  <th className="text-left py-3 px-5 text-sm font-medium text-gray-500">Ukwezi</th>
                  <th className="text-right py-3 px-5 text-sm font-medium text-gray-500">Igikorwa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-5">
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.shares} share{m.shares > 1 ? 's' : ''}{m.is_family ? ' • Family' : ''}</p>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {m.phone}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <p className="font-bold text-rose-600 text-sm">{formatRwf(m.unpaidTotal)}</p>
                      {m.penalty > 0 && (
                        <p className="text-xs text-amber-500">+{formatRwf(PENALTY_AMOUNT)} amande</p>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-xs font-medium">
                        {formatMonthLabel(currentMonth)}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-end gap-2">
                        {sentIds.has(m.id) ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            Byoherejwe
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendSms(m)}
                            disabled={sendingId === m.id}
                            className="inline-flex items-center gap-1.5 bg-teal-600 text-white rounded-lg px-3.5 py-2 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50"
                          >
                            {sendingId === m.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <MessageSquare className="w-4 h-4" />
                            )}
                            {sendingId === m.id ? '' : 'Ohereza SMS'}
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(m)}
                          className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 rounded-lg px-3 py-2 text-sm font-medium hover:bg-rose-100 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map((m) => (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-900">{m.name}</p>
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
                      <Phone className="w-3.5 h-3.5" />
                      {m.phone}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{m.shares} share{m.shares > 1 ? 's' : ''}{m.is_family ? ' • Family' : ''}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-xs font-medium whitespace-nowrap">
                    {formatMonthLabel(currentMonth)}
                  </span>
                </div>
                <div className="bg-rose-50 rounded-lg p-2.5 mb-3">
                  <p className="text-rose-600 font-bold text-sm">Atarishyura: {formatRwf(m.unpaidTotal)}</p>
                  {m.penalty > 0 && (
                    <p className="text-xs text-amber-500 mt-0.5">Inclusive amande: {formatRwf(PENALTY_AMOUNT)}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {sentIds.has(m.id) ? (
                    <div className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-600 rounded-xl py-2.5 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      SMS yoherejwe
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSendSms(m)}
                      disabled={sendingId === m.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50"
                    >
                      {sendingId === m.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {sendingId === m.id ? 'Kohereza...' : 'Ohereza SMS'}
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTarget(m)}
                    className="flex items-center justify-center bg-rose-50 text-rose-600 rounded-xl px-3.5 py-2.5 hover:bg-rose-100 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Gukuramo Umunyamuryango</h3>
            </div>
            <p className="text-sm text-gray-600">
              Urabayeho ko ushaka gukuramo <span className="font-bold text-gray-900">{deleteTarget.name}</span>?
              Ibi bizanazana kwibura amakuru y'ishyura rye byose. Iki kibazo ntikizagaruka.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 bg-rose-600 text-white rounded-xl py-3 font-medium hover:bg-rose-700 transition disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Gukuramo...' : 'Yego, Gukuramo'}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-medium hover:bg-gray-200 transition"
              >
                Oya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
