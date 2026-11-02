import React, { useState, useEffect } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { X, Check, ChevronDown, ChevronUp, Layers, Dumbbell } from 'lucide-react';
import { normalizeExercise } from '../../utils/workoutUtils';

export default function WorkoutEditorModal({ isOpen, onClose, exercise, dayId, clientId, existingExercises }) {
  const { addExercise, updateExercise } = useGymState();

  const [name, setName] = useState('');
  const [sets, setSets] = useState(3);
  const [targetReps, setTargetReps] = useState(10);
  const [suggestedWeight, setSuggestedWeight] = useState(10);
  const [isBodyweight, setIsBodyweight] = useState(false);
  const [equipment, setEquipment] = useState('Free Weights');
  const [details, setDetails] = useState('');
  const [image, setImage] = useState('/images/exercise_squat.webp');
  const [supersetWithExId, setSupersetWithExId] = useState('');
  
  // Custom per-set targets (optional toggle for progressive overload)
  const [customizeSetsIndividually, setCustomizeSetsIndividually] = useState(false);
  const [customSetTargets, setCustomSetTargets] = useState([]);

  // Pre-fill fields if editing existing exercise
  useEffect(() => {
    if (exercise) {
      const norm = normalizeExercise(exercise);
      setName(norm.name || '');
      setSets(norm.sets || 3);
      setTargetReps(norm.targetReps || 10);
      setSuggestedWeight(norm.suggestedWeight !== null && norm.suggestedWeight !== undefined ? norm.suggestedWeight : 10);
      setIsBodyweight(Boolean(norm.isBodyweight));
      setEquipment(norm.equipment || 'Free Weights');
      setDetails(norm.details || '');
      setImage(norm.image || '/images/exercise_squat.webp');

      const existingSets = norm.setRecords || [];
      const setList = [];
      for (let i = 1; i <= (norm.sets || 3); i++) {
        const found = existingSets.find(s => s.setNumber === i);
        setList.push({
          setNumber: i,
          targetReps: found?.targetReps ?? norm.targetReps ?? 10,
          weight: found?.weight ?? (norm.isBodyweight ? null : (norm.suggestedWeight ?? 10)),
          actualReps: found?.actualReps ?? null,
          status: found?.status ?? 'pending'
        });
      }
      setCustomSetTargets(setList);

      if (exercise.supersetId) {
        const partner = existingExercises.find(e => e.supersetId === exercise.supersetId && e.id !== exercise.id);
        setSupersetWithExId(partner ? partner.id : '');
      } else {
        setSupersetWithExId('');
      }
    } else {
      setName('');
      setSets(3);
      setTargetReps(10);
      setSuggestedWeight(10);
      setIsBodyweight(false);
      setEquipment('Free Weights');
      setDetails('');
      setImage('/images/exercise_squat.webp');
      setSupersetWithExId('');
      setCustomizeSetsIndividually(false);
      setCustomSetTargets([
        { setNumber: 1, targetReps: 10, weight: 10, status: 'pending' },
        { setNumber: 2, targetReps: 10, weight: 10, status: 'pending' },
        { setNumber: 3, targetReps: 10, weight: 10, status: 'pending' }
      ]);
    }
  }, [exercise, isOpen, existingExercises]);

  // Handle sets count change to dynamically re-adjust customSetTargets
  const handleSetsCountChange = (count) => {
    const num = Math.max(1, Math.min(10, parseInt(count, 10) || 1));
    setSets(num);
    setCustomSetTargets(prev => {
      const updated = [];
      for (let i = 1; i <= num; i++) {
        const existing = prev.find(s => s.setNumber === i);
        updated.push({
          setNumber: i,
          targetReps: existing?.targetReps ?? targetReps,
          weight: existing?.weight ?? (isBodyweight ? null : suggestedWeight),
          status: existing?.status ?? 'pending'
        });
      }
      return updated;
    });
  };

  const handleCustomSetTargetChange = (setNumber, field, val) => {
    setCustomSetTargets(prev => prev.map(s => {
      if (s.setNumber === setNumber) {
        return {
          ...s,
          [field]: field === 'weight'
            ? (val === '' ? null : parseFloat(val))
            : (parseInt(val, 10) || 0)
        };
      }
      return s;
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const setCount = Math.max(1, parseInt(sets, 10) || 3);
    const parsedTargetReps = parseInt(targetReps, 10) || 10;
    const parsedWeight = isBodyweight ? null : (parseFloat(suggestedWeight) || 0);

    // Build set records preserving any existing logged actual results if editing
    const existingSets = (exercise && Array.isArray(exercise.setRecords)) ? exercise.setRecords : [];
    const builtSetRecords = [];

    for (let i = 1; i <= setCount; i++) {
      const existing = existingSets.find(s => s.setNumber === i);
      const custom = customSetTargets.find(s => s.setNumber === i);

      const targetForSet = customizeSetsIndividually && custom ? custom.targetReps : parsedTargetReps;
      const weightForSet = customizeSetsIndividually && custom ? (isBodyweight ? null : custom.weight) : parsedWeight;

      builtSetRecords.push({
        setNumber: i,
        targetReps: targetForSet,
        actualReps: existing?.actualReps !== undefined ? existing.actualReps : null,
        weight: existing?.weight !== undefined ? existing.weight : weightForSet,
        status: existing?.status || 'pending',
        completedAt: existing?.completedAt || null
      });
    }

    const payload = {
      name: name.trim(),
      sets: setCount,
      targetReps: parsedTargetReps,
      suggestedWeight: parsedWeight,
      isBodyweight,
      equipment: equipment.trim() || (isBodyweight ? 'Bodyweight' : 'Free Weights'),
      reps: `${parsedTargetReps} reps`,
      weight: isBodyweight ? 'Bodyweight' : `${parsedWeight} kg`,
      details: details.trim() || `Coach Target: ${setCount} sets × ${parsedTargetReps} reps @ ${isBodyweight ? 'BW' : `${parsedWeight} kg`}`,
      image,
      status: exercise?.status || 'not_started',
      completed: exercise?.completed || false,
      setRecords: builtSetRecords
    };

    if (exercise) {
      updateExercise(clientId, dayId, exercise.id, payload);

      // Handle superset binding
      if (supersetWithExId) {
        const partnerEx = existingExercises.find(ex => ex.id === supersetWithExId);
        const newSsId = partnerEx?.supersetId || 'ss_' + Date.now();
        updateExercise(clientId, dayId, exercise.id, { supersetId: newSsId });
        updateExercise(clientId, dayId, supersetWithExId, { supersetId: newSsId });
      } else if (exercise.supersetId) {
        updateExercise(clientId, dayId, exercise.id, { supersetId: null });
        const remaining = existingExercises.filter(ex => ex.supersetId === exercise.supersetId && ex.id !== exercise.id);
        if (remaining.length <= 1) {
          remaining.forEach(rem => {
            updateExercise(clientId, dayId, rem.id, { supersetId: null });
          });
        }
      }
    } else {
      const newExId = 'ex_' + Date.now();
      const newSsId = supersetWithExId
        ? (existingExercises.find(ex => ex.id === supersetWithExId)?.supersetId || 'ss_' + Date.now())
        : null;

      addExercise(clientId, dayId, {
        ...payload,
        id: newExId,
        supersetId: newSsId
      });

      if (supersetWithExId && newSsId) {
        updateExercise(clientId, dayId, supersetWithExId, { supersetId: newSsId });
      }
    }

    onClose();
  };

  const imageOptions = [
    { label: 'Squat', value: '/images/exercise_squat.webp' },
    { label: 'Lunge', value: '/images/exercise_lunge.webp' },
    { label: 'Leg Press', value: '/images/exercise_legpress.webp' },
    { label: 'Burpee', value: '/images/exercise_burpee.webp' },
    { label: 'High Knees', value: '/images/exercise_highknees.webp' },
    { label: 'Pushups', value: '/images/exercise_pushups.webp' },
    { label: 'Row', value: '/images/exercise_row.webp' },
    { label: 'Bicep Curl', value: '/images/exercise_bicepcurl.webp' },
    { label: 'Tricep Dip', value: '/images/exercise_tricepdip.webp' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-teal-50/50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#00af87] text-white flex items-center justify-center shadow-sm">
              <Dumbbell size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-800 tracking-wide">
                {exercise ? 'Edit Exercise Targets' : 'Assign New Exercise'}
              </h3>
              <p className="text-[10px] text-gray-400 font-semibold">
                Set target sets, reps, and suggested weight for this client
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Exercise Name */}
          <div>
            <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
              Exercise Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-semibold"
              placeholder="e.g. Bodyweight Squat, Dumbbell Lunge"
            />
          </div>

          {/* Sets, Target Reps, Weight Suggestion Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Sets */}
            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                Total Sets
              </label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={sets}
                onChange={(e) => handleSetsCountChange(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-extrabold"
              />
            </div>

            {/* Target Reps */}
            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                Target Reps
              </label>
              <input
                type="number"
                min="1"
                max="999"
                required
                value={targetReps}
                onChange={(e) => setTargetReps(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-extrabold"
              />
            </div>

            {/* Suggested Weight */}
            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                disabled={isBodyweight}
                value={isBodyweight ? '' : suggestedWeight}
                onChange={(e) => setSuggestedWeight(e.target.value)}
                placeholder={isBodyweight ? 'Bodyweight' : '10'}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-extrabold disabled:opacity-40"
              />
            </div>
          </div>

          {/* Bodyweight Checkbox */}
          <label className="flex items-center gap-2 p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100/60 transition-colors">
            <input
              type="checkbox"
              checked={isBodyweight}
              onChange={(e) => setIsBodyweight(e.target.checked)}
              className="w-4 h-4 accent-[#00af87] rounded cursor-pointer"
            />
            <span className="text-xs font-bold text-gray-700">
              Bodyweight Exercise (No added weight required)
            </span>
          </label>

          {/* Equipment & Superset Linking */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                Equipment
              </label>
              <input
                type="text"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-medium"
                placeholder="e.g. Free Weights, Bodyweight, Machine"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                Link as Superset with
              </label>
              <select
                value={supersetWithExId}
                onChange={(e) => setSupersetWithExId(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#00af87] text-gray-700 font-medium cursor-pointer"
              >
                <option value="">(None - Standalone)</option>
                {existingExercises
                  .filter(ex => !exercise || ex.id !== exercise.id)
                  .map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))
                }
              </select>
            </div>
          </div>

          {/* Coach Notes & Details */}
          <div>
            <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
              Coach Form Notes & Instructions
            </label>
            <input
              type="text"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-medium"
              placeholder="e.g. Focus on keeping chest upright and slow controlled tempo"
            />
          </div>

          {/* Individual Set Targets Accordion */}
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setCustomizeSetsIndividually(!customizeSetsIndividually)}
              className="w-full p-3 bg-gray-50/70 hover:bg-gray-100 flex items-center justify-between text-xs font-bold text-gray-700 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Layers size={14} className="text-[#00af87]" />
                Customize Individual Set Targets (Progressive Overload)
              </span>
              {customizeSetsIndividually ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {customizeSetsIndividually && (
              <div className="p-3 bg-white space-y-2 border-t border-gray-100 animate-in fade-in duration-200">
                <p className="text-[11px] text-gray-400 font-medium mb-2">
                  Configure specific target reps and suggested weights per set (e.g. pyramids).
                </p>
                {customSetTargets.map((s) => (
                  <div key={s.setNumber} className="flex items-center justify-between gap-3 p-2 bg-gray-50/50 rounded-xl">
                    <span className="text-xs font-extrabold text-gray-700 w-14">Set {s.setNumber}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400 font-bold">Reps:</span>
                        <input
                          type="number"
                          min="1"
                          value={s.targetReps}
                          onChange={(e) => handleCustomSetTargetChange(s.setNumber, 'targetReps', e.target.value)}
                          className="w-14 text-center text-xs font-bold bg-white border border-gray-200 rounded-lg p-1 outline-none focus:border-[#00af87]"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400 font-bold">Weight:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          disabled={isBodyweight}
                          value={isBodyweight ? '' : (s.weight ?? '')}
                          onChange={(e) => handleCustomSetTargetChange(s.setNumber, 'weight', e.target.value)}
                          placeholder={isBodyweight ? 'BW' : 'kg'}
                          className="w-16 text-center text-xs font-bold bg-white border border-gray-200 rounded-lg p-1 outline-none focus:border-[#00af87] disabled:opacity-40"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Exercise Demo Image Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">
                Exercise Illustration
              </label>
              <select
                value={imageOptions.some(opt => opt.value === image) ? image : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    setImage(e.target.value);
                  }
                }}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#00af87] text-gray-700 font-medium cursor-pointer"
              >
                {imageOptions.map((opt, idx) => (
                  <option key={idx} value={opt.value}>{opt.label}</option>
                ))}
                {!imageOptions.some(opt => opt.value === image) && (
                  <option value="custom">Custom Uploaded</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wide block mb-1">
                Or Upload Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setImage(reader.result);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full text-[10px] bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 text-gray-500 outline-none file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[9px] file:font-extrabold file:bg-teal-50 file:text-[#00af87] file:cursor-pointer hover:file:opacity-90 transition-all"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl text-white text-xs font-extrabold bg-gradient-to-r from-[#00af87] to-[#009e7a] flex items-center gap-1.5 shadow-md hover:opacity-95 transition-all"
            >
              <Check size={14} />
              {exercise ? 'Save Targets' : 'Assign Exercise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
