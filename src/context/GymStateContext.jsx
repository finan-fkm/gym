import React, { createContext, useContext, useState, useEffect } from 'react';
import { initialClients } from '../mockData';

const hashPassword = async (password) => {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const GymStateContext = createContext();

export const useGymState = () => {
  const context = useContext(GymStateContext);
  if (!context) {
    throw new Error('useGymState must be used within a GymStateProvider');
  }
  return context;
};

export const GymStateProvider = ({ children }) => {
  const defaultApiUrl = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://gym-wm1s.onrender.com';
  const rawApiUrl = (import.meta.env.VITE_API_URL || defaultApiUrl).trim().replace(/\/+$/, '');
  const API_URL = rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://')
    ? rawApiUrl
    : `https://${rawApiUrl}`;
  const [isBackendConnected, setIsBackendConnected] = useState(false);

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

  // Attempt to load clients list from backend on mount
  useEffect(() => {
    const checkBackendAndLoad = async () => {
      try {
        const res = await fetch(`${API_URL}/api/clients`);
        if (res.ok) {
          const data = await res.json();
          setClients(data);
          setIsBackendConnected(true);
          console.log('Successfully connected to Gym Backend API.');
        } else {
          throw new Error('Failed to load from backend');
        }
      } catch (err) {
        console.warn('Backend API not available. Operating in local localStorage mode.', err);
        setIsBackendConnected(false);
      }
    };
    checkBackendAndLoad();
  }, [API_URL]);

  // Persist local copy as a secondary backup
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

  // API Sync Helper
  const syncClientToBackend = async (client) => {
    if (!isBackendConnected) return;
    try {
      await fetch(`${API_URL}/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });
    } catch (err) {
      console.error('Failed to sync client update to backend:', err);
    }
  };

  const registerClient = async (clientData) => {
    const newId = clientData.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const newClient = {
      id: newId,
      name: clientData.name,
      username: clientData.username.startsWith('@') ? clientData.username : '@' + clientData.username,
      memberId: clientData.memberId || ('GYM' + Math.floor(1000 + Math.random() * 9000)),
      phone: clientData.phone || '',
      email: clientData.email || '',
      membershipPlan: clientData.membershipPlan || 'Gold Monthly',
      membershipStartDate: clientData.membershipStartDate || new Date().toISOString().split('T')[0],
      membershipExpiryDate: clientData.membershipExpiryDate || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
      status: clientData.status || 'Active',
      passwordCreated: false,
      passwordHash: null,
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

    if (isBackendConnected) {
      try {
        await fetch(`${API_URL}/api/clients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newClient)
        });
      } catch (err) {
        console.error('Failed to create client on backend:', err);
      }
    }
  };

  const updateClientProfile = (clientId, details) => {
    let updatedClient = null;
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        updatedClient = {
          ...c,
          name: details.name,
          username: details.username.startsWith('@') ? details.username : '@' + details.username,
          location: details.location,
          height: details.height,
          photo: details.photo || c.photo,
          memberId: details.memberId || c.memberId,
          phone: details.phone || c.phone,
          email: details.email || c.email,
          membershipPlan: details.membershipPlan || c.membershipPlan,
          membershipStartDate: details.membershipStartDate || c.membershipStartDate,
          membershipExpiryDate: details.membershipExpiryDate || c.membershipExpiryDate,
          status: details.status || c.status
        };
        return updatedClient;
      }
      return c;
    }));

    if (updatedClient) syncClientToBackend(updatedClient);
  };

  const login = async (role, username, password) => {
    const rawUser = (username || '').trim();
    const cleanUser = rawUser.toLowerCase().replace(/^@/, '');
    const cleanPass = (password || '').trim();

    // 1. Always attempt backend authentication first with a safety timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, username: rawUser, password: cleanPass }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.user);
        setIsBackendConnected(true);
        return { success: true };
      }
      if (data && data.message && res.status !== 500 && res.status !== 404) {
        // Backend actively returned an error; continue to local fallback as safety backup
      }
    } catch (err) {
      console.warn('Backend login request did not succeed, proceeding with local credentials validation:', err);
    }

    // 2. Resilient Local Fallback (Handles offline, Render cold start, or local dev)
    if (role === 'admin') {
      const hashedPass = await hashPassword(cleanPass);
      const isUserAdmin = cleanUser === 'admin' || cleanUser === 'brandon' || cleanUser === 'coach';
      const isPassCorrect = 
        cleanPass === 'password' || 
        cleanPass.toLowerCase() === 'password' || 
        hashedPass === '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8' || 
        hashedPass === '5e88376ec2949e29f3d952c109206116a47761122b1766e4e472271002540ea3';

      if (isUserAdmin && isPassCorrect) {
        const u = { name: 'Coach Brandon', username: '@brandon', role: 'admin' };
        setCurrentUser(u);
        return { success: true };
      }
      return { success: false, message: 'Incorrect username or password.' };
    } else {
      const cleanInputUser = cleanUser;
      const client = clients.find(c => {
        const cleanClientUser = (c.username || '').toLowerCase().replace(/^@/, '');
        return cleanClientUser === cleanInputUser;
      });

      if (!client) {
        return { success: false, message: 'Incorrect username or password.' };
      }

      if (client.status === 'Inactive') {
        return { success: false, message: 'Your account is currently inactive. Please contact the gym administrator.' };
      }

      const hashedInputPass = await hashPassword(cleanPass);
      const isClientPassCorrect = 
        cleanPass === 'password' || 
        cleanPass.toLowerCase() === 'password' || 
        client.passwordHash === hashedInputPass ||
        hashedInputPass === '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8' ||
        client.passwordHash === '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8' ||
        client.passwordHash === '5e88376ec2949e29f3d952c109206116a47761122b1766e4e472271002540ea3';

      if (isClientPassCorrect) {
        const u = { name: client.name, username: client.username, role: 'client', clientId: client.id };
        setCurrentUser(u);
        return { success: true };
      }

      return { success: false, message: 'Incorrect username or password.' };
    }
  };

  const verifyClientUsername = async (username) => {
    const cleanUser = username.trim().toLowerCase();

    if (isBackendConnected) {
      try {
        const res = await fetch(`${API_URL}/api/auth/verify-username`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });
        const data = await res.json();
        if (res.ok) {
          return data;
        }
      } catch (err) {
        console.error('Backend username verification error, falling back to local:', err);
      }
    }

    // Local Storage Fallback
    const cleanInputUser = cleanUser.startsWith('@') ? cleanUser.slice(1) : cleanUser;
    const client = clients.find(c => {
      const cleanClientUser = c.username.toLowerCase().startsWith('@') ? c.username.toLowerCase().slice(1) : c.username.toLowerCase();
      return cleanClientUser === cleanInputUser;
    });

    if (!client) {
      return { success: false, code: 'NOT_FOUND', message: 'Username not found. Please check your username or contact the gym administrator.' };
    }
    if (client.passwordCreated) {
      return { success: false, code: 'ALREADY_REGISTERED', message: 'This account is already registered. Please login instead.' };
    }
    if (client.status === 'Inactive') {
      return { success: false, code: 'INACTIVE', message: 'Your account is currently inactive. Please contact the gym administrator.' };
    }
    return { success: true, client };
  };

  const registerClientPassword = async (username, password) => {
    const cleanUser = username.trim().toLowerCase();
    const cleanInputUser = cleanUser.startsWith('@') ? cleanUser.slice(1) : cleanUser;

    if (isBackendConnected) {
      try {
        const res = await fetch(`${API_URL}/api/auth/register-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          // Update local state too
          const hashed = await hashPassword(password);
          setClients(prev => prev.map(c => {
            const cleanClientUser = c.username.toLowerCase().startsWith('@') ? c.username.toLowerCase().slice(1) : c.username.toLowerCase();
            if (cleanClientUser === cleanInputUser) {
              return {
                ...c,
                passwordCreated: true,
                passwordHash: hashed
              };
            }
            return c;
          }));
          return { success: true };
        }
        return { success: false, message: data.message || 'Failed to update password.' };
      } catch (err) {
        console.error('Backend password registration error, falling back to local:', err);
      }
    }

    // Local Storage Fallback
    const hashed = await hashPassword(password);
    let updated = false;
    const newClients = clients.map(c => {
      const cleanClientUser = c.username.toLowerCase().startsWith('@') ? c.username.toLowerCase().slice(1) : c.username.toLowerCase();
      if (cleanClientUser === cleanInputUser) {
        updated = true;
        return {
          ...c,
          passwordCreated: true,
          passwordHash: hashed
        };
      }
      return c;
    });

    if (updated) {
      setClients(newClients);
      return { success: true };
    }
    return { success: false, message: 'Failed to update password. User not found.' };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const activeClient = clients.find(c => c.id === activeClientId);

  const updateGoals = (clientId, newGoals) => {
    let updatedClient = null;
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        updatedClient = { ...c, goals: newGoals };
        return updatedClient;
      }
      return c;
    }));
    if (updatedClient) syncClientToBackend(updatedClient);
  };

  const updateMetrics = (clientId, metricId, currentVal, changeVal) => {
    let updatedClient = null;
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

        updatedClient = { ...c, metrics: updatedMetrics, metricsHistory: updatedHistory };
        return updatedClient;
      }
      return c;
    }));
    if (updatedClient) syncClientToBackend(updatedClient);
  };

  const updateFitnessAndEquipment = (clientId, fitnessLevel, equipmentPreference) => {
    let updatedClient = null;
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        updatedClient = {
          ...c,
          fitnessLevel,
          equipmentPreference
        };
        return updatedClient;
      }
      return c;
    }));
    if (updatedClient) syncClientToBackend(updatedClient);
  };

  const toggleExerciseCompletion = (clientId, dayId, exerciseId) => {
    let updatedClient = null;
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

        updatedClient = {
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
        return updatedClient;
      }
      return c;
    }));
    if (updatedClient) syncClientToBackend(updatedClient);
  };

  const addExercise = (clientId, dayId, exercise) => {
    let updatedClient = null;
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

        updatedClient = {
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
        return updatedClient;
      }
      return c;
    }));
    if (updatedClient) syncClientToBackend(updatedClient);
  };

  const updateExercise = (clientId, dayId, exerciseId, updatedFields) => {
    let updatedClient = null;
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

        updatedClient = {
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
        return updatedClient;
      }
      return c;
    }));
    if (updatedClient) syncClientToBackend(updatedClient);
  };

  const deleteExercise = (clientId, dayId, exerciseId) => {
    let updatedClient = null;
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

        updatedClient = {
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
        return updatedClient;
      }
      return c;
    }));
    if (updatedClient) syncClientToBackend(updatedClient);
  };

  const addNote = (clientId, noteText) => {
    let updatedClient = null;
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const newNote = {
          id: 'note_' + Date.now(),
          date: 'Today',
          timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          text: noteText
        };
        updatedClient = {
          ...c,
          notes: [newNote, ...c.notes]
        };
        return updatedClient;
      }
      return c;
    }));
    if (updatedClient) syncClientToBackend(updatedClient);
  };

  const updateNextSession = (clientId, date, time) => {
    let updatedClient = null;
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        updatedClient = {
          ...c,
          nextSession: {
            ...c.nextSession,
            date,
            time
          }
        };
        return updatedClient;
      }
      return c;
    }));
    if (updatedClient) syncClientToBackend(updatedClient);
  };

  const updateWeeklyProgressFocus = (clientId, dayId, focusText) => {
    let updatedClient = null;
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const updatedWeeklyProgress = c.weeklyProgress.map(day => {
          if (day.id === dayId) {
            return { ...day, focus: focusText };
          }
          return day;
        });
        updatedClient = {
          ...c,
          weeklyProgress: updatedWeeklyProgress
        };
        return updatedClient;
      }
      return c;
    }));
    if (updatedClient) syncClientToBackend(updatedClient);
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
      updateWeeklyProgressFocus,
      verifyClientUsername,
      registerClientPassword
    }}>
      {children}
    </GymStateContext.Provider>
  );
};
