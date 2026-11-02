import React, { useState } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  ChevronDown, 
  ChevronUp, 
  History
} from 'lucide-react';
import { formatDuration } from '../../utils/workoutUtils';

export default function WorkoutHistoryComparison({ sessions = [], clientName = 'Client', role = 'client' }) {
  const [expandedSessionIds, setExpandedSessionIds] = useState(new Set());

  if (!sessions || sessions.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-premium border border-gray-100 text-center flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#00af87]">
          <History size={24} />
        </div>
        <h4 className="text-sm font-extrabold text-gray-800">No Recorded Workout Sessions Yet</h4>
        <p className="text-xs text-gray-400 max-w-xs leading-relaxed font-medium">
          Once {role === 'client' ? 'you complete and save' : `${clientName} completes`} a workout session, detailed performance comparisons and set-by-set histories will appear here.
        </p>
      </div>
    );
  }

  const latestSession = sessions[0];
  const previousSession = sessions.length > 1 ? sessions[1] : null;

  const toggleExpand = (id) => {
    setExpandedSessionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Compute comparison delta between latest & previous session
  const curSummary = latestSession.summary || {};
  const prevSummary = previousSession ? (previousSession.summary || {}) : null;

  const repsDelta = prevSummary ? (curSummary.totalReps || 0) - (prevSummary.totalReps || 0) : 0;
  const volDelta = prevSummary ? Math.round(((curSummary.totalWeightKg || 0) - (prevSummary.totalWeightKg || 0)) * 10) / 10 : 0;

  // Compute exercise breakdown comparison
  const curExMap = new Map();
  (latestSession.setRecords || []).forEach(sr => {
    const name = sr.exerciseName || 'Exercise';
    if (!curExMap.has(name)) curExMap.set(name, []);
    curExMap.get(name).push(sr);
  });

  const prevExMap = new Map();
  if (previousSession) {
    (previousSession.setRecords || []).forEach(sr => {
      const name = sr.exerciseName || 'Exercise';
      if (!prevExMap.has(name)) prevExMap.set(name, []);
      prevExMap.get(name).push(sr);
    });
  }

  const exerciseComparisons = [];
  curExMap.forEach((curSets, name) => {
    const prevSets = prevExMap.get(name) || [];
    const curMaxWeight = Math.max(0, ...curSets.map(s => s.weight || 0));
    const prevMaxWeight = Math.max(0, ...prevSets.map(s => s.weight || 0));
    const curTotalReps = curSets.reduce((sum, s) => sum + (s.actualReps || 0), 0);
    const prevTotalReps = prevSets.reduce((sum, s) => sum + (s.actualReps || 0), 0);

    exerciseComparisons.push({
      name,
      curSetsCount: curSets.length,
      prevSetsCount: prevSets.length,
      curTotalReps,
      prevTotalReps,
      repsDiff: prevSets.length > 0 ? (curTotalReps - prevTotalReps) : null,
      curMaxWeight: Math.round(curMaxWeight * 10) / 10,
      prevMaxWeight: Math.round(prevMaxWeight * 10) / 10,
      weightDiff: prevSets.length > 0 ? Math.round((curMaxWeight - prevMaxWeight) * 10) / 10 : null,
      curSets
    });
  });

  const formatDate = (isoString) => {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Session Comparison Hero Card */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-50 pb-4 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-[#00af87] rounded-sm"></span>
              <h4 className="text-sm font-extrabold text-gray-800 tracking-wide flex items-center gap-2">
                <TrendingUp size={16} className="text-[#00af87]" />
                Progress Comparison
              </h4>
            </div>
            <p className="text-xs text-gray-400 font-medium mt-1">
              {previousSession
                ? `Comparing Current (${formatDate(latestSession.completedAt)}) vs Previous (${formatDate(previousSession.completedAt)})`
                : `Latest workout performance logged on ${formatDate(latestSession.completedAt)}`}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[10px] font-extrabold bg-teal-50 text-[#00af87] border border-teal-100 px-3 py-1 rounded-full uppercase tracking-wider">
              {latestSession.workoutName || 'Workout'}
            </span>
          </div>
        </div>

        {/* Delta Key Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
          {/* Reps Progression */}
          <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100/80 flex flex-col justify-between">
            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
              Reps Performance
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-gray-800">{curSummary.totalReps || 0}</span>
              <span className="text-xs font-semibold text-gray-400">reps</span>
            </div>
            {previousSession ? (
              <div className="flex items-center gap-1 mt-2 text-xs font-bold">
                {repsDelta > 0 ? (
                  <span className="text-[#00af87] flex items-center gap-0.5">
                    <ArrowUpRight size={14} /> +{repsDelta} reps vs prev
                  </span>
                ) : repsDelta < 0 ? (
                  <span className="text-[#ff9f29] flex items-center gap-0.5">
                    <ArrowDownRight size={14} /> {repsDelta} reps vs prev
                  </span>
                ) : (
                  <span className="text-gray-400 flex items-center gap-0.5">
                    <Minus size={14} /> Maintained target reps
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[10px] text-gray-400 mt-2 font-medium">Baseline recorded</span>
            )}
          </div>

          {/* Weight / Volume Progression */}
          <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100/80 flex flex-col justify-between">
            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
              Total Weight Volume
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#ff9f29]">{curSummary.totalWeightKg || 0}</span>
              <span className="text-xs font-semibold text-gray-400">kg</span>
            </div>
            {previousSession ? (
              <div className="flex items-center gap-1 mt-2 text-xs font-bold">
                {volDelta > 0 ? (
                  <span className="text-[#00af87] flex items-center gap-0.5">
                    <ArrowUpRight size={14} /> +{volDelta} kg volume
                  </span>
                ) : volDelta < 0 ? (
                  <span className="text-gray-500 flex items-center gap-0.5">
                    <ArrowDownRight size={14} /> {volDelta} kg volume
                  </span>
                ) : (
                  <span className="text-gray-400 flex items-center gap-0.5">
                    <Minus size={14} /> Even volume load
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[10px] text-gray-400 mt-2 font-medium">Session benchmark</span>
            )}
          </div>

          {/* Completion Rate & Duration */}
          <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100/80 flex flex-col justify-between">
            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
              Completion & Duration
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#00af87]">
                {curSummary.completionPercentage ?? 100}%
              </span>
              <span className="text-xs font-semibold text-gray-400">
                ({formatDuration(latestSession.durationSeconds)})
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-gray-500">
              <CheckCircle2 size={13} className="text-[#00af87]" />
              <span>{curSummary.completedSets || 0} sets checked off</span>
            </div>
          </div>
        </div>

        {/* Exercise Progression Table */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="bg-gray-50/80 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
            <span>Exercise Progression</span>
            <span>Reps & Weight Comparison</span>
          </div>

          <div className="divide-y divide-gray-100">
            {exerciseComparisons.map((ex, idx) => (
              <div key={idx} className="p-3.5 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h5 className="text-xs font-extrabold text-gray-800">{ex.name}</h5>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] font-semibold text-gray-400">
                    <span>{ex.curSetsCount} sets performed</span>
                    {ex.curMaxWeight > 0 && (
                      <span>• Max weight: <b className="text-gray-700">{ex.curMaxWeight} kg</b></span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {/* Reps delta pill */}
                  {ex.repsDiff !== null ? (
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                      ex.repsDiff > 0
                        ? 'bg-teal-50 text-[#00af87] border border-teal-100'
                        : ex.repsDiff < 0
                          ? 'bg-orange-50 text-[#ff9f29] border border-orange-100'
                          : 'bg-gray-100 text-gray-500'
                    }`}>
                      {ex.repsDiff > 0 ? `+${ex.repsDiff} reps` : ex.repsDiff < 0 ? `${ex.repsDiff} reps` : 'Same reps'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-semibold">{ex.curTotalReps} total reps</span>
                  )}

                  {/* Weight delta pill */}
                  {ex.weightDiff !== null && ex.curMaxWeight > 0 ? (
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                      ex.weightDiff > 0
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : ex.weightDiff < 0
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-gray-100 text-gray-500'
                    }`}>
                      {ex.weightDiff > 0 ? `+${ex.weightDiff} kg` : ex.weightDiff < 0 ? `${ex.weightDiff} kg` : '0 kg delta'}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workout Sessions History Timeline */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
        <div className="flex items-center justify-between border-b border-gray-50 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-[#ff9f29] rounded-sm"></span>
            <h4 className="text-sm font-extrabold text-gray-800 tracking-wide flex items-center gap-2">
              <Calendar size={16} className="text-[#ff9f29]" />
              Workout Session History ({sessions.length})
            </h4>
          </div>
          <span className="text-[10px] text-gray-400 font-bold uppercase">All Logged Workouts</span>
        </div>

        <div className="space-y-3.5">
          {sessions.map((sess, idx) => {
            const isExpanded = expandedSessionIds.has(sess.id);
            const sum = sess.summary || {};
            const setsList = sess.setRecords || [];

            return (
              <div 
                key={sess.id || idx}
                className="border border-gray-100 rounded-2xl overflow-hidden transition-all hover:border-gray-200"
              >
                {/* Session Row Header */}
                <div 
                  onClick={() => toggleExpand(sess.id)}
                  className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-gray-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#00af87] shrink-0 font-bold text-xs">
                      #{sessions.length - idx}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-extrabold text-xs text-gray-800">{sess.workoutName || 'Workout Session'}</h5>
                        {idx === 0 && (
                          <span className="text-[9px] font-extrabold bg-[#00af87] text-white px-2 py-0.2 rounded-full uppercase tracking-wider">
                            Latest
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5 flex items-center gap-2">
                        <span>{formatDate(sess.completedAt)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {formatDuration(sess.durationSeconds)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3.5">
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold uppercase block">Volume</span>
                        <span className="text-xs font-extrabold text-gray-700">{sum.totalWeightKg || 0} kg</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold uppercase block">Reps</span>
                        <span className="text-xs font-extrabold text-[#ff9f29]">{sum.totalReps || 0}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold uppercase block">Score</span>
                        <span className="text-xs font-extrabold text-[#00af87]">{sum.completionPercentage ?? 100}%</span>
                      </div>
                    </div>

                    <button 
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                      title={isExpanded ? 'Collapse' : 'Expand detailed sets'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Sets Breakdown */}
                {isExpanded && (
                  <div className="bg-gray-50/60 p-4 border-t border-gray-100 animate-in fade-in duration-200">
                    <h6 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2.5">
                      Individual Set Breakdown ({setsList.length} Sets Logged)
                    </h6>

                    {setsList.length > 0 ? (
                      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50 text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                              <th className="py-2 px-3">Set</th>
                              <th className="py-2 px-3">Exercise</th>
                              <th className="py-2 px-3 text-center">Target</th>
                              <th className="py-2 px-3 text-center">Actual Reps</th>
                              <th className="py-2 px-3 text-center">Weight</th>
                              <th className="py-2 px-3 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 font-medium">
                            {setsList.map((st, sIdx) => (
                              <tr key={sIdx} className="hover:bg-gray-50/30">
                                <td className="py-2 px-3 font-extrabold text-gray-700">Set {st.setNumber}</td>
                                <td className="py-2 px-3 font-semibold text-gray-800">{st.exerciseName}</td>
                                <td className="py-2 px-3 text-center text-gray-400">{st.targetReps || '-'} reps</td>
                                <td className="py-2 px-3 text-center font-bold text-gray-700">{st.actualReps !== null ? `${st.actualReps} reps` : '-'}</td>
                                <td className="py-2 px-3 text-center font-bold text-[#ff9f29]">{st.weight !== null ? `${st.weight} kg` : 'Bodyweight'}</td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                                    st.status === 'completed'
                                      ? 'bg-teal-50 text-[#00af87]'
                                      : st.status === 'skipped'
                                        ? 'bg-gray-100 text-gray-500'
                                        : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    {st.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 font-semibold italic">No individual set records attached to this legacy session.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
