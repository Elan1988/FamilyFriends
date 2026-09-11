import { Wallet, Heart, Banknote } from 'lucide-react';

export default function Report() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Raporo y'Ukwezi - Nzeri 2026</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* CARD 1: Ayinjiye */}
        <div className="bg-green-50 border-green-200 p-6 rounded-xl shadow">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="text-green-600" />
            <h2 className="font-bold text-green-800">Ayinjiye</h2>
          </div>
          <p className="text-3xl font-bold text-green-900">0 RWF</p>
        </div>

        {/* CARD 2: Social */}
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl shadow">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="text-blue-600" />
            <h2 className="font-bold text-blue-800">Social</h2>
          </div>
          <p className="text-3xl font-bold text-blue-900">0 RWF</p>
        </div>

        {/* CARD 3: Loan */}
        <div className="bg-orange-50 border border-orange-200 p-6 rounded-xl shadow">
          <div className="flex items-center gap-3 mb-2">
            <Banknote className="text-orange-600" />
            <h2 className="font-bold text-orange-800">Loan</h2>
          </div>
          <p className="text-3xl font-bold text-orange-900">0 RWF</p>
        </div>

      </div>
    </div>
  )
}
