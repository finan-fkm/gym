import React, { useState, useEffect } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { CheckCircle2, Circle, Flame, Dumbbell, Award, Timer, Sparkles, ChevronRight, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ClientWorkoutPlay() {
  const { activeClient, toggleExerciseCompletion } = useGymState();
  const [activeDayId, setActiveDayId] = useState('thu'); // default Thursday
  const [timerCount, setTimerCount] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

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

  const currentWorkout = activeClient.dailyWorkouts[activeDayId] || {
    name: "Rest & Recovery",
    duration: "No formal workouts assigned",
    exercises: []
  };

  const exercises = currentWorkout.exercises || [];
  const completedCount = exercises.filter(ex => ex.completed).length;
  const totalCount = exercises.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Celebrate on completing the last exercise
  const handleCheckClick = (exId, wasCompleted) => {
    // If we are checking the exercise to complete
    if (!wasCompleted && completedCount + 1 === totalCount) {
      // Fire confetti!
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00af87', '#ff9f29', '#2dd4bf', '#ffc170']
      });
    }
    toggleExerciseCompletion(activeClient.id, activeDayId, exId);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
          // Render grouped block
          items.push(
            <div key={`client-ss-${i}`} className="border-2 border-dashed border-[#00af87]/40 rounded-3xl p-4 bg-teal-50/10 relative my-4">
              <span className="absolute -top-3 left-4 text-[9px] font-extrabold bg-[#00af87] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                Superset Combo
              </span>
              <div className="space-y-4 pt-1">
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

  const renderClientExerciseCard = (ex, inSuperset = false) => {
    return (
      <div
        key={ex.id}
        onClick={() => handleCheckClick(ex.id, ex.completed)}
        className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 cursor-pointer transition-all duration-300 hover:shadow-md ${
          ex.completed ? 'border-[#00af87]/50 bg-teal-50/5' : 'border-gray-100'
        }`}
      >
        <div className="flex items-center gap-3.5 flex-1">
          <img
            src={ex.image}
            alt={ex.name}
            className="w-14 h-14 rounded-xl object-cover border border-gray-50 shadow-sm"
          />
          <div className="flex-1">
            <h5 className={`font-extrabold text-sm transition-colors ${
              ex.completed ? 'text-gray-400 line-through' : 'text-gray-800'
            }`}>
              {ex.name}
            </h5>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] font-semibold text-gray-400">
              <span className="bg-gray-50 px-1.5 py-0.5 rounded text-gray-600 font-bold">{ex.sets} Sets</span>
              <span>{ex.reps}</span>
              {ex.weight && <span className="text-[#ff9f29]">{ex.weight}</span>}
            </div>
          </div>
        </div>

        {/* Completion checkbox checkmark */}
        <div className="flex items-center justify-center p-1">
          {ex.completed ? (
            <div className="w-7 h-7 rounded-full bg-[#00af87] flex items-center justify-center text-white shadow-sm transition-all scale-110">
              <CheckCircle2 size={16} className="fill-current text-white stroke-2" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-200 hover:border-[#00af87] hover:text-[#00af87] transition-all">
              <Circle size={16} />
            </div>
          )}
        </div>
      </div>
    );
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

      {/* Workout Progress Circular/Bar Panel */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100 relative overflow-hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block mb-1">Workout Focus</span>
            <h3 className="text-xl font-extrabold text-gray-800">{currentWorkout.name}</h3>
            <p className="text-xs text-gray-400 font-semibold mt-1">Est. Duration: {currentWorkout.duration}</p>
          </div>

          {/* Sparkly Completion badge */}
          {completionPercentage === 100 && totalCount > 0 ? (
            <div className="bg-teal-50 border border-teal-100 text-[#00af87] rounded-2xl p-2.5 flex items-center justify-center flex-col animate-bounce">
              <Award size={22} />
              <span className="text-[9px] font-extrabold mt-0.5">COMPLETED</span>
            </div>
          ) : (
            <div className="relative w-16 h-16 flex items-center justify-center">
              {/* SVG circular progress ring */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="32" cy="32" r="26" stroke="#f1f5f9" strokeWidth="4.5" fill="transparent" />
                <circle cx="32" cy="32" r="26" stroke="#00af87" strokeWidth="4.5" fill="transparent"
                  strokeDasharray={2 * Math.PI * 26}
                  strokeDashoffset={2 * Math.PI * 26 * (1 - completionPercentage / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-xs font-extrabold text-gray-700">{completionPercentage}%</span>
            </div>
          )}
        </div>

        {/* Progress Bar & Stat boxes */}
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
            <div className="bg-gray-50/70 p-2.5 rounded-xl cursor-pointer" onClick={() => setTimerActive(!timerActive)}>
              <span className="text-[9px] text-gray-400 font-bold block mb-0.5">REST TIMER</span>
              <span className="text-[#00af87] font-extrabold flex items-center justify-center gap-1">
                <Timer size={12} />
                {timerCount > 0 ? formatTimer(timerCount) : 'Start'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Exercises Play List */}
      <div className="flex flex-col gap-1">
        <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Workout Exercises</h4>
        {renderClientExercises()}
      </div>

      {/* Completion Congratulatory Card */}
      {completionPercentage === 100 && totalCount > 0 && (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-3xl p-6 shadow-md text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-[#00af87]">
            <Sparkles size={24} />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-gray-800 tracking-wide">Workout Complete!</h4>
            <p className="text-xs text-gray-500 mt-1 leading-normal font-medium">Awesome effort today, {activeClient.name}! You checked off all assigned exercises. Your results have been logged and synced with Coach Brandon.</p>
          </div>
          <button
            onClick={() => {
              // trigger another burst
              confetti({ particleCount: 80, spread: 50 });
            }}
            className="mt-1 flex items-center gap-1.5 px-6 py-2.5 bg-[#00af87] text-white rounded-2xl text-xs font-extrabold shadow-sm hover:opacity-90 transition-all"
          >
            Celebrate again <Zap size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
