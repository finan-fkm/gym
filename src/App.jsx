import React, { useState } from 'react';
import Navbar from './components/common/Navbar';
import ClientProfileSidebar from './components/admin/ClientProfileSidebar';
import WorkoutTracker from './components/admin/WorkoutTracker';
import NotesHistorySidebar from './components/admin/NotesHistorySidebar';
import ClientDirectory from './components/admin/ClientDirectory';
import ClientWorkoutPlay from './components/client/ClientWorkoutPlay';
import ClientProgressCharts from './components/client/ClientProgressCharts';
import ClientSessions from './components/client/ClientSessions';
import LoginPage from './components/common/LoginPage';
import { useGymState, GymStateProvider } from './context/GymStateContext';
import { Dumbbell, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

function DashboardContainer() {
  const { currentRole, activeClient, currentUser, activeTab } = useGymState();
  const [clientTab, setClientTab] = useState('workout'); // 'workout', 'progress', 'sessions'

  if (!currentUser) {
    return <LoginPage />;
  }

  if (!activeClient) {
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
                src={activeClient.photo}
                alt={activeClient.name}
                className="w-12 h-12 rounded-2xl object-cover border border-gray-100 shadow-sm"
              />
              <div>
                <h4 className="text-[10px] text-gray-400 font-extrabold uppercase">Welcome back</h4>
                <h3 className="text-base font-extrabold text-gray-800 leading-tight">{activeClient.name}</h3>
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
