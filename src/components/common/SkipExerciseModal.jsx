import React, { useState } from 'react';
import { X, SkipForward } from 'lucide-react';

export default function SkipExerciseModal({ isOpen, onClose, exerciseName, onConfirmSkip }) {
  const [selectedReason, setSelectedReason] = useState('Equipment unavailable / in use');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  const presetReasons = [
    'Equipment unavailable / in use',
    'Fatigue / energy level low',
    'Discomfort or minor strain',
    'Time constraint today',
    'Substitute exercise performed'
  ];

  const handleConfirm = () => {
    const finalReason = selectedReason === 'Other' ? (customReason.trim() || 'Custom reason') : selectedReason;
    onConfirmSkip(finalReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#ff9f29]">
              <SkipForward size={18} />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-gray-800">Skip Exercise</h4>
              <p className="text-[10px] text-gray-400 font-semibold">{exerciseName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
            Select Reason for Skipping (Optional)
          </label>

          <div className="space-y-1.5">
            {presetReasons.map((reason) => (
              <label
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                  selectedReason === reason
                    ? 'border-[#ff9f29] bg-orange-50/20 text-gray-800 font-bold'
                    : 'border-gray-100 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="skipReason"
                  checked={selectedReason === reason}
                  onChange={() => setSelectedReason(reason)}
                  className="accent-[#ff9f29]"
                />
                <span>{reason}</span>
              </label>
            ))}

            <label
              onClick={() => setSelectedReason('Other')}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                selectedReason === 'Other'
                  ? 'border-[#ff9f29] bg-orange-50/20 text-gray-800 font-bold'
                  : 'border-gray-100 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="skipReason"
                checked={selectedReason === 'Other'}
                onChange={() => setSelectedReason('Other')}
                className="accent-[#ff9f29]"
              />
              <span>Other custom note...</span>
            </label>

            {selectedReason === 'Other' && (
              <input
                type="text"
                autoFocus
                placeholder="Type reason here..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#ff9f29] text-gray-800 font-medium mt-1"
              />
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-[#ff9f29] hover:bg-orange-600 shadow-sm transition-all"
          >
            Confirm Skip
          </button>
        </div>
      </div>
    </div>
  );
}
