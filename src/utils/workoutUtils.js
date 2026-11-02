// Advanced Workout Tracking Utilities

export const normalizeExercise = (ex) => {
  if (!ex) return ex;
  const setsCount = Math.max(1, parseInt(ex.sets, 10) || 3);
  let parsedTargetReps = 10;
  if (ex.targetReps !== undefined && ex.targetReps !== null && ex.targetReps !== '') {
    parsedTargetReps = parseInt(ex.targetReps, 10) || 10;
  } else if (ex.reps) {
    const match = String(ex.reps).match(/\d+/);
    if (match) parsedTargetReps = parseInt(match[0], 10) || 10;
  }

  let parsedWeight = null;
  const isBw = ex.isBodyweight !== undefined 
    ? Boolean(ex.isBodyweight)
    : (
        String(ex.equipment || '').toLowerCase().includes('bodyweight') ||
        String(ex.weight || '').toLowerCase().includes('bodyweight') ||
        String(ex.weight || '').toLowerCase().includes('bw')
      );

  if (!isBw) {
    if (ex.suggestedWeight !== undefined && ex.suggestedWeight !== null && ex.suggestedWeight !== '') {
      parsedWeight = parseFloat(ex.suggestedWeight) || 0;
    } else if (ex.weight) {
      const match = String(ex.weight).match(/\d+(\.\d+)?/);
      if (match) parsedWeight = parseFloat(match[0]) || 10;
    }
  }

  const existingSets = Array.isArray(ex.setRecords) ? ex.setRecords : [];
  const setRecords = [];
  for (let i = 1; i <= setsCount; i++) {
    const existing = existingSets.find(s => s.setNumber === i);
    if (existing) {
      setRecords.push({
        setNumber: i,
        targetReps: existing.targetReps !== undefined ? existing.targetReps : parsedTargetReps,
        actualReps: existing.actualReps !== undefined ? existing.actualReps : (ex.completed ? (existing.targetReps ?? parsedTargetReps) : null),
        weight: existing.weight !== undefined ? existing.weight : (isBw ? null : parsedWeight),
        status: existing.status || (ex.completed ? 'completed' : 'pending'),
        completedAt: existing.completedAt || (ex.completed ? new Date().toISOString() : null)
      });
    } else {
      setRecords.push({
        setNumber: i,
        targetReps: parsedTargetReps,
        actualReps: ex.completed ? parsedTargetReps : null,
        weight: isBw ? null : parsedWeight,
        status: ex.completed ? 'completed' : 'pending',
        completedAt: ex.completed ? new Date().toISOString() : null
      });
    }
  }

  let status = ex.status;
  if (!status) {
    if (ex.completed) {
      status = 'completed';
    } else {
      const completedOrSkipped = setRecords.filter(s => s.status === 'completed' || s.status === 'skipped').length;
      if (completedOrSkipped === 0) status = 'not_started';
      else if (completedOrSkipped === setRecords.length) {
        const completedCount = setRecords.filter(s => s.status === 'completed').length;
        status = completedCount > 0 ? 'completed' : 'skipped';
      } else status = 'in_progress';
    }
  }

  const isCompleted = status === 'completed' || (setRecords.length > 0 && setRecords.every(s => s.status === 'completed' || s.status === 'skipped') && status !== 'skipped');

  return {
    ...ex,
    sets: setsCount,
    targetReps: parsedTargetReps,
    suggestedWeight: parsedWeight,
    isBodyweight: isBw,
    status,
    completed: isCompleted,
    skipReason: ex.skipReason || '',
    setRecords
  };
};

export const normalizeClientWorkouts = (client) => {
  if (!client) return client;
  const clone = JSON.parse(JSON.stringify(client));
  if (clone.dailyWorkouts && typeof clone.dailyWorkouts === 'object') {
    const updatedWorkouts = {};
    for (const [dayKey, workout] of Object.entries(clone.dailyWorkouts)) {
      if (!workout) {
        updatedWorkouts[dayKey] = workout;
        continue;
      }
      const updatedExercises = Array.isArray(workout.exercises)
        ? workout.exercises.map(normalizeExercise)
        : [];
      updatedWorkouts[dayKey] = {
        ...workout,
        exercises: updatedExercises
      };
    }
    clone.dailyWorkouts = updatedWorkouts;
  }
  if (!Array.isArray(clone.workoutSessions)) {
    clone.workoutSessions = [];
  }
  return clone;
};

export const formatDuration = (seconds = 0) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const calculateWorkoutSummary = (exercises = [], durationSeconds = 0) => {
  const totalExercises = exercises.length;
  const completedExercises = exercises.filter(e => e.status === 'completed' || e.completed).length;
  const skippedExercises = exercises.filter(e => e.status === 'skipped').length;

  let totalSets = 0;
  let completedSets = 0;
  let totalReps = 0;
  let totalWeightKg = 0;
  const exerciseVolumes = [];

  exercises.forEach(ex => {
    const sets = ex.setRecords || [];
    totalSets += sets.length;
    let exReps = 0;
    let exVolume = 0;

    sets.forEach(s => {
      if (s.status === 'completed') {
        completedSets++;
        const reps = parseInt(s.actualReps, 10) || 0;
        const weight = s.weight !== null && s.weight !== undefined ? parseFloat(s.weight) || 0 : 0;
        exReps += reps;
        totalReps += reps;
        exVolume += reps * weight;
        totalWeightKg += reps * weight;
      }
    });

    exerciseVolumes.push({
      exerciseId: ex.id,
      name: ex.name,
      setsCount: sets.length,
      completedSets: sets.filter(s => s.status === 'completed').length,
      totalReps: exReps,
      totalWeightKg: Math.round(exVolume * 10) / 10,
      status: ex.status || (ex.completed ? 'completed' : 'pending'),
      skipReason: ex.skipReason || ''
    });
  });

  const completionPercentage = totalExercises > 0
    ? Math.round(((completedExercises + (skippedExercises * 0.5)) / totalExercises) * 100)
    : 0;

  return {
    totalExercises,
    completedExercises,
    skippedExercises,
    totalSets,
    completedSets,
    totalReps,
    totalWeightKg: Math.round(totalWeightKg * 10) / 10,
    durationSeconds,
    durationFormatted: formatDuration(durationSeconds),
    completionPercentage: Math.min(100, completionPercentage),
    exerciseVolumes
  };
};

export const compareSessions = (currentSession, previousSession) => {
  if (!currentSession) return null;
  if (!previousSession) {
    return {
      hasComparison: false,
      currentSession,
      previousSession: null,
      repsDelta: 0,
      weightDelta: 0,
      durationDelta: 0,
      exerciseComparisons: []
    };
  }

  const curReps = currentSession.summary?.totalReps || 0;
  const prevReps = previousSession.summary?.totalReps || 0;
  const repsDelta = curReps - prevReps;

  const curVol = currentSession.summary?.totalWeightKg || 0;
  const prevVol = previousSession.summary?.totalWeightKg || 0;
  const weightDelta = Math.round((curVol - prevVol) * 10) / 10;

  const durationDelta = (currentSession.durationSeconds || 0) - (previousSession.durationSeconds || 0);

  const curExMap = new Map();
  (currentSession.setRecords || []).forEach(sr => {
    if (!curExMap.has(sr.exerciseName)) curExMap.set(sr.exerciseName, []);
    curExMap.get(sr.exerciseName).push(sr);
  });

  const prevExMap = new Map();
  (previousSession.setRecords || []).forEach(sr => {
    if (!prevExMap.has(sr.exerciseName)) prevExMap.set(sr.exerciseName, []);
    prevExMap.get(sr.exerciseName).push(sr);
  });

  const exerciseComparisons = [];
  for (const [name, curSets] of curExMap.entries()) {
    const prevSets = prevExMap.get(name) || [];
    const curMaxWeight = Math.max(0, ...curSets.map(s => s.weight || 0));
    const prevMaxWeight = Math.max(0, ...prevSets.map(s => s.weight || 0));
    const curTotalReps = curSets.reduce((sum, s) => sum + (s.actualReps || 0), 0);
    const prevTotalReps = prevSets.reduce((sum, s) => sum + (s.actualReps || 0), 0);

    exerciseComparisons.push({
      name,
      currentSetsCount: curSets.length,
      previousSetsCount: prevSets.length,
      currentTotalReps: curTotalReps,
      previousTotalReps: prevTotalReps,
      repsImprovement: curTotalReps - prevTotalReps,
      currentMaxWeight: Math.round(curMaxWeight * 10) / 10,
      previousMaxWeight: Math.round(prevMaxWeight * 10) / 10,
      weightProgression: Math.round((curMaxWeight - prevMaxWeight) * 10) / 10
    });
  }

  return {
    hasComparison: true,
    currentSession,
    previousSession,
    repsDelta,
    weightDelta,
    durationDelta,
    exerciseComparisons
  };
};

