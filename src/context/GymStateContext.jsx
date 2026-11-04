import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initialClients } from '../mockData';
import { 
  normalizeExercise, 
  normalizeClientWorkouts, 
  compareSessions 
} from '../utils/workoutUtils';

const GymStateContext = createContext();

export const useGymState = () => {
  const context = useContext(GymStateContext);
  if (!context) {
    throw new Error('useGymState must be used within a GymStateProvider');
  }
  return context;
};

export const GymStateProvider = ({ children }) => {
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const configuredApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  const defaultApiUrl = isLocalhost ? 'http://localhost:5000' : '';
  let rawApiUrl = configuredApiUrl || defaultApiUrl;
  if (!isLocalhost && rawApiUrl.startsWith('http://')) {
    rawApiUrl = rawApiUrl.replace('http://', 'https://');
  }
  const API_URL = rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://')
    ? rawApiUrl
    : (rawApiUrl ? `https://${rawApiUrl}` : '');

  useEffect(() => {
    if (!isLocalhost && !import.meta.env.VITE_API_URL) {
      console.warn(
        '⚠️ [Fit By Shahid] VITE_API_URL is not set in Vercel Environment Variables!\n' +
        'Please add VITE_API_URL pointing to your Render Web Service URL in Vercel Project Settings > Environment Variables, then redeploy.'
      );
    }
  }, [isLocalhost]);

  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [authToken, setAuthToken] = useState(() => {
    return sessionStorage.getItem('gymweb_token') || localStorage.getItem('gymweb_token') || '';
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem('gymweb_user') || localStorage.getItem('gymweb_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentRole, setCurrentRole] = useState(() => {
    const savedUser = sessionStorage.getItem('gymweb_user') || localStorage.getItem('gymweb_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      return u.role;
    }
    return 'admin';
  });

  const [clients, setClients] = useState(() => {
    const saved = localStorage.getItem('gymweb_clients');
    const base = saved ? JSON.parse(saved) : initialClients;
    return Array.isArray(base) ? base.map(normalizeClientWorkouts) : [];
  });

  const [activeClientId, setActiveClientId] = useState(() => {
    const savedUser = localStorage.getItem('gymweb_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      if (u.role === 'client') return u.clientId;
    }
    return initialClients[0]?.id || '';
  });

  const [activeTab, setActiveTab] = useState('home'); // 'home', 'clients', 'attendance', 'billing', 'settings' for admin
  const [adminDashboardStats, setAdminDashboardStats] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [membershipsList, setMembershipsList] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);
  const [trainersList, setTrainersList] = useState([]);
  const [gymSettings, setGymSettings] = useState(null);
  const [clientDashboardData, setClientDashboardData] = useState(null);
  const [clientNotifications, setClientNotifications] = useState([]);
  const [clientAttendanceSummary, setClientAttendanceSummary] = useState(null);

  // Helper to fetch clients list as Admin
  const fetchAdminClients = useCallback(async (token) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const normalizedClients = data.map(normalizeClientWorkouts);
          setClients(normalizedClients);
          setActiveClientId(prev => {
            const exists = normalizedClients.some(c => c.id === prev);
            return exists ? prev : normalizedClients[0].id;
          });
        }
        setIsBackendConnected(true);
      }
    } catch (err) {
      console.warn('Failed to fetch clients from backend:', err);
    }
  }, [API_URL]);

  // Helper to fetch client's own profile as Client
  const fetchClientSelfProfile = useCallback(async (token) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/client/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const normalized = normalizeClientWorkouts(data);
        setClients([normalized]);
        setActiveClientId(normalized.id);
        setIsBackendConnected(true);
      }
    } catch (err) {
      console.warn('Failed to fetch client self profile:', err);
    }
  }, [API_URL]);

  // Session Validation & Restoration on Boot
  useEffect(() => {
    const validateSession = async () => {
      const token = sessionStorage.getItem('gymweb_token') || localStorage.getItem('gymweb_token');
      if (!token) {
        setIsAuthChecking(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setCurrentUser(data.user);
            setCurrentRole(data.user.role);
            setIsBackendConnected(true);

            if (data.user.role === 'admin') {
              await fetchAdminClients(token);
            } else if (data.user.role === 'client') {
              if (data.client) {
                setClients([data.client]);
                setActiveClientId(data.client.id);
              } else {
                await fetchClientSelfProfile(token);
              }
            }
          }
        } else if (res.status === 401 || res.status === 403) {
          // Token is expired or invalid
          console.warn('Stored token is expired or unauthorized. Logging out.');
          localStorage.removeItem('gymweb_token');
          localStorage.removeItem('gymweb_user');
          sessionStorage.removeItem('gymweb_token');
          sessionStorage.removeItem('gymweb_user');
          setAuthToken('');
          setCurrentUser(null);
        }
      } catch (err) {
        console.warn('Backend unavailable during session check:', err);
      } finally {
        setIsAuthChecking(false);
      }
    };

    validateSession();
  }, [API_URL, fetchAdminClients, fetchClientSelfProfile]);

  // Synchronize currentUser with localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('gymweb_user', JSON.stringify(currentUser));
      setCurrentRole(currentUser.role);
      if (currentUser.role === 'client' && currentUser.clientId) {
        setActiveClientId(currentUser.clientId);
      }
    } else {
      localStorage.removeItem('gymweb_user');
    }
  }, [currentUser]);

  // Persist backup of clients to localStorage for offline resilience
  useEffect(() => {
    if (clients && clients.length > 0) {
      localStorage.setItem('gymweb_clients', JSON.stringify(clients));
    }
  }, [clients]);

  // API Sync Helper with Token & Ownership Route Mapping
  const syncClientToBackend = async (client) => {
    const token = localStorage.getItem('gymweb_token') || authToken;
    if (!token) return;

    try {
      if (currentRole === 'client') {
        // Client updates their own record via /api/client/me
        await fetch(`${API_URL}/api/client/me`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(client)
        });
      } else {
        // Admin updates any client record via /api/clients/:id
        await fetch(`${API_URL}/api/clients/${client.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(client)
        });
      }
    } catch (err) {
      console.error('Failed to sync client update to backend:', err);
    }
  };

  // Auth: Universal Login with Dedicated Portal Route Fallback
  const login = async (role, username, password, rememberMe = false) => {
    const rawUser = (username || '').trim();
    const cleanPass = (password || '').trim();

    const targetUrl = role === 'admin' 
      ? `${API_URL}/api/auth/admin/login` 
      : `${API_URL}/api/auth/client/login`;

    try {
      let res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, username: rawUser, password: cleanPass, rememberMe })
      });

      // Fallback to /api/auth/login if specific endpoint returns 404
      if (res.status === 404) {
        res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, username: rawUser, password: cleanPass, rememberMe })
        });
      }

      const data = await res.json();
      if (res.ok && data.success && data.token) {
        if (rememberMe) {
          localStorage.setItem('gymweb_token', data.token);
          localStorage.setItem('gymweb_user', JSON.stringify(data.user));
          sessionStorage.removeItem('gymweb_token');
          sessionStorage.removeItem('gymweb_user');
        } else {
          sessionStorage.setItem('gymweb_token', data.token);
          sessionStorage.setItem('gymweb_user', JSON.stringify(data.user));
          localStorage.removeItem('gymweb_token');
          localStorage.removeItem('gymweb_user');
        }

        setAuthToken(data.token);
        setCurrentUser(data.user);
        setCurrentRole(data.user.role);
        setIsBackendConnected(true);

        if (data.user.role === 'admin') {
          await fetchAdminClients(data.token);
        } else if (data.user.role === 'client') {
          if (data.client) {
            setClients([data.client]);
            setActiveClientId(data.client.id);
          } else {
            await fetchClientSelfProfile(data.token);
          }
        }

        return { success: true };
      }

      return {
        success: false,
        message: data.message || 'Incorrect username or password.'
      };
    } catch (err) {
      console.error('Login error:', err);
      return {
        success: false,
        message: 'Could not connect to authentication server. Please check your connection and try again.'
      };
    }
  };

  const loginAdmin = (username, password, rememberMe = false) => login('admin', username, password, rememberMe);
  const loginClient = (username, password, rememberMe = false) => login('client', username, password, rememberMe);

  // Auth: Logout (Clears all tokens and session data)
  const logout = async () => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (token) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch {
        // Ignore network failure on logout
      }
    }
    localStorage.removeItem('gymweb_token');
    localStorage.removeItem('gymweb_user');
    sessionStorage.removeItem('gymweb_token');
    sessionStorage.removeItem('gymweb_user');
    setAuthToken('');
    setCurrentUser(null);
    setCurrentRole('client');
  };

  // Auth: Change Password
  const changePassword = async (currentPassword, newPassword) => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return { success: false, message: 'Authentication required' };
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      return await res.json();
    } catch (err) {
      console.error('Change password error:', err);
      return { success: false, message: 'Server communication error' };
    }
  };

  // Admin: Fetch Dashboard KPI Stats
  const fetchAdminDashboardStats = async () => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/api/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminDashboardStats(data);
        return data;
      }
    } catch (err) {
      console.warn('Failed to fetch admin dashboard stats:', err);
    }
    return null;
  };

  // Admin: Fetch Attendance Records
  const fetchAttendanceRecords = async (params = {}) => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return [];
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${API_URL}/api/admin/attendance${qs ? '?' + qs : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceRecords(data.attendance || []);
        return data.attendance;
      }
    } catch (err) {
      console.warn('Failed to fetch attendance records:', err);
    }
    return [];
  };

  // Admin: Manually Mark Attendance
  const markAdminAttendance = async ({ clientId, date, sessionName, signature }) => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return { success: false, message: 'Authentication required' };
    try {
      const res = await fetch(`${API_URL}/api/admin/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ clientId, date, sessionName, signature })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchAttendanceRecords();
        return { success: true, record: data.record };
      }
      return { success: false, message: data.message || 'Failed to mark attendance' };
    } catch (err) {
      console.error('Error marking admin attendance:', err);
      return { success: false, message: 'Server communication error' };
    }
  };

  // Admin: Membership Plans
  const fetchMembershipPlans = async () => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return [];
    try {
      const res = await fetch(`${API_URL}/api/admin/membership-plans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMembershipPlans(data.plans || []);
        return data.plans;
      }
    } catch (err) {
      console.warn('Failed to fetch membership plans:', err);
    }
    return [];
  };

  const saveMembershipPlan = async (plan) => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/api/admin/membership-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(plan)
      });
      if (res.ok) {
        const data = await res.json();
        await fetchMembershipPlans();
        return data.plan;
      }
    } catch (err) {
      console.error('Failed to save membership plan:', err);
    }
    return null;
  };

  // Admin: Memberships
  const fetchMemberships = async (params = {}) => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return [];
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${API_URL}/api/admin/memberships${qs ? '?' + qs : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMembershipsList(data.memberships || []);
        return data.memberships;
      }
    } catch (err) {
      console.warn('Failed to fetch memberships:', err);
    }
    return [];
  };

  const assignMembership = async (payload) => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/api/admin/memberships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        await fetchMemberships();
        await fetchAdminClients(token);
        return data.membership;
      }
    } catch (err) {
      console.error('Failed to assign membership:', err);
    }
    return null;
  };

  const renewMembership = async (membershipId, extensionMonths = 1) => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/api/admin/memberships/${membershipId}/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ extensionMonths })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchMemberships();
        await fetchAdminClients(token);
        return data.membership;
      }
    } catch (err) {
      console.error('Failed to renew membership:', err);
    }
    return null;
  };

  // Admin: Payments
  const fetchPayments = async (params = {}) => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return [];
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${API_URL}/api/admin/payments${qs ? '?' + qs : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPaymentsList(data.payments || []);
        return data.payments;
      }
    } catch (err) {
      console.warn('Failed to fetch payments:', err);
    }
    return [];
  };

  const recordPayment = async (payload) => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/api/admin/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        await fetchPayments();
        await fetchAdminDashboardStats();
        return data.payment;
      }
    } catch (err) {
      console.error('Failed to record payment:', err);
    }
    return null;
  };

  // Admin: Reset Client Password
  const resetClientPassword = async (clientId, newPassword = 'password') => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return { success: false, message: 'Authentication required' };
    try {
      const res = await fetch(`${API_URL}/api/admin/clients/${clientId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });
      return await res.json();
    } catch (err) {
      console.error('Failed to reset client password:', err);
      return { success: false, message: 'Server communication error' };
    }
  };

  // Admin: Trainers
  const fetchTrainers = async () => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return [];
    try {
      const res = await fetch(`${API_URL}/api/admin/trainers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTrainersList(data.trainers || []);
        return data.trainers;
      }
    } catch (err) {
      console.warn('Failed to fetch trainers:', err);
    }
    return [];
  };

  const saveTrainer = async (trainer) => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/api/admin/trainers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(trainer)
      });
      if (res.ok) {
        const data = await res.json();
        await fetchTrainers();
        return data.trainer;
      }
    } catch (err) {
      console.error('Failed to save trainer:', err);
    }
    return null;
  };

  // Admin: Gym Settings
  const fetchGymSettings = async () => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/api/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGymSettings(data.settings);
        return data.settings;
      }
    } catch (err) {
      console.warn('Failed to fetch settings:', err);
    }
    return null;
  };

  const updateGymSettings = async (settings) => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        const data = await res.json();
        setGymSettings(data.settings);
        return data.settings;
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
    return null;
  };

  // Client: Fetch Dashboard Data
  const fetchClientDashboard = async () => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/api/client/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClientDashboardData(data);
        return data;
      }
    } catch (err) {
      console.warn('Failed to fetch client dashboard:', err);
    }
    return null;
  };

  // Client: Check-in to Gym
  const clientCheckIn = async (signature, sessionName) => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return { success: false, message: 'Authentication required' };
    try {
      const res = await fetch(`${API_URL}/api/client/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ signature, sessionName })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchClientAttendance();
        return { success: true, record: data.record };
      }
      return { success: false, message: data.message || 'Failed to check in.' };
    } catch (err) {
      console.error('Client check-in error:', err);
      return { success: false, message: 'Server communication error' };
    }
  };

  // Client: Fetch Attendance Summary
  const fetchClientAttendance = async () => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/api/client/attendance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClientAttendanceSummary(data.summary);
        return data;
      }
    } catch (err) {
      console.warn('Failed to fetch client attendance:', err);
    }
    return null;
  };

  // Client: Notifications
  const fetchClientNotifications = async () => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return [];
    try {
      const res = await fetch(`${API_URL}/api/client/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClientNotifications(data.notifications || []);
        return data.notifications;
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
    return [];
  };

  const markNotificationRead = async (id) => {
    const token = localStorage.getItem('gymweb_token') || sessionStorage.getItem('gymweb_token') || authToken;
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/client/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setClientNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  };

  // Auth: Forgot Password (Request Token)
  const forgotPassword = async (identifier) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });
      return await res.json();
    } catch (err) {
      console.error('Forgot password error:', err);
      return {
        success: false,
        message: 'Could not connect to authentication server. Please try again.'
      };
    }
  };

  // Auth: Reset Password (Submit Token & New Password)
  const resetPassword = async (token, newPassword) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      return await res.json();
    } catch (err) {
      console.error('Reset password error:', err);
      return {
        success: false,
        message: 'Could not connect to authentication server. Please try again.'
      };
    }
  };

  // Auth: Verify Client Username (Step 1 of Registration)
  const verifyClientUsername = async (username) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('Backend username verification error:', err);
      return {
        success: false,
        message: 'Unable to reach the server to verify username. Please try again.'
      };
    }
  };

  // Auth: Register Client Password (Step 2 of Registration)
  const registerClientPassword = async (username, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/register-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();
      if (res.ok && data.success && data.token) {
        localStorage.setItem('gymweb_token', data.token);
        localStorage.setItem('gymweb_user', JSON.stringify(data.user));
        setAuthToken(data.token);
        setCurrentUser(data.user);
        setCurrentRole('client');
        setIsBackendConnected(true);

        if (data.client) {
          setClients([data.client]);
          setActiveClientId(data.client.id);
        }

        return { success: true };
      }

      return {
        success: false,
        message: data.message || 'Failed to register password.'
      };
    } catch (err) {
      console.error('Password registration error:', err);
      return {
        success: false,
        message: 'Network error during registration. Please try again.'
      };
    }
  };

  // Client Management: Register New Client (Admin Only)
  const registerClient = async (clientData) => {
    const token = localStorage.getItem('gymweb_token') || authToken;
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
      location: clientData.location || "Los Angeles, CA",
      clientSince: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }),
      height: clientData.height || "5'9\"",
      photo: "/images/therese.webp",
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
    setActiveTab('home');

    if (token) {
      try {
        await fetch(`${API_URL}/api/clients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newClient)
        });
      } catch (err) {
        console.error('Failed to create client on backend:', err);
      }
    }
  };

  // Client Management: Delete Client (Admin Only)
  const deleteClientProfile = async (clientId) => {
    const token = localStorage.getItem('gymweb_token') || authToken;
    setClients(prev => prev.filter(c => c.id !== clientId));

    if (activeClientId === clientId) {
      const remaining = clients.filter(c => c.id !== clientId);
      if (remaining.length > 0) {
        setActiveClientId(remaining[0].id);
      }
    }

    if (token) {
      try {
        await fetch(`${API_URL}/api/clients/${clientId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error('Failed to delete client on backend:', err);
      }
    }
  };

  // Client Management: Toggle Status (Active / Inactive)
  const updateClientStatus = (clientId, newStatus) => {
    let updatedClient = null;
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        updatedClient = { ...c, status: newStatus };
        return updatedClient;
      }
      return c;
    }));
    if (updatedClient) syncClientToBackend(updatedClient);
  };

  // Update Client Profile (Demographics)
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

  const activeClient = clients.find(c => c.id === activeClientId) || clients[0] || null;

  // Fitness Program Methods
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
        const norm = normalizeClientWorkouts(c);
        const workout = norm.dailyWorkouts[dayId];
        if (!workout) return c;

        const updatedExercises = workout.exercises.map(ex => {
          if (ex.id === exerciseId) {
            const nextCompleted = !ex.completed;
            const nextStatus = nextCompleted ? 'completed' : 'not_started';
            const updatedSets = (ex.setRecords || []).map(s => ({
              ...s,
              status: nextCompleted ? 'completed' : 'pending',
              actualReps: nextCompleted ? (s.actualReps || s.targetReps) : null,
              weight: nextCompleted ? (s.weight || (ex.isBodyweight ? null : ex.suggestedWeight)) : null,
              completedAt: nextCompleted ? (s.completedAt || new Date().toISOString()) : null
            }));

            return {
              ...ex,
              completed: nextCompleted,
              status: nextStatus,
              skipReason: nextCompleted ? '' : ex.skipReason,
              setRecords: updatedSets
            };
          }
          return ex;
        });

        const allDone = updatedExercises.length > 0 && updatedExercises.every(ex => ex.completed);

        const updatedWeeklyProgress = norm.weeklyProgress.map(day => {
          if (day.id === dayId) {
            return { ...day, completed: allDone };
          }
          return day;
        });

        updatedClient = {
          ...norm,
          weeklyProgress: updatedWeeklyProgress,
          dailyWorkouts: {
            ...norm.dailyWorkouts,
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

  const updateSetRecord = async (clientId, dayId, exerciseId, setNumber, updates) => {
    let updatedClient = null;
    let targetExercise = null;

    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const norm = normalizeClientWorkouts(c);
        const workout = norm.dailyWorkouts[dayId];
        if (!workout) return c;

        const num = parseInt(setNumber, 10);
        const updatedExercises = workout.exercises.map(ex => {
          if (ex.id === exerciseId) {
            const updatedSets = (ex.setRecords || []).map(s => {
              if (s.setNumber === num) {
                const nextStatus = updates.status !== undefined ? updates.status : s.status;
                const nextActualReps = updates.actualReps !== undefined
                  ? (updates.actualReps !== '' && updates.actualReps !== null ? parseInt(updates.actualReps, 10) : null)
                  : s.actualReps;
                const nextWeight = updates.weight !== undefined
                  ? (updates.weight !== '' && updates.weight !== null ? parseFloat(updates.weight) : null)
                  : s.weight;
                const nextCompletedAt = nextStatus === 'completed'
                  ? (s.completedAt || new Date().toISOString())
                  : (nextStatus === 'pending' ? null : (s.completedAt || new Date().toISOString()));

                return {
                  ...s,
                  status: nextStatus,
                  actualReps: nextActualReps,
                  weight: nextWeight,
                  completedAt: nextCompletedAt
                };
              }
              return s;
            });

            const completedCount = updatedSets.filter(s => s.status === 'completed').length;
            const skippedCount = updatedSets.filter(s => s.status === 'skipped').length;
            const totalSets = updatedSets.length;

            let exStatus = 'not_started';
            if (completedCount + skippedCount === totalSets && totalSets > 0) {
              exStatus = completedCount > 0 ? 'completed' : 'skipped';
            } else if (completedCount > 0 || skippedCount > 0) {
              exStatus = 'in_progress';
            }

            const isDone = exStatus === 'completed';
            targetExercise = {
              ...ex,
              status: exStatus,
              completed: isDone,
              setRecords: updatedSets
            };
            return targetExercise;
          }
          return ex;
        });

        const allDone = updatedExercises.length > 0 && updatedExercises.every(ex => ex.completed || ex.status === 'completed');
        const updatedWeeklyProgress = norm.weeklyProgress.map(day => {
          if (day.id === dayId) {
            return { ...day, completed: allDone };
          }
          return day;
        });

        updatedClient = {
          ...norm,
          weeklyProgress: updatedWeeklyProgress,
          dailyWorkouts: {
            ...norm.dailyWorkouts,
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

    const token = localStorage.getItem('gymweb_token') || authToken;
    if (token) {
      try {
        await fetch(`${API_URL}/api/workouts/set-progress`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            clientId,
            dayKey: dayId,
            exerciseId,
            setNumber,
            actualReps: updates.actualReps,
            weight: updates.weight,
            status: updates.status
          })
        });
      } catch (err) {
        console.warn('Failed to sync set progress to backend endpoint:', err);
        if (updatedClient) syncClientToBackend(updatedClient);
      }
    } else if (updatedClient) {
      syncClientToBackend(updatedClient);
    }

    return { client: updatedClient, exercise: targetExercise };
  };

  const skipSet = (clientId, dayId, exerciseId, setNumber) => {
    return updateSetRecord(clientId, dayId, exerciseId, setNumber, { status: 'skipped' });
  };

  const skipExercise = async (clientId, dayId, exerciseId, reason = '') => {
    let updatedClient = null;
    let targetExercise = null;

    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const norm = normalizeClientWorkouts(c);
        const workout = norm.dailyWorkouts[dayId];
        if (!workout) return c;

        const updatedExercises = workout.exercises.map(ex => {
          if (ex.id === exerciseId) {
            const updatedSets = (ex.setRecords || []).map(s => {
              if (s.status === 'pending') {
                return { ...s, status: 'skipped', completedAt: new Date().toISOString() };
              }
              return s;
            });
            targetExercise = {
              ...ex,
              status: 'skipped',
              completed: false,
              skipReason: reason || 'Skipped by client',
              setRecords: updatedSets
            };
            return targetExercise;
          }
          return ex;
        });

        const allDoneOrSkipped = updatedExercises.length > 0 && updatedExercises.every(ex => ex.completed || ex.status === 'completed' || ex.status === 'skipped');
        const updatedWeeklyProgress = norm.weeklyProgress.map(day => {
          if (day.id === dayId) {
            return { ...day, completed: allDoneOrSkipped };
          }
          return day;
        });

        updatedClient = {
          ...norm,
          weeklyProgress: updatedWeeklyProgress,
          dailyWorkouts: {
            ...norm.dailyWorkouts,
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

    const token = localStorage.getItem('gymweb_token') || authToken;
    if (token) {
      try {
        await fetch(`${API_URL}/api/workouts/skip-exercise`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ clientId, dayKey: dayId, exerciseId, reason })
        });
      } catch (err) {
        console.warn('Failed to sync exercise skip to backend endpoint:', err);
        if (updatedClient) syncClientToBackend(updatedClient);
      }
    } else if (updatedClient) {
      syncClientToBackend(updatedClient);
    }

    return { client: updatedClient, exercise: targetExercise };
  };

  const saveWorkoutSession = async (sessionData) => {
    const token = localStorage.getItem('gymweb_token') || authToken;
    const targetCId = sessionData.clientId || activeClientId;
    const newSession = {
      id: sessionData.id || `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      clientId: targetCId,
      workoutId: sessionData.workoutId || `${targetCId}_${sessionData.dayKey || 'workout'}`,
      dayKey: sessionData.dayKey || 'thu',
      workoutName: sessionData.workoutName || 'Workout Session',
      durationSeconds: sessionData.durationSeconds || 0,
      startedAt: sessionData.startedAt || new Date(Date.now() - (sessionData.durationSeconds || 1800) * 1000).toISOString(),
      completedAt: sessionData.completedAt || new Date().toISOString(),
      status: sessionData.status || 'completed',
      summary: sessionData.summary || {},
      setRecords: sessionData.setRecords || []
    };

    setClients(prev => prev.map(c => {
      if (c.id === targetCId) {
        const existingSessions = Array.isArray(c.workoutSessions) ? c.workoutSessions : [];
        return {
          ...c,
          workoutSessions: [newSession, ...existingSessions.filter(s => s.id !== newSession.id)]
        };
      }
      return c;
    }));

    if (token) {
      try {
        const res = await fetch(`${API_URL}/api/workouts/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newSession)
        });
        if (res.ok) {
          const data = await res.json();
          return data.session || newSession;
        }
      } catch (err) {
        console.error('Failed to save workout session to backend:', err);
      }
    }
    return newSession;
  };

  const fetchWorkoutSessions = async (clientId) => {
    const token = localStorage.getItem('gymweb_token') || authToken;
    if (!token || !clientId) return [];
    try {
      const res = await fetch(`${API_URL}/api/workouts/sessions/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.sessions)) {
          setClients(prev => prev.map(c => {
            if (c.id === clientId) {
              return { ...c, workoutSessions: data.sessions };
            }
            return c;
          }));
          return data.sessions;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch workout sessions from backend:', err);
    }
    const current = clients.find(c => c.id === clientId);
    return current?.workoutSessions || [];
  };

  const fetchProgressComparison = async (clientId) => {
    const token = localStorage.getItem('gymweb_token') || authToken;
    if (!token || !clientId) return null;
    try {
      const res = await fetch(`${API_URL}/api/workouts/progress-comparison/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (err) {
      console.warn('Failed to fetch progress comparison from backend:', err);
    }
    const current = clients.find(c => c.id === clientId);
    const sessions = current?.workoutSessions || [];
    return compareSessions(sessions[0], sessions[1]);
  };

  const addExercise = (clientId, dayId, exercise) => {
    let updatedClient = null;
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const norm = normalizeClientWorkouts(c);
        const workout = norm.dailyWorkouts[dayId] || { name: "Custom Workout", duration: "30 minutes", exercises: [] };
        const rawExercise = {
          id: 'ex_' + Date.now(),
          completed: false,
          image: exercise.image || '/images/exercise_squat.webp',
          ...exercise
        };
        const newExercise = normalizeExercise(rawExercise);

        const updatedExercises = [...workout.exercises, newExercise];
        const allDone = updatedExercises.length > 0 && updatedExercises.every(ex => ex.completed);
        const updatedWeeklyProgress = norm.weeklyProgress.map(day => {
          if (day.id === dayId) {
            return { ...day, completed: allDone };
          }
          return day;
        });

        updatedClient = {
          ...norm,
          weeklyProgress: updatedWeeklyProgress,
          dailyWorkouts: {
            ...norm.dailyWorkouts,
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
        const norm = normalizeClientWorkouts(c);
        const workout = norm.dailyWorkouts[dayId];
        if (!workout) return c;

        const updatedExercises = workout.exercises.map(ex => {
          if (ex.id === exerciseId) {
            const merged = { ...ex, ...updatedFields };
            // If sets count changed, re-normalize
            if (updatedFields.sets !== undefined || updatedFields.targetReps !== undefined || updatedFields.suggestedWeight !== undefined) {
              return normalizeExercise(merged);
            }
            return merged;
          }
          return ex;
        });

        const allDone = updatedExercises.length > 0 && updatedExercises.every(ex => ex.completed);
        const updatedWeeklyProgress = norm.weeklyProgress.map(day => {
          if (day.id === dayId) {
            return { ...day, completed: allDone };
          }
          return day;
        });

        updatedClient = {
          ...norm,
          weeklyProgress: updatedWeeklyProgress,
          dailyWorkouts: {
            ...norm.dailyWorkouts,
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
        const norm = normalizeClientWorkouts(c);
        const workout = norm.dailyWorkouts[dayId];
        if (!workout) return c;

        const updatedExercises = workout.exercises.filter(ex => ex.id !== exerciseId);
        const allDone = updatedExercises.length > 0 && updatedExercises.every(ex => ex.completed);
        const updatedWeeklyProgress = norm.weeklyProgress.map(day => {
          if (day.id === dayId) {
            return { ...day, completed: allDone };
          }
          return day;
        });

        updatedClient = {
          ...norm,
          weeklyProgress: updatedWeeklyProgress,
          dailyWorkouts: {
            ...norm.dailyWorkouts,
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

  const updateWorkoutMeta = (clientId, dayId, name, duration) => {
    let updatedClient = null;
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const existingWorkout = c.dailyWorkouts[dayId] || { exercises: [] };
        const updatedDailyWorkouts = {
          ...c.dailyWorkouts,
          [dayId]: {
            ...existingWorkout,
            name: name || existingWorkout.name || "Custom Workout",
            duration: duration || existingWorkout.duration || "30 minutes"
          }
        };
        updatedClient = {
          ...c,
          dailyWorkouts: updatedDailyWorkouts
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

  const recordClientAttendance = async (clientId, date, signature) => {
    const token = localStorage.getItem('gymweb_token') || authToken;
    const client = clients.find(c => c.id === clientId);
    const clientName = client ? client.name : 'Client';
    const fallbackSig = clientName.toUpperCase().replace(/\s+/g, '_');

    const newSignin = {
      id: 's_' + Date.now(),
      date: date || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      signature: signature || fallbackSig
    };

    let updatedClient = null;
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        updatedClient = {
          ...c,
          signinHistory: [newSignin, ...(c.signinHistory || [])]
        };
        return updatedClient;
      }
      return c;
    }));

    if (token) {
      try {
        await fetch(`${API_URL}/api/clients/${clientId}/attendance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ date: newSignin.date, signature: newSignin.signature })
        });
      } catch (err) {
        console.error('Failed to sync attendance to backend:', err);
      }
    }
    return newSignin;
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
      isAuthChecking,
      isBackendConnected,
      login,
      loginAdmin,
      loginClient,
      logout,
      changePassword,
      activeTab,
      setActiveTab,
      adminDashboardStats,
      fetchAdminDashboardStats,
      attendanceRecords,
      fetchAttendanceRecords,
      markAdminAttendance,
      membershipPlans,
      fetchMembershipPlans,
      saveMembershipPlan,
      membershipsList,
      fetchMemberships,
      assignMembership,
      renewMembership,
      paymentsList,
      fetchPayments,
      recordPayment,
      trainersList,
      fetchTrainers,
      saveTrainer,
      gymSettings,
      fetchGymSettings,
      updateGymSettings,
      resetClientPassword,
      clientDashboardData,
      fetchClientDashboard,
      clientAttendanceSummary,
      fetchClientAttendance,
      clientCheckIn,
      clientNotifications,
      fetchClientNotifications,
      markNotificationRead,
      registerClient,
      deleteClientProfile,
      updateClientStatus,
      updateClientProfile,
      updateWorkoutMeta,
      updateGoals,
      updateMetrics,
      updateFitnessAndEquipment,
      toggleExerciseCompletion,
      updateSetRecord,
      skipSet,
      skipExercise,
      saveWorkoutSession,
      fetchWorkoutSessions,
      fetchProgressComparison,
      addExercise,
      updateExercise,
      deleteExercise,
      addNote,
      updateNextSession,
      updateWeeklyProgressFocus,
      recordClientAttendance,
      verifyClientUsername,
      registerClientPassword,
      forgotPassword,
      resetPassword
    }}>
      {children}
    </GymStateContext.Provider>
  );
};
