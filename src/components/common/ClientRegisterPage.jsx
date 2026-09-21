import React, { useState } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { User, Lock, CheckCircle, AlertCircle, ArrowRight, Eye, EyeOff, ShieldAlert } from 'lucide-react';

export default function ClientRegisterPage({ onNavigate }) {
  const { verifyClientUsername, registerClientPassword } = useGymState();
  const [step, setStep] = useState(1); // 1: Enter Username, 2: Create Password, 3: Success
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

  // Username Verification
  const handleVerifyUsername = (e) => {
    e.preventDefault();
    setError('');
    setIsAlreadyRegistered(false);
    
    if (!username.trim()) {
      setError('Please enter a username.');
      return;
    }

    setLoading(true);
    // Add small timeout for simulated API feel
    setTimeout(async () => {
      const res = await verifyClientUsername(username);
      setLoading(false);
      if (res.success) {
        setStep(2);
      } else {
        if (res.code === 'ALREADY_REGISTERED') {
          setIsAlreadyRegistered(true);
        } else {
          setError(res.message);
        }
      }
    }, 400);
  };

  // Password Strength Check
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: 'No Password', color: 'bg-gray-200' };
    if (pass.length < 8) return { score: 1, text: 'Weak (Min 8 chars)', color: 'bg-red-500' };
    
    // Check complexity
    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    const hasSymbols = /[^a-zA-Z0-9]/.test(pass);

    if (hasLetters && hasNumbers && hasSymbols) {
      return { score: 3, text: 'Strong Password', color: 'bg-[#00af87]' };
    }
    return { score: 2, text: 'Medium Password', color: 'bg-orange-400' };
  };

  const strength = getPasswordStrength(password);

  // Password Submission
  const handleCreatePassword = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerClientPassword(username, password);
      setLoading(false);
      if (res.success) {
        setStep(3);
      } else {
        setError(res.message);
      }
    } catch {
      setLoading(false);
      setError('Failed to create account. Please try again.');
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
          <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mt-1">Register Account</p>
        </div>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-10 rounded-3xl shadow-premium border border-gray-100 flex flex-col gap-6">
          
          {/* Duplicate registration block */}
          {isAlreadyRegistered ? (
            <div className="text-center py-4 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-inner">
                <ShieldAlert size={24} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800">This account is already registered. Please login instead.</h2>
              </div>

              <button
                onClick={() => onNavigate('/login/client')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-extrabold text-xs shadow-md transition-all mt-4 bg-gradient-to-r from-[#ff9f29] to-orange-500 hover:opacity-95"
              >
                Go to Client Login <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <>
              {/* STEP 1: Enter Username */}
              {step === 1 && (
                <>
                  <div className="text-center">
                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-wider">Enter Your Username</h2>
                    <p className="text-[11px] text-gray-400 mt-1 font-medium">Please verify your assigned member username first.</p>
                  </div>

                  <form className="space-y-4" onSubmit={handleVerifyUsername}>
                    {error && (
                      <div className="bg-red-50 border border-red-100 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-red-600 font-semibold animate-in fade-in slide-in-from-top-2">
                        <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                        Username
                      </label>
                      <div className="relative">
                        <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          required
                          placeholder="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full text-xs bg-gray-50/70 border border-gray-200 focus:border-[#ff9f29] rounded-xl pl-10 pr-4 py-3 outline-none transition-all text-gray-800 font-semibold"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-extrabold text-xs shadow-md transition-all mt-6 bg-[#ff9f29] hover:bg-orange-500 disabled:opacity-50"
                    >
                      {loading ? 'Verifying...' : <>Continue <ArrowRight size={14} /></>}
                    </button>
                  </form>
                </>
              )}

              {/* STEP 2 & 3: Verify Username & Create New Password */}
              {step === 2 && (
                <>
                  <div className="text-center flex flex-col items-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-[10px] font-extrabold text-[#00af87] mb-3 uppercase tracking-wider">
                      Username Verified ✓
                    </div>
                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-wider">Create Your New Password</h2>
                    <p className="text-[11px] text-gray-400 mt-1 font-medium">Please set a secure password for your member profile.</p>
                  </div>

                  <form className="space-y-4" onSubmit={handleCreatePassword}>
                    {error && (
                      <div className="bg-red-50 border border-red-100 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-red-600 font-semibold animate-in fade-in slide-in-from-top-2">
                        <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="Min. 8 characters"
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

                      {/* Password Strength Indicator */}
                      {password && (
                        <div className="mt-2.5 space-y-1">
                          <div className="flex items-center justify-between text-[9px] font-extrabold text-gray-400 uppercase">
                            <span>Password Strength:</span>
                            <span className={strength.score === 3 ? 'text-[#00af87]' : strength.score === 2 ? 'text-orange-400' : 'text-red-500'}>
                              {strength.text}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
                            <div className={`h-full flex-1 transition-all duration-300 ${strength.score >= 1 ? strength.color : 'bg-gray-100'}`}></div>
                            <div className={`h-full flex-1 transition-all duration-300 ${strength.score >= 2 ? strength.color : 'bg-gray-100'}`}></div>
                            <div className={`h-full flex-1 transition-all duration-300 ${strength.score >= 3 ? strength.color : 'bg-gray-100'}`}></div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="Repeat your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full text-xs bg-gray-50/70 border border-gray-200 focus:border-[#ff9f29] rounded-xl pl-10 pr-10 py-3 outline-none transition-all text-gray-800 font-semibold"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || strength.score < 1}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-extrabold text-xs shadow-md transition-all mt-6 bg-[#ff9f29] hover:bg-orange-500 disabled:opacity-50"
                    >
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </form>
                </>
              )}

              {/* STEP 4: Success Screen */}
              {step === 3 && (
                <div className="text-center py-4 flex flex-col items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#00af87] shadow-inner mb-1 animate-bounce">
                    <CheckCircle size={28} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-800 uppercase tracking-wider">Account Created Successfully ✓</h2>
                    <p className="text-xs text-gray-400 mt-2 font-medium leading-relaxed">
                      Your client account has been created. You can now login using your username and new password.
                    </p>
                  </div>

                  <button
                    onClick={() => onNavigate('/login/client')}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-extrabold text-xs shadow-md transition-all mt-4 bg-gradient-to-r from-[#ff9f29] to-orange-500 hover:opacity-95"
                  >
                    Go to Client Login <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {/* Footer Back Link */}
              {step < 3 && (
                <div className="text-center border-t border-gray-100 pt-3">
                  <button
                    onClick={() => onNavigate('/login/client')}
                    className="text-[10px] text-gray-400 hover:text-gray-600 font-semibold"
                  >
                    ← Back to Login
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
