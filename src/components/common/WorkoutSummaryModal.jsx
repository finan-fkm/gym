import React from 'react';
import { 
  Award, 
  Clock, 
  Sparkles, 
  X, 
  Save,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatDuration } from '../../utils/workoutUtils';

export default function WorkoutSummaryModal({
  isOpen,
  onClose,
  summary,
  onSaveSession,
  workoutName = 'Workout Session',
  isSaving = false
}) {
  if (!isOpen || !summary) return null;

  const handleCelebrate = () => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00af87', '#ff9f29', '#2dd4bf', '#ffd180']
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-50 via-emerald-50/60 to-white px-6 pt-6 pb-4 border-b border-gray-100 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-[#00af87] text-white flex items-center justify-center shadow-md">
              <Award size={26} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-[#00af87] uppercase tracking-widest block">
                Workout Summary & Performance
              </span>
              <h3 className="text-lg font-extrabold text-gray-800 leading-tight">
                {workoutName}
              </h3>
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Great work! Here is your complete set-by-set breakdown and volume lifted for this session.
          </p>
        </div>

        {/* Scrollable Metrics Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Top Score Banner */}
          <div className="bg-gradient-to-r from-[#00af87] to-[#009e7a] rounded-2xl p-5 text-white flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] font-bold text-teal-100 uppercase tracking-wider block">Overall Completion</span>
              <div className="text-3xl font-black mt-0.5">{summary.completionPercentage}%</div>
              <span className="text-xs text-teal-100 font-semibold mt-1 block">
                {summary.completedExercises} of {summary.totalExercises} exercises completed
              </span>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 flex flex-col items-center">
              <Clock size={20} className="text-white" />
              <span className="text-xs font-black mt-1">{formatDuration(summary.durationSeconds)}</span>
              <span className="text-[9px] uppercase tracking-wider text-teal-100 font-bold">Duration</span>
            </div>
          </div>

          {/* Key Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                Sets Done
              </span>
              <span className="text-base font-extrabold text-gray-800">
                {summary.completedSets} <span className="text-xs font-semibold text-gray-400">/ {summary.totalSets}</span>
              </span>
            </div>

            <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                Total Reps
              </span>
              <span className="text-base font-extrabold text-[#ff9f29]">
                {summary.totalReps}
              </span>
            </div>

            <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                Weight Lifted
              </span>
              <span className="text-base font-extrabold text-[#00af87]">
                {summary.totalWeightKg} <span className="text-xs font-semibold">kg</span>
              </span>
            </div>

            <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                Skipped
              </span>
              <span className={`text-base font-extrabold ${summary.skippedExercises > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {summary.skippedExercises}
              </span>
            </div>
          </div>

          {/* Exercise-by-Exercise Volume Breakdown */}
          <div>
            <h5 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Layers size={13} className="text-[#00af87]" />
              Weight Lifted & Reps Per Exercise
            </h5>

            <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100">
              {summary.exerciseVolumes && summary.exerciseVolumes.map((ex, idx) => (
                <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs hover:bg-gray-50/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-gray-800">{ex.name}</span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.2 rounded-full uppercase tracking-wider ${
                        ex.status === 'completed'
                          ? 'bg-teal-50 text-[#00af87]'
                          : ex.status === 'skipped'
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-amber-50 text-amber-700'
                      }`}>
                        {ex.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block">
                      {ex.completedSets} of {ex.setsCount} sets • {ex.totalReps} total reps
                      {ex.skipReason && ` • Reason: ${ex.skipReason}`}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-[#00af87] block">
                      {ex.totalWeightKg > 0 ? `${ex.totalWeightKg} kg` : 'Bodyweight'}
                    </span>
                    <span className="text-[9px] text-gray-400 uppercase font-bold">Total Volume</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            onClick={handleCelebrate}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Sparkles size={14} className="text-[#ff9f29]" />
            Celebrate
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => onSaveSession && onSaveSession()}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-[#00af87] to-[#009e7a] shadow-md hover:opacity-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save size={14} />
              {isSaving ? 'Saving to Database...' : 'Save to Workout History'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
