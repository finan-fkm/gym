import React from 'react';
import { useGymState } from '../../context/GymStateContext';
import { Home, Users, Dumbbell, MessageSquare, Shield, User, LogOut } from 'lucide-react';

export default function Navbar() {
  const { currentRole, activeClient, clients, setActiveClientId, logout, activeTab, setActiveTab } = useGymState();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
      {/* Brand Logo */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-teal-50 border-2 border-[#00af87] flex items-center justify-center relative">
          <span className="text-[#00af87] font-bold text-lg font-serif">F</span>
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff9f29] absolute -bottom-0.5 -right-0.5 border border-white"></div>
        </div>
        <span className="text-xl font-bold tracking-tight text-[#2c3e50] font-sans">
          FIT_BY_SHAHID_<span className="text-[#00af87]">_</span>
        </span>
      </div>

      {/* Main Tabs */}
      <div className="hidden md:flex items-center gap-8">
        <button
          onClick={() => currentRole === 'admin' && setActiveTab('home')}
          className={`flex items-center gap-1.5 text-sm font-medium transition-all pb-1 ${
            currentRole !== 'admin' || activeTab === 'home'
              ? 'text-[#00af87] border-b-2 border-[#00af87]'
              : 'text-gray-500 hover:text-gray-900 border-b-2 border-transparent'
          }`}
        >
          <Home size={16} />
          Home
        </button>
        {currentRole === 'admin' && (
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex items-center gap-1.5 text-sm font-medium transition-all pb-1 ${
              activeTab === 'clients'
                ? 'text-[#00af87] border-b-2 border-[#00af87]'
                : 'text-gray-500 hover:text-gray-900 border-b-2 border-transparent'
            }`}
          >
            <Users size={16} />
            Clients
          </button>
        )}
        <button className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#00af87] transition-all pb-1 border-b-2 border-transparent">
          <Dumbbell size={16} />
          Workout
        </button>
        <button className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#00af87] transition-all pb-1 border-b-2 border-transparent">
          <MessageSquare size={16} />
          Message
        </button>
      </div>

      {/* Switcher & Logged In user info */}
      <div className="flex items-center gap-4">
        {/* Client Selection (Admin Mode only) */}
        {currentRole === 'admin' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Viewing Client:</span>
            <select
              value={activeClient?.id || ''}
              onChange={(e) => setActiveClientId(e.target.value)}
              className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-700 outline-none focus:border-[#00af87] cursor-pointer animate-in fade-in"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* User profile details */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200">
          <div className="flex flex-col text-right hidden sm:block">
            <span className="text-xs font-bold text-gray-800">
              {currentRole === 'admin' ? 'Coach Brandon' : activeClient?.name}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              {currentRole === 'admin' ? 'Trainer Account' : 'Client Account'}
            </span>
          </div>
          <img
            src={currentRole === 'admin' ? '/images/john.webp' : activeClient?.photo}
            alt="User profile"
            className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 shadow-sm"
          />
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl text-xs font-bold transition-all shadow-sm"
          title="Sign out of account"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </nav>
  );
}

