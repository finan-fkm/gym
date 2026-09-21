import React, { useState } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { User, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function ClientLoginPage({ onNavigate }) {
  const { login } = useGymState();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login('client', username, password);
      setLoading(false);
      if (res.success) {
        onNavigate('/client/dashboard');
      } else {
        setError(res.message);
      }
    } catch {
      setLoading(false);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const handleQuickLogin = async (user, pass) => {
    setError('');
    setLoading(true);
    try {
      const res = await login('client', user, pass);
      setLoading(false);
      if (res.success) {
        onNavigate('/client/dashboard');
      } else {
        setError(res.message);
      }
    } catch {
      setLoading(false);
      setError('An unexpected error occurred.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-amber-50/30 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Background shape layers */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#ff9f29]/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-orange-200/20 blur-[120px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-4">
          <img
            src="/logo.jpg"
            alt="Fit By Shahid Logo"
            className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-lg mb-2"
          />
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-800 font-sans flex items-center justify-center gap-1">
            FIT_BY_SHAHID<span className="text-[#ff9f29]">_</span>
          </h1>
          <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mt-1">Member Portal</p>
        </div>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        {/* Main Member Login Card */}
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-10 rounded-3xl shadow-premium border border-gray-100 flex flex-col gap-6">
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-[#ff9f29]/10 border border-[#ff9f29]/20 flex items-center justify-center text-[#ff9f29] shadow-inner mb-1">
              <User size={24} />
            </div>
            <h2 className="text-xl font-black text-gray-800 uppercase tracking-wider">MEMBER LOGIN</h2>
            <p className="text-[11px] text-gray-400 font-medium">Access your fitness journey</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-red-600 font-semibold animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                Username / Member ID
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. therese"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs bg-gray-50/70 border border-gray-200 focus:border-[#ff9f29] rounded-xl pl-10 pr-4 py-3 outline-none transition-all text-gray-800 font-semibold"
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
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs bg-gray-50/70 border border-gray-200 focus:border-[#ff9f29] rounded-xl pl-10 pr-10 py-3 outline-none transition-all text-gray-800 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <label className="flex items-center gap-2 text-gray-400 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-gray-50 border-gray-200 text-[#ff9f29] focus:ring-0 cursor-pointer"
                />
                Remember Me
              </label>
              <button
                type="button"
                onClick={() => setError('Please contact the gym administrator to reset your password.')}
                className="text-[#ff9f29] hover:underline font-semibold"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-extrabold text-xs shadow-md transition-all mt-6 bg-gradient-to-r from-[#ff9f29] to-orange-500 hover:opacity-95 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  Login <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Registration Section */}
          <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block text-center">
              First time logging in?
            </span>
            <button
              type="button"
              onClick={() => onNavigate('/register/client')}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-[#00af87] hover:border-[#00af87] hover:bg-teal-50/10 font-extrabold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 animate-pulse"
            >
              Register & Set Password
            </button>
          </div>

          {/* Quick Demo Login */}
          <div className="border-t border-gray-100 pt-4">
            <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider block text-center mb-2.5">
              Quick Demo Accounts
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('therese', 'password')}
                className="px-3 py-2 border border-gray-100 hover:border-[#ff9f29] hover:bg-orange-50/10 rounded-xl text-center transition-all text-[11px] font-bold text-gray-600"
              >
                Therese Spring
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('john', 'password')}
                className="px-3 py-2 border border-gray-100 hover:border-[#ff9f29] hover:bg-orange-50/10 rounded-xl text-center transition-all text-[11px] font-bold text-gray-600"
              >
                John Doe
              </button>
            </div>
          </div>
        </div>

        {/* Link to Admin Login is separate and small, outside the card */}
        <div className="mt-6 text-center">
          <button
            onClick={() => onNavigate('/login/admin')}
            className="text-[10px] text-gray-400 hover:text-gray-600 font-bold uppercase tracking-wider transition-all"
          >
            Coach Portal (Admin) →
          </button>
        </div>
      </div>
    </div>
  );
}
