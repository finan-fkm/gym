import React, { useState } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { Search, UserPlus, Shield, User, MapPin, Scale, ChevronRight, MessageSquare, Plus, Check, X } from 'lucide-react';

export default function ClientDirectory() {
  const { clients, registerClient, setActiveClientId, setActiveTab } = useGymState();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Registration Form States
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('');
  const [height, setHeight] = useState("5'8\"");
  const [weight, setWeight] = useState("150");
  const [fitnessLevel, setFitnessLevel] = useState('Moderate');
  const [equipmentPreference, setEquipmentPreference] = useState('Free Weights, Bodyweight');
  const [goalsString, setGoalsString] = useState('');

  // Filtering
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) return;

    const goals = goalsString
      .split(',')
      .map(g => g.trim())
      .filter(g => g.length > 0);

    registerClient({
      name: name.trim(),
      username: username.trim(),
      location: location.trim() || "Los Angeles, CA",
      height,
      weight,
      fitnessLevel,
      equipmentPreference,
      goals
    });

    // Clear form
    setName('');
    setUsername('');
    setLocation('');
    setHeight("5'8\"");
    setWeight("150");
    setFitnessLevel('Moderate');
    setEquipmentPreference('Free Weights, Bodyweight');
    setGoalsString('');
    setIsRegisterOpen(false);
  };

  const calculateCompletionStats = (client) => {
    const days = client.weeklyProgress || [];
    const completedDays = days.filter(d => d.completed).length;
    const totalDays = days.length;
    const percentage = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
    return { completedDays, totalDays, percentage };
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Directory Title Banner */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 leading-tight">Registered Clients Directory</h2>
          <p className="text-xs text-gray-400 font-semibold mt-1">
            Viewing {filteredClients.length} of {clients.length} active client profiles.
          </p>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          className="flex items-center gap-1.5 px-6 py-3 rounded-2xl text-white font-extrabold text-xs btn-gradient-teal shadow-md hover:opacity-95 transition-all self-stretch md:self-auto justify-center"
        >
          <UserPlus size={14} />
          Register New Client
        </button>
      </div>

      {/* Search Filter Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by client name, username, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-3.5 text-xs outline-none focus:border-[#00af87] text-gray-700 shadow-sm font-semibold transition-all"
        />
      </div>

      {/* Grid of Client Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => {
          const stats = calculateCompletionStats(client);
          return (
            <div
              key={client.id}
              className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100 hover:shadow-premium-lg transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Client Info Header */}
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={client.photo}
                    alt={client.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-gray-50 shadow-sm group-hover:scale-105 transition-transform duration-300"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 tracking-wide leading-tight group-hover:text-[#00af87] transition-colors">{client.name}</h3>
                    <p className="text-[10px] text-[#00af87] font-bold mt-0.5">{client.username}</p>
                    <p className="text-[9px] text-gray-400 font-semibold mt-0.5 flex items-center gap-0.5">
                      <MapPin size={8} /> {client.location}
                    </p>
                  </div>
                </div>

                {/* Goals Preview */}
                <div className="mb-4">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5">Active Goals</span>
                  {client.goals.length === 0 ? (
                    <span className="text-[10px] text-gray-400 italic">No goals assigned yet.</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {client.goals.slice(0, 2).map((goal, idx) => (
                        <div key={idx} className="text-[10px] text-gray-600 font-semibold truncate leading-tight flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-teal-400 shrink-0"></span>
                          {goal}
                        </div>
                      ))}
                      {client.goals.length > 2 && (
                        <span className="text-[9px] text-gray-400 font-bold ml-2">
                          + {client.goals.length - 2} more goals
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Current Stats */}
                <div className="grid grid-cols-2 gap-2 mb-5">
                  <div className="bg-gray-50/70 p-2 rounded-xl text-center">
                    <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">Current Weight</span>
                    <span className="text-[10px] text-gray-700 font-extrabold flex items-center justify-center gap-1">
                      <Scale size={10} className="text-gray-400" />
                      {client.metrics.find(m => m.id === 'weight')?.current} lbs
                    </span>
                  </div>

                  <div className="bg-gray-50/70 p-2 rounded-xl text-center">
                    <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">Weight Delta</span>
                    <span className={`text-[10px] font-extrabold ${
                      (client.metrics.find(m => m.id === 'weight')?.change || 0) < 0 ? 'text-[#ff9f29]' : 'text-[#00af87]'
                    }`}>
                      {client.metrics.find(m => m.id === 'weight')?.change > 0 ? `+` : ''}
                      {client.metrics.find(m => m.id === 'weight')?.change} lbs
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Slider & Actions */}
              <div>
                {/* Weekly completion bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[9px] font-extrabold uppercase mb-1">
                    <span className="text-gray-400">Weekly Progress</span>
                    <span className="text-[#00af87]">{stats.completedDays} / {stats.totalDays} Days</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00af87] rounded-full transition-all duration-500"
                      style={{ width: `${stats.percentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveClientId(client.id);
                      setActiveTab('home');
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-100 text-xs font-bold text-gray-600 hover:border-[#00af87] hover:text-[#00af87] hover:bg-teal-50/10 transition-all flex items-center justify-center gap-1 shadow-sm"
                  >
                    View Profile
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Client Registration Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative border border-gray-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-gray-800 tracking-wide flex items-center gap-2">
                <UserPlus size={18} className="text-[#00af87]" /> Register New Client Profile
              </h3>
              <button onClick={() => setIsRegisterOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRegisterSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Client Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Client Username</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. @alexsmith"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. San Francisco, CA"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Starting Weight (lbs)</label>
                  <input
                    type="number"
                    required
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Height</label>
                  <input
                    type="text"
                    required
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Fitness Level</label>
                  <select
                    value={fitnessLevel}
                    onChange={(e) => setFitnessLevel(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#00af87] text-gray-700 font-medium cursor-pointer"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Equipment Preference</label>
                <input
                  type="text"
                  placeholder="e.g. Free Weights, Barbells, Cable Machines"
                  value={equipmentPreference}
                  onChange={(e) => setEquipmentPreference(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#00af87] text-gray-800 font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block mb-1.5">Client Goals (Comma-separated)</label>
                <textarea
                  placeholder="e.g. Lose 10lbs, Increase Squat Strength, Run 5k in under 25 mins"
                  value={goalsString}
                  onChange={(e) => setGoalsString(e.target.value)}
                  rows={3}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-[#00af87] text-gray-700 resize-none font-medium"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-white text-xs font-bold btn-gradient-teal flex items-center gap-1.5 shadow-md"
                >
                  <Check size={14} />
                  Register Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
