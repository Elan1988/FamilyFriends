import { useState } from 'react';
import { Phone, Lock, Loader2, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
  onLogin: (memberId: string) => void;
};

export default function Login({ onLogin }: Props) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone.trim() || !password.trim()) {
      setError("Andika telefoni n'ijambo ry'ibanga.");
      return;
    }
    setLoading(true);
    const { data, error: qErr } = await supabase
      .from('members')
      .select('id, name, password')
      .eq('phone', phone.trim())
      .maybeSingle();

    setLoading(false);

    if (qErr) { setError(qErr.message); return; }
    if (!data) { setError('Iyi mibare ya telefoni ntabonetse.'); return; }
    if (!data.password) { setError('Ntabwo ufite ijambobanga. Baza umuyobozi akugurire ijambobanga.'); return; }
    if (data.password !== password.trim()) { setError('Ijambobanga si ryo.'); return; }

    onLogin(data.id);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 sm:p-8 space-y-5">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <span className="text-white font-bold text-2xl">F</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">FamilyFriends</h1>
            <p className="text-sm text-gray-500">Kwinjira kw'umunyamuryango</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              <Phone className="w-4 h-4 text-gray-400" />
              Telefoni
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XX XXX XXX"
              autoFocus
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              <Lock className="w-4 h-4 text-gray-400" />
              Ijambobanga
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Andika ijambobanga"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
            />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
              <p className="text-rose-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white rounded-xl py-3.5 font-bold hover:bg-teal-700 transition disabled:opacity-50 shadow-sm"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            {loading ? 'Kwinjira...' : 'Kwinjira'}
          </button>
        </form>
      </div>
    </div>
  );
}
