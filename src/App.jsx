import React, { useState, useEffect } from 'react';
import Navbar from './components/common/Navbar';
import ClientProfileSidebar from './components/admin/ClientProfileSidebar';
import WorkoutTracker from './components/admin/WorkoutTracker';
import NotesHistorySidebar from './components/admin/NotesHistorySidebar';
import ClientDirectory from './components/admin/ClientDirectory';
import ClientWorkoutPlay from './components/client/ClientWorkoutPlay';
import ClientProgressCharts from './components/client/ClientProgressCharts';
import ClientSessions from './components/client/ClientSessions';
import AdminLoginPage from './components/common/AdminLoginPage';
import ClientLoginPage from './components/common/ClientLoginPage';
import ClientRegisterPage from './components/common/ClientRegisterPage';
import { useGymState, GymStateProvider } from './context/GymStateContext';
import { Dumbbell, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

function useRouter() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to) => {
    window.history.pushState({}, '', to);
    setPath(to);
  };

  return { path, navigate };
}

function DashboardContainer() {
  const { currentRole, activeClient, currentUser, activeTab, isAuthChecking, logout } = useGymState();
  const [clientTab, setClientTab] = useState('workout'); // 'workout', 'progress', 'sessions'
  const { path, navigate } = useRouter();

  useEffect(() => {
    if (isAuthChecking) return;

    if (currentUser) {
      if (currentRole === 'admin') {
        if (path !== '/admin/dashboard' && !path.startsWith('/admin')) {
          navigate('/admin/dashboard');
        }
      } else if (currentRole === 'client') {
        if (path.startsWith('/admin')) {
          logout();
          navigate('/login/client');
        } else if (path !== '/client/dashboard' && !path.startsWith('/client')) {
          navigate('/client/dashboard');
        }
      }
    } else {
      // Guest redirects
      if (path !== '/login/admin' && path !== '/login/client' && path !== '/register/client') {
        if (path.startsWith('/admin')) {
          navigate('/login/admin');
        } else {
          navigate('/login/client');
        }
      }
    }
  }, [currentUser, currentRole, path, navigate, logout, isAuthChecking]);

  // Loading state during token validation
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#0d0f12] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#00af87]/20 border-t-[#00af87] rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-gray-400">Connecting to Gym Portal...</p>
        </div>
      </div>
    );
  }

  // Handle unauthenticated routes
  if (!currentUser) {
    if (path === '/login/admin') {
      return <AdminLoginPage onNavigate={navigate} />;
    }
    if (path === '/register/client') {
      return <ClientRegisterPage onNavigate={navigate} />;
    }
    return <ClientLoginPage onNavigate={navigate} />;
  }

  // Handle no clients (Admin view only checks)
  if (currentRole === 'admin' && !activeClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-premium border border-gray-100 flex flex-col items-center gap-3">
          <AlertCircle size={40} className="text-[#ff9f29]" />
          <h3 className="text-lg font-bold text-gray-800">No Clients Found</h3>
          <p className="text-xs text-gray-400">Please seed or reload client profiles to start using the app.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Dashboard Panel */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 transition-all duration-300">
        {currentRole === 'admin' ? (
          activeTab === 'clients' ? (
            /* Trainer View - Clients Directory Grid */
            <ClientDirectory />
          ) : (
            /* Trainer/Admin View - 3 Column Layout */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Client Profile (3/12 cols) */}
              <div className="lg:col-span-3">
                <ClientProfileSidebar />
              </div>

              {/* Middle Column: Daily Workouts & Weekly progress (6/12 cols) */}
              <div className="lg:col-span-6">
                <WorkoutTracker />
              </div>

              {/* Right Column: Progress Notes & History (3/12 cols) */}
              <div className="lg:col-span-3">
                <NotesHistorySidebar />
              </div>
            </div>
          )
        ) : (
          /* Client View - Single Column Mobile-Friendly Layout */
          <div className="max-w-md mx-auto flex flex-col gap-6">
            {/* Top Info Banner for Client */}
            <div className="bg-white rounded-3xl p-5 shadow-premium border border-gray-100 flex items-center gap-4">
              <img
                src={activeClient ? activeClient.photo : "/images/therese.webp"}
                alt={activeClient ? activeClient.name : "Member"}
                className="w-12 h-12 rounded-2xl object-cover border border-gray-100 shadow-sm"
              />
              <div>
                <h4 className="text-[10px] text-gray-400 font-extrabold uppercase">Welcome back</h4>
                <h3 className="text-base font-extrabold text-gray-800 leading-tight">{activeClient ? activeClient.name : "Member"}</h3>
                <p className="text-[10px] text-[#00af87] font-semibold mt-0.5">Trainer: Coach Brandon</p>
              </div>
            </div>

            {/* Tab Bar Selector (Mobile Layout) */}
            <div className="grid grid-cols-3 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 text-center">
              <button
                onClick={() => setClientTab('workout')}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  clientTab === 'workout'
                    ? 'bg-[#00af87]/10 text-[#00af87]'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <Dumbbell size={16} />
                Workout
              </button>
              <button
                onClick={() => setClientTab('progress')}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  clientTab === 'progress'
                    ? 'bg-[#00af87]/10 text-[#00af87]'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <TrendingUp size={16} />
                My Progress
              </button>
              <button
                onClick={() => setClientTab('sessions')}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  clientTab === 'sessions'
                    ? 'bg-[#00af87]/10 text-[#00af87]'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <Calendar size={16} />
                Sessions
              </button>
            </div>

            {/* Render selected Client Panel */}
            <div className="transition-all duration-300">
              {clientTab === 'workout' && <ClientWorkoutPlay />}
              {clientTab === 'progress' && <ClientProgressCharts />}
              {clientTab === 'sessions' && <ClientSessions />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <GymStateProvider>
      <DashboardContainer />
    </GymStateProvider>
  );
}
