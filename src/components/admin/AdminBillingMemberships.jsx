import React, { useState, useEffect } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { 
  CreditCard, 
  Layers, 
  Plus, 
  CheckCircle2, 
  X, 
  DollarSign, 
  RefreshCw, 
  Receipt,
  Sparkles
} from 'lucide-react';

export default function AdminBillingMemberships() {
  const { 
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
    clients 
  } = useGymState();

  const [activeSubTab, setActiveSubTab] = useState('memberships'); // 'memberships', 'plans', 'payments'
  const [loading, setLoading] = useState(false);

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [modalFeedback, setModalFeedback] = useState(null);

  // Assign Form
  const [assignClientId, setAssignClientId] = useState('');
  const [assignPlanName, setAssignPlanName] = useState('Gold Monthly');
  const [assignStartDate, setAssignStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [assignExpiryDate, setAssignExpiryDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [assignPrice, setAssignPrice] = useState('99');

  // Plan Form
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('79');
  const [newPlanDuration, setNewPlanDuration] = useState('1');
  const [newPlanDesc, setNewPlanDesc] = useState('');
  const [newPlanFeatures, setNewPlanFeatures] = useState('');

  // Payment Form
  const [payClientId, setPayClientId] = useState('');
  const [payAmount, setPayAmount] = useState('99');
  const [payMethod, setPayMethod] = useState('Credit Card');
  const [payNotes, setPayNotes] = useState('Monthly membership fee');

  useEffect(() => {
    fetchMembershipPlans();
    fetchMemberships();
    fetchPayments();
  }, [fetchMembershipPlans, fetchMemberships, fetchPayments]);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setModalFeedback(null);
    if (!assignClientId) return;

    setLoading(true);
    const res = await assignMembership({
      clientId: assignClientId,
      planName: assignPlanName,
      startDate: assignStartDate,
      expiryDate: assignExpiryDate,
      price: parseFloat(assignPrice) || 99,
      autoRenew: true
    });
    setLoading(false);

    if (res) {
      setModalFeedback({ type: 'success', text: 'Membership assigned successfully!' });
      setTimeout(() => {
        setIsAssignModalOpen(false);
        setModalFeedback(null);
      }, 1000);
    }
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    setModalFeedback(null);
    if (!newPlanName.trim()) return;

    const features = newPlanFeatures.split(',').map(f => f.trim()).filter(Boolean);
    setLoading(true);
    const res = await saveMembershipPlan({
      name: newPlanName.trim(),
      price: parseFloat(newPlanPrice) || 50,
      durationMonths: parseInt(newPlanDuration, 10) || 1,
      description: newPlanDesc.trim(),
      features,
      isActive: true
    });
    setLoading(false);

    if (res) {
      setModalFeedback({ type: 'success', text: 'New plan created!' });
      setTimeout(() => {
        setIsPlanModalOpen(false);
        setModalFeedback(null);
        setNewPlanName('');
        setNewPlanDesc('');
        setNewPlanFeatures('');
      }, 1000);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setModalFeedback(null);
    if (!payClientId || !payAmount) return;

    setLoading(true);
    const res = await recordPayment({
      clientId: payClientId,
      amount: parseFloat(payAmount) || 0,
      currency: 'USD',
      paymentMethod: payMethod,
      paymentStatus: 'Completed',
      notes: payNotes
    });
    setLoading(false);

    if (res) {
      setModalFeedback({ type: 'success', text: 'Payment transaction logged!' });
      setTimeout(() => {
        setIsPaymentModalOpen(false);
        setModalFeedback(null);
      }, 1000);
    }
  };

  const handleRenew = async (membershipId) => {
    if (window.confirm('Renew this membership for 1 additional month?')) {
      await renewMembership(membershipId, 1);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00af87]"></span>
            <span className="text-[10px] font-extrabold uppercase text-[#00af87] tracking-wider">Revenue & Memberships</span>
          </div>
          <h2 className="text-xl font-black text-gray-800 leading-tight mt-1">Membership & Billing Center</h2>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            Manage plans, client subscriptions, renewal cycles, and payment records.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
          <button
            onClick={() => {
              setAssignClientId(clients[0]?.id || '');
              setModalFeedback(null);
              setIsAssignModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-white font-extrabold text-xs btn-gradient-teal shadow-md hover:opacity-95 transition-all"
          >
            <Plus size={14} /> Assign Plan
          </button>
          <button
            onClick={() => {
              setPayClientId(clients[0]?.id || '');
              setModalFeedback(null);
              setIsPaymentModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gray-900 text-white font-extrabold text-xs shadow-md hover:bg-gray-800 transition-all"
          >
            <DollarSign size={14} /> Log Payment
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm self-start">
        <button
          onClick={() => setActiveSubTab('memberships')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'memberships'
              ? 'bg-[#00af87] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Layers size={14} /> Client Memberships ({membershipsList.length})
        </button>
        <button
          onClick={() => setActiveSubTab('plans')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'plans'
              ? 'bg-[#00af87] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Sparkles size={14} /> Membership Plans ({membershipPlans.length})
        </button>
        <button
          onClick={() => setActiveSubTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'payments'
              ? 'bg-[#00af87] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <CreditCard size={14} /> Transactions ({paymentsList.length})
        </button>
      </div>

      {/* Panel 1: Client Memberships List */}
      {activeSubTab === 'memberships' && (
        <div className="bg-white rounded-3xl shadow-premium border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-800">Active & Expired Member Subscriptions</h3>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Automated Status Tracking</span>
          </div>

          {membershipsList.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 font-semibold">
              No client subscriptions registered yet. Click "Assign Plan" above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-extrabold uppercase text-gray-400">
                    <th className="py-3.5 px-6">Member</th>
                    <th className="py-3.5 px-6">Plan Name</th>
                    <th className="py-3.5 px-6">Start Date</th>
                    <th className="py-3.5 px-6">Expiry Date</th>
                    <th className="py-3.5 px-6">Price</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {membershipsList.map((m) => {
                    const isExp = new Date(m.expiryDate) < new Date();
                    return (
                      <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-bold text-gray-800">{m.clientName || 'Client'}</div>
                          <div className="text-[10px] text-[#00af87] font-semibold">{m.clientUsername}</div>
                        </td>
                        <td className="py-3.5 px-6 font-bold text-gray-800">{m.planName}</td>
                        <td className="py-3.5 px-6 text-gray-500">{m.startDate}</td>
                        <td className="py-3.5 px-6 text-gray-700 font-semibold">{m.expiryDate}</td>
                        <td className="py-3.5 px-6 font-extrabold text-gray-900">${m.price}</td>
                        <td className="py-3.5 px-6">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border ${
                            isExp
                              ? 'bg-red-50 text-red-600 border-red-100'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                            {isExp ? 'Expired' : 'Active'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button
                            onClick={() => handleRenew(m.id)}
                            className="px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 text-[#00af87] hover:bg-teal-100 text-xs font-bold transition-all shadow-sm flex items-center gap-1 inline-flex"
                          >
                            <RefreshCw size={11} /> Renew +1 Mo
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Panel 2: Membership Plans Catalog */}
      {activeSubTab === 'plans' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium">Available tiers offered to gym members.</p>
            <button
              onClick={() => {
                setModalFeedback(null);
                setIsPlanModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-extrabold text-xs btn-gradient-teal shadow-sm"
            >
              <Plus size={13} /> Add New Plan Tier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {membershipPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold uppercase text-[#00af87] tracking-wider">Tier Package</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-600">Active</span>
                  </div>
                  <h3 className="text-lg font-black text-gray-800">{plan.name}</h3>
                  <div className="text-2xl font-black text-gray-900 my-2">
                    ${plan.price} <span className="text-xs font-normal text-gray-400">/ {plan.durationMonths} mo</span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mb-4">{plan.description}</p>

                  <div className="space-y-1.5 border-t border-gray-50 pt-3">
                    {(plan.features || []).map((feat, idx) => (
                      <div key={idx} className="text-xs text-gray-700 font-medium flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-[#00af87] shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel 3: Transactions & Invoices */}
      {activeSubTab === 'payments' && (
        <div className="bg-white rounded-3xl shadow-premium border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-800 flex items-center gap-2">
              <Receipt size={16} className="text-emerald-600" /> Payment & Billing History
            </h3>
            <span className="text-xs font-extrabold text-emerald-600">
              Total Recorded: ${paymentsList.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}
            </span>
          </div>

          {paymentsList.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 font-semibold">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-extrabold uppercase text-gray-400">
                    <th className="py-3.5 px-6">Invoice</th>
                    <th className="py-3.5 px-6">Member</th>
                    <th className="py-3.5 px-6">Date</th>
                    <th className="py-3.5 px-6">Payment Method</th>
                    <th className="py-3.5 px-6">Amount</th>
                    <th className="py-3.5 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paymentsList.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-6 font-mono text-gray-700 font-bold">{p.invoiceNumber}</td>
                      <td className="py-3.5 px-6 font-bold text-gray-800">{p.clientName || 'Client'}</td>
                      <td className="py-3.5 px-6 text-gray-500">{new Date(p.paymentDate || p.createdAt).toLocaleDateString()}</td>
                      <td className="py-3.5 px-6 text-gray-600 font-semibold">{p.paymentMethod}</td>
                      <td className="py-3.5 px-6 font-black text-gray-900">${p.amount} {p.currency}</td>
                      <td className="py-3.5 px-6">
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          {p.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-800">Assign Membership to Client</h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAssignSubmit} className="space-y-4 pt-4 text-xs">
              {modalFeedback && (
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 font-semibold">{modalFeedback.text}</div>
              )}
              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Client</label>
                <select
                  value={assignClientId}
                  onChange={(e) => setAssignClientId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-[#00af87]"
                >
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.username})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Plan Tier</label>
                <select
                  value={assignPlanName}
                  onChange={(e) => {
                    setAssignPlanName(e.target.value);
                    const p = membershipPlans.find(plan => plan.name === e.target.value);
                    if (p) setAssignPrice(String(p.price));
                  }}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-[#00af87]"
                >
                  {membershipPlans.map(p => <option key={p.id} value={p.name}>{p.name} (${p.price})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={assignStartDate}
                    onChange={(e) => setAssignStartDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-[#00af87]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={assignExpiryDate}
                    onChange={(e) => setAssignExpiryDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-[#00af87]"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 font-bold text-gray-500">Cancel</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-xl text-white font-extrabold btn-gradient-teal shadow-md">
                  {loading ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-800">Record Member Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="space-y-4 pt-4 text-xs">
              {modalFeedback && (
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 font-semibold">{modalFeedback.text}</div>
              )}
              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Member</label>
                <select
                  value={payClientId}
                  onChange={(e) => setPayClientId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-[#00af87]"
                >
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Amount ($ USD)</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-[#00af87]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-[#00af87]"
                  >
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Apple Pay">Apple Pay</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Notes / Description</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Monthly subscription renewal"
                  className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-[#00af87]"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 font-bold text-gray-500">Cancel</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-xl text-white font-extrabold btn-gradient-teal shadow-md">
                  {loading ? 'Logging...' : 'Confirm Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-800">Create New Membership Tier</h3>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePlanSubmit} className="space-y-4 pt-4 text-xs">
              {modalFeedback && (
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 font-semibold">{modalFeedback.text}</div>
              )}
              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Plan Title</label>
                <input
                  type="text"
                  placeholder="e.g. Diamond Unlimited"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-[#00af87]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Monthly Price ($)</label>
                  <input
                    type="number"
                    value={newPlanPrice}
                    onChange={(e) => setNewPlanPrice(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-[#00af87]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    value={newPlanDuration}
                    onChange={(e) => setNewPlanDuration(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-[#00af87]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Short description for members"
                  value={newPlanDesc}
                  onChange={(e) => setNewPlanDesc(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-[#00af87]"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">Features (comma separated)</label>
                <input
                  type="text"
                  placeholder="Gym Access, Pool, Sauna, 2 Guest Passes"
                  value={newPlanFeatures}
                  onChange={(e) => setNewPlanFeatures(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-[#00af87]"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsPlanModalOpen(false)} className="px-4 py-2 font-bold text-gray-500">Cancel</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-xl text-white font-extrabold btn-gradient-teal shadow-md">
                  {loading ? 'Creating...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
