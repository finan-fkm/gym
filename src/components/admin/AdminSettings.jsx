import React, { useState, useEffect } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { 
  Lock, 
  Building, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  KeyRound, 
  ShieldCheck 
} from 'lucide-react';

export default function AdminSettings() {
  const { 
    currentUser, 
    changePassword, 
    fetchGymSettings, 
    updateGymSettings 
  } = useGymState();

  const [loading, setLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [gymFeedback, setGymFeedback] = useState(null);

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Gym Information States
  const [gymName, setGymName] = useState('FIT_BY_SHAHID');
  const [tagline, setTagline] = useState('Elite Personal Training & Athletic Conditioning');
  const [phone, setPhone] = useState('+1 (555) 019-2834');
  const [email, setEmail] = useState('contact@fitbyshahid.com');
  const [address, setAddress] = useState('10880 Wilshire Blvd, Los Angeles, CA 90024');
  const [currency, setCurrency] = useState('USD');
  const [businessHours, setBusinessHours] = useState('Mon-Fri: 5:00 AM - 11:00 PM, Sat-Sun: 7:00 AM - 9:00 PM');
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(true);

  useEffect(() => {
    const load = async () => {
      const s = await fetchGymSettings();
      if (s) {
        if (s.gymName) setGymName(s.gymName);
        if (s.brandTagline) setTagline(s.brandTagline);
        if (s.phone) setPhone(s.phone);
        if (s.email) setEmail(s.email);
        if (s.address) setAddress(s.address);
        if (s.currency) setCurrency(s.currency);
        if (s.businessHours) setBusinessHours(s.businessHours);
        if (s.allowClientSelfRegistration !== undefined) setAllowSelfRegistration(s.allowClientSelfRegistration);
      }
    };
    load();
  }, [fetchGymSettings]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    setLoading(true);
    const res = await changePassword(currentPassword, newPassword);
    setLoading(false);

    if (res.success) {
      setPasswordFeedback({ type: 'success', text: 'Admin password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordFeedback({ type: 'error', text: res.message || 'Could not update password.' });
    }
  };

  const handleGymInfoSave = async (e) => {
    e.preventDefault();
    setGymFeedback(null);
    setLoading(true);

    const updated = await updateGymSettings({
      gymName,
      brandTagline: tagline,
      phone,
      email,
      address,
      currency,
      businessHours,
      allowClientSelfRegistration: allowSelfRegistration
    });
    setLoading(false);

    if (updated) {
      setGymFeedback({ type: 'success', text: 'Gym settings updated and saved to database!' });
      setTimeout(() => setGymFeedback(null), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00af87]"></span>
            <span className="text-[10px] font-extrabold uppercase text-[#00af87] tracking-wider">System Configuration</span>
          </div>
          <h2 className="text-xl font-black text-gray-800 leading-tight mt-1">Admin Profile & Settings</h2>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            Configure application parameters, facility contact information, and security credentials.
          </p>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-teal-50 border border-teal-100 flex items-center gap-2">
          <ShieldCheck size={18} className="text-[#00af87]" />
          <div className="text-left">
            <div className="text-[10px] font-extrabold uppercase text-gray-400">Authenticated As</div>
            <div className="text-xs font-black text-gray-800">{currentUser?.name || 'Administrator'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Gym Information & App Settings (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50">
            <Building size={18} className="text-[#00af87]" />
            <h3 className="text-sm font-extrabold text-gray-800">Gym & Facility Information</h3>
          </div>

          <form onSubmit={handleGymInfoSave} className="space-y-4 text-xs">
            {gymFeedback && (
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 font-semibold flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>{gymFeedback.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Gym Name</label>
                <input
                  type="text"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#00af87] text-gray-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Currency</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#00af87] text-gray-800"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Tagline / Mission</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#00af87] text-gray-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Support Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#00af87] text-gray-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#00af87] text-gray-800"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Physical Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#00af87] text-gray-800"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Operating Hours</label>
              <input
                type="text"
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#00af87] text-gray-800"
              />
            </div>

            <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowSelfRegistration}
                  onChange={(e) => setAllowSelfRegistration(e.target.checked)}
                  className="rounded text-[#00af87] focus:ring-[#00af87]"
                />
                <span className="text-xs font-semibold text-gray-700">Allow Client Password Setup & Self-Registration</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-white font-extrabold btn-gradient-teal shadow-md flex items-center gap-1.5"
              >
                <Save size={14} /> Save Information
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Change Admin Password (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50">
            <KeyRound size={18} className="text-[#00af87]" />
            <h3 className="text-sm font-extrabold text-gray-800">Admin Security Credentials</h3>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
            {passwordFeedback && (
              <div className={`p-3 rounded-2xl font-semibold flex items-start gap-2 ${
                passwordFeedback.type === 'error'
                  ? 'bg-red-50 text-red-600 border border-red-100'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              }`}>
                {passwordFeedback.type === 'error' ? <AlertCircle size={15} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={15} className="shrink-0 mt-0.5" />}
                <span>{passwordFeedback.text}</span>
              </div>
            )}

            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#00af87] text-gray-800"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">New Password</label>
              <input
                type="password"
                required
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#00af87] text-gray-800"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#00af87] text-gray-800"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-white font-extrabold btn-gradient-teal shadow-md flex items-center justify-center gap-1.5"
              >
                <Lock size={14} /> Update Admin Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
