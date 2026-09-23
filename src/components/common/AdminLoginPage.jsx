import React, { useState } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { Shield, Lock, User, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function AdminLoginPage({ onNavigate }) {
  const { login } = useGymState();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Set to true to enable Admin/Staff Registration link
  const isAdminRegistrationEnabled = false;

  const handleQuickLogin = async (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setError('');
    setLoading(true);
    try {
      const res = await login('admin', user, pass);
      setLoading(false);
      if (res.success) {
        onNavigate('/admin/dashboard');
      } else {
        setError(res.message);
      }
    } catch {
      setLoading(false);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login('admin', username, password);
      setLoading(false);
      if (res.success) {
        onNavigate('/admin/dashboard');
      } else {
        setError(res.message);
      }
    } catch {
      setLoading(false);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f12] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[#00af87]/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-teal-900/10 blur-[100px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-4">
          <img
            src="/logo.jpg"
            alt="Fit By Shahid Logo"
            className="w-20 h-20 rounded-full object-cover border-2 border-[#00af87] shadow-md mb-2"
          />
          <h1 className="text-2xl font-extrabold tracking-tight text-white font-sans flex items-center gap-1 justify-center">
            FIT_BY_SHAHID<span className="text-[#00af87]">_</span>
          </h1>
          <p className="text-[10px] text-[#00af87] font-extrabold uppercase tracking-widest mt-1">Admin Portal</p>
        </div>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        {/* Main Login Card */}
        <div className="bg-[#15191e]/95 backdrop-blur-md py-8 px-6 sm:px-10 rounded-3xl shadow-2xl border border-gray-800 flex flex-col gap-6">
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-[#00af87]/10 border border-[#00af87]/20 flex items-center justify-center text-[#00af87] shadow-inner mb-1">
              <Shield size={24} className="animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">ADMIN LOGIN</h2>
            <p className="text-[11px] text-gray-400 font-medium">Manage your gym with complete control</p>
          </div>

          {/* Quick Demo Helper for Mobile & Testing */}
          <div className="bg-[#1a2027] border border-gray-800/90 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
            <div className="text-left">
              <span className="text-[10px] font-extrabold text-[#00af87] uppercase tracking-wider block">Default Credentials</span>
              <span className="font-mono text-gray-300 text-[11px]">admin</span> / <span className="font-mono text-gray-300 text-[11px]">password</span>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('admin', 'password')}
              className="px-3 py-1.5 rounded-xl bg-[#00af87]/20 border border-[#00af87]/40 text-[#00af87] hover:bg-[#00af87]/30 text-[11px] font-extrabold transition-all shrink-0 active:scale-95 disabled:opacity-50"
            >
              1-Tap Login
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-950/50 border border-red-900/50 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-red-400 font-semibold animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                Username / Admin ID
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  autoComplete="username"
                  placeholder="e.g. admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs bg-[#1f242b] border border-gray-800 focus:border-[#00af87] rounded-xl pl-10 pr-4 py-3 outline-none transition-all text-white font-medium focus:ring-1 focus:ring-[#00af87]/50"
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
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs bg-[#1f242b] border border-gray-800 focus:border-[#00af87] rounded-xl pl-10 pr-10 py-3 outline-none transition-all text-white font-medium focus:ring-1 focus:ring-[#00af87]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
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
                  className="rounded bg-[#1f242b] border-gray-800 text-[#00af87] focus:ring-0 cursor-pointer"
                />
                Remember Me
              </label>
              <button
                type="button"
                onClick={() => setError('Please contact the head administrator to reset your password.')}
                className="text-[#00af87] hover:underline font-semibold"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-extrabold text-xs shadow-md transition-all mt-6 bg-gradient-to-r from-[#00af87] to-teal-600 hover:opacity-95 disabled:opacity-50 active:scale-[0.98]"
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

          {/* Admin Registration Link - Displayed only if enabled */}
          {isAdminRegistrationEnabled && (
            <div className="border-t border-gray-800 pt-4 text-center">
              <button
                onClick={() => onNavigate('/register/admin')}
                className="text-xs text-[#00af87] hover:underline font-bold"
              >
                Create Admin Account
              </button>
            </div>
          )}
        </div>

        {/* Client portal redirect link: Kept separate and outside the login form card */}
        <div className="mt-6 text-center">
          <button
            onClick={() => onNavigate('/login/client')}
            className="text-[11px] text-gray-500 hover:text-[#00af87] font-bold uppercase tracking-wider transition-all"
          >
            ← Go to Member Portal
          </button>
        </div>
      </div>
    </div>
  );
}
