import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, UserPlus, Trash2, Loader2, AlertTriangle,
  Users, Phone, Heart, Coins, Lock,
} from 'lucide-react';
import {
  supabase, type Member,
  formatRwf, SHARE_UNIT_PRICE, INGOBOKA_FAMILY, INGOBOKA_NON_FAMILY,
} from '@/lib/supabase';

type Props = {
  onBack: () => void;
};

export default function Abanyamuryango({ onBack }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Add member modal
  const [showAddMember, setShowAddMember] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newIsFamily, setNewIsFamily] = useState(false);
  const [newShares, setNewShares] = useState('1');
  const [addingMember, setAddingMember] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Set password
  const [passTarget, setPassTarget] = useState<Member | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('members').select('*').order('name');
    if (error) { setError(error.message); setLoading(false); return; }
    setMembers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!newName.trim() || !newPhone.trim()) return;
    setAddingMember(true);
    const { data, error: addErr } = await supabase
      .from('members')
      .insert({
        name: newName.trim(),
        phone: newPhone.trim(),
        is_family: newIsFamily,
        shares: parseInt(newShares, 10) || 1,
      })
      .select()
      .single();
    setAddingMember(false);
    if (addErr) { setAddError(addErr.message); return; }
    if (data) {
      setMembers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setToast(`${data.name} yongerewe.`);
      setTimeout(() => setToast(null), 3000);
    }
    setNewName('');
    setNewPhone('');
    setNewIsFamily(false);
    setNewShares('1');
    setShowAddMember(false);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: delErr } = await supabase.from('members').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (delErr) {
      setError(delErr.message);
      setTimeout(() => setError(null), 3000);
      setDeleteTarget(null);
      return;
    }
    setToast(`${deleteTarget.name} yakurwemo.`);
    setDeleteTarget(null);
    setTimeout(() => setToast(null), 3000);
    load();
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passTarget) return;
    setPassErr(null);
    setPassMsg(null);
    if (newPassword.length < 4) { setPassErr('Ijambobanga rigomba kuba nibura inyuguti 4.'); return; }
    setSavingPass(true);
    const { error: updErr } = await supabase
      .from('members')
      .update({ password: newPassword })
      .eq('id', passTarget.id);
    setSavingPass(false);
    if (updErr) { setPassErr(updErr.message); return; }
    setPassMsg('Ijambobanga ryabitswe neza!');
    setNewPassword('');
    setTimeout(() => { setPassTarget(null); setPassMsg(null); }, 2000);
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
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Abanyamuryango Bose</h1>
          <p className="text-sm text-gray-500">{members.length} banyamuryango</p>
        </div>
        <button
          onClick={() => setShowAddMember(true)}
          className="flex items-center gap-2 bg-teal-600 text-white rounded-xl px-4 py-2.5 font-medium text-sm hover:bg-teal-700 transition shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Ongeraho</span>
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white rounded-xl px-5 py-3 shadow-lg flex items-center gap-2">
          <Loader2 className="w-5 h-5" />
          <p className="text-sm font-medium">{toast}</p>
        </div>
      )}

      {/* Empty state */}
      {members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 text-center">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-teal-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Nta banyamuryango bihari</h3>
          <p className="text-gray-500 text-sm mb-5 max-w-sm mx-auto">
            Ongeraho umunyamuryango wa mbere kugirango utangire gukoresha FamilyFriends.
          </p>
          <button
            onClick={() => setShowAddMember(true)}
            className="inline-flex items-center gap-2 bg-teal-600 text-white rounded-xl px-5 py-3 font-medium hover:bg-teal-700 transition"
          >
            <UserPlus className="w-5 h-5" />
            Ongeraho Umunyamuryango wa mbere
          </button>
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
                  <th className="text-center py-3 px-5 text-sm font-medium text-gray-500">Umuryango</th>
                  <th className="text-center py-3 px-5 text-sm font-medium text-gray-500">Shares</th>
                  <th className="text-right py-3 px-5 text-sm font-medium text-gray-500">Igikorwa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-teal-600" />
                        </div>
                        <p className="font-medium text-gray-900">{m.name}</p>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {m.phone}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-center">
                      {m.is_family ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-xs font-medium">
                          <Heart className="w-3 h-3" />
                          Family
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium">
                          Single
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className="inline-flex items-center gap-1.5 text-gray-700 text-sm font-medium">
                        <Coins className="w-4 h-4 text-teal-500" />
                        {m.shares}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setPassTarget(m); setPassErr(null); setPassMsg(null); setNewPassword(''); }}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                            m.password ? 'bg-gray-50 text-gray-600 hover:bg-gray-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                          }`}
                        >
                          <Lock className="w-4 h-4" />
                          {m.password ? 'Hindura' : 'Ijambobanga'}
                        </button>
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
            {members.map((m) => (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{m.name}</p>
                      <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-0.5">
                        <Phone className="w-3.5 h-3.5" />
                        {m.phone}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {m.is_family ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-xs font-medium">
                      <Heart className="w-3 h-3" />
                      Family
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium">
                      Single
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-600 text-xs font-medium">
                    <Coins className="w-3 h-3" />
                    {m.shares} share{m.shares > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => { setPassTarget(m); setPassErr(null); setPassMsg(null); setNewPassword(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition ${
                      m.password ? 'bg-gray-50 text-gray-600 hover:bg-gray-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    {m.password ? 'Hindura Ijambobanga' : 'Shiraho Ijambobanga'}
                  </button>
                </div>
                <button
                  onClick={() => setDeleteTarget(m)}
                  className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-600 rounded-xl py-2.5 text-sm font-medium hover:bg-rose-100 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Gukuramo
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add member modal */}
      {showAddMember && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddMember(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-teal-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Ongeraho Umunyamuryango</h3>
            </div>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Izina</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Andika izina"
                  autoFocus
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefoni</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Amashare (1 share = {SHARE_UNIT_PRICE.toLocaleString()} RWF)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={newShares}
                  onChange={(e) => setNewShares(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsFamily}
                    onChange={(e) => setNewIsFamily(e.target.checked)}
                    className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">
                    Aka umuryango? (Ingoboka: {formatRwf(INGOBOKA_FAMILY)} vs {formatRwf(INGOBOKA_NON_FAMILY)})
                  </span>
                </label>
              </div>
              {addError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <p className="text-rose-600 text-sm">{addError}</p>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={addingMember || !newName.trim() || !newPhone.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white rounded-xl py-3 font-medium hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {addingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {addingMember ? 'Bika...' : 'Bika'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-medium hover:bg-gray-200 transition"
                >
                  Funga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
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
              Urabayeho ko ushaka gukuramo{' '}
              <span className="font-bold text-gray-900">{deleteTarget.name}</span>?
              Ibi bizanazana kwibura amakuru ye y'ishyura byose. Iki kibazo ntikizagaruka.
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
      {/* Password modal */}
      {passTarget && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setPassTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Shiraho Ijambobanga</h3>
                <p className="text-xs text-gray-400">{passTarget.name} — {passTarget.phone}</p>
              </div>
            </div>
            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Ijambobanga rya {passTarget.name}
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Andika ijambobanga"
                  autoFocus
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
                <p className="text-xs text-gray-400 mt-1.5">Umunyamuryango azajya akoresheje iyi telefoni n'ikiijamobanga kugirango yinjire.</p>
              </div>
              {passErr && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <p className="text-rose-600 text-sm">{passErr}</p>
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
                  disabled={savingPass || newPassword.length < 4}
                  className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white rounded-xl py-3 font-medium hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {savingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {savingPass ? 'Bika...' : 'Bika'}
                </button>
                <button
                  type="button"
                  onClick={() => setPassTarget(null)}
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
