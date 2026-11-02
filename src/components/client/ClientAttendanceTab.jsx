import React, { useState, useEffect } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { 
  CalendarCheck, 
  CheckCircle2, 
  Clock, 
  FileSignature, 
  AlertCircle, 
  Calendar,
  Sparkles
} from 'lucide-react';

export default function ClientAttendanceTab() {
  const { 
    activeClient, 
    clientAttendanceSummary, 
    fetchClientAttendance, 
    clientCheckIn 
  } = useGymState();

  const [signature, setSignature] = useState('FIT_BY_SHAHID_');
  const [sessionName, setSessionName] = useState('Workout Check-in');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetchClientAttendance();
      if (res && res.attendance) {
        setRecords(res.attendance);
      } else if (activeClient?.signinHistory) {
        setRecords(activeClient.signinHistory.map(s => ({
          id: s.id,
          dateLabel: s.date,
          sessionName: s.session || 'General Access',
          signature: s.signature || 'FIT_BY_SHAHID_',
          status: 'Present'
        })));
      }
    };
    load();
  }, [activeClient, fetchClientAttendance]);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const res = await clientCheckIn(signature, sessionName);
    setLoading(false);

    if (res.success) {
      setMessage({ type: 'success', text: 'Checked in successfully! Have a great workout!' });
      const updated = await fetchClientAttendance();
      if (updated?.attendance) setRecords(updated.attendance);
    } else {
      setMessage({ type: 'error', text: res.message || 'Check-in failed.' });
    }
  };

  const totalDays = clientAttendanceSummary?.totalAttendedDays ?? records.length;
  const monthCount = clientAttendanceSummary?.currentMonthCount ?? records.slice(0, 5).length;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-5 shadow-premium border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase text-gray-400">Total Visits</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#00af87]">
              <CalendarCheck size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-800">{totalDays}</div>
            <p className="text-[10px] font-bold text-gray-400 mt-0.5">All-time check-ins</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-premium border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase text-gray-400">This Month</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#ff9f29]">
              <Calendar size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-800">{monthCount}</div>
            <p className="text-[10px] font-bold text-gray-400 mt-0.5">Sessions logged this month</p>
          </div>
        </div>
      </div>

      {/* Check-In Action Card */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-50">
          <Sparkles size={18} className="text-[#00af87]" />
          <div>
            <h3 className="text-sm font-extrabold text-gray-800">Gym Check-In</h3>
            <p className="text-[10px] text-gray-400 font-semibold">Mark your attendance for today's session</p>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-2xl mb-4 text-xs font-semibold flex items-start gap-2 ${
            message.type === 'error'
              ? 'bg-amber-50 text-amber-700 border border-amber-100'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
          }`}>
            {message.type === 'error' ? <AlertCircle size={15} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={15} className="shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleCheckIn} className="space-y-3.5 text-xs">
          <div>
            <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">
              Session Focus
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g. Lower Body Burn, Cardio"
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#00af87] text-gray-800"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">
              Member Sign-off Signature
            </label>
            <div className="relative">
              <FileSignature size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-semibold outline-none focus:border-[#00af87] text-gray-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl text-white font-extrabold text-xs btn-gradient-teal shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 size={15} />
            {loading ? 'Checking in...' : 'Sign In To Gym Today'}
          </button>
        </form>
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
        <h3 className="text-sm font-extrabold text-gray-800 mb-4 flex items-center gap-2">
          <Clock size={16} className="text-[#00af87]" /> Check-In History
        </h3>

        {records.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400 font-semibold bg-gray-50/50 rounded-2xl border border-gray-100">
            No attendance check-ins on record yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {records.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-gray-800">{r.sessionName || 'Gym Check-in'}</div>
                  <div className="text-[10px] text-gray-400 font-medium flex items-center gap-1.5 mt-0.5">
                    <Clock size={10} /> {r.dateLabel}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-100">
                    {r.status || 'Present'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
