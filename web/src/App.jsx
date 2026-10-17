import React, { useState, useEffect } from 'react';
import { 
  Fuel, AlertTriangle, ShieldCheck, TrendingDown, DollarSign, 
  Truck, ArrowRight, CheckCircle2, MessageSquare, RefreshCw,
  Search, Sliders, MapPin, Database, Award, Lock, ExternalLink, X,
  Clock, Zap, Check, ChevronRight
} from 'lucide-react';

const API_BASE = '/api/v1';

export default function App() {
  const [activeTab, setActiveTab] = useState('kpis');
  const [kpis, setKpis] = useState(null);
  const [leaks, setLeaks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [depots, setDepots] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedVehicleModal, setSelectedVehicleModal] = useState(null);
  
  // Interactive Simulator Slider State
  const [reductionSlider, setReductionSlider] = useState(30);
  
  // Guarded AI Copilot State
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'copilot',
      text: 'Hello Elena. I am your Guarded Fleet Intelligence Copilot. Ask me about top fuel leaks, depot comparisons, or savings scenarios.',
      tool: null,
      data: null
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [erasureDriverId, setErasureDriverId] = useState('');
  const [erasureStatus, setErasureStatus] = useState(null);

  useEffect(() => {
    fetchKpis();
    fetchLeaks();
    fetchAlerts();
    fetchDepots();
    fetchRecommendations();

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

  const inspectVehicle = async (vehicleId) => {
    try {
      const res = await fetch(`${API_BASE}/vehicles/${vehicleId}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setSelectedVehicleModal(data);
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
        body: JSON.stringify({ driver_id: erasureDriverId, reason: 'Right-to-be-forgotten GDPR/DPDP request' })
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
    <div className="app-container">
      {/* Top Header */}
      <header className="header">
        <div className="brand-section">
          <div className="brand-icon">
            <Fuel className="w-5 h-5" />
          </div>
          <div>
            <div className="brand-title">
              FleetLeak
              <span className="badge badge-medium">ENTERPRISE</span>
            </div>
            <div className="brand-subtitle">Fuel, Idling & Asset Utilisation Cost Intelligence</div>
          </div>
        </div>

        {/* Tab Selector */}
        <nav className="nav-tabs">
          <button 
            onClick={() => setActiveTab('kpis')}
            className={`nav-tab-btn ${activeTab === 'kpis' ? 'active' : ''}`}
          >
            Executive KPIs
          </button>
          <button 
            onClick={() => setActiveTab('leaks')}
            className={`nav-tab-btn ${activeTab === 'leaks' ? 'active' : ''}`}
          >
            Ranked Leaks
          </button>
          <button 
            onClick={() => setActiveTab('depots')}
            className={`nav-tab-btn ${activeTab === 'depots' ? 'active' : ''}`}
          >
            Depots
          </button>
          <button 
            onClick={() => setActiveTab('copilot')}
            className={`nav-tab-btn ${activeTab === 'copilot' ? 'active' : ''}`}
          >
            Guarded Copilot
          </button>
          <button 
            onClick={() => setActiveTab('compliance')}
            className={`nav-tab-btn ${activeTab === 'compliance' ? 'active' : ''}`}
          >
            Compliance & Privacy
          </button>
        </nav>

        {/* Right Status */}
        <div className="header-right">
          <div className="live-badge">
            <span className="pulse-dot"></span>
            Streaming Ingest Live
          </div>
          <div className="user-profile">
            <div className="user-name">Elena Rostova</div>
            <div className="user-role">Fleet Finance Manager</div>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="main-content">
        
        {/* =================================================================== */}
        {/* TAB 1: EXECUTIVE KPIS & WHAT-IF SIMULATOR                           */}
        {/* =================================================================== */}
        {activeTab === 'kpis' && (
          <div>
            {/* Top Stat Cards */}
            <div className="grid-4">
              <div className="glass-card">
                <div className="card-header">
                  <span className="card-title-sm">Active Monitored Fleet</span>
                  <Truck className="w-5 h-5" style={{ color: 'var(--primary-cyan)' }} />
                </div>
                <div className="card-value">
                  {kpis ? kpis.total_vehicles.toLocaleString() : '5,000'}
                </div>
                <div className="card-desc">Class 1, 6 & 8 Commercial Assets</div>
              </div>

              <div className="glass-card" style={{ borderColor: 'rgba(244, 63, 94, 0.25)' }}>
                <div className="card-header">
                  <span className="card-title-sm" style={{ color: '#fb7185' }}>Monthly Leak Loss</span>
                  <DollarSign className="w-5 h-5" style={{ color: '#fb7185' }} />
                </div>
                <div className="card-value rose">
                  ${kpis ? kpis.monthly_leak_cost_usd.toLocaleString() : '7,920.97'}
                </div>
                <div className="card-desc">Fuel burn & idle opportunity waste</div>
              </div>

              <div className="glass-card" style={{ borderColor: 'rgba(16, 185, 129, 0.25)' }}>
                <div className="card-header">
                  <span className="card-title-sm" style={{ color: '#34d399' }}>Recoverable Savings</span>
                  <TrendingDown className="w-5 h-5" style={{ color: '#34d399' }} />
                </div>
                <div className="card-value emerald">
                  ${kpis ? kpis.recoverable_savings_usd.toLocaleString() : '2,283.00'}
                </div>
                <div className="card-desc">From pending policy recommendations</div>
              </div>

              <div className="glass-card">
                <div className="card-header">
                  <span className="card-title-sm">Live Open Alerts</span>
                  <AlertTriangle className="w-5 h-5" style={{ color: 'var(--accent-amber)' }} />
                </div>
                <div className="card-value">
                  {kpis ? kpis.active_alerts : '637'}
                </div>
                <div className="card-desc">Real-time threshold breaches</div>
              </div>
            </div>

            {/* Middle Section: What-If Simulator + Alert Stream */}
            <div className="grid-2">
              
              {/* Simulator Card */}
              <div className="glass-card simulator-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sliders className="w-5 h-5" style={{ color: 'var(--primary-cyan)' }} />
                      Financial "What-If" Savings Simulator
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Model bottom-line cost recovery by reducing excessive dwell and shift idle
                    </p>
                  </div>
                  <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary-cyan)', fontFamily: 'var(--font-mono)' }}>
                    {reductionSlider}%
                  </span>
                </div>

                <div className="slider-container">
                  <div className="slider-labels">
                    <span>0% (Status Quo)</span>
                    <span>Target Idle Reduction</span>
                    <span>100% (Zero Idle)</span>
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

                <div className="sim-metrics-grid">
                  <div className="sim-metric-cell">
                    <div className="sim-metric-label">Monthly Recovered</div>
                    <div className="sim-metric-val" style={{ color: '#34d399' }}>
                      ${((kpis ? kpis.monthly_leak_cost_usd : 7920) * (reductionSlider / 100)).toFixed(2)}
                    </div>
                  </div>
                  <div className="sim-metric-cell">
                    <div className="sim-metric-label">Annual Recovered</div>
                    <div className="sim-metric-val" style={{ color: 'var(--primary-cyan)' }}>
                      ${((kpis ? kpis.monthly_leak_cost_usd : 7920) * (reductionSlider / 100) * 12).toFixed(2)}
                    </div>
                  </div>
                  <div className="sim-metric-cell">
                    <div className="sim-metric-label">CO2 Avoided</div>
                    <div className="sim-metric-val" style={{ color: 'var(--accent-amber)' }}>
                      {((reductionSlider / 100) * 18.4).toFixed(1)} tons/yr
                    </div>
                  </div>
                </div>
              </div>

              {/* Alert Feed Card */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: 'var(--accent-amber)' }} />
                    Live Alert Stream
                  </h3>
                  <button onClick={fetchAlerts} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>

                <div className="alert-feed">
                  {alerts.map((a, idx) => (
                    <div key={idx} className="alert-item">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span className={`badge ${a.severity === 'CRITICAL' ? 'badge-critical' : 'badge-high'}`}>
                            {a.severity}
                          </span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>{a.title}</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{a.message}</p>
                      </div>
                      <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fb7185', whiteSpace: 'nowrap' }}>
                        -${a.estimated_cost_loss ? a.estimated_cost_loss.toFixed(2) : '3.50'}
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
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>Ranked Fuel & Idle Leaks</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Keyset-paginated audit list ($O(\log n)$) with masked location privacy compliance
                </p>
              </div>
              <button onClick={fetchLeaks} className="btn-secondary">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Vehicle Asset</th>
                    <th>Leak Classification</th>
                    <th>Depot Hub</th>
                    <th>Idle Duration</th>
                    <th>Fuel Wasted</th>
                    <th>Cost Loss</th>
                    <th>Geohash (Privacy)</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaks.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700, color: '#ffffff' }}>
                        {item.license_plate}
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                          {item.make} {item.model}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${item.severity === 'CRITICAL' ? 'badge-critical' : (item.severity === 'HIGH' ? 'badge-high' : 'badge-medium')}`}>
                          {item.leak_type_code}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{item.depot_name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(item.duration_seconds / 60)} mins</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{item.fuel_wasted_liters.toFixed(2)} L</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fb7185' }}>
                        ${item.estimated_cost_loss.toFixed(2)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.geohash_5} (Masked)
                      </td>
                      <td>
                        <span className={`badge ${item.status === 'OPEN' ? 'badge-high' : 'badge-success'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => inspectVehicle(item.vehicle_id)}
                          className="btn-secondary" 
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          Drill Down
                        </button>
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
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>Cross-Depot Waste Comparison</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Ranked operational leak expenditures and fuel waste across all regional hub locations
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {depots.map((dep, idx) => (
                <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>{dep.depot_name}</span>
                    <span style={{ fontWeight: 800, color: '#fb7185', fontFamily: 'var(--font-mono)', fontSize: '1.05rem' }}>
                      ${dep.total_leak_cost_usd.toLocaleString()} Loss
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${Math.min(100, Math.max(15, (dep.total_leak_cost_usd / 3000) * 100))}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, #38bdf8 0%, #fb7185 100%)',
                        borderRadius: '9999px'
                      }}
                    ></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    <span>{dep.assigned_vehicles} Commercial Vehicles Active</span>
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
          <div className="grid-2">
            
            {/* Copilot Chat */}
            <div className="glass-card chat-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare className="w-5 h-5" style={{ color: 'var(--primary-cyan)' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>Guarded AI Financial Copilot</h3>
                </div>
                <span className="badge badge-medium">Guarded Tool Pipeline</span>
              </div>

              {/* Messages Scroll Area */}
              <div className="chat-messages">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`chat-bubble ${msg.sender === 'user' ? 'user' : (msg.status === 'REFUSED' ? 'refused' : 'copilot')}`}>
                    <p>{msg.text}</p>
                    {msg.latency && (
                      <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '6px' }}>
                        Execution Latency: {msg.latency} ms | Audited to agent_action_log
                      </span>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Evaluating tools, tenant boundaries & security guardrails...
                  </div>
                )}
              </div>

              {/* Sample Question Chips */}
              <div className="chat-chips">
                <button 
                  onClick={() => handleSendChat("Which depots have the highest fuel leak cost?")}
                  className="chip-btn"
                >
                  Top Depot Leaks
                </button>
                <button 
                  onClick={() => handleSendChat("If we cut idling by 40%, how much money do we save?")}
                  className="chip-btn"
                >
                  What-If 40% Reduction
                </button>
                <button 
                  onClick={() => handleSendChat("Recommend an auto-shutdown policy for Chicago depot")}
                  className="chip-btn"
                >
                  Stage Policy Recommendation
                </button>
              </div>

              {/* Chat Input */}
              <div className="chat-input-bar">
                <input 
                  type="text"
                  placeholder="Ask copilot about fleet leaks, savings, or stage policies..."
                  className="chat-input"
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                />
                <button onClick={() => handleSendChat()} disabled={chatLoading} className="btn-primary">
                  Send
                </button>
              </div>
            </div>

            {/* Human-in-the-Loop Approval Queue */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck className="w-5 h-5" style={{ color: 'var(--accent-emerald)' }} />
                  Human Approval Queue
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Guarded AI recommendations requiring explicit Finance Manager authorization
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '480px', overflowY: 'auto' }}>
                {recommendations.map((rec) => (
                  <div key={rec.id} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.88rem' }}>{rec.title}</span>
                      <span className={`badge ${rec.status === 'APPROVED' ? 'badge-success' : 'badge-high'}`}>
                        {rec.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '12px' }}>
                      {rec.proposed_action}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#34d399', fontSize: '0.85rem' }}>
                        +${rec.projected_monthly_savings.toFixed(2)}/mo
                      </span>
                      {rec.status === 'PENDING_APPROVAL' ? (
                        <button 
                          onClick={() => handleApproveRecommendation(rec.id)}
                          className="btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          Approve Action
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
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
          <div className="grid-2">
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock className="w-5 h-5" style={{ color: 'var(--primary-cyan)' }} />
                Driver Right-to-Erasure (GDPR / DPDP)
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Submits formal pseudonymization request. Driver employee codes, contact numbers, and pgcrypto credentials will be purged while preserving aggregated fleet metrics.
              </p>

              <form onSubmit={handleErasureSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Driver ID / Employee Code
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. f0000000-0000-0000-0000-000000000001"
                    className="chat-input"
                    value={erasureDriverId}
                    onChange={(e) => setErasureDriverId(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
                  Initiate Erasure Request
                </button>
              </form>

              {erasureStatus && (
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '10px', padding: '12px', fontSize: '0.75rem', color: '#7dd3fc' }}>
                  {erasureStatus}
                </div>
              )}
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database className="w-5 h-5" style={{ color: 'var(--accent-emerald)' }} />
                STRIDE Threat Model & Compliance Controls
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                  <div><strong style={{ color: '#ffffff' }}>Spoofed Devices:</strong> mTLS client certificate verification at gateway edge.</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                  <div><strong style={{ color: '#ffffff' }}>Replay Attacks:</strong> L1 Bloom filter + Redis SETNX natural key dedupe.</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                  <div><strong style={{ color: '#ffffff' }}>Cross-Tenant Leakage:</strong> PostgreSQL Row-Level Security (RLS) on tenant_id.</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                  <div><strong style={{ color: '#ffffff' }}>Prompt Injection:</strong> Guardrail input defense treating all text as untrusted data.</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                  <div><strong style={{ color: '#ffffff' }}>Location Privacy:</strong> Driver GPS coordinates masked to Geohash-5 for non-privileged roles.</div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Vehicle Drill-Down Modal */}
      {selectedVehicleModal && (
        <div className="modal-overlay" onClick={() => setSelectedVehicleModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                  Vehicle Inspection: {selectedVehicleModal.vehicle.license_plate}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  VIN: {selectedVehicleModal.vehicle.vin} | {selectedVehicleModal.vehicle.make} {selectedVehicleModal.vehicle.model} ({selectedVehicleModal.vehicle.year})
                </p>
              </div>
              <button onClick={() => setSelectedVehicleModal(null)} className="btn-secondary" style={{ padding: '6px' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Assigned Hub</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>{selectedVehicleModal.vehicle.depot_name}</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Propulsion Class</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>{selectedVehicleModal.vehicle.vehicle_class}</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Daily Lease Cost</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>${selectedVehicleModal.vehicle.daily_lease_cost}/day</div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '10px' }}>Recent Incident History</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {selectedVehicleModal.leak_history.map((lh, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', fontSize: '0.75rem' }}>
                  <span>{new Date(lh.started_at).toLocaleDateString()}</span>
                  <span className={`badge ${lh.severity === 'CRITICAL' ? 'badge-critical' : 'badge-high'}`}>{lh.severity}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#fb7185' }}>-${lh.estimated_cost_loss.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        FleetLeak Platform &copy; 2026 SRM x Talenciaglobal Connected Vehicle Intelligence Hackathon.
      </footer>
    </div>
  );
}
