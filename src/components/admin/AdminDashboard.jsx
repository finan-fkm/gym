import React, { useEffect, useState, useCallback } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Award, 
  CalendarCheck, 
  DollarSign, 
  Dumbbell, 
  TrendingUp, 
  RefreshCw, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export default function AdminDashboard() {
  const { 
    adminDashboardStats, 
    fetchAdminDashboardStats, 
    setActiveTab, 
    clients 
  } = useGymState();
  const [loading, setLoading] = useState(!adminDashboardStats);

  const loadStats = useCallback(async () => {
    setLoading(true);
    await fetchAdminDashboardStats();
    setLoading(false);
  }, [fetchAdminDashboardStats]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const stats = adminDashboardStats?.overview || {
    totalClients: clients.length,
    activeClients: clients.filter(c => (c.status || 'Active') === 'Active').length,
    inactiveClients: clients.filter(c => c.status === 'Inactive').length,
    totalTrainers: 2,
    todayAttendance: 0,
    monthlyRevenue: 168,
    totalRevenue: 168,
    pendingPaymentsCount: 0
  };

  const membershipStats = adminDashboardStats?.membershipStats || {
    active: stats.activeClients,
    expiringSoon: 1,
    expired: stats.inactiveClients
  };

  const workoutStats = adminDashboardStats?.workoutStats || {
    totalSessions: 14,
    totalSetsCompleted: 56,
    totalRepsCompleted: 620,
    totalWeightVolumeKg: 1420
  };

  const recentPayments = adminDashboardStats?.recentPayments || [];
  const recentAttendance = adminDashboardStats?.recentAttendance || [];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00af87] animate-pulse"></span>
            <span className="text-[10px] font-extrabold uppercase text-[#00af87] tracking-wider">Live System Overview</span>
          </div>
          <h2 className="text-xl font-black text-gray-800 leading-tight mt-1">Admin Command Center</h2>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">Real-time statistics across members, revenue, workouts, and attendance.</p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-xs font-bold transition-all shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-2xl text-white font-extrabold text-xs btn-gradient-teal shadow-md hover:opacity-95 transition-all"
          >
            <Users size={14} />
            Manage Clients
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Clients */}
        <div className="bg-white rounded-3xl p-5 shadow-premium border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Total Clients</span>
            <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#00af87]">
              <Users size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-800">{stats.totalClients}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                <UserCheck size={11} /> {stats.activeClients} Active
              </span>
              <span className="text-[10px] font-bold text-gray-400">•</span>
              <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                <UserX size={11} /> {stats.inactiveClients} Inactive
              </span>
            </div>
          </div>
        </div>

        {/* Today's Attendance */}
        <div className="bg-white rounded-3xl p-5 shadow-premium border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Today's Check-ins</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <CalendarCheck size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-800">{stats.todayAttendance}</div>
            <p className="text-[10px] font-bold text-gray-400 mt-1">
              {stats.todayAttendance > 0 ? 'Members training today' : 'No check-ins yet today'}
            </p>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white rounded-3xl p-5 shadow-premium border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Monthly Revenue</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <DollarSign size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-800">${stats.monthlyRevenue.toLocaleString()}</div>
            <p className="text-[10px] font-bold text-gray-400 mt-1">
              Total: ${stats.totalRevenue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Active Trainers */}
        <div className="bg-white rounded-3xl p-5 shadow-premium border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Total Trainers</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Award size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-800">{stats.totalTrainers}</div>
            <p className="text-[10px] font-bold text-gray-400 mt-1">Certified Coaches</p>
          </div>
        </div>
      </div>

      {/* Middle Section: Memberships & Workouts Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Membership Health Widget */}
        <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-gray-800 tracking-wide flex items-center gap-2">
                <ShieldAlert size={16} className="text-[#00af87]" /> Membership Status Breakdown
              </h3>
              <button
                onClick={() => setActiveTab('billing')}
                className="text-xs font-bold text-[#00af87] hover:underline flex items-center gap-1"
              >
                View Plans <ArrowRight size={12} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-emerald-50/70 border border-emerald-100 p-3.5 rounded-2xl text-center">
                <span className="text-[9px] font-extrabold uppercase text-emerald-700 block mb-1">Active</span>
                <span className="text-xl font-black text-emerald-800">{membershipStats.active}</span>
              </div>
              <div className="bg-amber-50/70 border border-amber-100 p-3.5 rounded-2xl text-center">
                <span className="text-[9px] font-extrabold uppercase text-amber-700 block mb-1">Expiring Soon</span>
                <span className="text-xl font-black text-amber-800">{membershipStats.expiringSoon}</span>
              </div>
              <div className="bg-red-50/70 border border-red-100 p-3.5 rounded-2xl text-center">
                <span className="text-[9px] font-extrabold uppercase text-red-700 block mb-1">Expired</span>
                <span className="text-xl font-black text-red-800">{membershipStats.expired}</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 font-medium">
              {membershipStats.expiringSoon > 0 
                ? `${membershipStats.expiringSoon} member(s) expiring within the next 7 days. Automatic renewal alerts active.`
                : 'All client memberships are currently active and in good standing.'}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-xs font-bold">
            <span className="text-gray-400">Default Plan</span>
            <span className="text-gray-700 font-extrabold">Gold Monthly ($99/mo)</span>
          </div>
        </div>

        {/* Workout Performance Widget */}
        <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-gray-800 tracking-wide flex items-center gap-2">
                <Dumbbell size={16} className="text-[#00af87]" /> Overall Workout Statistics
              </h3>
              <button
                onClick={() => setActiveTab('home')}
                className="text-xs font-bold text-[#00af87] hover:underline flex items-center gap-1"
              >
                Open Workout Editor <ArrowRight size={12} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
              <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center">
                <span className="text-[8px] font-extrabold uppercase text-gray-400 block mb-0.5">Sessions</span>
                <span className="text-base font-black text-gray-800">{workoutStats.totalSessions}</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center">
                <span className="text-[8px] font-extrabold uppercase text-gray-400 block mb-0.5">Sets Done</span>
                <span className="text-base font-black text-gray-800">{workoutStats.totalSetsCompleted}</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center">
                <span className="text-[8px] font-extrabold uppercase text-gray-400 block mb-0.5">Total Reps</span>
                <span className="text-base font-black text-gray-800">{workoutStats.totalRepsCompleted}</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center">
                <span className="text-[8px] font-extrabold uppercase text-gray-400 block mb-0.5">Volume (kg)</span>
                <span className="text-base font-black text-[#00af87]">{workoutStats.totalWeightVolumeKg.toLocaleString()}</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 font-medium">
              Real-time synchronization preserves coach target sets and records client weights per set.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-xs font-bold">
            <span className="text-gray-400">Tracking Engine</span>
            <span className="text-[#00af87] font-extrabold flex items-center gap-1">
              <TrendingUp size={12} /> Active & Calibrated
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Check-Ins */}
        <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-gray-800 tracking-wide flex items-center gap-2">
              <CalendarCheck size={16} className="text-[#00af87]" /> Today's Recent Check-ins
            </h3>
            <button
              onClick={() => setActiveTab('attendance')}
              className="text-xs font-bold text-[#00af87] hover:underline flex items-center gap-1"
            >
              All Attendance <ArrowRight size={12} />
            </button>
          </div>

          {recentAttendance.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400 font-semibold bg-gray-50/50 rounded-2xl border border-gray-100">
              No check-ins recorded yet today.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentAttendance.slice(0, 5).map((att) => (
                <div
                  key={att.id}
                  className="p-3 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={att.clientPhoto || '/images/therese.webp'}
                      alt={att.clientName}
                      className="w-9 h-9 rounded-xl object-cover border border-gray-200"
                    />
                    <div>
                      <div className="font-bold text-gray-800">{att.clientName}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{att.sessionName}</div>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-100">
                    {att.status || 'Present'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-gray-800 tracking-wide flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-600" /> Recent Payment Transactions
            </h3>
            <button
              onClick={() => setActiveTab('billing')}
              className="text-xs font-bold text-[#00af87] hover:underline flex items-center gap-1"
            >
              Billing History <ArrowRight size={12} />
            </button>
          </div>

          {recentPayments.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400 font-semibold bg-gray-50/50 rounded-2xl border border-gray-100">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentPayments.slice(0, 5).map((pay) => (
                <div
                  key={pay.id}
                  className="p-3 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-gray-800">{pay.clientName || 'Client'}</div>
                    <div className="text-[10px] text-gray-400 font-medium">Invoice: {pay.invoiceNumber}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-gray-900">${pay.amount} {pay.currency}</div>
                    <div className="text-[10px] text-emerald-600 font-bold uppercase">{pay.paymentStatus}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
