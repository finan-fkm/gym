import React, { useState, useEffect } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { 
  CalendarCheck, 
  CheckCircle2, 
  Search, 
  Plus, 
  AlertCircle, 
  Clock, 
  X,
  FileSignature
} from 'lucide-react';

export default function AdminAttendance() {
  const { 
    attendanceRecords, 
    fetchAttendanceRecords, 
    markAdminAttendance, 
    clients 
  } = useGymState();

  const [filterRange, setFilterRange] = useState('all'); // 'all', 'today', 'week', 'month'
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal Form States
  const [selectedClientId, setSelectedClientId] = useState('');
  const [sessionName, setSessionName] = useState('General Gym Access');
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [signature, setSignature] = useState('FIT_BY_SHAHID_');
  const [modalMessage, setModalMessage] = useState(null);

  useEffect(() => {
    fetchAttendanceRecords({ range: filterRange });
  }, [filterRange, fetchAttendanceRecords]);

  const handleManualCheckIn = async (e) => {
    e.preventDefault();
    setModalMessage(null);
    if (!selectedClientId) {
      setModalMessage({ type: 'error', text: 'Please select a client.' });
      return;
    }

    setLoading(true);
    const res = await markAdminAttendance({
      clientId: selectedClientId,
      date: customDate,
      sessionName,
      signature: signature.trim() || 'FIT_BY_SHAHID_'
    });
    setLoading(false);

    if (res.success) {
      setModalMessage({ type: 'success', text: 'Attendance recorded successfully!' });
      setTimeout(() => {
        setIsCheckInModalOpen(false);
        setModalMessage(null);
      }, 1200);
    } else {
      setModalMessage({ type: 'error', text: res.message || 'Could not record attendance.' });
    }
  };

  const filteredRecords = attendanceRecords.filter(r => {
    const q = searchQuery.toLowerCase();
    const nameMatch = (r.clientName || '').toLowerCase().includes(q);
    const userMatch = (r.clientUsername || '').toLowerCase().includes(q);
    const dateMatch = (r.dateLabel || '').toLowerCase().includes(q);
    return nameMatch || userMatch || dateMatch;
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00af87]"></span>
            <span className="text-[10px] font-extrabold uppercase text-[#00af87] tracking-wider">Attendance Ledger</span>
          </div>
          <h2 className="text-xl font-black text-gray-800 leading-tight mt-1">Gym Attendance Management</h2>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            Track daily, weekly, and monthly check-ins. Duplicate sessions are automatically prevented.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedClientId(clients[0]?.id || '');
            setModalMessage(null);
            setIsCheckInModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-2xl text-white font-extrabold text-xs btn-gradient-teal shadow-md hover:opacity-95 transition-all self-stretch sm:self-auto"
        >
          <Plus size={15} />
          Manual Check-In
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search attendance by member name, username, or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-3 text-xs outline-none focus:border-[#00af87] text-gray-700 shadow-sm font-semibold transition-all"
          />
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm self-start sm:self-auto shrink-0">
          {[
            { id: 'all', label: 'All Records' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterRange(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                filterRange === tab.id
                  ? 'bg-[#00af87] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-3xl shadow-premium border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
          <span className="text-xs font-extrabold text-gray-800">
            Total Check-ins Shown: <span className="text-[#00af87]">{filteredRecords.length}</span>
          </span>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Duplicate Protection: Active
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 font-semibold flex flex-col items-center gap-2">
            <CalendarCheck size={36} className="text-gray-300" />
            No attendance records match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                  <th className="py-3.5 px-6">Member</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Session Type</th>
                  <th className="py-3.5 px-6">Digital Signature</th>
                  <th className="py-3.5 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={r.clientPhoto || '/images/therese.webp'}
                          alt={r.clientName}
                          className="w-9 h-9 rounded-xl object-cover border border-gray-100"
                        />
                        <div>
                          <div className="font-bold text-gray-800 leading-tight">{r.clientName}</div>
                          <div className="text-[10px] text-[#00af87] font-semibold">{r.clientUsername}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-gray-700">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-gray-400" />
                        {r.dateLabel}
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-gray-600">
                      {r.sessionName}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-[10px] text-gray-500">
                      <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                        {r.signature}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1 w-max">
                        <CheckCircle2 size={11} /> {r.status || 'Present'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Check-in Modal */}
      {isCheckInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                <CalendarCheck size={18} className="text-[#00af87]" />
                Record Member Attendance
              </h3>
              <button onClick={() => setIsCheckInModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleManualCheckIn} className="p-6 space-y-4">
              {modalMessage && (
                <div className={`p-3 rounded-2xl text-xs font-semibold flex items-start gap-2 ${
                  modalMessage.type === 'error'
                    ? 'bg-red-50 text-red-600 border border-red-100'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}>
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{modalMessage.text}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                  Select Member
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#00af87] text-gray-800"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.username})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#00af87] text-gray-800"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                  Session Type
                </label>
                <input
                  type="text"
                  placeholder="e.g. Strength Training, Cardio, Personal Coaching"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#00af87] text-gray-800"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                  Digital Sign-off Signature
                </label>
                <div className="relative">
                  <FileSignature size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3.5 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCheckInModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl text-white font-extrabold text-xs btn-gradient-teal shadow-md hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Confirm Check-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
