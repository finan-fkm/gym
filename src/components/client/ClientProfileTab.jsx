import React, { useState, useEffect } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { 
  User, 
  CreditCard, 
  Lock, 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Mail, 
  Phone, 
  Ruler, 
  ShieldCheck
} from 'lucide-react';

export default function ClientProfileTab() {
  const { 
    activeClient, 
    updateClientProfile, 
    changePassword, 
    clientNotifications, 
    fetchClientNotifications, 
    markNotificationRead 
  } = useGymState();

  const [loading, setLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const [passwordMsg, setPasswordMsg] = useState(null);

  // Form States
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [height, setHeight] = useState('');

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (activeClient) {
      setPhone(activeClient.phone || '');
      setEmail(activeClient.email || '');
      setHeight(activeClient.height || '');
    }
    fetchClientNotifications();
  }, [activeClient, fetchClientNotifications]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    setLoading(true);

    try {
      updateClientProfile({
        phone: phone.trim(),
        email: email.trim(),
        height: height.trim()
      });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setProfileMsg(null), 3000);
    } catch {
      setProfileMsg({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    const res = await changePassword(currentPassword, newPassword);
    setLoading(false);

    if (res.success) {
      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(null), 3000);
    } else {
      setPasswordMsg({ type: 'error', text: res.message || 'Incorrect current password.' });
    }
  };

  // Expiry Calculation
  let daysRemaining = null;
  let isExpired = false;
  if (activeClient?.membershipExpiryDate) {
    const exp = new Date(activeClient.membershipExpiryDate);
    const now = new Date();
    daysRemaining = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    isExpired = daysRemaining < 0;
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Membership Card */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] w-32 h-32 rounded-full bg-[#00af87]/20 blur-2xl pointer-events-none"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-[#00af87]" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#00af87]">
              Membership Card
            </span>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
            isExpired ? 'bg-red-500/20 text-red-400' : 'bg-[#00af87]/20 text-[#00af87]'
          }`}>
            {isExpired ? 'Expired' : 'Active Member'}
          </span>
        </div>

        <div className="mb-4">
          <div className="text-xl font-black">{activeClient?.membershipPlan || 'Gold Monthly'}</div>
          <div className="text-xs text-gray-400 font-mono mt-0.5">Member ID: {activeClient?.memberId || 'GYM1025'}</div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-gray-700/60 pt-3 text-xs">
          <div>
            <div className="text-[9px] text-gray-400 uppercase font-bold">Valid Through</div>
            <div className="font-bold text-gray-200 mt-0.5">{activeClient?.membershipExpiryDate || 'Active'}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-gray-400 uppercase font-bold">Days Remaining</div>
            <div className="font-black text-[#00af87] mt-0.5">
              {daysRemaining !== null ? (daysRemaining > 0 ? `${daysRemaining} Days` : 'Expired') : 'Ongoing'}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Drawer */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-50">
          <h3 className="text-sm font-extrabold text-gray-800 flex items-center gap-2">
            <Bell size={16} className="text-[#00af87]" /> Gym Announcements & Alerts
          </h3>
          <span className="text-[10px] text-gray-400 font-bold uppercase">
            {clientNotifications.filter(n => !n.isRead).length} Unread
          </span>
        </div>

        {clientNotifications.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400 font-semibold bg-gray-50/50 rounded-2xl">
            You're all caught up! No active notifications.
          </div>
        ) : (
          <div className="space-y-2">
            {clientNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.isRead && markNotificationRead(notif.id)}
                className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                  notif.isRead
                    ? 'bg-gray-50/60 border-gray-100 text-gray-600'
                    : 'bg-teal-50/50 border-teal-100 text-gray-800 font-bold'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-gray-900">{notif.title}</span>
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-[#00af87]"></span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 font-medium mt-1 leading-snug">{notif.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile Details Edit Card */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50">
          <User size={18} className="text-[#00af87]" />
          <h3 className="text-sm font-extrabold text-gray-800">Personal Information</h3>
        </div>

        {profileMsg && (
          <div className={`p-3 rounded-2xl mb-4 text-xs font-semibold flex items-center gap-2 ${
            profileMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
          }`}>
            <CheckCircle2 size={15} />
            <span>{profileMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleProfileSave} className="space-y-3.5 text-xs">
          <div>
            <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Email Address</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#00af87]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Phone Number</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#00af87]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Height</label>
            <div className="relative">
              <Ruler size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="e.g. 5'7&quot;"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#00af87]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-white font-extrabold text-xs btn-gradient-teal shadow-md flex items-center justify-center gap-1.5"
          >
            <Save size={14} /> Save Profile Changes
          </button>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50">
          <Lock size={18} className="text-[#00af87]" />
          <h3 className="text-sm font-extrabold text-gray-800">Change Account Password</h3>
        </div>

        {passwordMsg && (
          <div className={`p-3 rounded-2xl mb-4 text-xs font-semibold flex items-center gap-2 ${
            passwordMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
          }`}>
            {passwordMsg.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-3.5 text-xs">
          <div>
            <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#00af87]"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">New Password</label>
            <input
              type="password"
              required
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#00af87]"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#00af87]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-white font-extrabold text-xs btn-gradient-teal shadow-md flex items-center justify-center gap-1.5"
          >
            <ShieldCheck size={14} /> Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
