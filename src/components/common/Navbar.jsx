import React from 'react';
import { useGymState } from '../../context/GymStateContext';
import { 
  Home, 
  Users, 
  CalendarCheck, 
  CreditCard, 
  Settings, 
  LayoutDashboard, 
  LogOut 
} from 'lucide-react';

export default function Navbar() {
  const { currentRole, activeClient, clients, setActiveClientId, logout, activeTab, setActiveTab } = useGymState();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-sm">
      {/* Brand Logo */}
      <div 
        onClick={() => currentRole === 'admin' && setActiveTab('dashboard')}
        className="flex items-center gap-2 sm:gap-2.5 min-w-0 cursor-pointer"
      >
        <img
          src="/logo.jpg"
          alt="Fit By Shahid Logo"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-gray-100 shadow-sm shrink-0"
        />
        <span className="text-sm sm:text-xl font-bold tracking-tight text-[#2c3e50] font-sans truncate">
          FIT_BY_SHAHID<span className="text-[#00af87]">_</span>
        </span>
      </div>

      {/* Main Tabs */}
      <div className="hidden md:flex items-center gap-6">
        {currentRole === 'admin' ? (
          <>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 text-xs font-bold transition-all pb-1 ${
                activeTab === 'dashboard'
                  ? 'text-[#00af87] border-b-2 border-[#00af87]'
                  : 'text-gray-500 hover:text-gray-900 border-b-2 border-transparent'
              }`}
            >
              <LayoutDashboard size={15} />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center gap-1.5 text-xs font-bold transition-all pb-1 ${
                activeTab === 'home'
                  ? 'text-[#00af87] border-b-2 border-[#00af87]'
                  : 'text-gray-500 hover:text-gray-900 border-b-2 border-transparent'
              }`}
            >
              <Home size={15} />
              Workout Tracker
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`flex items-center gap-1.5 text-xs font-bold transition-all pb-1 ${
                activeTab === 'clients'
                  ? 'text-[#00af87] border-b-2 border-[#00af87]'
                  : 'text-gray-500 hover:text-gray-900 border-b-2 border-transparent'
              }`}
            >
              <Users size={15} />
              Clients
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center gap-1.5 text-xs font-bold transition-all pb-1 ${
                activeTab === 'attendance'
                  ? 'text-[#00af87] border-b-2 border-[#00af87]'
                  : 'text-gray-500 hover:text-gray-900 border-b-2 border-transparent'
              }`}
            >
              <CalendarCheck size={15} />
              Attendance
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-1.5 text-xs font-bold transition-all pb-1 ${
                activeTab === 'billing'
                  ? 'text-[#00af87] border-b-2 border-[#00af87]'
                  : 'text-gray-500 hover:text-gray-900 border-b-2 border-transparent'
              }`}
            >
              <CreditCard size={15} />
              Memberships & Billing
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 text-xs font-bold transition-all pb-1 ${
                activeTab === 'settings'
                  ? 'text-[#00af87] border-b-2 border-[#00af87]'
                  : 'text-gray-500 hover:text-gray-900 border-b-2 border-transparent'
              }`}
            >
              <Settings size={15} />
              Settings
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#00af87] bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100">
            <span className="w-2 h-2 rounded-full bg-[#00af87] animate-pulse"></span>
            Member Workout Portal
          </div>
        )}
      </div>

      {/* Switcher & Logged In user info */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Client Selection (Admin Mode only) */}
        {currentRole === 'admin' && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 font-medium hidden md:inline">Viewing:</span>
            <select
              value={activeClient?.id || ''}
              onChange={(e) => {
                setActiveClientId(e.target.value);
                if (activeTab === 'dashboard') setActiveTab('home');
              }}
              className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-1.5 sm:px-2 py-1 text-gray-700 outline-none focus:border-[#00af87] cursor-pointer animate-in fade-in max-w-[95px] sm:max-w-[180px] truncate"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* User profile details */}
        <div className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 border-l border-gray-200">
          <div className="flex flex-col text-right hidden sm:block">
            <span className="text-xs font-bold text-gray-800">
              {currentRole === 'admin' ? 'Coach Brandon' : activeClient?.name}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              {currentRole === 'admin' ? 'Trainer Account' : 'Client Account'}
            </span>
          </div>
          <img
            src={currentRole === 'admin' ? '/images/john.webp' : activeClient?.photo || '/images/therese.webp'}
            alt="User profile"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-gray-200 shadow-sm shrink-0"
          />
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl text-xs font-bold transition-all shadow-sm"
          title="Sign out of account"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </nav>
  );
}

