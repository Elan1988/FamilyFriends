import { useState } from 'react';
import { LayoutDashboard, CheckCircle2, Users, LogIn } from 'lucide-react';
import Dashboard from '@/pages/Dashboard';
import KwinjizaIbyinjiye from '@/pages/KwinjizaIbyinjiye';
import Abanyamuryango from '@/pages/Abanyamuryango';
import Login from '@/pages/Login';
import MemberDashboard from '@/pages/MemberDashboard';

type Page = 'dashboard' | 'kwinjiza' | 'abanyamuryango';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [view, setView] = useState<'admin' | 'login' | 'member'>('admin');
  const [loggedInMemberId, setLoggedInMemberId] = useState<string | null>(null);

  const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kwinjiza', label: 'Kwinjiza', icon: CheckCircle2 },
    { id: 'abanyamuryango', label: 'Abanyamuryango', icon: Users },
  ];

  // Login view
  if (view === 'login') {
    return (
      <Login
        onLogin={(memberId) => {
          setLoggedInMemberId(memberId);
          setView('member');
        }}
      />
    );
  }

  // Member dashboard view
  if (view === 'member' && loggedInMemberId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <div>
                <h1 className="font-bold text-gray-900 text-base sm:text-lg leading-tight">FamilyFriends</h1>
                <p className="text-xs text-gray-400 leading-tight hidden sm:block">Umwanya w'umunyamuryango</p>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-8">
          <MemberDashboard
            memberId={loggedInMemberId}
            onLogout={() => {
              setLoggedInMemberId(null);
              setView('admin');
              setPage('dashboard');
            }}
          />
        </main>
      </div>
    );
  }

  // Admin view (default)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base sm:text-lg leading-tight">FamilyFriends</h1>
              <p className="text-xs text-gray-400 leading-tight hidden sm:block">Ubuyobozi bw'Umuryango</p>
            </div>
          </div>
          <button
            onClick={() => setView('login')}
            className="flex items-center gap-2 bg-teal-50 text-teal-700 rounded-xl px-3 sm:px-4 py-2 text-sm font-medium hover:bg-teal-100 transition"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Kwinjira nku munyamuryango</span>
            <span className="sm:hidden">Kwinjira</span>
          </button>
        </div>
      </header>

      {/* Desktop nav bar */}
      <nav className="hidden sm:block bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 flex gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  page === item.id
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-24 sm:pb-8">
        {page === 'dashboard' && <Dashboard onNavigate={(p) => setPage(p)} />}
        {page === 'kwinjiza' && <KwinjizaIbyinjiye onBack={() => setPage('dashboard')} onGoToMembers={() => setPage('abanyamuryango')} />}
        {page === 'abanyamuryango' && <Abanyamuryango onBack={() => setPage('dashboard')} />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40">
        <div className="grid grid-cols-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex flex-col items-center gap-1 py-3 transition ${
                  page === item.id ? 'text-teal-600' : 'text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-tight text-center px-0.5">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
