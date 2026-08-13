import React, { useState } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { Calendar, Clock, MapPin, Send, CheckCircle2 } from 'lucide-react';

export default function ClientSessions() {
  const { activeClient, updateNextSession } = useGymState();

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState(false);

  if (!activeClient) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date || !time) return;

    // Save rescheduled date/time to global state (which trainer will see!)
    updateNextSession(activeClient.id, date, time);

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setDate('');
      setTime('');
      setReason('');
    }, 4000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      {/* Current Session Card */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
        <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Confirmed Session</h4>

        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#00af87] shrink-0">
            <Calendar size={18} />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase">Date</span>
            <p className="text-sm font-extrabold text-gray-800 mt-0.5">{activeClient.nextSession.date}</p>
          </div>
        </div>

        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#ff9f29] shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase">Time</span>
            <p className="text-sm font-extrabold text-gray-800 mt-0.5">{activeClient.nextSession.time}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 shrink-0">
            <MapPin size={18} />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase">Location</span>
            <p className="text-sm font-extrabold text-gray-800 mt-0.5">{activeClient.nextSession.location || 'Private Gym Studio'}</p>
          </div>
        </div>
      </div>

      {/* Reschedule Form */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
        <h4 className="text-sm font-extrabold text-gray-800 tracking-wide flex items-center gap-1.5 mb-2">
          <span className="w-1.5 h-3.5 bg-[#00af87] rounded-sm"></span>
          Reschedule Session
        </h4>
        <p className="text-xs text-gray-400 mb-6 font-semibold">Need to modify your upcoming time? Request a new slot here.</p>

        {success ? (
          <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 text-center flex flex-col items-center gap-2.5 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-[#00af87] text-white flex items-center justify-center shadow-sm">
              <CheckCircle2 size={18} />
            </div>
            <h5 className="text-xs font-bold text-gray-800">Request Sent Successfully!</h5>
            <p className="text-[10px] text-gray-500 leading-relaxed max-w-[200px]">Coach Brandon has been notified of your request and your upcoming schedule has been updated.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Proposed Date</label>
              <input
                type="text"
                required
                placeholder="e.g. Wednesday, March 14, 2018"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs bg-gray-50/70 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Proposed Time</label>
              <input
                type="text"
                required
                placeholder="e.g. 10:00 AM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full text-xs bg-gray-50/70 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Reason for change (Optional)</label>
              <textarea
                placeholder="Let your trainer know why..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full text-xs bg-gray-50/70 border border-gray-200 rounded-xl p-3.5 outline-none focus:border-[#00af87] text-gray-700 resize-none font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-extrabold text-xs btn-gradient-teal hover:opacity-90 shadow-md transition-all mt-6"
            >
              <Send size={13} />
              Submit Reschedule Request
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
