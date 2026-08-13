import React, { useState } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { Calendar, CheckCircle2, Circle, Clock, Plus, Trash2, Edit2, Link2, Unlink2, Check, X, Dumbbell, TrendingUp, Scale, Ruler, Award } from 'lucide-react';
import WorkoutEditorModal from './WorkoutEditorModal';

export default function WorkoutTracker() {
  const {
    activeClient,
    toggleExerciseCompletion,
    deleteExercise,
    updateNextSession,
    updateWeeklyProgressFocus
  } = useGymState();

  const [selectedDayId, setSelectedDayId] = useState('thu'); // default Thursday as per design
  const [isEditingSession, setIsEditingSession] = useState(false);
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');

  const [editingFocusDayId, setEditingFocusDayId] = useState(null);
  const [focusText, setFocusText] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  
  const [activePanel, setActivePanel] = useState('workout'); // 'workout' or 'analytics'

  if (!activeClient) return null;

  const renderAnalyticsPanel = () => {
    const history = activeClient.metricsHistory || [];
    const weeklyProgress = activeClient.weeklyProgress || [];
    const completedCount = weeklyProgress.filter(d => d.completed).length;
    const totalCount = weeklyProgress.length;
    const weeklyPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const drawWeightChart = () => {
      if (history.length === 0) return null;
      const width = 340;
      const height = 140;
      const padding = 30;
      const weights = history.map(h => h.weight);
      const maxWeight = Math.max(...weights) + 2;
      const minWeight = Math.min(...weights) - 2;
      const weightRange = maxWeight - minWeight;

      const points = history.map((h, idx) => {
        const x = padding + (idx * (width - 2 * padding)) / (history.length - 1);
        const y = height - padding - ((h.weight - minWeight) * (height - 2 * padding)) / weightRange;
        return { x, y, val: h.weight, date: h.date };
      });

      const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      const fillPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

      return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          <defs>
            <linearGradient id="trainerWeightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff9f29" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ff9f29" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#f1f5f9" strokeWidth="1.5" />
          <path d={fillPath} fill="url(#trainerWeightGrad)" />
          <path d={linePath} fill="none" stroke="#ff9f29" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#ff9f29" strokeWidth="2" />
              <text x={p.x} y={p.y - 8} textAnchor="middle" className="text-[9px] font-bold text-gray-700">{p.val} lbs</text>
              <text x={p.x} y={height - 10} textAnchor="middle" className="text-[8px] font-semibold text-gray-400 uppercase">{p.date}</text>
            </g>
          ))}
        </svg>
      );
    };

    const drawSizeChart = () => {
      if (history.length === 0) return null;
      const width = 340;
      const height = 140;
      const padding = 30;
      const allVals = history.flatMap(h => [h.chest, h.waist]);
      const maxVal = Math.max(...allVals) + 1;
      const minVal = Math.min(...allVals) - 1;
      const valRange = maxVal - minVal;

      const chestPoints = history.map((h, idx) => {
        const x = padding + (idx * (width - 2 * padding)) / (history.length - 1);
        const y = height - padding - ((h.chest - minVal) * (height - 2 * padding)) / valRange;
        return { x, y, val: h.chest, label: h.date };
      });

      const waistPoints = history.map((h, idx) => {
        const x = padding + (idx * (width - 2 * padding)) / (history.length - 1);
        const y = height - padding - ((h.waist - minVal) * (height - 2 * padding)) / valRange;
        return { x, y, val: h.waist };
      });

      const chestPath = chestPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      const waistPath = waistPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

      return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#f1f5f9" strokeWidth="1.5" />
          <path d={chestPath} fill="none" stroke="#00af87" strokeWidth="2" />
          <path d={waistPath} fill="none" stroke="#ff9f29" strokeWidth="2" />
          {chestPoints.map((p, idx) => (
            <g key={`c-${idx}`}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="white" stroke="#00af87" strokeWidth="1.5" />
              <text x={p.x - 3} y={p.y - 7} textAnchor="end" className="text-[8px] font-bold text-[#00af87]">{p.val}"</text>
              <text x={p.x} y={height - 10} textAnchor="middle" className="text-[8px] font-semibold text-gray-400 uppercase">{p.label}</text>
            </g>
          ))}
          {waistPoints.map((p, idx) => (
            <g key={`w-${idx}`}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="white" stroke="#ff9f29" strokeWidth="1.5" />
              <text x={p.x + 3} y={p.y + 11} textAnchor="start" className="text-[8px] font-bold text-[#ff9f29]">{p.val}"</text>
            </g>
          ))}
        </svg>
      );
    };

    const drawConsistencyChart = () => {
      const data = [
        { label: 'Jan', rate: 70 },
        { label: 'Feb', rate: 85 },
        { label: 'Mar', rate: 95 }
      ];
      
      return (
        <div className="space-y-3 mt-2">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <span className="text-[10px] text-gray-400 font-extrabold w-8 uppercase">{item.label}</span>
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#00af87] to-[#009e7a] rounded-full"
                  style={{ width: `${item.rate}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-[#00af87] font-extrabold w-8 text-right">{item.rate}%</span>
            </div>
          ))}
        </div>
      );
    };

    return (
      <div className="flex flex-col gap-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Weekly Consistency</span>
            <span className="text-xl font-extrabold text-gray-700">{weeklyPercentage}%</span>
            <p className="text-[9px] text-gray-400 font-semibold mt-1">{completedCount} of {totalCount} completed</p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Weight Delta</span>
            <span className="text-xl font-extrabold text-[#ff9f29]">
              {(activeClient.metrics.find(m => m.id === 'weight')?.change || 0) < 0 ? '' : '+'}
              {activeClient.metrics.find(m => m.id === 'weight')?.change || 0} lbs
            </span>
            <p className="text-[9px] text-gray-400 font-semibold mt-1">Net weight change</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Coaching Consistency</span>
            <span className="text-xl font-extrabold text-[#00af87] flex items-center gap-1">
              <Award size={18} /> Elite
            </span>
            <p className="text-[9px] text-gray-400 font-semibold mt-1">Monthly completion streak</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-5 shadow-premium border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Scale size={16} className="text-[#ff9f29]" />
                <h4 className="text-xs font-extrabold text-gray-800 uppercase tracking-wide">Weight Loss Curve</h4>
              </div>
              <span className="text-[8px] text-gray-400 font-extrabold uppercase tracking-wide">3-Month Trend</span>
            </div>
            <div className="py-2">{drawWeightChart()}</div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-premium border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Ruler size={16} className="text-[#00af87]" />
                <h4 className="text-xs font-extrabold text-gray-800 uppercase tracking-wide">Size Progression</h4>
              </div>
              <span className="text-[8px] text-gray-400 font-extrabold uppercase tracking-wide">Chest (Teal) vs Waist (Orange)</span>
            </div>
            <div className="py-2">{drawSizeChart()}</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
          <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
            <h4 className="text-xs font-extrabold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
              <TrendingUp size={14} className="text-[#00af87]" />
              Monthly Workout Consistency
            </h4>
            <span className="text-[9px] text-gray-400 font-extrabold uppercase">Consistency Rates</span>
          </div>
          {drawConsistencyChart()}
        </div>
      </div>
    );
  };

  const currentWorkout = activeClient.dailyWorkouts[selectedDayId] || {
    name: "Recovery or Rest Day",
    duration: "No workouts scheduled",
    exercises: []
  };

  // Day mapping for indexing
  const dayIdToKey = {
    mon: 'mon',
    tue: 'tue',
    wed: 'wed',
    thu: 'thu',
    fri: 'fri',
    sat: 'sat',
    sun: 'sun'
  };

  // Reschedule Session Handler
  const handleSaveSession = () => {
    if (sessionDate && sessionTime) {
      updateNextSession(activeClient.id, sessionDate, sessionTime);
      setIsEditingSession(false);
    }
  };

  const handleEditFocus = (day) => {
    setEditingFocusDayId(day.id);
    setFocusText(day.focus);
  };

  const handleSaveFocus = (dayId) => {
    updateWeeklyProgressFocus(activeClient.id, dayId, focusText);
    setEditingFocusDayId(null);
  };

  const handleAddExerciseClick = () => {
    setEditingExercise(null);
    setEditorOpen(true);
  };

  const handleEditExerciseClick = (ex) => {
    setEditingExercise(ex);
    setEditorOpen(true);
  };

  // Superset Action Helper
  const handleToggleSuperset = (exId) => {
    const exercises = currentWorkout.exercises;
    const idx = exercises.findIndex(e => e.id === exId);
    if (idx === -1 || idx === exercises.length - 1) return;

    const currentEx = exercises[idx];
    const nextEx = exercises[idx + 1];

    if (currentEx.supersetId && nextEx.supersetId && currentEx.supersetId === nextEx.supersetId) {
      // Unlink them
      const { updateExercise } = useGymState(); // use state setters
      // Let's break the link
      exercises[idx].supersetId = null;
      exercises[idx + 1].supersetId = null;
    } else {
      // Link them
      const newSsId = 'ss_' + Date.now();
      exercises[idx].supersetId = newSsId;
      exercises[idx + 1].supersetId = newSsId;
    }
    // trigger state update by forcing recalculation or calling updateExercise
    // Since we are updating local references directly, let's call updateExercise to flush state to localStorage
    const { updateExercise: flushUpdate } = useGymState();
  };

  // Grouping exercises by superset consecutive blocks
  const renderExercisesList = () => {
    const exercises = currentWorkout.exercises;
    if (exercises.length === 0) {
      return (
        <div className="py-12 text-center text-gray-400 font-medium bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center gap-2">
          <Dumbbell size={24} className="opacity-50" />
          <span>No exercises assigned for this day.</span>
          <button
            onClick={handleAddExerciseClick}
            className="mt-2 text-xs font-bold text-[#00af87] hover:underline"
          >
            + Add Exercise
          </button>
        </div>
      );
    }

    const items = [];
    let i = 0;
    while (i < exercises.length) {
      const ex = exercises[i];
      const isPart = ex.supersetId;

      if (isPart) {
        // Collect consecutive exercises with the same supersetId
        const supersetBlock = [ex];
        let j = i + 1;
        while (j < exercises.length && exercises[j].supersetId === ex.supersetId) {
          supersetBlock.push(exercises[j]);
          j++;
        }

        if (supersetBlock.length > 1) {
          // Render as a grouped block
          items.push(
            <div key={`ss-group-${i}`} className="border border-dashed border-[#00af87] rounded-3xl p-4 bg-teal-50/5 relative my-4">
              {/* Connection link indicator inside container */}
              <div className="absolute left-[38px] top-12 bottom-12 w-0.5 bg-[#00af87]/40 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-[#00af87] text-white flex items-center justify-center shadow-sm">
                  <Link2 size={10} />
                </div>
              </div>

              <div className="space-y-4">
                {supersetBlock.map((sEx, blockIdx) => (
                  <div key={sEx.id} className="relative pl-10">
                    {renderExerciseRow(sEx, true, blockIdx === 0, blockIdx === supersetBlock.length - 1)}
                  </div>
                ))}
              </div>
            </div>
          );
          i = j;
          continue;
        }
      }

      // Render standard row
      items.push(
        <div key={ex.id} className="my-2 border border-gray-50 rounded-2xl bg-white">
          {renderExerciseRow(ex, false)}
        </div>
      );
      i++;
    }
    return items;
  };

  const renderExerciseRow = (ex, inSuperset = false, isFirst = false, isLast = false) => {
    return (
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 ${
        ex.completed ? 'bg-amber-50/10' : 'bg-transparent'
      }`}>
        <div className="flex items-center gap-4 flex-1">
          {/* Exercise Demo Image */}
          <img
            src={ex.image}
            alt={ex.name}
            className="w-16 h-16 rounded-xl object-cover border border-gray-100 shadow-sm"
          />

          {/* Exercise Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h5 className="font-extrabold text-sm text-gray-800 tracking-wide">{ex.name}</h5>
              {inSuperset && isFirst && (
                <span className="text-[9px] font-extrabold bg-teal-50 text-[#00af87] border border-teal-100 px-2 py-0.5 rounded-full tracking-wider uppercase">
                  Superset
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] font-semibold text-gray-400">
              <span>Sets: <b className="text-gray-700">{ex.sets}</b></span>
              {ex.equipment && <span>Equipment: <b className="text-gray-500">{ex.equipment}</b></span>}
              {ex.reps && <span>Reps/Dur: <b className="text-gray-500">{ex.reps}</b></span>}
              {ex.weight && <span>Weight: <b className="text-gray-500">{ex.weight}</b></span>}
            </div>

            {ex.details && (
              <p className="text-[10px] text-gray-400 font-medium mt-1 leading-normal">
                Details: <span className="text-[#00af87] font-semibold">{ex.details}</span>
              </p>
            )}
          </div>
        </div>

        {/* Action controls & completion */}
        <div className="flex items-center justify-between sm:justify-end gap-3.5 border-t sm:border-t-0 pt-2 sm:pt-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEditExerciseClick(ex)}
              className="text-gray-400 hover:text-[#00af87] p-1.5 hover:bg-gray-50 rounded-lg transition-colors"
              title="Edit exercise"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => deleteExercise(activeClient.id, selectedDayId, ex.id)}
              className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-gray-50 rounded-lg transition-colors"
              title="Delete exercise"
            >
              <Trash2 size={13} />
            </button>
          </div>

          <button
            onClick={() => toggleExerciseCompletion(activeClient.id, selectedDayId, ex.id)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:opacity-85 transition-opacity"
          >
            {ex.completed ? (
              <CheckCircle2 size={18} className="text-[#00af87] fill-teal-50" />
            ) : (
              <Circle size={18} className="text-gray-300" />
            )}
            <span className="sr-only">Complete</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Next Session Card */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-[#00af87]">
            <Clock size={22} className="pulse-glow rounded-full p-0.5" />
          </div>
          <div>
            <h4 className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Next Training Session</h4>
            {isEditingSession ? (
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <input
                  type="text"
                  placeholder="Date e.g. Tuesday, Mar 13"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none"
                />
                <input
                  type="text"
                  placeholder="Time e.g. 3:00 PM"
                  value={sessionTime}
                  onChange={(e) => setSessionTime(e.target.value)}
                  className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none"
                />
                <div className="flex gap-1.5">
                  <button onClick={handleSaveSession} className="bg-[#00af87] text-white p-1 rounded-md text-xs font-bold px-2 flex items-center gap-0.5"><Check size={11} /> Save</button>
                  <button onClick={() => setIsEditingSession(false)} className="bg-gray-100 text-gray-600 p-1 rounded-md text-xs font-bold px-2"><X size={11} /></button>
                </div>
              </div>
            ) : (
              <div className="mt-0.5">
                <p className="text-sm font-extrabold text-gray-800">{activeClient.nextSession.date}</p>
                <p className="text-xs text-gray-400 font-medium">{activeClient.nextSession.time} • {activeClient.nextSession.location || 'Online'}</p>
              </div>
            )}
          </div>
        </div>

        {!isEditingSession && (
          <button
            onClick={() => {
              setSessionDate(activeClient.nextSession.date);
              setSessionTime(activeClient.nextSession.time);
              setIsEditingSession(true);
            }}
            className="flex items-center gap-1.5 px-6 py-3 rounded-2xl text-white font-extrabold text-xs btn-gradient-teal shadow-md hover:opacity-95 transition-all self-stretch sm:self-auto justify-center"
          >
            <Calendar size={14} />
            Book Session →
          </button>
        )}
      </div>

      {/* Middle Column View Panel Toggle */}
      <div className="grid grid-cols-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 text-center shadow-sm">
        <button
          onClick={() => setActivePanel('workout')}
          className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activePanel === 'workout'
              ? 'bg-white text-gray-800 shadow-sm border border-gray-100'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Dumbbell size={13} className="text-[#00af87]" />
          Workout Builder
        </button>
        <button
          onClick={() => setActivePanel('analytics')}
          className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activePanel === 'analytics'
              ? 'bg-white text-gray-800 shadow-sm border border-gray-100'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp size={13} className="text-[#ff9f29]" />
          Progress & Analytics
        </button>
      </div>

      {activePanel === 'analytics' ? (
        /* Render client progress charts and rates dashboard */
        renderAnalyticsPanel()
      ) : (
        /* Render workout calendar and daily exercises list */
        <>
          {/* Weekly Progress Calendar */}
          <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-sm font-extrabold text-gray-800 tracking-wide flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-[#00af87] rounded-sm"></span>
            Weekly Progress
          </h4>
          <span className="text-[10px] font-extrabold text-gray-400 tracking-wider cursor-pointer hover:text-[#00af87] uppercase">Set Next Week</span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {activeClient.weeklyProgress.map((day) => {
            const isSelected = selectedDayId === day.id;
            return (
              <div
                key={day.id}
                onClick={() => setSelectedDayId(day.id)}
                className={`flex flex-col items-center py-3 rounded-2xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'border-[#ff9f29]/30 bg-orange-50/10 shadow-sm'
                    : 'border-transparent hover:bg-gray-50'
                }`}
              >
                {/* Selected Top Indicator Line */}
                <div className={`w-6 h-1 rounded-full mb-2 ${
                  isSelected ? 'bg-[#ff9f29]' : 'bg-transparent'
                }`}></div>

                {/* Day Name */}
                <span className="text-[10px] text-gray-400 font-bold uppercase mb-2 block sm:hidden">
                  {day.dayName.substring(0, 1)}
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase mb-2 hidden sm:block">
                  {day.dayName.substring(0, 3)}
                </span>

                {/* Status Indicator bubble */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all ${
                  day.completed
                    ? 'bg-[#00af87] text-white'
                    : isSelected
                      ? 'bg-white border-2 border-gray-300 text-gray-700'
                      : 'bg-gray-100 text-gray-500'
                }`}>
                  {day.completed ? (
                    <CheckCircle2 size={15} className="text-white" />
                  ) : (
                    day.dateNum
                  )}
                </div>

                {/* Muscle Group Focus */}
                <div className="mt-2 text-center px-1 w-full min-h-[30px] flex items-center justify-center">
                  {editingFocusDayId === day.id ? (
                    <div className="flex flex-col items-center gap-1">
                      <input
                        type="text"
                        value={focusText}
                        onChange={(e) => setFocusText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveFocus(day.id)}
                        className="w-16 text-[9px] text-center border border-gray-200 rounded px-0.5 py-0.2"
                      />
                      <button onClick={() => handleSaveFocus(day.id)} className="text-[8px] font-bold text-[#00af87]">Save</button>
                    </div>
                  ) : (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditFocus(day);
                      }}
                      className="text-[9px] font-extrabold text-gray-500 hover:text-[#00af87] block truncate max-w-[70px] uppercase tracking-wide leading-tight cursor-edit"
                      title="Click to edit focus"
                    >
                      {day.focus || 'Rest'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Workout Details & Editor */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-50 pb-5 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-[#00af87] rounded-sm"></span>
              <h3 className="text-base font-extrabold text-gray-800">
                {activeClient.weeklyProgress.find(d => d.id === selectedDayId)?.dayName || 'Day\'s'} Workout
              </h3>
            </div>
            <p className="text-xs text-gray-400 font-semibold mt-1">
              {currentWorkout.name} {currentWorkout.duration ? `— ${currentWorkout.duration}` : ''}
            </p>
          </div>

          <button
            onClick={handleAddExerciseClick}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-50 text-[#00af87] border border-teal-100 hover:bg-[#00af87] hover:text-white rounded-2xl text-xs font-bold transition-all shadow-sm self-start sm:self-auto"
          >
            <Plus size={14} />
            Add Exercise
          </button>
        </div>

        {/* Exercises list */}
        <div className="space-y-2">
          {renderExercisesList()}
        </div>
      </div>
    </>
  )}

  {/* Workout Builder/Editor Modal */}
  {editorOpen && (
        <WorkoutEditorModal
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
          exercise={editingExercise}
          dayId={selectedDayId}
          clientId={activeClient.id}
          existingExercises={currentWorkout.exercises}
        />
      )}
    </div>
  );
}
