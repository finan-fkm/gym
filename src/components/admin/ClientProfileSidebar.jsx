import React, { useState } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { Edit2, Check, X, Plus, Trash2, MessageCircle, CreditCard, ChevronRight } from 'lucide-react';

export default function ClientProfileSidebar() {
  const {
    activeClient,
    updateGoals,
    updateMetrics,
    updateFitnessAndEquipment,
    updateClientProfile
  } = useGymState();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [profileHeight, setProfileHeight] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');

  const handleSaveProfile = () => {
    updateClientProfile(activeClient.id, {
      name: profileName,
      username: profileUsername,
      location: profileLocation,
      height: profileHeight,
      photo: profilePhoto
    });
    setIsEditingProfile(false);
  };

  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [goalsList, setGoalsList] = useState([]);
  const [newGoal, setNewGoal] = useState('');

  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [equipmentPreference, setEquipmentPreference] = useState('');

  const [editingMetricId, setEditingMetricId] = useState(null);
  const [metricCurrent, setMetricCurrent] = useState('');
  const [metricChange, setMetricChange] = useState('');

  const [chatOpen, setChatOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { sender: 'client', text: 'Hi coach, completed my chest workout!' },
    { sender: 'coach', text: 'Awesome job Therese! Focus on deep breathing next time.' }
  ]);

  if (!activeClient) return null;

  // Goals Editing Handlers
  const startEditingGoals = () => {
    setGoalsList([...activeClient.goals]);
    setIsEditingGoals(true);
  };

  const handleSaveGoals = () => {
    updateGoals(activeClient.id, goalsList.filter(g => g.trim() !== ''));
    setIsEditingGoals(false);
  };

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      setGoalsList([...goalsList, newGoal.trim()]);
      setNewGoal('');
    }
  };

  const handleRemoveGoal = (index) => {
    setGoalsList(goalsList.filter((_, i) => i !== index));
  };

  // Preference Handlers
  const startEditingPreferences = () => {
    setFitnessLevel(activeClient.fitnessLevel);
    setEquipmentPreference(activeClient.equipmentPreference);
    setIsEditingPreferences(true);
  };

  const handleSavePreferences = () => {
    updateFitnessAndEquipment(activeClient.id, fitnessLevel, equipmentPreference);
    setIsEditingPreferences(false);
  };

  // Metrics Handlers
  const startEditingMetric = (metric) => {
    setEditingMetricId(metric.id);
    setMetricCurrent(metric.current);
    setMetricChange(metric.change);
  };

  const handleSaveMetric = (metricId) => {
    updateMetrics(activeClient.id, metricId, metricCurrent, metricChange);
    setEditingMetricId(null);
  };

  // Chat/Package Mock Drawer Handlers
  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      setChatHistory([...chatHistory, { sender: 'coach', text: chatMessage.trim() }]);
      setChatMessage('');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Profile Overview Card */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
        {/* Edit Button in corner */}
        <div className="absolute top-4 right-4">
          {!isEditingProfile ? (
            <button
              onClick={() => {
                setProfileName(activeClient.name);
                setProfileUsername(activeClient.username);
                setProfileLocation(activeClient.location);
                setProfileHeight(activeClient.height);
                setProfilePhoto(activeClient.photo);
                setIsEditingProfile(true);
              }}
              className="text-gray-400 hover:text-[#00af87] p-1.5 rounded-lg transition-colors"
              title="Edit Profile Details"
            >
              <Edit2 size={13} />
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={handleSaveProfile} className="text-[#00af87] hover:opacity-85 p-1"><Check size={14} /></button>
              <button onClick={() => setIsEditingProfile(false)} className="text-red-500 hover:opacity-85 p-1"><X size={14} /></button>
            </div>
          )}
        </div>

        {isEditingProfile ? (
          /* Profile Details Edit Form */
          <div className="w-full flex flex-col items-center gap-3 pt-3">
            {/* Image Selector */}
            <div className="relative mb-1">
              <img
                src={profilePhoto}
                alt="Editing profile"
                className="w-24 h-24 rounded-2xl object-cover border-2 border-[#00af87]"
              />
              <select
                value={profilePhoto}
                onChange={(e) => setProfilePhoto(e.target.value)}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-white border border-gray-200 rounded px-1 text-gray-700 outline-none"
              >
                <option value="/images/therese.webp">Therese</option>
                <option value="/images/john.webp">John</option>
              </select>
            </div>

            <div className="w-full text-left space-y-2">
              <div>
                <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wide block">Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none text-gray-800 font-medium"
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wide block">Username</label>
                <input
                  type="text"
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none text-gray-800 font-medium"
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wide block">Location</label>
                <input
                  type="text"
                  value={profileLocation}
                  onChange={(e) => setProfileLocation(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none text-gray-800 font-medium"
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wide block">Height</label>
                <input
                  type="text"
                  value={profileHeight}
                  onChange={(e) => setProfileHeight(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none text-gray-800 font-medium"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Profile Details Standard View */
          <>
            {/* Profile Image & Small Images Stack */}
            <div className="relative mb-4">
              <img
                src={activeClient.photo}
                alt={activeClient.name}
                className="w-28 h-28 rounded-2xl object-cover shadow-md border-4 border-white"
              />
              <div className="flex -space-x-1.5 mt-2 justify-center">
                <img src="/images/therese.webp" className="w-6 h-6 rounded-full border border-white object-cover" />
                <img src="/images/john.webp" className="w-6 h-6 rounded-full border border-white object-cover" />
                <div className="w-6 h-6 rounded-full border border-white bg-teal-50 text-[9px] font-bold text-[#00af87] flex items-center justify-center">
                  2+
                </div>
              </div>
            </div>

            {/* Basic Details */}
            <h3 className="text-xl font-bold text-gray-800 leading-tight">{activeClient.name}</h3>
            <p className="text-xs text-[#00af87] font-semibold mb-1">{activeClient.username}</p>
            <p className="text-xs text-gray-400 font-medium mb-3">{activeClient.location}</p>

            <div className="flex justify-between w-full border-t border-gray-50 pt-3 text-[11px] text-gray-500 font-medium px-2">
              <span>Client est: <b className="text-gray-700">{activeClient.clientSince}</b></span>
              <span>Height: <b className="text-gray-700">{activeClient.height}</b></span>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 w-full gap-2.5 mt-5">
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white font-bold text-xs btn-gradient-orange hover:opacity-90 shadow-sm transition-all"
          >
            <MessageCircle size={14} />
            Message
          </button>
          <button
            onClick={() => setPackageOpen(true)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white font-bold text-xs btn-gradient-teal hover:opacity-90 shadow-sm transition-all"
          >
            <CreditCard size={14} />
            + Add Package
          </button>
        </div>
      </div>

      {/* Goals Card */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-extrabold text-gray-800 tracking-wide flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-[#00af87] rounded-sm"></span>
            Goals
          </h4>
          {!isEditingGoals ? (
            <button
              onClick={startEditingGoals}
              className="text-[11px] font-bold text-gray-400 hover:text-[#00af87] flex items-center gap-1"
            >
              <Edit2 size={10} /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleSaveGoals} className="text-[#00af87] hover:opacity-80"><Check size={14} /></button>
              <button onClick={() => setIsEditingGoals(false)} className="text-red-500 hover:opacity-80"><X size={14} /></button>
            </div>
          )}
        </div>

        {isEditingGoals ? (
          <div className="flex flex-col gap-2">
            {goalsList.map((goal, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => {
                    const temp = [...goalsList];
                    temp[idx] = e.target.value;
                    setGoalsList(temp);
                  }}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-[#00af87]"
                />
                <button onClick={() => handleRemoveGoal(idx)} className="text-gray-400 hover:text-red-500 p-1">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-1 mt-2">
              <input
                type="text"
                placeholder="New goal..."
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none"
              />
              <button onClick={handleAddGoal} className="bg-teal-50 text-[#00af87] hover:bg-[#00af87] hover:text-white p-1 rounded-md transition-colors">
                <Plus size={12} />
              </button>
            </div>
          </div>
        ) : (
          <ol className="flex flex-col gap-2.5">
            {activeClient.goals.map((goal, idx) => (
              <li key={idx} className="text-xs text-gray-600 font-medium leading-relaxed flex gap-2">
                <span className="text-gray-400 font-semibold">{idx + 1}.</span>
                {goal}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Fitness & Equipment Card */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-extrabold text-gray-800 tracking-wide flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-[#00af87] rounded-sm"></span>
            Preferences
          </h4>
          {!isEditingPreferences ? (
            <button
              onClick={startEditingPreferences}
              className="text-[11px] font-bold text-gray-400 hover:text-[#00af87] flex items-center gap-1"
            >
              <Edit2 size={10} /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleSavePreferences} className="text-[#00af87] hover:opacity-80"><Check size={14} /></button>
              <button onClick={() => setIsEditingPreferences(false)} className="text-red-500 hover:opacity-80"><X size={14} /></button>
            </div>
          )}
        </div>

        {isEditingPreferences ? (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1">FITNESS LEVEL</label>
              <select
                value={fitnessLevel}
                onChange={(e) => setFitnessLevel(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5"
              >
                <option value="Beginner">Beginner</option>
                <option value="Moderate">Moderate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1">EQUIPMENT PREFERENCE</label>
              <input
                type="text"
                value={equipmentPreference}
                onChange={(e) => setEquipmentPreference(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Fitness Level</span>
              <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00af87]"></span>
                {activeClient.fitnessLevel}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Equipment Preference</span>
              <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff9f29]"></span>
                {activeClient.equipmentPreference}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Table Card */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-extrabold text-gray-800 tracking-wide flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-[#00af87] rounded-sm"></span>
            Metrics
          </h4>
          <span className="text-[10px] font-bold text-gray-400">View All / Edit</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] text-gray-400 font-bold">
                <th className="pb-2 font-semibold">Body Part</th>
                <th className="pb-2 text-center font-semibold">Current</th>
                <th className="pb-2 text-right font-semibold">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
              {activeClient.metrics.map((metric) => (
                <tr key={metric.id} className="group hover:bg-gray-50/50">
                  <td className="py-2.5 text-gray-500 capitalize">{metric.name}</td>
                  <td className="py-2.5 text-center">
                    {editingMetricId === metric.id ? (
                      <div className="flex items-center justify-center gap-1 max-w-[80px] mx-auto">
                        <input
                          type="number"
                          step="0.01"
                          value={metricCurrent}
                          onChange={(e) => setMetricCurrent(e.target.value)}
                          className="w-12 text-center bg-gray-50 border border-gray-200 rounded px-1 text-xs py-0.5 outline-none"
                        />
                        <button onClick={() => handleSaveMetric(metric.id)} className="text-[#00af87]">
                          <Check size={11} />
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => startEditingMetric(metric)}
                        className="cursor-pointer hover:underline decoration-dotted decoration-[#00af87] underline-offset-4"
                      >
                        {metric.current}
                        <span className="text-[9px] text-gray-400 ml-0.5">{metric.unit}</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    {editingMetricId === metric.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={metricChange}
                        onChange={(e) => setMetricChange(e.target.value)}
                        className="w-10 text-right bg-gray-50 border border-gray-200 rounded px-1 text-xs py-0.5 outline-none"
                      />
                    ) : (
                      <span className={`font-semibold ${metric.change < 0 ? 'text-[#ff9f29]' : metric.change > 0 ? 'text-[#00af87]' : 'text-gray-400'}`}>
                        {metric.change > 0 ? `+${metric.change}` : metric.change}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mock Chat Modal/Drawer */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-sm h-full shadow-2xl flex flex-col p-6 relative animate-in slide-in-from-right">
            <button onClick={() => setChatOpen(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
              <MessageCircle className="text-[#00af87]" /> Chat with {activeClient.name}
            </h3>
            <p className="text-xs text-gray-400 mb-6">Send messages or workout tips directly to the client.</p>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
              {chatHistory.map((chat, idx) => (
                <div key={idx} className={`flex flex-col ${chat.sender === 'coach' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-2xl text-xs max-w-[80%] font-medium ${
                    chat.sender === 'coach'
                      ? 'bg-[#ff9f29] text-white rounded-tr-none'
                      : 'bg-gray-100 text-gray-800 rounded-tl-none'
                  }`}>
                    {chat.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00af87]"
              />
              <button
                onClick={handleSendMessage}
                className="bg-[#00af87] text-white px-4 rounded-xl text-xs font-bold hover:opacity-90"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mock Package Modal/Drawer */}
      {packageOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 relative">
            <button onClick={() => setPackageOpen(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
              <CreditCard className="text-[#00af87]" /> Assign Training Package
            </h3>
            <p className="text-xs text-gray-400 mb-6">Assign a new session bundle or coaching tier to {activeClient.name}.</p>

            <div className="space-y-3">
              {[
                { title: 'Personal Training (10 Sessions)', desc: '1-on-1 private workouts, scheduled weekly.', price: '$750' },
                { title: 'Nutrition Kickstart Tier', desc: 'Custom macros guide + daily review notes.', price: '$199' },
                { title: 'Premium Elite Tier (Monthly)', desc: 'Unlimited chat support, 3 customized plans.', price: '$299/mo' }
              ].map((pack, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    alert(`Assigned package: ${pack.title}`);
                    setPackageOpen(false);
                  }}
                  className="p-4 border border-gray-100 hover:border-[#00af87] hover:bg-teal-50/20 rounded-2xl cursor-pointer transition-all flex justify-between items-center group"
                >
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 group-hover:text-[#00af87]">{pack.title}</h4>
                    <p className="text-[10px] text-gray-400 mt-1">{pack.desc}</p>
                  </div>
                  <span className="text-xs font-extrabold text-[#ff9f29]">{pack.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
