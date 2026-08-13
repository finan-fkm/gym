import React, { createContext, useContext, useState, useEffect } from 'react';
import { initialClients } from '../mockData';

const GymStateContext = createContext();

export const useGymState = () => {
  const context = useContext(GymStateContext);
  if (!context) {
    throw new Error('useGymState must be used within a GymStateProvider');
  }
  return context;
};

export const GymStateProvider = ({ children }) => {
  const [clients, setClients] = useState(() => {
    const saved = localStorage.getItem('gymweb_clients');
    return saved ? JSON.parse(saved) : initialClients;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('gymweb_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeClientId, setActiveClientId] = useState(() => {
    const savedUser = localStorage.getItem('gymweb_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      if (u.role === 'client') return u.clientId;
    }
    return clients[0]?.id || '';
  });

  const [currentRole, setCurrentRole] = useState(() => {
    const savedUser = localStorage.getItem('gymweb_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      return u.role;
    }
    return 'admin';
  });

  const [activeTab, setActiveTab] = useState('home'); // 'home' or 'clients' for admin dashboard tabs

  useEffect(() => {
    localStorage.setItem('gymweb_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('gymweb_user', JSON.stringify(currentUser));
      setCurrentRole(currentUser.role);
      if (currentUser.role === 'client') {
        setActiveClientId(currentUser.clientId);
      }
    } else {
      localStorage.removeItem('gymweb_user');
    }
  }, [currentUser]);

  const registerClient = (clientData) => {
    const newId = clientData.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const newClient = {
      id: newId,
      name: clientData.name,
      username: clientData.username.startsWith('@') ? clientData.username : '@' + clientData.username,
      location: clientData.location || "Los Angeles, CA",
      clientSince: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }),
      height: clientData.height || "5'9\"",
      photo: "/images/therese.webp", // default fallback photo
      fitnessLevel: clientData.fitnessLevel || "Moderate",
      equipmentPreference: clientData.equipmentPreference || "Bodyweight",
      goals: clientData.goals || [],
      metrics: [
        { id: "weight", name: "Weight", current: parseFloat(clientData.weight) || 150, unit: "lbs", change: 0 },
        { id: "chest", name: "Chest", current: 36, unit: "in", change: 0 },
        { id: "left_arm", name: "Left Arm", current: 12, unit: "in", change: 0 },
        { id: "right_arm", name: "Right Arm", current: 12, unit: "in", change: 0 },
        { id: "waist", name: "Waist", current: 32, unit: "in", change: 0 },
        { id: "hips", name: "Hips", current: 38, unit: "in", change: 0 },
        { id: "left_thigh", name: "Left Thigh", current: 20, unit: "in", change: 0 },
        { id: "right_thigh", name: "Right Thigh", current: 20, unit: "in", change: 0 }
      ],
      nextSession: {
        date: "Tuesday, March 20, 2018",
        time: "3:00 PM",
        location: "Private Studio"
      },
      weeklyProgress: [
        { id: "mon", dayName: "Monday", dateNum: 12, completed: false, focus: "Cardio" },
        { id: "tue", dayName: "Tuesday", dateNum: 13, completed: false, focus: "Chest & Back" },
        { id: "wed", dayName: "Wednesday", dateNum: 14, completed: false, focus: "Arms" },
        { id: "thu", dayName: "Thursday", dateNum: 15, completed: false, focus: "Lower Body" },
        { id: "fri", dayName: "Friday", dateNum: 16, completed: false, focus: "Rest" },
        { id: "sat", dayName: "Saturday", dateNum: 17, completed: false, focus: "Recovery" },
        { id: "sun", dayName: "Sunday", dateNum: 18, completed: false, focus: "Rest" }
      ],
      dailyWorkouts: {
        thu: {
          name: "Introductory Workout",
          duration: "20 minutes",
          exercises: [
            {
              id: "ex_init_1",
              name: "Bodyweight Squat",
              sets: 3,
              equipment: "Bodyweight",
              details: "Reps: 15",
              reps: "15 reps",
              weight: "Bodyweight",
              completed: false,
              image: "/images/exercise_squat.webp"
            }
          ]
        }
      },
      notes: [
        {
          id: "note_init_1",
          date: "Today",
          timestamp: "Today",
          text: "Registered new client profile."
        }
      ],
      signinHistory: [],
      metricsHistory: [
        { date: new Date().toLocaleDateString('en-US', { month: 'short' }), weight: parseFloat(clientData.weight) || 150, chest: 36, waist: 32 }
      ]
    };

    setClients(prev => [...prev, newClient]);
    setActiveClientId(newId);
    setActiveTab('home'); // Switch tab back to single client view to load profile
  };

  const updateClientProfile = (clientId, details) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          name: details.name,
          username: details.username.startsWith('@') ? details.username : '@' + details.username,
          location: details.location,
          height: details.height,
          photo: details.photo || c.photo
        };
      }
      return c;
    }));
  };

  const login = (role, username, password) => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (role === 'admin') {
      if (cleanUser === 'admin' && cleanPass === 'password') {
        const u = { name: 'Coach Brandon', username: '@brandon', role: 'admin' };
        setCurrentUser(u);
        return { success: true };
      }
      return { success: false, message: 'Invalid Coach credentials. Use admin / password.' };
    } else {
      if (cleanPass !== 'password') {
        return { success: false, message: 'Invalid Password. Use password.' };
      }
      if (cleanUser === 'therese' || cleanUser === 'therese spring' || cleanUser === '@thespring') {
        const u = { name: 'Therese Spring', username: '@thespring', role: 'client', clientId: 'therese_spring' };
        setCurrentUser(u);
        return { success: true };
      } else if (cleanUser === 'john' || cleanUser === 'john doe' || cleanUser === '@johndoe') {
        const u = { name: 'John Doe', username: '@johndoe', role: 'client', clientId: 'john_doe' };
        setCurrentUser(u);
        return { success: true };
      }
      return { success: false, message: 'Client username not found. Try therese or john.' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const activeClient = clients.find(c => c.id === activeClientId);

  const updateGoals = (clientId, newGoals) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        return { ...c, goals: newGoals };
      }
      return c;
    }));
  };

  const updateMetrics = (clientId, metricId, currentVal, changeVal) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const updatedMetrics = c.metrics.map(m => {
          if (m.id === metricId) {
            return {
              ...m,
              current: parseFloat(currentVal) || 0,
              change: parseFloat(changeVal) || 0
            };
          }
          return m;
        });

        // Also append to history for charting if we update weight
        let updatedHistory = [...(c.metricsHistory || [])];
        if (metricId === 'weight') {
          const lastH = updatedHistory[updatedHistory.length - 1];
          const todayLabel = new Date().toLocaleDateString('en-US', { month: 'short' });
          if (lastH && lastH.date === todayLabel) {
            updatedHistory[updatedHistory.length - 1] = {
              ...lastH,
              weight: parseFloat(currentVal) || 0
            };
          } else {
            updatedHistory.push({
              date: todayLabel,
              weight: parseFloat(currentVal) || 0,
              chest: updatedMetrics.find(x => x.id === 'chest')?.current || 0,
              waist: updatedMetrics.find(x => x.id === 'waist')?.current || 0
            });
          }
        }

        return { ...c, metrics: updatedMetrics, metricsHistory: updatedHistory };
      }
      return c;
    }));
  };

  const updateFitnessAndEquipment = (clientId, fitnessLevel, equipmentPreference) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          fitnessLevel,
          equipmentPreference
        };
      }
      return c;
    }));
  };

  const toggleExerciseCompletion = (clientId, dayId, exerciseId) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const workout = c.dailyWorkouts[dayId];
        if (!workout) return c;

        const updatedExercises = workout.exercises.map(ex => {
          if (ex.id === exerciseId) {
            return { ...ex, completed: !ex.completed };
          }
          return ex;
        });

        // Calculate if day is complete
        const allDone = updatedExercises.length > 0 && updatedExercises.every(ex => ex.completed);

        const updatedWeeklyProgress = c.weeklyProgress.map(day => {
          if (day.id === dayId) {
            return { ...day, completed: allDone };
          }
          return day;
        });

        return {
          ...c,
          weeklyProgress: updatedWeeklyProgress,
          dailyWorkouts: {
            ...c.dailyWorkouts,
            [dayId]: {
              ...workout,
              exercises: updatedExercises
            }
          }
        };
      }
      return c;
    }));
  };

  const addExercise = (clientId, dayId, exercise) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const workout = c.dailyWorkouts[dayId] || { name: "Custom Workout", duration: "30 minutes", exercises: [] };
        const newExercise = {
          id: 'ex_' + Date.now(),
          completed: false,
          image: exercise.image || '/images/exercise_squat.webp',
          ...exercise
        };

        const updatedExercises = [...workout.exercises, newExercise];
        // recalculate day completion
        const allDone = updatedExercises.length > 0 && updatedExercises.every(ex => ex.completed);
        const updatedWeeklyProgress = c.weeklyProgress.map(day => {
          if (day.id === dayId) {
            return { ...day, completed: allDone };
          }
          return day;
        });

        return {
          ...c,
          weeklyProgress: updatedWeeklyProgress,
          dailyWorkouts: {
            ...c.dailyWorkouts,
            [dayId]: {
              ...workout,
              exercises: updatedExercises
            }
          }
        };
      }
      return c;
    }));
  };

  const updateExercise = (clientId, dayId, exerciseId, updatedFields) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const workout = c.dailyWorkouts[dayId];
        if (!workout) return c;

        const updatedExercises = workout.exercises.map(ex => {
          if (ex.id === exerciseId) {
            return { ...ex, ...updatedFields };
          }
          return ex;
        });

        const allDone = updatedExercises.length > 0 && updatedExercises.every(ex => ex.completed);
        const updatedWeeklyProgress = c.weeklyProgress.map(day => {
          if (day.id === dayId) {
            return { ...day, completed: allDone };
          }
          return day;
        });

        return {
          ...c,
          weeklyProgress: updatedWeeklyProgress,
          dailyWorkouts: {
            ...c.dailyWorkouts,
            [dayId]: {
              ...workout,
              exercises: updatedExercises
            }
          }
        };
      }
      return c;
    }));
  };

  const deleteExercise = (clientId, dayId, exerciseId) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const workout = c.dailyWorkouts[dayId];
        if (!workout) return c;

        const updatedExercises = workout.exercises.filter(ex => ex.id !== exerciseId);
        const allDone = updatedExercises.length > 0 && updatedExercises.every(ex => ex.completed);
        const updatedWeeklyProgress = c.weeklyProgress.map(day => {
          if (day.id === dayId) {
            return { ...day, completed: allDone };
          }
          return day;
        });

        return {
          ...c,
          weeklyProgress: updatedWeeklyProgress,
          dailyWorkouts: {
            ...c.dailyWorkouts,
            [dayId]: {
              ...workout,
              exercises: updatedExercises
            }
          }
        };
      }
      return c;
    }));
  };

  const addNote = (clientId, noteText) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const newNote = {
          id: 'note_' + Date.now(),
          date: 'Today',
          timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          text: noteText
        };
        return {
          ...c,
          notes: [newNote, ...c.notes]
        };
      }
      return c;
    }));
  };

  const updateNextSession = (clientId, date, time) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          nextSession: {
            ...c.nextSession,
            date,
            time
          }
        };
      }
      return c;
    }));
  };

  const updateWeeklyProgressFocus = (clientId, dayId, focusText) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const updatedWeeklyProgress = c.weeklyProgress.map(day => {
          if (day.id === dayId) {
            return { ...day, focus: focusText };
          }
          return day;
        });
        return {
          ...c,
          weeklyProgress: updatedWeeklyProgress
        };
      }
      return c;
    }));
  };

  return (
    <GymStateContext.Provider value={{
      clients,
      activeClientId,
      setActiveClientId,
      activeClient,
      currentRole,
      setCurrentRole,
      currentUser,
      login,
      logout,
      activeTab,
      setActiveTab,
      registerClient,
      updateClientProfile,
      updateGoals,
      updateMetrics,
      updateFitnessAndEquipment,
      toggleExerciseCompletion,
      addExercise,
      updateExercise,
      deleteExercise,
      addNote,
      updateNextSession,
      updateWeeklyProgressFocus
    }}>
      {children}
    </GymStateContext.Provider>
  );
};
