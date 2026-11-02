import React, { useState } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { KeyRound, Lock, User, AlertCircle, CheckCircle, ArrowRight, X, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function ForgotPasswordModal({ isOpen, onClose, onNavigate }) {
  const { forgotPassword, resetPassword } = useGymState();
  const [step, setStep] = useState(1); // 1: Request, 2: Enter Token & New Password, 3: Success
  const [identifier, setIdentifier] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [directTokenNotice, setDirectTokenNotice] = useState(null);

  if (!isOpen) return null;

  // Step 1: Request Reset Token
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setDirectTokenNotice(null);

    if (!identifier.trim()) {
      setError('Please enter your Username, Member ID, or Email.');
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(identifier.trim());
      setLoading(false);

      if (res.success) {
        setInfoMessage(res.message);
        if (res.resetToken) {
          setDirectTokenNotice(res.resetToken);
          setToken(res.resetToken); // Autofill for convenience
        }
        setStep(2);
      } else {
        setError(res.message || 'Unable to process password reset request.');
      }
    } catch {
      setLoading(false);
      setError('A network error occurred. Please try again.');
    }
  };

  // Step 2: Submit New Password with Token
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!token.trim()) {
      setError('Please provide the reset code.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(token.trim(), newPassword);
      setLoading(false);

      if (res.success) {
        setStep(3);
      } else {
        setError(res.message || 'Invalid or expired reset token.');
      }
    } catch {
      setLoading(false);
      setError('Failed to reset password. Please check your token and try again.');
    }
  };

  const handleClose = () => {
    setStep(1);
    setIdentifier('');
    setToken('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setInfoMessage('');
    setDirectTokenNotice(null);
    onClose();
    if (onNavigate) {
      onNavigate('/login/client');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white/95 backdrop-blur-md rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 p-6 sm:p-8 relative overflow-hidden text-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-5 top-5 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* STEP 1: Enter Username or Email */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-[#ff9f29]/10 border border-[#ff9f29]/20 flex items-center justify-center text-[#ff9f29] shadow-inner">
                <KeyRound size={24} />
              </div>
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-wider">Reset Password</h2>
              <p className="text-[11px] text-gray-400 font-medium max-w-xs">
                Enter your member username, member ID, or registered email to receive a secure password reset token.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-red-600 font-semibold animate-in fade-in">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                  Username / Member ID / Email
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. @thespring, GYM1025, or email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full text-xs bg-gray-50/70 border border-gray-200 focus:border-[#ff9f29] rounded-xl pl-10 pr-4 py-3 outline-none transition-all text-gray-800 font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-extrabold text-xs hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl text-white font-extrabold text-xs shadow-md transition-all bg-gradient-to-r from-[#ff9f29] to-orange-500 hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {loading ? 'Processing...' : <>Send Token <ArrowRight size={14} /></>}
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setStep(2); setError(''); }}
                  className="text-[11px] text-[#ff9f29] hover:underline font-semibold"
                >
                  Already have a reset token? Enter it here &rarr;
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: Enter Token & New Password */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#00af87] shadow-inner">
                <ShieldCheck size={24} />
              </div>
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-wider">Set New Password</h2>
              <p className="text-[11px] text-gray-400 font-medium max-w-xs">
                Enter your one-time verification token and choose a secure new password.
              </p>
            </div>

            {infoMessage && (
              <div className="bg-teal-50 border border-teal-100 rounded-2xl p-3 text-xs text-[#00af87] font-semibold leading-relaxed">
                {infoMessage}
              </div>
            )}

            {directTokenNotice && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-800 flex flex-col gap-1.5">
                <span className="font-extrabold uppercase text-[10px] text-amber-600">Your One-Time Reset Code:</span>
                <code className="bg-white px-2 py-1.5 rounded-lg border border-amber-200 font-mono text-[11px] break-all select-all text-gray-800">
                  {directTokenNotice}
                </code>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-red-600 font-semibold animate-in fade-in">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1">
                  Reset Token / Code
                </label>
                <div className="relative">
                  <KeyRound size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Paste 64-char token here"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full text-xs font-mono bg-gray-50/70 border border-gray-200 focus:border-[#ff9f29] rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1">
                  New Password (min. 8 characters)
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs bg-gray-50/70 border border-gray-200 focus:border-[#ff9f29] rounded-xl pl-10 pr-10 py-2.5 outline-none transition-all text-gray-800 font-semibold"
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

              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs bg-gray-50/70 border border-gray-200 focus:border-[#ff9f29] rounded-xl pl-10 pr-10 py-2.5 outline-none transition-all text-gray-800 font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-extrabold text-xs hover:bg-gray-50 transition-all"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl text-white font-extrabold text-xs shadow-md transition-all bg-gradient-to-r from-[#ff9f29] to-orange-500 hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: Success Screen */}
        {step === 3 && (
          <div className="text-center py-4 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#00af87] shadow-inner animate-bounce">
              <CheckCircle size={30} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-800 uppercase tracking-wider">Password Reset Complete!</h2>
              <p className="text-xs text-gray-400 mt-2 font-medium leading-relaxed max-w-xs">
                Your password has been successfully updated. You can now log into your member dashboard with your new password.
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3 rounded-2xl text-white font-extrabold text-xs shadow-md transition-all mt-3 bg-gradient-to-r from-[#ff9f29] to-orange-500 hover:opacity-95 flex items-center justify-center gap-2"
            >
              Back to Login <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
