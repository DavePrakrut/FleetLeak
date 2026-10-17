import React, { useState, useEffect } from 'react';
import { 
  Fuel, AlertTriangle, ShieldCheck, TrendingDown, DollarSign, 
  Truck, ArrowRight, CheckCircle2, MessageSquare, RefreshCw,
  Search, Sliders, MapPin, Database, Award, Lock, ExternalLink
} from 'lucide-react';

const API_BASE = '/api/v1';

export default function App() {
  const [activeTab, setActiveTab] = useState('kpis');
  const [kpis, setKpis] = useState(null);
  const [leaks, setLeaks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [depots, setDepots] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  
  // Interactive Simulator Slider State
  const [reductionSlider, setReductionSlider] = useState(30);
  
  // Guarded AI Copilot State
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'copilot',
      text: '[Rule-Based Fallback Copilot] Hello Elena. I am your Guarded Fleet Intelligence Copilot. Ask me about top fuel leaks, depot comparisons, or savings scenarios.',
      tool: null,
      data: null
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [erasureDriverId, setErasureDriverId] = useState('');
  const [erasureStatus, setErasureStatus] = useState(null);

  // Load initial data
  useEffect(() => {
    fetchKpis();
    fetchLeaks();
    fetchAlerts();
    fetchDepots();
    fetchRecommendations();

    // Setup live alert polling or websocket
    const interval = setInterval(() => {
      fetchAlerts();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchKpis = async () => {
    try {
      const res = await fetch(`${API_BASE}/fleet/kpis`);
      if (res.ok) setKpis(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchLeaks = async () => {
    try {
      const res = await fetch(`${API_BASE}/leaks?limit=15`);
      if (res.ok) {
        const data = await res.json();
        setLeaks(data.items || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE}/alerts/live?limit=6`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchDepots = async () => {
    try {
      const res = await fetch(`${API_BASE}/depots/compare`);
      if (res.ok) {
        const data = await res.json();
        setDepots(data.depots || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await fetch(`${API_BASE}/recommendations`);
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (e) { console.error(e); }
  };

  const handleApproveRecommendation = async (recId) => {
    try {
      const res = await fetch(`${API_BASE}/recommendations/${recId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Approved directly by Elena Rostova from Web Dashboard' })
      });
      if (res.ok) {
        fetchRecommendations();
        fetchKpis();
      }
    } catch (e) { console.error(e); }
  };

  const handleSendChat = async (promptToSend) => {
    const p = promptToSend || chatPrompt;
    if (!p.trim()) return;

    const userMsg = { sender: 'user', text: p };
    setChatMessages(prev => [...prev, userMsg]);
    setChatPrompt('');
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/agent/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p })
      });
      const data = await res.json();
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'copilot',
          text: data.response || data.reason,
          tool: data.tool_called,
          data: data.data,
          status: data.status,
          latency: data.latency_ms
        }
      ]);
    } catch (e) {
      setChatMessages(prev => [
        ...prev,
        { sender: 'copilot', text: 'Error connecting to Guarded Copilot service.', status: 'ERROR' }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleErasureSubmit = async (e) => {
    e.preventDefault();
    if (!erasureDriverId) return;
    try {
      const res = await fetch(`${API_BASE}/privacy/erasure-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: erasureDriverId, reason: 'Right-to-be-forgotten request' })
      });
      if (res.ok) {
        const data = await res.json();
        setErasureStatus(`Erasure request ${data.erasure_request_id} created in status PENDING. Driver PII will be pseudonymized.`);
        setErasureDriverId('');
      }
    } catch (e) {
      setErasureStatus('Error submitting erasure request.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-white/10 bg-[#0d131f]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Fuel className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">FleetLeak</h1>
              <span className="badge-medium text-xs font-semibold">ENTERPRISE</span>
            </div>
            <p className="text-xs text-slate-400">Fuel, Idling & Asset Utilisation Cost Intelligence</p>
          </div>
        </div>

        {/* Center Tabs */}
        <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-sm">
          <button 
            onClick={() => setActiveTab('kpis')}
            className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'kpis' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' : 'text-slate-400 hover:text-white'}`}
          >
            Executive KPIs
          </button>
          <button 
            onClick={() => setActiveTab('leaks')}
            className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'leaks' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' : 'text-slate-400 hover:text-white'}`}
          >
            Ranked Leaks
          </button>
          <button 
            onClick={() => setActiveTab('depots')}
            className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'depots' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' : 'text-slate-400 hover:text-white'}`}
          >
            Depots
          </button>
          <button 
            onClick={() => setActiveTab('copilot')}
            className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'copilot' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' : 'text-slate-400 hover:text-white'}`}
          >
            Guarded Copilot
          </button>
          <button 
            onClick={() => setActiveTab('compliance')}
            className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'compliance' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' : 'text-slate-400 hover:text-white'}`}
          >
            Compliance & Privacy
          </button>
        </nav>

        {/* Right Status & Identity */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Streaming Ingest Live
          </div>
          <div className="text-right">
            <p className="font-semibold text-white">Elena Rostova</p>
            <p className="text-slate-400">Fleet Finance Manager</p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* =================================================================== */}
        {/* TAB 1: EXECUTIVE KPIS & WHAT-IF SIMULATOR                           */}
        {/* =================================================================== */}
        {activeTab === 'kpis' && (
          <div className="space-y-8">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="glass-panel p-6">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Active Monitored Fleet</span>
                  <Truck className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {kpis ? kpis.total_vehicles.toLocaleString() : '5,000'}
                </div>
                <p className="text-xs text-slate-400 mt-2">Class 1, 6 & 8 Commercial Assets</p>
              </div>

              <div className="glass-panel p-6 border-rose-500/20">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-rose-400">Monthly Leak Loss</span>
                  <DollarSign className="w-5 h-5 text-rose-400" />
                </div>
                <div className="text-3xl font-extrabold text-rose-400">
                  ${kpis ? kpis.monthly_leak_cost_usd.toLocaleString() : '7,920.97'}
                </div>
                <p className="text-xs text-slate-400 mt-2">Fuel burn & idle opportunity loss</p>
              </div>

              <div className="glass-panel p-6 border-emerald-500/20">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Recoverable Savings</span>
                  <TrendingDown className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-extrabold text-emerald-400">
                  ${kpis ? kpis.recoverable_savings_usd.toLocaleString() : '2,283.00'}
                </div>
                <p className="text-xs text-slate-400 mt-2">From pending actionable policies</p>
              </div>

              <div className="glass-panel p-6">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Live Open Alerts</span>
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {kpis ? kpis.active_alerts : '637'}
                </div>
                <p className="text-xs text-slate-400 mt-2">Real-time threshold breaches</p>
              </div>
            </div>

            {/* Middle Section: Interactive What-If Simulator + Live Alert Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* What-If Simulator Slider (7 Cols) */}
              <div className="lg:col-span-7 glass-panel p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-cyan-400" />
                      Financial "What-If" Savings Simulator
                    </h3>
                    <p className="text-xs text-slate-400">Model revenue recovery by reducing excessive dwell and shift idle</p>
                  </div>
                  <span className="text-2xl font-black text-cyan-400">{reductionSlider}%</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-400 font-mono">
                    <span>0% (Status Quo)</span>
                    <span>Target Idle Reduction</span>
                    <span>100% (Zero Excess Idle)</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="100" 
                    step="5"
                    value={reductionSlider} 
                    onChange={(e) => setReductionSlider(Number(e.target.value))}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-xs text-slate-400">Monthly Recovered</p>
                    <p className="text-xl font-bold text-emerald-400">
                      ${((kpis ? kpis.monthly_leak_cost_usd : 7920) * (reductionSlider / 100)).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-xs text-slate-400">Annual Recovered</p>
                    <p className="text-xl font-bold text-cyan-400">
                      ${((kpis ? kpis.monthly_leak_cost_usd : 7920) * (reductionSlider / 100) * 12).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-xs text-slate-400">CO2 Emissions Avoided</p>
                    <p className="text-xl font-bold text-amber-400">
                      {((reductionSlider / 100) * 18.4).toFixed(1)} tons/yr
                    </p>
                  </div>
                </div>
              </div>

              {/* Real-time Alerts Feed (5 Cols) */}
              <div className="lg:col-span-5 glass-panel p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    Live Alert Stream
                  </h3>
                  <button onClick={fetchAlerts} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {alerts.map((a, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={a.severity === 'CRITICAL' ? 'badge-critical' : 'badge-high'}>
                            {a.severity}
                          </span>
                          <span className="text-xs font-bold text-white">{a.title}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{a.message}</p>
                      </div>
                      <span className="text-xs font-mono text-rose-400 whitespace-nowrap">
                        -${a.estimated_cost_loss?.toFixed(2) || '3.50'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: RANKED LEAKS & DRILLDOWN                                     */}
        {/* =================================================================== */}
        {activeTab === 'leaks' && (
          <div className="glass-panel p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Ranked Fuel & Idle Leaks</h3>
                <p className="text-xs text-slate-400">Keyset-paginated audit list ($O(\log n)$) with masked location privacy</p>
              </div>
              <button onClick={fetchLeaks} className="btn-secondary text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Leaks
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Vehicle</th>
                    <th className="pb-3">Leak Type</th>
                    <th className="pb-3">Depot Hub</th>
                    <th className="pb-3">Duration</th>
                    <th className="pb-3">Fuel Burned</th>
                    <th className="pb-3">Estimated Loss</th>
                    <th className="pb-3">Geohash</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaks.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 font-semibold text-white">
                        {item.license_plate}
                        <span className="block text-xs text-slate-400 font-normal">{item.make} {item.model}</span>
                      </td>
                      <td className="py-3">
                        <span className={item.severity === 'CRITICAL' ? 'badge-critical' : (item.severity === 'HIGH' ? 'badge-high' : 'badge-medium')}>
                          {item.leak_type_code}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300">{item.depot_name}</td>
                      <td className="py-3 font-mono text-slate-300">{Math.round(item.duration_seconds / 60)} mins</td>
                      <td className="py-3 font-mono text-slate-300">{item.fuel_wasted_liters.toFixed(2)} L</td>
                      <td className="py-3 font-mono font-bold text-rose-400">${item.estimated_cost_loss.toFixed(2)}</td>
                      <td className="py-3 font-mono text-xs text-slate-400">{item.geohash_5} (Masked)</td>
                      <td className="py-3">
                        <span className={item.status === 'OPEN' ? 'badge-high' : 'badge-success'}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: DEPOT COMPARISON                                            */}
        {/* =================================================================== */}
        {activeTab === 'depots' && (
          <div className="glass-panel p-6 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white">Cross-Depot Waste Comparison</h3>
              <p className="text-xs text-slate-400">Ranked operational leak costs and fuel waste across regional facilities</p>
            </div>

            <div className="space-y-4">
              {depots.map((dep, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white">{dep.depot_name}</span>
                    <span className="text-sm font-bold text-rose-400">${dep.total_leak_cost_usd.toLocaleString()} Lost</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(15, (dep.total_leak_cost_usd / 3000) * 100))}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{dep.assigned_vehicles} Vehicles Assigned</span>
                    <span>{dep.total_fuel_wasted_liters.toFixed(1)} Liters Wasted</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: GUARDED AI COPILOT & HUMAN APPROVAL QUEUE                    */}
        {/* =================================================================== */}
        {activeTab === 'copilot' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Copilot Chat (7 cols) */}
            <div className="lg:col-span-7 glass-panel p-6 flex flex-col h-[600px]">
              <div className="border-b border-white/10 pb-3 mb-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-bold text-white">Guarded AI Financial Copilot</h3>
                </div>
                <span className="badge-medium text-xs font-mono">[Rule-Based Fallback Copilot] Active</span>
              </div>

              {/* Chat Message Scroll Area */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                      msg.sender === 'user' 
                        ? 'bg-cyan-500 text-white rounded-br-none' 
                        : (msg.status === 'REFUSED' ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-bl-none' : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-none')
                    }`}>
                      <p>{msg.text}</p>
                      {msg.latency && (
                        <span className="block mt-2 text-[10px] text-slate-400 font-mono">
                          Audited execution latency: {msg.latency} ms
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="text-xs text-cyan-400 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Copilot is evaluating tools & security guardrails...
                  </div>
                )}
              </div>

              {/* Suggested Questions Chips */}
              <div className="py-2 flex gap-2 overflow-x-auto text-xs text-slate-400">
                <button 
                  onClick={() => handleSendChat("Which depots have the highest fuel leak cost?")}
                  className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 transition whitespace-nowrap"
                >
                  Top Depot Leaks
                </button>
                <button 
                  onClick={() => handleSendChat("If we cut idling by 40%, how much money do we save?")}
                  className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 transition whitespace-nowrap"
                >
                  What-If 40% Reduction
                </button>
                <button 
                  onClick={() => handleSendChat("Recommend an auto-shutdown policy for Chicago depot")}
                  className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 transition whitespace-nowrap"
                >
                  Stage Recommendation
                </button>
              </div>

              {/* Chat Input Box */}
              <div className="pt-3 border-t border-white/10 flex gap-2">
                <input 
                  type="text"
                  placeholder="Ask copilot about fleet leaks, savings, or stage policies..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                />
                <button 
                  onClick={() => handleSendChat()}
                  disabled={chatLoading}
                  className="btn-primary"
                >
                  Ask
                </button>
              </div>
            </div>

            {/* Human-in-the-Loop Recommendation Approval Queue (5 cols) */}
            <div className="lg:col-span-5 glass-panel p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    Human Approval Queue
                  </h3>
                  <p className="text-xs text-slate-400">Guarded AI recommendations requiring manager authorization</p>
                </div>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {recommendations.map((rec) => (
                  <div key={rec.id} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-white text-sm">{rec.title}</span>
                      <span className={rec.status === 'APPROVED' ? 'badge-success' : 'badge-high'}>
                        {rec.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{rec.proposed_action}</p>
                    <div className="flex justify-between items-center pt-2 border-t border-white/5 text-xs">
                      <span className="font-mono text-emerald-400 font-bold">
                        +${rec.projected_monthly_savings.toFixed(2)}/mo
                      </span>
                      {rec.status === 'PENDING_APPROVAL' ? (
                        <button 
                          onClick={() => handleApproveRecommendation(rec.id)}
                          className="btn-primary text-xs py-1.5 px-3"
                        >
                          Approve Action
                        </button>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Authorized
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: COMPLIANCE, GDPR & PRIVACY                                   */}
        {/* =================================================================== */}
        {activeTab === 'compliance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-panel p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-cyan-400" />
                Driver Right-to-Erasure (GDPR / DPDP)
              </h3>
              <p className="text-xs text-slate-400">
                Submits formal pseudonymization request. Driver employee codes, contact numbers, and pgcrypto encrypted credentials will be purged while preserving aggregated fleet metrics.
              </p>

              <form onSubmit={handleErasureSubmit} className="space-y-3 pt-2">
                <div>
                  <label className="text-xs text-slate-300">Driver ID / Employee Code</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. f0000000-0000-0000-0000-000000000001"
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    value={erasureDriverId}
                    onChange={(e) => setErasureDriverId(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary w-full justify-center">
                  Initiate Erasure Request
                </button>
              </form>

              {erasureStatus && (
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-xs text-cyan-300">
                  {erasureStatus}
                </div>
              )}
            </div>

            <div className="glass-panel p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                STRIDE Threat Model & Compliance Summary
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <strong>Spoofed Devices:</strong> mTLS client certificate verification at gateway.
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <strong>Replay Attacks:</strong> L1 Bloom filter + Redis SETNX natural key dedupe.
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <strong>Cross-Tenant Leakage:</strong> PostgreSQL Row-Level Security (RLS) on tenant_id.
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <strong>Prompt Injection:</strong> Guardrail input defense treating all text as untrusted data.
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <strong>Location Privacy:</strong> Driver GPS coordinates masked to Geohash-5 for non-privileged roles.
                </li>
              </ul>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-8 text-center text-xs text-slate-500">
        FleetLeak Platform &copy; 2026 SRM x Talenciaglobal Connected Vehicle Intelligence Hackathon. Built with PostgreSQL, TimescaleDB, Redpanda & LightGBM.
      </footer>
    </div>
  );
}
