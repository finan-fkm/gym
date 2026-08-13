import React, { useState, useEffect } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { X, Check } from 'lucide-react';

export default function WorkoutEditorModal({ isOpen, onClose, exercise, dayId, clientId, existingExercises }) {
  const { addExercise, updateExercise } = useGymState();

  const [name, setName] = useState('');
  const [sets, setSets] = useState(3);
  const [equipment, setEquipment] = useState('Free Weights');
  const [reps, setReps] = useState('10 reps');
  const [weight, setWeight] = useState('20 lbs');
  const [details, setDetails] = useState('');
  const [image, setImage] = useState('/images/exercise_squat.webp');
  const [supersetWithExId, setSupersetWithExId] = useState('');

  // Pre-fill fields if we are editing an existing exercise
  useEffect(() => {
    if (exercise) {
      setName(exercise.name || '');
      setSets(exercise.sets || 3);
      setEquipment(exercise.equipment || '');
      setReps(exercise.reps || '');
      setWeight(exercise.weight || '');
      setDetails(exercise.details || '');
      setImage(exercise.image || '/images/exercise_squat.webp');

      // Find if it has a supersetId and who it is grouped with
      if (exercise.supersetId) {
        const partner = existingExercises.find(e => e.supersetId === exercise.supersetId && e.id !== exercise.id);
        setSupersetWithExId(partner ? partner.id : '');
      } else {
        setSupersetWithExId('');
      }
    } else {
      // Clear for new exercise
      setName('');
      setSets(3);
      setEquipment('Bodyweight');
      setReps('10 reps');
      setWeight('Bodyweight');
      setDetails('');
      setImage('/images/exercise_squat.webp');
      setSupersetWithExId('');
    }
  }, [exercise, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name,
      sets: parseInt(sets) || 1,
      equipment,
      reps,
      weight,
      details,
      image
    };

    if (exercise) {
      // Save changes to existing exercise
      updateExercise(clientId, dayId, exercise.id, payload);

      // Handle superset binding
      if (supersetWithExId) {
        const partnerEx = existingExercises.find(ex => ex.id === supersetWithExId);
        const newSsId = partnerEx?.supersetId || 'ss_' + Date.now();
        // Set superset ID on both
        updateExercise(clientId, dayId, exercise.id, { supersetId: newSsId });
        updateExercise(clientId, dayId, supersetWithExId, { supersetId: newSsId });
      } else if (exercise.supersetId) {
        // If we removed it from superset, clear the ID on this exercise
        updateExercise(clientId, dayId, exercise.id, { supersetId: null });
        // Check if partner is now alone, and if so clear its superset ID
        const remaining = existingExercises.filter(ex => ex.supersetId === exercise.supersetId && ex.id !== exercise.id);
        if (remaining.length <= 1) {
          remaining.forEach(rem => {
            updateExercise(clientId, dayId, rem.id, { supersetId: null });
          });
        }
      }
    } else {
      // Create new exercise
      const newExId = 'ex_' + Date.now();
      const newSsId = supersetWithExId
        ? (existingExercises.find(ex => ex.id === supersetWithExId)?.supersetId || 'ss_' + Date.now())
        : null;

      addExercise(clientId, dayId, {
        ...payload,
        id: newExId,
        supersetId: newSsId
      });

      // Update partner if a new superset is formed
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
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-gray-800 tracking-wide">
            {exercise ? 'Edit Exercise Detail' : 'Add New Exercise'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Exercise Name */}
          <div>
            <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Exercise Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-medium"
              placeholder="e.g. Kettlebell Goblet Squat"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Sets count */}
            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Sets</label>
              <input
                type="number"
                min="1"
                max="10"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-medium"
              />
            </div>

            {/* Equipment used */}
            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Equipment</label>
              <input
                type="text"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-medium"
                placeholder="e.g. Dumbbells, Bodyweight"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Reps or Duration */}
            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Reps / Duration</label>
              <input
                type="text"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-medium"
                placeholder="e.g. 12 reps, 45 seconds"
              />
            </div>

            {/* Suggested Weight */}
            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Weight Suggestion</label>
              <input
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-medium"
                placeholder="e.g. 25 lbs, Bodyweight"
              />
            </div>
          </div>

          {/* Details breakdown */}
          <div>
            <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Details (Reps & Weights per Set)</label>
            <input
              type="text"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-medium"
              placeholder="e.g. 1: 10/25   2: 10/28   3: 10/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Exercise Image Option & Custom Upload */}
            <div className="flex flex-col gap-2.5">
              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Demo Illustration</label>
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
                <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wide block mb-1">Or Upload Image</label>
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

            {/* Superset Link Selection */}
            <div>
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Link as Superset with</label>
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

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-white text-xs font-bold btn-gradient-teal flex items-center gap-1.5 shadow-md"
            >
              <Check size={14} />
              {exercise ? 'Save Changes' : 'Create Exercise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
