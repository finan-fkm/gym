import React, { useState, useEffect } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { 
  CheckCircle2, 
  Circle, 
  Flame, 
  Award, 
  Sparkles, 
  Plus, 
  Minus, 
  SkipForward, 
  History, 
  Layers, 
  Info, 
  Play, 
  Pause, 
  RotateCcw,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { calculateWorkoutSummary, formatDuration, normalizeExercise } from '../../utils/workoutUtils';
import WorkoutSummaryModal from '../common/WorkoutSummaryModal';
import SkipExerciseModal from '../common/SkipExerciseModal';
import WorkoutHistoryComparison from '../common/WorkoutHistoryComparison';

export default function ClientWorkoutPlay() {
  const { 
    activeClient, 
    updateSetRecord, 
    skipSet, 
    skipExercise, 
    saveWorkoutSession 
  } = useGymState();

  const [activeDayId, setActiveDayId] = useState('thu'); // default Thursday
  const [activeSubTab, setActiveSubTab] = useState('workout'); // 'workout' or 'history'
  
  // Rest Timer State
  const [timerCount, setTimerCount] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Modals State
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [skipModalEx, setSkipModalEx] = useState(null); // Exercise to skip

  // Local state for set input fields (allows smooth typing before blur/commit)
  const [inputActualReps, setInputActualReps] = useState({});
  const [inputWeight, setInputWeight] = useState({});

  useEffect(() => {
    let interval = null;
    if (timerActive) {
      interval = setInterval(() => {
        setTimerCount((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  if (!activeClient) return null;

  const currentWorkout = (activeClient.dailyWorkouts && activeClient.dailyWorkouts[activeDayId]) || {
    name: "Rest & Recovery",
    duration: "No formal workouts assigned",
    exercises: []
  };

  const rawExercises = currentWorkout.exercises || [];
  const exercises = rawExercises.map(normalizeExercise);

  const completedCount = exercises.filter(ex => ex.status === 'completed' || ex.completed).length;
  const skippedCount = exercises.filter(ex => ex.status === 'skipped').length;
  const totalCount = exercises.length;
  const completionPercentage = totalCount > 0 
    ? Math.round(((completedCount + (skippedCount * 0.5)) / totalCount) * 100) 
    : 0;

  // Handle set values change
  const handleRepsChange = (exId, setNumber, val) => {
    const key = `${exId}_${setNumber}`;
    setInputActualReps(prev => ({ ...prev, [key]: val }));
  };

  const handleWeightChange = (exId, setNumber, val) => {
    const key = `${exId}_${setNumber}`;
    setInputWeight(prev => ({ ...prev, [key]: val }));
  };

  const getSetValues = (ex, setRec) => {
    const key = `${ex.id}_${setRec.setNumber}`;
    const actualReps = inputActualReps[key] !== undefined 
      ? inputActualReps[key] 
      : (setRec.actualReps !== null ? setRec.actualReps : setRec.targetReps);

    const defaultWt = ex.isBodyweight ? '' : (ex.suggestedWeight !== null ? ex.suggestedWeight : '');
    const weight = inputWeight[key] !== undefined
      ? inputWeight[key]
      : (setRec.weight !== null ? setRec.weight : defaultWt);

    return { actualReps, weight };
  };

  // Set Complete Action
  const handleCompleteSet = async (ex, setRec) => {
    const { actualReps, weight } = getSetValues(ex, setRec);
    const wasCompleted = setRec.status === 'completed';
    const nextStatus = wasCompleted ? 'pending' : 'completed';

    await updateSetRecord(
      activeClient.id, 
      activeDayId, 
      ex.id, 
      setRec.setNumber, 
      {
        actualReps: nextStatus === 'completed' ? (parseInt(actualReps, 10) || setRec.targetReps) : null,
        weight: nextStatus === 'completed' ? (ex.isBodyweight ? null : (parseFloat(weight) || 0)) : null,
        status: nextStatus
      }
    );

    // If checking to completed, restart rest timer
    if (!wasCompleted) {
      setTimerCount(0);
      setTimerActive(true);
    }
  };

  // Step reps or weight helper
  const handleStep = (ex, setRec, field, delta) => {
    const key = `${ex.id}_${setRec.setNumber}`;
    if (field === 'reps') {
      const current = parseInt(inputActualReps[key] ?? setRec.actualReps ?? setRec.targetReps ?? 10, 10);
      const next = Math.max(0, current + delta);
      setInputActualReps(prev => ({ ...prev, [key]: next }));
      if (setRec.status === 'completed') {
        updateSetRecord(activeClient.id, activeDayId, ex.id, setRec.setNumber, { actualReps: next });
      }
    } else if (field === 'weight') {
      const current = parseFloat(inputWeight[key] ?? setRec.weight ?? ex.suggestedWeight ?? 0);
      const next = Math.max(0, Math.round((current + delta) * 10) / 10);
      setInputWeight(prev => ({ ...prev, [key]: next }));
      if (setRec.status === 'completed') {
        updateSetRecord(activeClient.id, activeDayId, ex.id, setRec.setNumber, { weight: next });
      }
    }
  };

  // Skip set action
  const handleSkipSet = async (ex, setRec) => {
    await skipSet(activeClient.id, activeDayId, ex.id, setRec.setNumber);
  };

  // Skip entire exercise
  const handleConfirmSkipExercise = async (reason) => {
    if (!skipModalEx) return;
    await skipExercise(activeClient.id, activeDayId, skipModalEx.id, reason);
    setSkipModalEx(null);
  };

  // Workout Summary calculation
  const currentSummary = calculateWorkoutSummary(exercises, timerCount);

  // Finish Workout Handler
  const handleFinishWorkout = () => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00af87', '#ff9f29', '#2dd4bf', '#ffd180']
    });
    setSummaryOpen(true);
  };

  // Save Session to Database
  const handleSaveSessionToHistory = async () => {
    setIsSavingSession(true);
    try {
      const allSets = [];
      exercises.forEach(ex => {
        (ex.setRecords || []).forEach(s => {
          allSets.push({
            id: `sr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            exerciseId: ex.id,
            exerciseName: ex.name,
            setNumber: s.setNumber,
            targetReps: s.targetReps,
            actualReps: s.actualReps,
            weight: s.weight,
            status: s.status,
            completedAt: s.completedAt || new Date().toISOString()
          });
        });
      });

      await saveWorkoutSession({
        clientId: activeClient.id,
        dayKey: activeDayId,
        workoutName: currentWorkout.name,
        durationSeconds: timerCount,
        summary: currentSummary,
        setRecords: allSets
      });

      setSummaryOpen(false);
      setActiveSubTab('history');
    } catch (err) {
      console.error('Error saving workout session:', err);
    } finally {
      setIsSavingSession(false);
    }
  };

  // Render Exercise Card with Individual Set Tracking Table
  const renderClientExerciseCard = (ex, inSuperset = false) => {
    const sets = ex.setRecords || [];
    const completedSetsCount = sets.filter(s => s.status === 'completed').length;
    const isExerciseCompleted = ex.status === 'completed' || ex.completed;
    const isExerciseSkipped = ex.status === 'skipped';

    return (
      <div
        key={ex.id}
        className={`bg-white rounded-3xl p-5 shadow-premium border transition-all duration-300 ${
          isExerciseCompleted
            ? 'border-[#00af87]/40 bg-teal-50/5'
            : isExerciseSkipped
              ? 'border-gray-200 bg-gray-50/40 opacity-80'
              : 'border-gray-100 hover:border-gray-200'
        }`}
      >
        {/* Exercise Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-gray-100">
          <div className="flex items-center gap-3.5">
            <img
              src={ex.image || '/images/exercise_squat.webp'}
              alt={ex.name}
              className="w-13 h-13 rounded-2xl object-cover border border-gray-100 shadow-sm shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h5 className={`font-extrabold text-sm ${isExerciseCompleted ? 'text-[#00af87]' : 'text-gray-800'}`}>
                  {ex.name}
                </h5>
                {inSuperset && (
                  <span className="text-[9px] font-extrabold bg-teal-50 text-[#00af87] border border-teal-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Superset
                  </span>
                )}
              </div>

              {/* Coach Target Information */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] font-semibold text-gray-400">
                <span>Target: <b className="text-gray-700">{ex.sets} Sets</b> × <b className="text-gray-700">{ex.targetReps} Reps</b></span>
                <span>•</span>
                <span>
                  Suggested: <b className="text-gray-700">{ex.isBodyweight ? 'Bodyweight' : `${ex.suggestedWeight || 10} kg`}</b>
                </span>
                {ex.equipment && (
                  <>
                    <span>•</span>
                    <span className="text-gray-400">{ex.equipment}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Indicator & Skip Option */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5">
            {/* Visual Status Indicator */}
            {isExerciseCompleted ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-teal-50 text-[#00af87] border border-teal-100 uppercase tracking-wider">
                <CheckCircle2 size={13} /> Completed
              </span>
            ) : isExerciseSkipped ? (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-500 uppercase tracking-wider" title={ex.skipReason || 'Skipped'}>
                <SkipForward size={12} /> Skipped
              </span>
            ) : ex.status === 'in_progress' ? (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold bg-orange-50 text-[#ff9f29] border border-orange-100 uppercase tracking-wider">
                <Flame size={12} /> In Progress ({completedSetsCount}/{sets.length})
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-400 uppercase tracking-wider">
                Not Started
              </span>
            )}

            {!isExerciseCompleted && !isExerciseSkipped && (
              <button
                onClick={() => setSkipModalEx(ex)}
                className="text-gray-400 hover:text-gray-600 text-[11px] font-bold px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                title="Skip this exercise"
              >
                Skip
              </button>
            )}
          </div>
        </div>

        {/* Skipped Notice */}
        {isExerciseSkipped && ex.skipReason && (
          <div className="mt-3 p-2.5 rounded-xl bg-gray-50 text-[11px] text-gray-500 font-medium flex items-center gap-1.5">
            <Info size={13} className="text-gray-400 shrink-0" />
            <span>Skipped: <b className="text-gray-700">{ex.skipReason}</b></span>
          </div>
        )}

        {/* Individual Set Tracking Rows */}
        <div className="mt-4 space-y-2">
          {sets.map((setRec) => {
            const { actualReps, weight } = getSetValues(ex, setRec);
            const isSetCompleted = setRec.status === 'completed';
            const isSetSkipped = setRec.status === 'skipped';

            return (
              <div
                key={setRec.setNumber}
                className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isSetCompleted
                    ? 'border-[#00af87]/30 bg-teal-50/15'
                    : isSetSkipped
                      ? 'border-gray-100 bg-gray-50/60 opacity-60'
                      : 'border-gray-100 bg-gray-50/40 hover:bg-gray-50'
                }`}
              >
                {/* Set Identity */}
                <div className="flex items-center gap-2.5 min-w-[90px]">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-extrabold text-[11px] shadow-2xs ${
                    isSetCompleted
                      ? 'bg-[#00af87] text-white'
                      : isSetSkipped
                        ? 'bg-gray-200 text-gray-500'
                        : 'bg-white border border-gray-200 text-gray-700'
                  }`}>
                    {setRec.setNumber}
                  </span>
                  <div>
                    <span className="text-xs font-extrabold text-gray-800">Set {setRec.setNumber}</span>
                    <span className="text-[10px] text-gray-400 font-semibold block">Target: {setRec.targetReps} reps</span>
                  </div>
                </div>

                {/* Reps and Weight Input Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Actual Reps Field */}
                  <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleStep(ex, setRec, 'reps', -1)}
                      className="w-6 h-6 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors font-black text-xs"
                    >
                      <Minus size={11} />
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={actualReps}
                      onChange={(e) => handleRepsChange(ex.id, setRec.setNumber, e.target.value)}
                      onBlur={() => {
                        if (isSetCompleted) {
                          updateSetRecord(activeClient.id, activeDayId, ex.id, setRec.setNumber, {
                            actualReps: parseInt(actualReps, 10) || setRec.targetReps
                          });
                        }
                      }}
                      className="w-10 text-center font-extrabold text-xs text-gray-800 outline-none bg-transparent"
                    />
                    <span className="text-[10px] text-gray-400 font-bold pr-1">reps</span>
                    <button
                      type="button"
                      onClick={() => handleStep(ex, setRec, 'reps', 1)}
                      className="w-6 h-6 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors font-black text-xs"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Weight Field (kg) */}
                  <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleStep(ex, setRec, 'weight', -1)}
                      disabled={ex.isBodyweight}
                      className="w-6 h-6 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors font-black text-xs disabled:opacity-30"
                    >
                      <Minus size={11} />
                    </button>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder={ex.isBodyweight ? 'BW' : '0'}
                      value={ex.isBodyweight ? (weight || '') : weight}
                      onChange={(e) => handleWeightChange(ex.id, setRec.setNumber, e.target.value)}
                      onBlur={() => {
                        if (isSetCompleted && !ex.isBodyweight) {
                          updateSetRecord(activeClient.id, activeDayId, ex.id, setRec.setNumber, {
                            weight: parseFloat(weight) || 0
                          });
                        }
                      }}
                      className="w-12 text-center font-extrabold text-xs text-gray-800 outline-none bg-transparent placeholder:text-gray-400"
                    />
                    <span className="text-[10px] text-gray-400 font-bold pr-1">
                      {ex.isBodyweight ? 'kg (BW)' : 'kg'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStep(ex, setRec, 'weight', 1)}
                      disabled={ex.isBodyweight}
                      className="w-6 h-6 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors font-black text-xs disabled:opacity-30"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>

                {/* Set Actions: Complete Button & Skip Set */}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleSkipSet(ex, setRec)}
                    className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-colors ${
                      isSetSkipped
                        ? 'bg-gray-200 text-gray-700'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {isSetSkipped ? 'Skipped' : 'Skip Set'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCompleteSet(ex, setRec)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shadow-xs ${
                      isSetCompleted
                        ? 'bg-[#00af87] text-white hover:bg-emerald-600'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-[#00af87] hover:text-[#00af87]'
                    }`}
                  >
                    {isSetCompleted ? (
                      <>
                        <Check size={13} className="stroke-3" />
                        <span>Done</span>
                      </>
                    ) : (
                      <>
                        <Circle size={13} />
                        <span>Complete Set</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Group exercises by superset consecutiveness
  const renderClientExercises = () => {
    if (exercises.length === 0) {
      return (
        <div className="py-12 text-center text-gray-400 font-medium bg-white rounded-3xl border border-gray-100 flex flex-col items-center gap-2">
          <Sparkles size={24} className="text-[#ff9f29]" />
          <span>Rest & Recovery Day! Focus on nutrition and mobility.</span>
        </div>
      );
    }

    const items = [];
    let i = 0;
    while (i < exercises.length) {
      const ex = exercises[i];
      const isPart = ex.supersetId;

      if (isPart) {
        const supersetBlock = [ex];
        let j = i + 1;
        while (j < exercises.length && exercises[j].supersetId === ex.supersetId) {
          supersetBlock.push(exercises[j]);
          j++;
        }

        if (supersetBlock.length > 1) {
          items.push(
            <div key={`client-ss-${i}`} className="border-2 border-dashed border-[#00af87]/30 rounded-3xl p-4 bg-teal-50/10 relative my-4 space-y-4">
              <span className="text-[9px] font-extrabold bg-[#00af87] text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                Superset Combo
              </span>
              <div className="space-y-4">
                {supersetBlock.map((sEx) => renderClientExerciseCard(sEx, true))}
              </div>
            </div>
          );
          i = j;
          continue;
        }
      }

      items.push(
        <div key={ex.id} className="my-3">
          {renderClientExerciseCard(ex, false)}
        </div>
      );
      i++;
    }
    return items;
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      {/* Day Selector Tabs (Mobile Style Carousel) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {activeClient.weeklyProgress.map((day) => {
          const isSelected = activeDayId === day.id;
          return (
            <button
              key={day.id}
              onClick={() => setActiveDayId(day.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-[#00af87] text-white shadow-md'
                  : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
              }`}
            >
              {day.dayName.substring(0, 3)}
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Navigation Toggle: Active Workout vs History & Comparisons */}
      <div className="grid grid-cols-2 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 text-center">
        <button
          onClick={() => setActiveSubTab('workout')}
          className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'workout'
              ? 'bg-[#00af87] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Layers size={14} />
          Active Workout
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'history'
              ? 'bg-[#00af87] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <History size={14} />
          History & Progress
        </button>
      </div>

      {activeSubTab === 'history' ? (
        /* History & Progress Comparisons Panel */
        <WorkoutHistoryComparison
          sessions={activeClient.workoutSessions || []}
          clientName={activeClient.name}
          role="client"
        />
      ) : (
        /* Active Workout Interface */
        <>
          {/* Workout Progress Circular/Bar Panel */}
          <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100 relative overflow-hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block mb-1">
                  Assigned Workout
                </span>
                <h3 className="text-xl font-extrabold text-gray-800">{currentWorkout.name}</h3>
                <p className="text-xs text-gray-400 font-semibold mt-1">Est. Duration: {currentWorkout.duration}</p>
              </div>

              {/* Circular progress ring */}
              {completionPercentage === 100 && totalCount > 0 ? (
                <div className="bg-teal-50 border border-teal-100 text-[#00af87] rounded-2xl p-2.5 flex items-center justify-center flex-col animate-bounce">
                  <Award size={22} />
                  <span className="text-[9px] font-extrabold mt-0.5">COMPLETED</span>
                </div>
              ) : (
                <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="26" stroke="#f1f5f9" strokeWidth="4.5" fill="transparent" />
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      stroke="#00af87"
                      strokeWidth="4.5"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 26}
                      strokeDashoffset={2 * Math.PI * 26 * (1 - completionPercentage / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-xs font-extrabold text-gray-700">{completionPercentage}%</span>
                </div>
              )}
            </div>

            {/* Stat boxes & Interactive Rest Timer */}
            {totalCount > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-50 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                <div className="bg-gray-50/70 p-2.5 rounded-xl">
                  <span className="text-[9px] text-gray-400 font-bold block mb-0.5">COMPLETED</span>
                  <span className="text-gray-700 font-extrabold">{completedCount} / {totalCount}</span>
                </div>

                <div className="bg-gray-50/70 p-2.5 rounded-xl">
                  <span className="text-[9px] text-gray-400 font-bold block mb-0.5">TARGETS</span>
                  <span className="text-gray-700 font-extrabold flex items-center justify-center gap-1">
                    <Flame size={12} className="text-[#ff9f29]" />
                    {activeClient.weeklyProgress.find(d => d.id === activeDayId)?.focus || 'Rest'}
                  </span>
                </div>

                <div className="bg-teal-50/40 border border-teal-100/60 p-2 rounded-xl flex flex-col justify-between">
                  <span className="text-[9px] text-gray-400 font-extrabold uppercase block">Rest Timer</span>
                  <div className="flex items-center justify-center gap-1.5 my-0.5">
                    <span className="text-xs font-extrabold text-[#00af87]">
                      {formatDuration(timerCount)}
                    </span>
                    <button
                      onClick={() => setTimerActive(!timerActive)}
                      className="p-1 rounded-md text-[#00af87] hover:bg-teal-100/60 transition-colors"
                      title={timerActive ? 'Pause' : 'Start'}
                    >
                      {timerActive ? <Pause size={11} /> : <Play size={11} />}
                    </button>
                    <button
                      onClick={() => {
                        setTimerActive(false);
                        setTimerCount(0);
                      }}
                      className="p-1 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                      title="Reset"
                    >
                      <RotateCcw size={11} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Finish Workout & View Summary CTA */}
            {totalCount > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between gap-3">
                <span className="text-xs text-gray-400 font-medium">Ready to complete today&apos;s workout?</span>
                <button
                  onClick={handleFinishWorkout}
                  className="px-4 py-2 bg-gradient-to-r from-[#00af87] to-[#009e7a] text-white rounded-2xl text-xs font-extrabold shadow-sm hover:opacity-95 transition-all flex items-center gap-1.5"
                >
                  <Award size={13} /> Finish & Summary
                </button>
              </div>
            )}
          </div>

          {/* Exercises Play List */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">
                Workout Exercises ({exercises.length})
              </h4>
              <span className="text-[10px] text-gray-400 font-semibold">Enter actual reps & weights per set</span>
            </div>
            {renderClientExercises()}
          </div>

          {/* Completion Congratulatory Card */}
          {completionPercentage === 100 && totalCount > 0 && (
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-3xl p-6 shadow-md text-center flex flex-col items-center gap-3 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-[#00af87]">
                <Sparkles size={24} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-gray-800 tracking-wide">Awesome Job, {activeClient.name}!</h4>
                <p className="text-xs text-gray-500 mt-1 leading-normal font-medium">
                  You completed all sets and exercises for today. Click below to review your total volume lifted and save this session to your official training records.
                </p>
              </div>
              <button
                onClick={handleFinishWorkout}
                className="mt-1 flex items-center gap-1.5 px-6 py-2.5 bg-[#00af87] text-white rounded-2xl text-xs font-extrabold shadow-md hover:opacity-90 transition-all"
              >
                Review Workout Summary <Award size={13} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Workout Summary Modal */}
      {summaryOpen && (
        <WorkoutSummaryModal
          isOpen={summaryOpen}
          onClose={() => setSummaryOpen(false)}
          summary={currentSummary}
          workoutName={currentWorkout.name}
          onSaveSession={handleSaveSessionToHistory}
          isSaving={isSavingSession}
        />
      )}

      {/* Skip Exercise Modal */}
      {skipModalEx && (
        <SkipExerciseModal
          isOpen={Boolean(skipModalEx)}
          onClose={() => setSkipModalEx(null)}
          exerciseName={skipModalEx.name}
          onConfirmSkip={handleConfirmSkipExercise}
        />
      )}
    </div>
  );
}
