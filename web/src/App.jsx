import React, { useState, useEffect } from 'react';
import { 
  Truck, DollarSign, TrendingDown, AlertTriangle, ShieldCheck, 
  Search, Sliders, MapPin, Database, Lock, X, RefreshCw, Send,
  Moon, Sun, CheckCircle2, ChevronRight, BarChart3, Filter,
  Layers, Eye, ArrowUpRight, Gauge, AlertCircle, FileText
} from 'lucide-react';

const API_BASE = '/api/v1';

export default function App() {
  const [theme, setTheme] = useState('light');
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'auditor', 'depots', 'copilot', 'privacy'
  const [currentTenant, setCurrentTenant] = useState('10000000-0000-0000-0000-000000000001');

  // Backend Data
  const [kpis, setKpis] = useState(null);
  const [leaks, setLeaks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [depots, setDepots] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedVehicleModal, setSelectedVehicleModal] = useState(null);

  // Filters for Auditor
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedDepot, setSelectedDepot] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

  // What-If Simulator
  const [reductionSlider, setReductionSlider] = useState(30);
  const [fuelPriceSlider, setFuelPriceSlider] = useState(3.85);

  // Copilot Chat
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'copilot',
      text: 'Hello Elena. I am your FleetLeak AI Copilot powered by Gemini Live & PostgreSQL TimescaleDB. I monitor 5,000 commercial vehicles across 4 depots. Ask me about top fuel leaks, cross-depot waste, or what-if savings scenarios.',
      tool: null,
      data: null,
      latency: 42
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [erasureDriverId, setErasureDriverId] = useState('');
  const [erasureStatus, setErasureStatus] = useState(null);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(() => {
      fetchAlerts();
    }, 15000);
    return () => clearInterval(interval);
  }, [currentTenant]);

  const loadAllData = () => {
    fetchKpis();
    fetchLeaks();
    fetchAlerts();
    fetchDepots();
    fetchRecommendations();
  };

  const fetchKpis = async () => {
    try {
      const res = await fetch(`${API_BASE}/fleet/kpis`, {
        headers: { 'X-Tenant-ID': currentTenant }
      });
      if (res.ok) setKpis(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchLeaks = async () => {
    try {
      const res = await fetch(`${API_BASE}/leaks?limit=100`, {
        headers: { 'X-Tenant-ID': currentTenant }
      });
      if (res.ok) {
        const data = await res.json();
        setLeaks(data.items || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE}/alerts/live?limit=6`, {
        headers: { 'X-Tenant-ID': currentTenant }
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchDepots = async () => {
    try {
      const res = await fetch(`${API_BASE}/depots/compare`, {
        headers: { 'X-Tenant-ID': currentTenant }
      });
      if (res.ok) {
        const data = await res.json();
        setDepots(data.depots || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await fetch(`${API_BASE}/recommendations`, {
        headers: { 'X-Tenant-ID': currentTenant }
      });
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
        headers: { 
          'Content-Type': 'application/json',
          'X-Tenant-ID': currentTenant 
        },
        body: JSON.stringify({ notes: 'Authorized by Elena Rostova from Fleet Command Center' })
      });
      if (res.ok) {
        fetchRecommendations();
        fetchKpis();
      }
    } catch (e) { console.error(e); }
  };

  const inspectVehicle = async (vehicleId) => {
    try {
      const res = await fetch(`${API_BASE}/vehicles/${vehicleId}/timeline`, {
        headers: { 'X-Tenant-ID': currentTenant }
      });
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
        headers: { 
          'Content-Type': 'application/json',
          'X-Tenant-ID': currentTenant 
        },
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
        headers: { 
          'Content-Type': 'application/json',
          'X-Tenant-ID': currentTenant 
        },
        body: JSON.stringify({ driver_id: erasureDriverId, reason: 'Right-to-be-forgotten GDPR/DPDP request' })
      });
      if (res.ok) {
        const data = await res.json();
        setErasureStatus(`Erasure request ${data.erasure_request_id} created in status PENDING. Driver PII successfully pseudonymized.`);
        setErasureDriverId('');
      }
    } catch (e) {
      setErasureStatus('Error submitting erasure request.');
    }
  };

  // Filter leaks logic
  const filteredLeaks = leaks.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      (item.license_plate && item.license_plate.toLowerCase().includes(q)) ||
      (item.vin && item.vin.toLowerCase().includes(q)) ||
      (item.depot_name && item.depot_name.toLowerCase().includes(q)) ||
      (item.make && item.make.toLowerCase().includes(q));

    const matchesRole = selectedRole === 'ALL' || item.leak_type_code === selectedRole;
    const matchesDepot = selectedDepot === 'ALL' || (item.depot_name && item.depot_name.includes(selectedDepot));
    const matchesSeverity = selectedSeverity === 'ALL' || item.severity === selectedSeverity;

    return matchesSearch && matchesRole && matchesDepot && matchesSeverity;
  });

  const pendingApprovalsCount = recommendations.filter(r => r.status === 'PENDING_APPROVAL').length;

  return (
    <div className="app-wrapper">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP ENTERPRISE PLATFORM HEADER                             */}
      {/* ------------------------------------------------------------- */}
      <header className="top-header">
        <div className="brand-box">
          <div className="brand-icon-square">
            <Truck className="w-5 h-5" />
          </div>
          <div className="brand-text">
            <h1>FleetLeak</h1>
            <p>Connected Vehicle Fuel, Idling & Energy Leak Intelligence</p>
          </div>
        </div>

        <div className="header-controls">
          <div className="operator-select-wrap">
            <span>FLEET:</span>
            <select 
              className="operator-select"
              value={currentTenant}
              onChange={(e) => setCurrentTenant(e.target.value)}
            >
              <option value="10000000-0000-0000-0000-000000000001">
                Apex Logistics Corp 01 (5,000 Vehicles · Chicago Hub)
              </option>
              <option value="10000000-0000-0000-0000-000000000002">
                Metro Freight Systems 02 (5,000 Vehicles · Dallas Hub)
              </option>
              <option value="10000000-0000-0000-0000-000000000003">
                TransEnergy Logistics 03 (5,000 Vehicles · Atlanta Hub)
              </option>
            </select>
          </div>

          <div className="status-pill">
            <span className="status-dot-green"></span>
            <span>TimescaleDB 16.13</span>
          </div>

          <div className="status-pill">
            <span className="status-dot-green"></span>
            <span>Gemini 3.8 Live LLM</span>
          </div>

          <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle Theme">
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>

          <div className="user-profile-box">
            <div className="user-profile-name">Elena Rostova</div>
            <div className="user-profile-role">VP Fleet Finance</div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. PRIMARY NAVIGATION BAR                                     */}
      {/* ------------------------------------------------------------- */}
      <nav className="primary-nav">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <BarChart3 className="w-4 h-4" />
          Executive Command Center
        </button>

        <button 
          onClick={() => setActiveTab('auditor')}
          className={`nav-tab-btn ${activeTab === 'auditor' ? 'active' : ''}`}
        >
          <Search className="w-4 h-4" />
          Active Leak Auditor
          <span className="nav-badge-pill">{leaks.length}</span>
        </button>

        <button 
          onClick={() => setActiveTab('depots')}
          className={`nav-tab-btn ${activeTab === 'depots' ? 'active' : ''}`}
        >
          <MapPin className="w-4 h-4" />
          Depot Energy Benchmarks
        </button>

        <button 
          onClick={() => setActiveTab('copilot')}
          className={`nav-tab-btn ${activeTab === 'copilot' ? 'active' : ''}`}
        >
          <Sliders className="w-4 h-4" />
          Guarded AI Copilot & Approval Queue
          {pendingApprovalsCount > 0 && (
            <span className="nav-badge-pill amber">{pendingApprovalsCount} Pending</span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('privacy')}
          className={`nav-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
        >
          <Lock className="w-4 h-4" />
          Governance & Privacy Shield
        </button>
      </nav>

      {/* ------------------------------------------------------------- */}
      {/* 3. MAIN WORKSPACE CONTENT                                     */}
      {/* ------------------------------------------------------------- */}
      <main className="page-container">

        {/* ============================================================= */}
        {/* VIEW 1: EXECUTIVE COMMAND CENTER (Intuitive Home Dashboard)   */}
        {/* ============================================================= */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-layout">
            
            {/* Top Stat Row: 4 Clean Square Cards */}
            <div className="grid-4-square">
              <div className="stat-square-card">
                <div className="stat-square-header">
                  <span className="stat-square-title">Monitored Fleet Size</span>
                  <Truck className="w-5 h-5" style={{ color: 'var(--primary-blue)' }} />
                </div>
                <div className="stat-square-val">
                  {kpis ? kpis.total_vehicles.toLocaleString() : '5,000'}
                </div>
                <div className="stat-square-desc">Class 1, 6 & 8 Connected Assets</div>
              </div>

              <div className="stat-square-card" style={{ borderColor: 'var(--accent-red-border)' }}>
                <div className="stat-square-header">
                  <span className="stat-square-title" style={{ color: 'var(--accent-red-text)' }}>Monthly Fuel & Idle Waste</span>
                  <DollarSign className="w-5 h-5" style={{ color: 'var(--accent-red-text)' }} />
                </div>
                <div className="stat-square-val" style={{ color: 'var(--accent-red-text)' }}>
                  ${kpis ? kpis.monthly_leak_cost_usd.toLocaleString() : '7,921.77'}
                </div>
                <div className="stat-square-desc">{kpis ? kpis.fuel_wasted_liters.toFixed(1) : '770.0'} Liters Burned in Off-Duty Idle</div>
              </div>

              <div className="stat-square-card" style={{ borderColor: 'var(--accent-green-border)' }}>
                <div className="stat-square-header">
                  <span className="stat-square-title" style={{ color: 'var(--accent-green-text)' }}>Recoverable Savings</span>
                  <TrendingDown className="w-5 h-5" style={{ color: 'var(--accent-green-text)' }} />
                </div>
                <div className="stat-square-val" style={{ color: 'var(--accent-green-text)' }}>
                  ${kpis ? kpis.recoverable_savings_usd.toLocaleString() : '1,563.00'}
                </div>
                <div className="stat-square-desc">From 3 AI Policy Recommendations</div>
              </div>

              <div className="stat-square-card">
                <div className="stat-square-header">
                  <span className="stat-square-title">Fleet Idle Runtime</span>
                  <Gauge className="w-5 h-5" style={{ color: 'var(--accent-amber-text)' }} />
                </div>
                <div className="stat-square-val" style={{ color: 'var(--accent-amber-text)' }}>
                  {kpis ? kpis.idle_fraction_percent : '12.8'}%
                </div>
                <div className="stat-square-desc">Depot Target: &lt; 5.0% of Total Runtime</div>
              </div>
            </div>

            {/* Middle Row: Two-Column Command Grid (Interactive Simulator + Live Alert Stream) */}
            <div className="grid-command-split">
              
              {/* Financial What-If Simulator Card */}
              <div className="simulator-card">
                <div className="sim-header">
                  <div>
                    <h3>
                      <Sliders className="w-5 h-5" style={{ color: 'var(--primary-blue)' }} />
                      Interactive Financial What-If Savings Simulator
                    </h3>
                    <p>Adjust idle reduction targets and diesel cost to forecast bottom-line dollar recovery</p>
                  </div>
                  <div className="sim-target-badge">
                    {reductionSlider}% IDLE CUT
                  </div>
                </div>

                <div className="slider-box">
                  <div className="slider-label-row">
                    <span>Target Idle Reduction: <strong>{reductionSlider}%</strong></span>
                    <span>Status Quo (0%) &rarr; Zero Idle (100%)</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="100" 
                    step="5"
                    value={reductionSlider} 
                    onChange={(e) => setReductionSlider(Number(e.target.value))}
                    className="range-slider"
                  />
                </div>

                <div className="slider-box">
                  <div className="slider-label-row">
                    <span>Projected Diesel Price: <strong>${fuelPriceSlider.toFixed(2)}/gal</strong></span>
                    <span>Range: $3.00 &rarr; $6.00</span>
                  </div>
                  <input 
                    type="range" 
                    min="3.00" 
                    max="6.00" 
                    step="0.05"
                    value={fuelPriceSlider} 
                    onChange={(e) => setFuelPriceSlider(Number(e.target.value))}
                    className="range-slider"
                  />
                </div>

                {/* 4 Metric Calculation Result Tiles */}
                <div className="sim-results-grid">
                  <div className="sim-result-box">
                    <div className="sim-result-label">Monthly Recovered</div>
                    <div className="sim-result-val" style={{ color: 'var(--accent-green-text)' }}>
                      ${(((kpis ? kpis.monthly_leak_cost_usd : 7921) * (reductionSlider / 100)) * (fuelPriceSlider / 3.85)).toFixed(2)}
                    </div>
                  </div>

                  <div className="sim-result-box">
                    <div className="sim-result-label">Annual Recovered</div>
                    <div className="sim-result-val" style={{ color: 'var(--primary-blue)' }}>
                      ${(((kpis ? kpis.monthly_leak_cost_usd : 7921) * (reductionSlider / 100) * 12) * (fuelPriceSlider / 3.85)).toFixed(2)}
                    </div>
                  </div>

                  <div className="sim-result-box">
                    <div className="sim-result-label">Diesel Conserved</div>
                    <div className="sim-result-val">
                      {((reductionSlider / 100) * 2050).toFixed(0)} Gal / mo
                    </div>
                  </div>

                  <div className="sim-result-box">
                    <div className="sim-result-label">CO2 Abatement</div>
                    <div className="sim-result-val" style={{ color: 'var(--accent-amber-text)' }}>
                      {((reductionSlider / 100) * 22.8).toFixed(1)} MT / yr
                    </div>
                  </div>
                </div>

                <div className="sim-footer">
                  <button 
                    onClick={() => {
                      setActiveTab('copilot');
                      handleSendChat(`Recommend an idle shutdown policy targeting a ${reductionSlider}% reduction.`);
                    }}
                    className="btn-square-blue"
                  >
                    <Sliders className="w-4 h-4" />
                    Stage AI Policy for {reductionSlider}% Idle Cut
                  </button>
                  <span className="sim-note">Policy requires Human Approval before ECU parameter dispatch</span>
                </div>
              </div>

              {/* Live Alerts Stream Card */}
              <div className="alerts-card">
                <div className="alerts-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: 'var(--accent-amber-text)' }} />
                    <h3>Live Telemetry Anomaly Stream</h3>
                  </div>
                  <button onClick={fetchAlerts} className="btn-square-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem' }}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="alerts-list">
                  {alerts.map((a, i) => (
                    <div key={i} className="alert-row">
                      <div className="alert-meta">
                        <span className={`match-badge ${a.severity === 'CRITICAL' ? 'badge-match-critical' : 'badge-match-high'}`}>
                          {a.severity}
                        </span>
                        <span className="alert-title">{a.title}</span>
                      </div>
                      <p className="alert-msg">{a.message}</p>
                      <div className="alert-footer">
                        <span className="alert-cost">-${a.estimated_cost_loss ? a.estimated_cost_loss.toFixed(2) : '3.50'} Loss</span>
                        <button 
                          onClick={() => {
                            setSearchQuery(a.title.includes('FL-') ? 'FL-' : '');
                            setActiveTab('auditor');
                          }}
                          className="btn-link"
                        >
                          Inspect Event &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Bottom Row: Top 5 Highest Loss Incidents Quick Table */}
            <div className="square-table-container">
              <div className="table-header-bar">
                <div>
                  <h3>Highest Loss Incidents Across Monitored Fleet</h3>
                  <p>Immediate operational attention required — excessive engine dwell and off-shift fuel burn</p>
                </div>
                <button 
                  onClick={() => setActiveTab('auditor')}
                  className="btn-square-secondary"
                >
                  View All {leaks.length} Incidents in Auditor &rarr;
                </button>
              </div>

              <table className="square-table">
                <thead>
                  <tr>
                    <th>Vehicle Asset</th>
                    <th>Anomaly Classification</th>
                    <th>Assigned Depot Hub</th>
                    <th>Excess Duration</th>
                    <th>Fuel Wasted</th>
                    <th>Financial Loss</th>
                    <th>Severity Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaks.slice(0, 6).map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.license_plate}</strong>
                        <span className="sub-asset-text">{item.make} {item.model}</span>
                      </td>
                      <td>
                        <span className="leak-type-badge">{item.leak_type_name || item.leak_type_code}</span>
                      </td>
                      <td>{item.depot_name}</td>
                      <td>{Math.round(item.duration_seconds / 60)} mins</td>
                      <td>{item.fuel_wasted_liters.toFixed(1)} L</td>
                      <td style={{ fontWeight: 800, color: 'var(--accent-red-text)' }}>
                        ${item.estimated_cost_loss.toFixed(2)}
                      </td>
                      <td>
                        <span className={`match-badge ${item.severity === 'CRITICAL' ? 'badge-match-critical' : (item.severity === 'HIGH' ? 'badge-match-high' : 'badge-match-100')}`}>
                          {item.severity}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => inspectVehicle(item.vehicle_id)}
                          className="btn-square-blue"
                          style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                        >
                          Inspect Asset
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ============================================================= */}
        {/* VIEW 2: ACTIVE LEAK AUDITOR (Dense, Searchable Fleet Table)   */}
        {/* ============================================================= */}
        {activeTab === 'auditor' && (
          <div className="auditor-layout">
            
            {/* Header + Stats */}
            <div className="section-banner">
              <div className="section-banner-title">
                <h2>Active Leak Auditor & Incident Ledger</h2>
                <p>Filter, search, and inspect all {leaks.length} connected vehicle fuel and idling leak events.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
                  className="btn-square-secondary"
                >
                  <Eye className="w-4 h-4" />
                  {viewMode === 'table' ? 'Card View' : 'Table View'}
                </button>
                <button onClick={loadAllData} className="btn-square-secondary">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>
            </div>

            {/* Clean Professional Filter Bar */}
            <div className="filter-card">
              <div className="filter-group">
                <label className="filter-label">SEARCH VEHICLES / VIN</label>
                <input 
                  type="text"
                  placeholder="Search license plate, VIN, vehicle model..."
                  className="filter-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">LEAK CLASSIFICATION</label>
                <select 
                  className="filter-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="ALL">All Classifications</option>
                  <option value="IDLE_EXCESS">Excessive Idling</option>
                  <option value="THEFT_SIPHON">Fuel Theft / Siphoning</option>
                  <option value="REEFER_DRIFT">Reefer Thermal Drift</option>
                  <option value="CARD_MISMATCH">Fuel Card Mismatch</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">DEPOT LOCATION</label>
                <select 
                  className="filter-select"
                  value={selectedDepot}
                  onChange={(e) => setSelectedDepot(e.target.value)}
                >
                  <option value="ALL">All Depot Terminals</option>
                  <option value="Chicago">Chicago Hub #1</option>
                  <option value="Dallas">Dallas Terminal #2</option>
                  <option value="Atlanta">Atlanta Regional</option>
                  <option value="Ontario">Ontario Depot</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">SEVERITY LEVEL</label>
                <select 
                  className="filter-select"
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical Loss</option>
                  <option value="HIGH">High Severity</option>
                  <option value="MEDIUM">Medium / Moderate</option>
                  <option value="LOW">Low Threshold</option>
                </select>
              </div>
            </div>

            {/* Table View (Default Dense Enterprise View) */}
            {viewMode === 'table' ? (
              <div className="square-table-container">
                <table className="square-table">
                  <thead>
                    <tr>
                      <th>Vehicle Asset & Class</th>
                      <th>Leak Classification</th>
                      <th>Assigned Depot</th>
                      <th>Duration</th>
                      <th>Fuel Wasted</th>
                      <th>Estimated Loss</th>
                      <th>Geohash Mask (Privacy)</th>
                      <th>Severity</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaks.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.license_plate}</strong>
                          <span className="sub-asset-text">{item.make} {item.model}</span>
                        </td>
                        <td>
                          <span className="leak-type-badge">{item.leak_type_name || item.leak_type_code}</span>
                        </td>
                        <td>{item.depot_name}</td>
                        <td>{Math.round(item.duration_seconds / 60)} mins</td>
                        <td>{item.fuel_wasted_liters.toFixed(1)} L</td>
                        <td style={{ fontWeight: 800, color: 'var(--accent-red-text)' }}>
                          ${item.estimated_cost_loss.toFixed(2)}
                          <span className="sub-asset-text">${(item.estimated_cost_loss * 30).toFixed(0)}/mo</span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {item.geohash_5 || 'dp3wm'}
                        </td>
                        <td>
                          <span className={`match-badge ${item.severity === 'CRITICAL' ? 'badge-match-critical' : (item.severity === 'HIGH' ? 'badge-match-high' : 'badge-match-100')}`}>
                            {item.severity}
                          </span>
                        </td>
                        <td>
                          <button 
                            onClick={() => inspectVehicle(item.vehicle_id)}
                            className="btn-square-blue"
                            style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                          >
                            Inspect Asset
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Card Grid View (Visual Cards) */
              <div className="card-grid-3">
                {filteredLeaks.map((item) => (
                  <div key={item.id} className="talentra-card">
                    <div>
                      <div className="card-top-row">
                        <div className="card-title">
                          {item.leak_type_name || item.leak_type_code} — {item.license_plate}
                        </div>
                        <span className={`match-badge ${item.severity === 'CRITICAL' ? 'badge-match-critical' : 'badge-match-100'}`}>
                          {item.severity}
                        </span>
                      </div>
                      <div className="card-subline">
                        {item.depot_name} · {item.make} {item.model}
                      </div>
                      <div className="card-description">
                        Continuous engine operation at 0 km/h with PTO disengaged for {Math.round(item.duration_seconds / 60)} minutes. Telemetry indicates fuel burn of {item.fuel_wasted_liters.toFixed(1)} L.
                      </div>
                      <div className="card-tags">
                        <span className="card-tag-pill">{item.make}</span>
                        <span className="card-tag-pill">{item.fuel_wasted_liters.toFixed(1)} L Burn</span>
                        <span className="card-tag-pill">Geohash: {item.geohash_5 || 'dp3wm'}</span>
                        <span className="card-tag-pill">Driver: Anonymized</span>
                      </div>
                    </div>
                    <div className="card-bottom-row">
                      <div className="card-metric-group">
                        <span className="card-metric-label">FINANCIAL LOSS</span>
                        <span className="card-metric-val">
                          ${item.estimated_cost_loss.toFixed(2)} Loss · ${(item.estimated_cost_loss * 30).toFixed(0)}/Mo
                        </span>
                      </div>
                      <button 
                        onClick={() => inspectVehicle(item.vehicle_id)}
                        className="btn-square-blue"
                      >
                        Inspect Asset
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* ============================================================= */}
        {/* VIEW 3: DEPOT ENERGY BENCHMARKS                               */}
        {/* ============================================================= */}
        {activeTab === 'depots' && (
          <div className="square-table-container">
            <div className="table-header-bar">
              <div>
                <h2>Cross-Depot Energy Waste & Idle Benchmarks</h2>
                <p>Compare regional operational terminal performance, total fuel losses, and fleet efficiency rankings</p>
              </div>
              <button onClick={fetchDepots} className="btn-square-secondary">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Depots
              </button>
            </div>

            <table className="square-table">
              <thead>
                <tr>
                  <th>Regional Depot Hub</th>
                  <th>Assigned Vehicles</th>
                  <th>Fuel Wasted</th>
                  <th>Relative Waste Severity</th>
                  <th>Total Loss Cost</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {depots.map((dep, idx) => {
                  const lossPct = Math.min(100, Math.max(12, (dep.total_leak_cost_usd / 2500) * 100));
                  return (
                    <tr key={idx}>
                      <td>
                        <strong>{dep.depot_name}</strong>
                      </td>
                      <td>{dep.assigned_vehicles} Commercial Units</td>
                      <td>{dep.total_fuel_wasted_liters.toFixed(1)} Liters</td>
                      <td style={{ width: '25%' }}>
                        <div style={{ background: 'var(--border-card)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${lossPct}%`, background: 'var(--primary-blue)', height: '100%', borderRadius: '4px' }}></div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--accent-red-text)', fontFamily: 'var(--font-mono)' }}>
                        ${dep.total_leak_cost_usd.toLocaleString()} Loss
                      </td>
                      <td>
                        <button 
                          onClick={() => {
                            setSelectedDepot(dep.depot_name.split(' ')[0]);
                            setActiveTab('auditor');
                          }}
                          className="btn-square-blue"
                          style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                        >
                          View Depot Leaks
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ============================================================= */}
        {/* VIEW 4: GUARDED AI COPILOT & HUMAN APPROVAL QUEUE             */}
        {/* ============================================================= */}
        {activeTab === 'copilot' && (
          <div className="copilot-grid">
            
            {/* Copilot Chat Assistant */}
            <div className="copilot-chat-card">
              <div className="chat-head">
                <div className="chat-head-title">
                  <Sliders className="w-5 h-5" style={{ color: 'var(--primary-blue)' }} />
                  Guarded AI Fleet Intelligence Copilot
                </div>
                <span className="badge-match-100">GEMINI 3.8 LIVE</span>
              </div>

              <div className="chat-body">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`chat-bubble ${msg.sender === 'user' ? 'user' : (msg.status === 'REFUSED' ? 'refused' : 'copilot')}`}>
                    <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>
                    {msg.latency && (
                      <div className="chat-audit-tag">
                        Latency: {msg.latency} ms | Audited to agent_action_log | Tenant Scoped
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Evaluating tools, tenant boundaries & running Gemini 3.8 Live...
                  </div>
                )}
              </div>

              {/* Quick Prompt Chips */}
              <div className="prompt-chips">
                <button onClick={() => handleSendChat("What are our top fuel leaks?")} className="prompt-chip-btn">
                  Top Fuel Leaks
                </button>
                <button onClick={() => handleSendChat("Which depots have the highest fuel leak cost?")} className="prompt-chip-btn">
                  Rank Depots by Cost
                </button>
                <button onClick={() => handleSendChat("If we cut idling by 35%, how much money do we save?")} className="prompt-chip-btn">
                  What-If 35% Reduction
                </button>
                <button onClick={() => handleSendChat("Recommend an auto-shutdown policy for Chicago depot")} className="prompt-chip-btn">
                  Stage Policy Recommendation
                </button>
              </div>

              {/* Chat Input Bar */}
              <div className="chat-input-row">
                <input 
                  type="text"
                  placeholder="Ask copilot about fleet leaks, idle waste, or cost recovery..."
                  className="chat-text-input"
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                />
                <button onClick={() => handleSendChat()} disabled={chatLoading} className="btn-square-blue">
                  <Send className="w-4 h-4" /> Send
                </button>
              </div>
            </div>

            {/* Human Approval Queue */}
            <div className="approval-list-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck className="w-5 h-5" style={{ color: 'var(--accent-green-text)' }} />
                    Human Approval Queue
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Guarded AI recommendations requiring explicit Finance Manager authorization
                  </p>
                </div>
                <button onClick={fetchRecommendations} className="btn-square-secondary" style={{ padding: '4px 8px' }}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {recommendations.map((rec) => (
                <div key={rec.id} className="approval-item">
                  <div className="approval-item-top">
                    <span className="approval-item-title">{rec.title}</span>
                    <span className={`match-badge ${rec.status === 'APPROVED' ? 'badge-match-100' : 'badge-match-high'}`}>
                      {rec.status}
                    </span>
                  </div>
                  <div className="approval-item-desc">{rec.proposed_action}</div>
                  <div className="approval-item-footer">
                    <span style={{ fontWeight: 800, color: 'var(--accent-green-text)', fontSize: '0.82rem' }}>
                      +${rec.projected_monthly_savings.toFixed(2)}/mo
                    </span>
                    {rec.status === 'PENDING_APPROVAL' ? (
                      <button 
                        onClick={() => handleApproveRecommendation(rec.id)}
                        className="btn-square-blue"
                        style={{ padding: '5px 12px', fontSize: '0.72rem' }}
                      >
                        Approve Action
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent-green-text)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                        <CheckCircle2 className="w-4 h-4" /> Authorized
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ============================================================= */}
        {/* VIEW 5: GOVERNANCE, GDPR & PRIVACY SHIELD                     */}
        {/* ============================================================= */}
        {activeTab === 'privacy' && (
          <div className="copilot-grid">
            <div className="stat-square-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock className="w-5 h-5" style={{ color: 'var(--primary-blue)' }} />
                Driver Right-to-Erasure (GDPR / DPDP Compliance)
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Submits formal pseudonymization request. Driver employee codes, contact numbers, and pgcrypto credentials will be purged while preserving aggregated fleet metrics.
              </p>

              <form onSubmit={handleErasureSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Driver ID / Employee Code
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. f0000000-0000-0000-0000-000000000001"
                    className="filter-input"
                    value={erasureDriverId}
                    onChange={(e) => setErasureDriverId(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-square-blue" style={{ justifyContent: 'center' }}>
                  Initiate Cryptographic Erasure
                </button>
              </form>

              {erasureStatus && (
                <div style={{ background: 'var(--accent-green-bg)', border: '1px solid var(--accent-green-border)', borderRadius: '4px', padding: '12px', fontSize: '0.78rem', color: 'var(--accent-green-text)' }}>
                  {erasureStatus}
                </div>
              )}
            </div>

            <div className="stat-square-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database className="w-5 h-5" style={{ color: 'var(--accent-green-text)' }} />
                STRIDE Threat Model & Compliance Controls
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent-green-text)', flexShrink: 0 }} />
                  <div><strong style={{ color: 'var(--text-main)' }}>Spoofed Devices:</strong> mTLS client certificate verification at gateway edge.</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent-green-text)', flexShrink: 0 }} />
                  <div><strong style={{ color: 'var(--text-main)' }}>Replay Attacks:</strong> L1 Bloom filter + Redis SETNX natural key dedupe.</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent-green-text)', flexShrink: 0 }} />
                  <div><strong style={{ color: 'var(--text-main)' }}>Cross-Tenant Leakage:</strong> PostgreSQL Row-Level Security (RLS) on tenant_id.</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent-green-text)', flexShrink: 0 }} />
                  <div><strong style={{ color: 'var(--text-main)' }}>Prompt Injection:</strong> Guardrail input defense treating all text as untrusted data.</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent-green-text)', flexShrink: 0 }} />
                  <div><strong style={{ color: 'var(--text-main)' }}>Location Privacy:</strong> Driver GPS coordinates masked to Geohash-5 for non-privileged roles.</div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ------------------------------------------------------------- */}
      {/* 4. VEHICLE DRILL-DOWN INSPECTION MODAL                        */}
      {/* ------------------------------------------------------------- */}
      {selectedVehicleModal && (
        <div className="modal-overlay" onClick={() => setSelectedVehicleModal(null)}>
          <div className="modal-square-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Vehicle Inspection: {selectedVehicleModal.vehicle.license_plate}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  VIN: {selectedVehicleModal.vehicle.vin} | {selectedVehicleModal.vehicle.make} {selectedVehicleModal.vehicle.model} ({selectedVehicleModal.vehicle.year})
                </p>
              </div>
              <button onClick={() => setSelectedVehicleModal(null)} className="btn-square-secondary" style={{ padding: '6px' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div className="sim-result-box">
                <div className="sim-result-label">Assigned Hub</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {selectedVehicleModal.vehicle.depot_name}
                </div>
              </div>
              <div className="sim-result-box">
                <div className="sim-result-label">Propulsion Class</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {selectedVehicleModal.vehicle.vehicle_class}
                </div>
              </div>
              <div className="sim-result-box">
                <div className="sim-result-label">Daily Lease Cost</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-blue)', marginTop: '4px' }}>
                  ${selectedVehicleModal.vehicle.daily_lease_cost}/day
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
              Recent Telemetry Incident History
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {selectedVehicleModal.leak_history.map((lh, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: '4px', fontSize: '0.78rem' }}>
                  <span>{new Date(lh.started_at).toLocaleDateString()}</span>
                  <span className={`match-badge ${lh.severity === 'CRITICAL' ? 'badge-match-critical' : 'badge-match-high'}`}>
                    {lh.severity}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-red-text)' }}>
                    -${lh.estimated_cost_loss.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer-bar">
        FleetLeak Enterprise &copy; 2026 SRM x Talenciaglobal Connected Vehicle Intelligence Platform. Fully Compliant with PostgreSQL 16 TimescaleDB & GDPR/DPDP Privacy Shield.
      </footer>
    </div>
  );
}
