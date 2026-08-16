import React, { useState } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { Shield, User, Lock, Mail, AlertCircle, ArrowRight, Dumbbell } from 'lucide-react';

export default function LoginPage() {
  const { login } = useGymState();
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' or 'client'
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Mock delay for realistic loading feel
    setTimeout(() => {
      const res = login(activeTab, username, password);
      setLoading(false);
      if (!res.success) {
        setError(res.message);
      }
    }, 600);
  };

  const handleQuickLogin = (role, user, pass) => {
    setError('');
    setLoading(true);
    setTimeout(() => {
      const res = login(role, user, pass);
      setLoading(false);
      if (!res.success) {
        setError(res.message);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-teal-50/20 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Background shapes for depth */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-200/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-orange-200/10 blur-[120px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="/logo.jpg"
            alt="Fit By Shahid Logo"
            className="w-24 h-24 rounded-full object-cover border border-gray-100 shadow-md mb-3"
          />
          <span className="text-3xl font-extrabold tracking-tight text-gray-800 font-sans">
            FIT_BY_SHAHID<span className="text-[#00af87]">_</span>
          </span>
        </div>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Premium Fitness Coaching Platform</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-10 rounded-3xl shadow-premium-lg border border-gray-100 flex flex-col gap-6">
          
          {/* Tab Selector */}
          <div className="grid grid-cols-2 bg-gray-100 rounded-2xl p-1 border border-gray-200">
            <button
              onClick={() => {
                setActiveTab('admin');
                setError('');
                setUsername('');
                setPassword('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === 'admin'
                  ? 'bg-white text-gray-800 shadow-sm border border-gray-100'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Shield size={14} className={activeTab === 'admin' ? 'text-[#00af87]' : ''} />
              Trainer Portal
            </button>
            <button
              onClick={() => {
                setActiveTab('client');
                setError('');
                setUsername('');
                setPassword('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === 'client'
                  ? 'bg-white text-gray-800 shadow-sm border border-gray-100'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <User size={14} className={activeTab === 'client' ? 'text-[#ff9f29]' : ''} />
              Client Portal
            </button>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-red-600 font-semibold animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                {activeTab === 'admin' ? 'Coach Username' : 'Client Username'}
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder={activeTab === 'admin' ? 'e.g. admin' : 'e.g. therese'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full text-xs bg-gray-50/70 border border-gray-200 rounded-xl pl-10 pr-4 py-3 outline-none transition-all focus:bg-white text-gray-800 font-medium ${
                    activeTab === 'admin' ? 'focus:border-[#00af87]' : 'focus:border-[#ff9f29]'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full text-xs bg-gray-50/70 border border-gray-200 rounded-xl pl-10 pr-4 py-3 outline-none transition-all focus:bg-white text-gray-800 font-medium ${
                    activeTab === 'admin' ? 'focus:border-[#00af87]' : 'focus:border-[#ff9f29]'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-extrabold text-xs shadow-md transition-all mt-6 disabled:opacity-50 ${
                activeTab === 'admin' ? 'btn-gradient-teal' : 'btn-gradient-orange'
              }`}
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  Sign In <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login */}
          <div className="border-t border-gray-100 pt-5">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block text-center mb-3">Quick Demo Portals</span>
            
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin', 'password')}
                className="flex items-center justify-between px-4 py-2.5 border border-gray-100 hover:border-[#00af87] hover:bg-teal-50/10 rounded-2xl text-left transition-all text-xs font-semibold group"
              >
                <div className="flex items-center gap-2 text-gray-600 group-hover:text-[#00af87]">
                  <Shield size={14} className="text-[#00af87]" />
                  <span>Coach Portal (Admin)</span>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">Quick Login →</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('client', 'therese', 'password')}
                className="flex items-center justify-between px-4 py-2.5 border border-gray-100 hover:border-[#ff9f29] hover:bg-orange-50/10 rounded-2xl text-left transition-all text-xs font-semibold group"
              >
                <div className="flex items-center gap-2 text-gray-600 group-hover:text-[#ff9f29]">
                  <User size={14} className="text-[#ff9f29]" />
                  <span>Therese Spring (Client)</span>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">Quick Login →</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('client', 'john', 'password')}
                className="flex items-center justify-between px-4 py-2.5 border border-gray-100 hover:border-[#ff9f29] hover:bg-orange-50/10 rounded-2xl text-left transition-all text-xs font-semibold group"
              >
                <div className="flex items-center gap-2 text-gray-600 group-hover:text-[#ff9f29]">
                  <User size={14} className="text-[#ff9f29]" />
                  <span>John Doe (Client)</span>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">Quick Login →</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
