import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Layers,
  Sliders,
  Flame,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  RefreshCw,
  Gauge,
  Thermometer,
  Zap,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Cpu,
  BarChart3,
  HardHat,
  Droplets,
  Play,
  RotateCcw,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
  ChevronDown,
  Check,
  X,
  Database,
  Award,
  MapPin,
  Truck,
  DollarSign,
  Radio,
  FileText,
  Menu,
  Home,
  SlidersHorizontal,
  Compass,
  Sun,
  Eye,
  Settings,
  Download,
  Printer,
  Calendar,
  Filter,
  Wrench,
  History,
  LifeBuoy
} from 'lucide-react';
import { api } from './services/api';
import WellDigitalTwin3D from './components/digital_twin_viz/WellDigitalTwin3D';
import ReservoirThermalTwin from './components/digital_twin_viz/ReservoirThermalTwin';
import WhatIfSimulator from './components/digital_twin_viz/WhatIfSimulator';
import CssOptimization from './components/optimization/CssOptimization';
import SrpOptimization from './components/optimization/SrpOptimization';
import RodPumpHealth from './components/health_monitoring/RodPumpHealth';
import PredictiveMaintenanceRUL from './components/health_monitoring/PredictiveMaintenanceRUL';
import AIModelRegistry from './components/AIModelRegistry';
import SteamEnergyEconomics from './components/optimization/SteamEnergyEconomics';
import HistoricalAnalysis from './components/analytics/HistoricalAnalysis';
import ProductionAnalytics from './components/analytics/ProductionAnalytics';
import AnomalyAlertCenter from './components/alerts/AnomalyAlertCenter';
import TechnicalDossier from './components/reports/TechnicalDossier';
import { generateTechnicalDossierPDF } from './services/pdfReportGenerator';
import BaghewalaSatelliteMap from './components/dashboard/BaghewalaSatelliteMap';
import LandingPage from './pages/LandingPage';
import './index.css';

// 37 Comprehensive Official Baghewala Field Wells across 6 Multi-Well Drilling Pads
const MASTER_BAGHEWALA_WELLS = [
  // Sector NK (North Heavy Oil Cluster)
  { id: 'NK-07', name: 'NK-07', pad: 'Pad-NK (North Field)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'NK-68', name: 'NK-68', pad: 'Pad-NK (North Field)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'NK-75', name: 'NK-75', pad: 'Pad-NK (North Field)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'NK-76', name: 'NK-76', pad: 'Pad-NK (North Field)', status: 'INJECTION', lift: 'CSS' },
  { id: 'NK-82', name: 'NK-82', pad: 'Pad-NK (North Field)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'NK-91', name: 'NK-91', pad: 'Pad-NK (North Field)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'NK-93', name: 'NK-93', pad: 'Pad-NK (North Field)', status: 'SOAKING', lift: 'CSS' },

  // Pad-01 (North-Jodhpur Sector)
  { id: 'B-01', name: 'B-01', pad: 'Pad-1 (North-Jodhpur)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-02', name: 'B-02', pad: 'Pad-1 (North-Jodhpur)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-03', name: 'B-03', pad: 'Pad-1 (North-Jodhpur)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-04', name: 'B-04', pad: 'Pad-1 (North-Jodhpur)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-05', name: 'B-05', pad: 'Pad-1 (North-Jodhpur)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-06', name: 'B-06', pad: 'Pad-1 (North-Jodhpur)', status: 'PRODUCING', lift: 'SRP' },

  // Pad-02 (Central-GGS Sector)
  { id: 'B-07', name: 'B-07', pad: 'Pad-2 (Central-GGS)', status: 'INJECTION', lift: 'CSS' },
  { id: 'B-08', name: 'B-08', pad: 'Pad-2 (Central-GGS)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-09', name: 'B-09', pad: 'Pad-2 (Central-GGS)', status: 'SOAKING', lift: 'CSS' },
  { id: 'B-10', name: 'B-10', pad: 'Pad-2 (Central-GGS)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-11', name: 'B-11', pad: 'Pad-2 (Central-GGS)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-12', name: 'B-12', pad: 'Pad-2 (Central-GGS)', status: 'PRODUCING', lift: 'SRP' },

  // Pad-03 (South-Extension Sector)
  { id: 'B-13', name: 'B-13', pad: 'Pad-3 (South-Extension)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-14', name: 'B-14', pad: 'Pad-3 (South-Extension)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-15', name: 'B-15', pad: 'Pad-3 (South-Extension)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-16', name: 'B-16', pad: 'Pad-3 (South-Extension)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-17', name: 'B-17', pad: 'Pad-3 (South-Extension)', status: 'INJECTION', lift: 'CSS' },
  { id: 'B-18', name: 'B-18', pad: 'Pad-3 (South-Extension)', status: 'PRODUCING', lift: 'SRP' },

  // Pad-04 (East-Sandstone Sector)
  { id: 'B-19', name: 'B-19', pad: 'Pad-4 (East-Sandstone)', status: 'SOAKING', lift: 'CSS' },
  { id: 'B-20', name: 'B-20', pad: 'Pad-4 (East-Sandstone)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-21', name: 'B-21', pad: 'Pad-4 (East-Sandstone)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-22', name: 'B-22', pad: 'Pad-4 (East-Sandstone)', status: 'INJECTION', lift: 'CSS' },
  { id: 'B-23', name: 'B-23', pad: 'Pad-4 (East-Sandstone)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-24', name: 'B-24', pad: 'Pad-4 (East-Sandstone)', status: 'PRODUCING', lift: 'SRP' },

  // Pad-05 (Deep Jodhpur Sector)
  { id: 'B-25', name: 'B-25', pad: 'Pad-5 (Deep Jodhpur)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-26', name: 'B-26', pad: 'Pad-5 (Deep Jodhpur)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-27', name: 'B-27', pad: 'Pad-5 (Deep Jodhpur)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-28', name: 'B-28', pad: 'Pad-5 (Deep Jodhpur)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-29', name: 'B-29', pad: 'Pad-5 (Deep Jodhpur)', status: 'PRODUCING', lift: 'SRP' },
  { id: 'B-30', name: 'B-30', pad: 'Pad-5 (Deep Jodhpur)', status: 'PRODUCING', lift: 'SRP' },
];

export default function App() {
  // Cinematic Landing / Loading Screen State
  const [showLanding, setShowLanding] = useState(true);

  // Navigation State - Hierarchy matching user specifications
  const [activeNav, setActiveNav] = useState('main_dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedWellId, setSelectedWellId] = useState('B-17');
  const [userRole, setUserRole] = useState('Field Operator');
  
  const handleNavSelect = (navKey) => {
    setActiveNav(navKey);
    setMobileMenuOpen(false);
  };
  
  // Real Data State from Backend
  const [wells, setWells] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [twinState, setTwinState] = useState(null);
  const [dynoData, setDynoData] = useState(null);
  const [mechanicsData, setMechanicsData] = useState(null);
  const [depthProfileData, setDepthProfileData] = useState(null);
  const [asphalteneData, setAsphalteneData] = useState(null);
  const [cutoffData, setCutoffData] = useState(null);
  const [economicsData, setEconomicsData] = useState(null);
  const [failureRiskData, setFailureRiskData] = useState(null);
  const [cssHistory, setCssHistory] = useState([]);
  const [workoverLogs, setWorkoverLogs] = useState([]);
  const [customSinkerVisc, setCustomSinkerVisc] = useState(7000);
  const [customSinkerResult, setCustomSinkerResult] = useState(null);
  const [isSizingSinker, setIsSizingSinker] = useState(false);
  const [fleetData, setFleetData] = useState(null);
  const [gisData, setGisData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isBackendLive, setIsBackendLive] = useState(false);

  // Map Controls State
  const [mapMode, setMapMode] = useState('Satellite'); // 'Satellite', 'Terrain', 'Field Plan'
  const [mapLayers, setMapLayers] = useState({
    wells: true,
    productionLines: true,
    steamLines: true,
    facilities: true,
    thermalZones: true,
    reservoirBoundary: true
  });
  const [showLayersDropdown, setShowLayersDropdown] = useState(true);

  // Dashboard Controls
  const [chartTimeframe, setChartTimeframe] = useState('30D');
  const [tableFilter, setTableFilter] = useState('All Wells');
  const [thermalView, setThermalView] = useState('Subsurface');
  const [balanceUnits, setBalanceUnits] = useState('Imperial'); // Imperial vs Metric
  const [activityFilter, setActivityFilter] = useState('All Activities');
  const [chartHover, setChartHover] = useState(null);

  // Simulation State (What-If)
  const [cssSimSteam, setCssSimSteam] = useState(1600);
  const [cssSimPressure, setCssSimPressure] = useState(42);
  const [cssSimSoakHours, setCssSimSoakHours] = useState(48);
  const [cssSimResult, setCssSimResult] = useState(null);
  const [isSimulatingCss, setIsSimulatingCss] = useState(false);

  const [srpSimSpm, setSrpSimSpm] = useState(4.2);
  const [srpSimStroke, setSrpSimStroke] = useState(72);
  const [srpSimVfd, setSrpSimVfd] = useState(42);
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [isEvaluatingWhatIf, setIsEvaluatingWhatIf] = useState(false);

  const [actionInProgress, setActionInProgress] = useState(null);

  // Field-Wide Production Analytics & Comparison State
  const [analyticsSearch, setAnalyticsSearch] = useState('');
  const [analyticsSectorFilter, setAnalyticsSectorFilter] = useState('All Sectors');
  const [analyticsLiftFilter, setAnalyticsLiftFilter] = useState('All Lift Types');
  const [analyticsStatusFilter, setAnalyticsStatusFilter] = useState('All Statuses');
  const [analyticsSortCol, setAnalyticsSortCol] = useState('bopd');
  const [analyticsSortAsc, setAnalyticsSortAsc] = useState(false);
  const [isRefreshingAnalytics, setIsRefreshingAnalytics] = useState(false);

  // CSV Export for Field-Wide Well Comparison Matrix
  const exportFieldComparisonCSV = (records) => {
    if (!records || !records.length) return;
    const headers = [
      'Well ID',
      'Sector',
      'Lift Mechanism',
      'Status',
      'Daily Oil (BOPD)',
      'Water Cut (%)',
      'Monthly Cum (m3)',
      'Total Cum Oil (m3)',
      'Cum Steam (tonnes)',
      'SOR (t/m3)',
      'Decline Rate (%/wk)',
      'Floating Risk (%)',
      'SPM',
      'Stroke Length (m)'
    ];
    const rows = records.map((w) => [
      w.id || w.well_id,
      `"${w.sector || 'Main'}"`,
      `"${w.mode || w.lift_mechanism || 'SRP'}"`,
      w.state || w.status || 'PRODUCING',
      w.bopd ?? 0,
      w.water_cut_pct ?? 0,
      w.monthly_cum_oil_m3 ?? 0,
      w.cum_oil_m3 ?? 0,
      w.cum_steam_tonnes ?? w.total_cum_steam_tonnes ?? 0,
      w.sor ?? 0,
      w.decline_rate_pct_wk ?? 0,
      w.rod_floating_risk_pct ?? 0,
      w.spm ?? 0,
      w.stroke_length_m ?? 0
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `baghewala_field_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefreshAnalytics = async () => {
    setIsRefreshingAnalytics(true);
    try {
      const data = await api.getFieldProductionAnalytics(selectedWellId, chartTimeframe);
      if (data) {
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Failed to refresh analytics:', err);
    } finally {
      setIsRefreshingAnalytics(false);
    }
  };

  // Live IST Clock & PDF Feedback
  const [pdfToast, setPdfToast] = useState(null);
  const [currentTime, setCurrentTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' };
      setCurrentTime(now.toLocaleString('en-IN', options) + ' IST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize App on Mount
  useEffect(() => {
    initApp();
  }, []);

  // Reload well data on selection change
  useEffect(() => {
    if (selectedWellId) {
      loadSelectedWellData(selectedWellId);
    }
  }, [selectedWellId]);

  // Periodic Refresh for Real-time telemetry (every 15s)
  useEffect(() => {
    const poll = setInterval(() => {
      if (selectedWellId) {
        api.getLiveDashboard(selectedWellId, chartTimeframe)
          .then((dash) => { if (dash) setDashboardData(dash); })
          .catch(() => {});
      }
    }, 15000);
    return () => clearInterval(poll);
  }, [selectedWellId, chartTimeframe]);

  const initApp = async () => {
    setLoading(true);
    try {
      await api.checkHealth();
      setIsBackendLive(true);

      const wellList = await api.getWells();
      if (Array.isArray(wellList) && wellList.length > 0) {
        setWells(wellList);
      }

      const [metrics, fleet, gis, dash] = await Promise.all([
        api.getModelMetrics().catch(() => null),
        api.getFleetSchedule().catch(() => null),
        api.getGisMap().catch(() => null),
        api.getLiveDashboard('B-17', '30D').catch(() => null)
      ]);
      setModelMetrics(metrics);
      setFleetData(fleet);
      setGisData(gis);
      if (dash) setDashboardData(dash);
    } catch (err) {
      console.error('Init error:', err);
      setIsBackendLive(false);
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedWellData = async (wellId) => {
    try {
      const [
        dash,
        state,
        dyno,
        mechanics,
        profile,
        asphaltene,
        cutoff,
        econ,
        risk,
        cssHist,
        recs,
        failures
      ] = await Promise.all([
        api.getLiveDashboard(wellId, chartTimeframe).catch(() => null),
        api.getDigitalTwinState(wellId).catch(() => null),
        api.getDynoCard(wellId).catch(() => null),
        api.getMechanicsDiagnostics(wellId).catch(() => null),
        api.getWellboreDepthProfile(wellId).catch(() => null),
        api.getAsphalteneRisk(wellId).catch(() => null),
        api.getCssCutoff(wellId).catch(() => null),
        api.getEconomics(wellId).catch(() => null),
        api.getFailureRisk(wellId).catch(() => null),
        api.getCSSHistory(wellId).catch(() => []),
        api.getRecommendations(wellId).catch(() => []),
        api.getWellFailures(wellId).catch(() => [])
      ]);

      if (dash) setDashboardData(dash);
      setTwinState(state);
      setDynoData(dyno);
      setMechanicsData(mechanics);
      setDepthProfileData(profile);
      setAsphalteneData(asphaltene);
      setCutoffData(cutoff);
      setEconomicsData(econ);
      setFailureRiskData(risk);
      setCssHistory(Array.isArray(cssHist) ? cssHist : []);
      setRecommendations(recs || []);
      setWorkoverLogs(Array.isArray(failures) ? failures : []);

      if (state?.srp) {
        setSrpSimSpm(state.srp.spm || 4.2);
        setSrpSimStroke(state.srp.stroke_length_in || 72);
        setSrpSimVfd(state.srp.vfd_frequency_hz || 42);
      }
      if (state?.reservoir?.viscosity_cp) {
        setCustomSinkerVisc(Math.round(state.reservoir.viscosity_cp));
      }
    } catch (err) {
      console.error('Error loading well data:', err);
    }
  };

  // Interactive Live Sinker Bar Sizing Tool
  const handleSizeSinkerLive = async () => {
    setIsSizingSinker(true);
    try {
      const res = await api.sizeSinkerBars(selectedWellId, {
        viscosity_cp: customSinkerVisc,
        target_min_mprl_kn: 14.0,
        spm: twinState?.srp?.spm || 4.2,
        stroke_length_in: twinState?.srp?.stroke_length_in || 72
      });
      setCustomSinkerResult(res);
    } catch (e) {
      console.error('Error sizing sinker bars:', e);
    } finally {
      setIsSizingSinker(false);
    }
  };


  // Run What-If Simulation
  const handleRunWhatIf = async () => {
    setIsEvaluatingWhatIf(true);
    try {
      const payload = {
        well_id: selectedWellId,
        spm: srpSimSpm,
        stroke_length_in: srpSimStroke,
        vfd_frequency_hz: srpSimVfd,
        steam_injection_ton: cssSimSteam,
        injection_pressure_ksc: Number((cssSimPressure / 0.980665).toFixed(1)),
        soak_days: Number((cssSimSoakHours / 24.0).toFixed(1)),
        injection_days: 15.0,
        production_days: 45.0,
        reservoir_temperature_c: twinState?.reservoir?.temperature_c || 67.4,
        reservoir_pressure_ksc: 102.0,
        rod_load_lb: 13500.0,
        water_cut_fraction: 0.24
      };
      const res = await api.runPrediction(payload);
      setWhatIfResult(res.predictions);
    } catch (err) {
      console.error('What-if prediction error:', err);
    } finally {
      setIsEvaluatingWhatIf(false);
    }
  };

  // Operator Action on Recommendation
  const handleAcknowledge = async (recId, status) => {
    setActionInProgress(recId);
    try {
      const updated = await api.acknowledgeRecommendation(recId, status, `Operator marked as ${status} at ${currentTime}`);
      setRecommendations((prev) => prev.map((r) => (r.recommendation_id === recId ? updated : r)));
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  // Live Data Fallbacks from dashboardData
  const fieldOutput = dashboardData?.field_output || {
    oil_production_bopd: 1842,
    oil_target_bopd: 1750,
    oil_delta_pct: 6.2,
    water_cut_pct: 24,
    water_cut_target_pct: 30,
    water_cut_delta_pct: -2.0,
    steam_injection_bpd: 3260,
    steam_target_bpd: 3000,
    steam_delta_pct: 4.0,
    active_wells: 14,
    total_wells: 16,
    reservoir_temp_c: 76,
    reservoir_temp_delta_c: 3.0
  };

  // Export Technical Dossier (PDF/CSV/Print)
  const handleExport = (format) => {
    if (format === 'print') {
      window.print();
    } else if (format === 'pdf') {
      try {
        const res = generateTechnicalDossierPDF({
          selectedWellId,
          userRole,
          currentTime,
          fieldOutput,
          twinState,
          economicsData,
          recentActivities: filteredActivities
        });
        const fname = typeof res === 'string' ? res : (res?.filename || `Baghewala_Technical_Dossier_${selectedWellId}.pdf`);
        setPdfToast(`Official Technical Dossier PDF generated: ${fname}`);
        setTimeout(() => setPdfToast(null), 6000);
      } catch (err) {
        console.error('Failed to generate PDF:', err);
        setPdfToast('Failed to generate PDF. Check console.');
        setTimeout(() => setPdfToast(null), 5000);
      }
    } else {
      const content = `BAGHEWALA FIELD DIGITAL TWIN - DOSSIER\nGenerated: ${currentTime}\nWell: ${selectedWellId}\nOil Production: ${fieldOutput?.oil_production_bopd || 1842} BOPD\nSteam Injection: ${fieldOutput?.steam_injection_bpd || 3260} BPD\nSOR: 3.2\nReservoir Temp: ${fieldOutput?.reservoir_temp_c || 76}°C\nActive Wells: ${fieldOutput?.active_wells || 14}/16`;
      const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Baghewala_${selectedWellId}_Report_${Date.now()}.${format === 'csv' ? 'csv' : 'txt'}`;
      a.click();
    }
  };

  const wellPins = dashboardData?.well_pins || [
    { id: 'B-03', name: 'B-03', type: 'SRP', bopd: 142, steam: null, temp: 68, top: '22%', left: '30%', status: 'PRODUCING' },
    { id: 'B-07', name: 'B-07', type: 'CSS', bopd: 112, steam: 380, temp: 78, top: '29%', left: '44%', status: 'INJECTION' },
    { id: 'B-09', name: 'B-09', type: 'CSS', bopd: 148, steam: null, temp: 71, top: '42%', left: '55%', status: 'SOAK' },
    { id: 'B-12', name: 'B-12', type: 'CSS', bopd: 186, steam: 360, temp: 82, top: '40%', left: '21%', status: 'PRODUCING' },
    { id: 'B-14', name: 'B-14', type: 'SRP', bopd: 98, steam: null, temp: 66, top: '53%', left: '16%', status: 'PRODUCING' },
    { id: 'B-17', name: 'B-17', type: 'CSS + SRP', bopd: 192, steam: 420, temp: 80, top: '50%', left: '42%', status: 'INJECTION' },
    { id: 'B-19', name: 'B-19', type: 'CSS', bopd: 148, steam: 390, temp: 76, top: '51%', left: '53%', status: 'SOAK' },
    { id: 'B-21', name: 'B-21', type: 'SRP', bopd: 104, steam: null, temp: 66, top: '63%', left: '57%', status: 'PRODUCING' }
  ];

  const wellStatusList = dashboardData?.well_status_list || [
    { id: 'B-03', mode: 'SRP', bopd: 142, steam: '-', temp: 68, state: 'Producing', dot: 'dot-producing' },
    { id: 'B-05', mode: 'SRP', bopd: 98, steam: '-', temp: 64, state: 'Producing', dot: 'dot-producing' },
    { id: 'B-07', mode: 'CSS', bopd: 112, steam: '380', temp: 78, state: 'Injection', dot: 'dot-injection' },
    { id: 'B-09', mode: 'CSS', bopd: 0, steam: '-', temp: 71, state: 'Soak', dot: 'dot-soak' },
    { id: 'B-12', mode: 'CSS', bopd: 186, steam: '360', temp: 82, state: 'Producing', dot: 'dot-producing' },
    { id: 'B-14', mode: 'SRP', bopd: 98, steam: '-', temp: 66, state: 'Producing', dot: 'dot-producing' },
    { id: 'B-17', mode: 'CSS + SRP', bopd: 192, steam: '420', temp: 80, state: 'Injection', dot: 'dot-injection' },
    { id: 'B-19', mode: 'CSS', bopd: 148, steam: '390', temp: 76, state: 'Soak', dot: 'dot-soak' },
    { id: 'B-21', mode: 'SRP', bopd: 104, steam: '-', temp: 66, state: 'Producing', dot: 'dot-producing' },
    { id: 'B-22', mode: 'Injector', bopd: 0, steam: '310', temp: 72, state: 'Injection', dot: 'dot-injection' }
  ];

  const filteredWellStatus = wellStatusList.filter((w) => {
    if (tableFilter === 'All Wells') return true;
    if (tableFilter === 'CSS') return w.mode.includes('CSS');
    if (tableFilter === 'SRP') return w.mode.includes('SRP');
    if (tableFilter === 'Injector') return w.mode.includes('Injector') || w.state === 'Injection';
    if (tableFilter === 'Producer') return w.state === 'Producing';
    return true;
  });

  const rawActivities = dashboardData?.recent_activities || [
    { time: '14:28', well: 'B-17', action: 'Injection cycle active', detail: 'Steam 420 BPD | Pressure 24.8 bar', type: 'injection' },
    { time: '13:52', well: 'B-12', action: 'Production increase', detail: '+18% from previous cycle', type: 'production' },
    { time: '12:17', well: 'Field', action: 'Steam manifold pressure adjusted', detail: 'From 25.1 to 24.8 bar', type: 'facility' },
    { time: '11:06', well: 'Reservoir', action: 'Thermal front update', detail: 'B-17: +3.2 m | B-12: +2.1 m', type: 'thermal' },
    { time: '09:33', well: 'B-09', action: 'Soak period started', detail: 'Planned duration: 7 days', type: 'soak' },
    { time: '08:14', well: 'CPF', action: 'Oil export stable', detail: 'Current rate: 1,842 BOPD', type: 'export' }
  ];

  const filteredActivities = rawActivities.filter((a) => {
    if (activityFilter === 'All Activities') return true;
    if (activityFilter === 'Wells') return a.well.startsWith('B-');
    if (activityFilter === 'Steam') return a.type === 'injection' || a.action.toLowerCase().includes('steam');
    if (activityFilter === 'Facilities') return a.well === 'CPF' || a.well === 'Field';
    return true;
  });

  const prodResp = dashboardData?.production_response || {
    dates: ['28 Aug', '31 Aug', '3 Sep', '6 Sep', '9 Sep', '12 Sep', '15 Sep', '18 Sep', '21 Sep', '24 Sep', '26 Sep'],
    oil_production_bopd: [142, 146, 150, 153, 158, 170, 182, 190, 195, 202, 212],
    steam_injection_bpd: [210, 240, 270, 260, 310, 390, 420, 435, 440, 445, 450],
    water_cut_pct: [34, 32, 30, 29, 28, 26, 25, 24, 24, 23, 22],
    annotation: { date: '10 Sep', label: 'B-17 Injection Started', value: '420 BPD' }
  };

  // Monotone Cubic Spline Generator for smooth organic graph curves
  const getSmoothSvgPath = (points) => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) return `M ${points[0][0]},${points[0][1]}`;
    if (points.length === 2) return `M ${points[0][0]},${points[0][1]} L ${points[1][0]},${points[1][1]}`;

    let d = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  };

  // Generates smooth area fill beneath a spline curve
  const getSmoothAreaPath = (points, baselineY = 140) => {
    if (!points || points.length === 0) return '';
    const linePath = getSmoothSvgPath(points);
    const firstX = points[0][0];
    const lastX = points[points.length - 1][0];
    return `${linePath} L ${lastX},${baselineY} L ${firstX},${baselineY} Z`;
  };

  // Dynamic Sparkline Generator for Telemetry Cards with smooth curves & area gradients
  const renderSparkline = (values, strokeColor, labels = ['30d ago', 'Today']) => {
    if (!values || values.length === 0) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 190;
    const height = 45;
    const padX = 12;
    const padY = 8;
    const step = (width - 2 * padX) / Math.max(1, values.length - 1);
    
    const points = values.map((v, i) => [
      padX + i * step,
      padY + (height - 2 * padY) * (1 - (v - min) / range)
    ]);
    
    const linePath = getSmoothSvgPath(points);
    const areaPath = getSmoothAreaPath(points, 52);
    const gradId = `sparkGrad_${Math.abs(strokeColor.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0))}`;

    return (
      <svg width="100%" height="70" viewBox="0 0 200 70" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.32" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} className="animated-graph-area" />
        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animated-graph-line" />
        {points.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="2.8"
            fill={strokeColor}
            stroke="#ffffff"
            strokeWidth="0.8"
            className="graph-interactive-dot"
          />
        ))}
        <text x="10" y="68" fill="#78716c" fontSize="8" fontWeight="600">{labels[0]}</text>
        <text x="145" y="68" fill="#78716c" fontSize="8" fontWeight="600">{labels[1]}</text>
      </svg>
    );
  };

  // Dyno Card SVG Renderer
  const renderDynoSvg = (points, width = 340, height = 200, color = 'var(--accent-amber)') => {
    if (!points || points.length === 0) return <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Calculating Card...</div>;
    const maxPos = Math.max(...points.map((p) => p.position_in), 72);
    const maxLoad = Math.max(...points.map((p) => p.load_kn), 90);
    const minLoad = Math.min(...points.map((p) => p.load_kn), 10);
    const loadRange = Math.max(10, maxLoad - minLoad);

    const pad = 25;
    const plotW = width - pad * 2;
    const plotH = height - pad * 2;

    const pathData = points
      .map((p, i) => {
        const x = pad + (p.position_in / maxPos) * plotW;
        const y = pad + plotH - ((p.load_kn - minLoad) / loadRange) * plotH;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ') + ' Z';

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: `${width}px`, height: 'auto', overflow: 'visible' }}>
        <line x1={pad} y1={pad} x2={pad} y2={pad + plotH} stroke="#c7baa7" />
        <line x1={pad} y1={pad + plotH} x2={pad + plotW} y2={pad + plotH} stroke="#c7baa7" />
        <path d={pathData} fill="rgba(217, 119, 6, 0.15)" stroke={color} strokeWidth="2.5" className="animated-dynacard-curve" />
        <text x={pad} y={pad - 6} fill="#574b3d" fontSize="10" fontWeight="700">{maxLoad.toFixed(0)} kN</text>
        <text x={pad} y={pad + plotH + 15} fill="#574b3d" fontSize="10">{minLoad.toFixed(0)} kN</text>
        <text x={pad + plotW - 15} y={pad + plotH + 15} fill="#574b3d" fontSize="10">{maxPos.toFixed(0)}"</text>
      </svg>
    );
  };

  return (
    <div className="app-container">
      {/* Cinematic Telemetry Landing/Loading Screen */}
      {showLanding && (
        <LandingPage onEnterDashboard={() => setShowLanding(false)} />
      )}

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div className="mobile-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* 1. Left Hierarchical Navigation Sidebar */}
      <aside className={`left-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Category: 🏠 COMMAND CENTER */}
        <div className="sidebar-category-block">
          <div className="sidebar-category-title">Command Center</div>
          <button
            className={`sidebar-subitem-btn ${activeNav === 'main_dashboard' ? 'active' : ''}`}
            onClick={() => handleNavSelect('main_dashboard')}
            title="Main Dashboard"
          >
            <Home size={16} />
            <span className="sidebar-subitem-label">Main Dashboard</span>
          </button>
          <button
            className="sidebar-subitem-btn"
            onClick={() => setShowLanding(true)}
            title="Replay Loading / Telemetry Intro"
          >
            <Play size={16} />
            <span className="sidebar-subitem-label">Intro / Loading Page</span>
          </button>
        </div>

        {/* Category: 🧬 DIGITAL TWIN */}
        <div className="sidebar-category-block">
          <div className="sidebar-category-title">Digital Twin</div>
          <button
            className={`sidebar-subitem-btn ${activeNav === 'twin_surface' ? 'active' : ''}`}
            onClick={() => handleNavSelect('twin_surface')}
            title="Well-to-Surface Twin"
          >
            <Activity size={16} />
            <span className="sidebar-subitem-label">Well-to-Surface Twin</span>
          </button>
          <button
            className={`sidebar-subitem-btn ${activeNav === 'twin_thermal' ? 'active' : ''}`}
            onClick={() => handleNavSelect('twin_thermal')}
            title="Reservoir / Thermal Twin"
          >
            <Compass size={16} />
            <span className="sidebar-subitem-label">Reservoir / Thermal</span>
          </button>
          <button
            className={`sidebar-subitem-btn ${activeNav === 'twin_whatif' ? 'active' : ''}`}
            onClick={() => handleNavSelect('twin_whatif')}
            title="What-If Simulation"
          >
            <Cpu size={16} />
            <span className="sidebar-subitem-label">What-If Simulation</span>
          </button>
        </div>

        {/* Category: ⚙️ OPTIMIZATION */}
        <div className="sidebar-category-block">
          <div className="sidebar-category-title">Optimization</div>
          <button
            className={`sidebar-subitem-btn ${activeNav === 'opt_css' ? 'active' : ''}`}
            onClick={() => handleNavSelect('opt_css')}
            title="CSS Optimization"
          >
            <Flame size={16} />
            <span className="sidebar-subitem-label">CSS Optimization</span>
          </button>
          <button
            className={`sidebar-subitem-btn ${activeNav === 'opt_srp' ? 'active' : ''}`}
            onClick={() => handleNavSelect('opt_srp')}
            title="SRP Optimization"
          >
            <Gauge size={16} />
            <span className="sidebar-subitem-label">SRP Optimization</span>
          </button>
          <button
            className={`sidebar-subitem-btn ${activeNav === 'opt_energy' ? 'active' : ''}`}
            onClick={() => handleNavSelect('opt_energy')}
            title="Steam & Energy"
          >
            <Zap size={16} />
            <span className="sidebar-subitem-label">Steam &amp; Energy</span>
          </button>
        </div>

        {/* Category: 🛡️ HEALTH & MONITORING */}
        <div className="sidebar-category-block">
          <div className="sidebar-category-title">Health &amp; Monitoring</div>
          <button
            className={`sidebar-subitem-btn ${activeNav === 'health_rod_pump' ? 'active' : ''}`}
            onClick={() => handleNavSelect('health_rod_pump')}
            title="Rod & Pump Health"
          >
            <ShieldCheck size={16} />
            <span className="sidebar-subitem-label">Rod &amp; Pump Health</span>
          </button>
          <button
            className={`sidebar-subitem-btn ${activeNav === 'health_alerts' ? 'active' : ''}`}
            onClick={() => handleNavSelect('health_alerts')}
            title="Anomaly & Alerts"
          >
            <AlertTriangle size={16} />
            <span className="sidebar-subitem-label">Anomaly &amp; Alerts</span>
          </button>
          <button
            className={`sidebar-subitem-btn ${activeNav === 'health_pdm' ? 'active' : ''}`}
            onClick={() => handleNavSelect('health_pdm')}
            title="Predictive Maintenance"
          >
            <Wrench size={16} />
            <span className="sidebar-subitem-label">Predictive Maint.</span>
          </button>
        </div>

        {/* Category: 📊 ANALYTICS */}
        <div className="sidebar-category-block">
          <div className="sidebar-category-title">Analytics</div>
          <button
            className={`sidebar-subitem-btn ${activeNav === 'analytics_production' ? 'active' : ''}`}
            onClick={() => handleNavSelect('analytics_production')}
            title="Production Analytics"
          >
            <BarChart3 size={16} />
            <span className="sidebar-subitem-label">Production Analytics</span>
          </button>
          <button
            className={`sidebar-subitem-btn ${activeNav === 'analytics_predictions' ? 'active' : ''}`}
            onClick={() => handleNavSelect('analytics_predictions')}
            title="AI Predictions"
          >
            <Sparkles size={16} />
            <span className="sidebar-subitem-label">AI Predictions</span>
          </button>
          <button
            className={`sidebar-subitem-btn ${activeNav === 'analytics_historical' ? 'active' : ''}`}
            onClick={() => handleNavSelect('analytics_historical')}
            title="Historical Analysis"
          >
            <History size={16} />
            <span className="sidebar-subitem-label">Historical Analysis</span>
          </button>
          <button
            className={`sidebar-subitem-btn ${activeNav === 'analytics_timeline' ? 'active' : ''}`}
            onClick={() => handleNavSelect('analytics_timeline')}
            title="Operations Timeline (under Historical Analysis)"
            style={{ paddingLeft: '1.85rem', fontSize: '0.74rem' }}
          >
            <Clock size={13} style={{ opacity: 0.8 }} />
            <span className="sidebar-subitem-label">↳ Operations Timeline</span>
          </button>
        </div>



        {/* Category: 📑 REPORTING */}
        <div className="sidebar-category-block">
          <div className="sidebar-category-title">Reporting</div>
          <button
            className={`sidebar-subitem-btn ${activeNav === 'reporting_dossier' ? 'active' : ''}`}
            onClick={() => handleNavSelect('reporting_dossier')}
            title="Technical Dossier"
          >
            <FileText size={16} />
            <span className="sidebar-subitem-label">Technical Dossier</span>
          </button>
        </div>

        {/* Category: ⚙️ SYSTEM */}
        <div className="sidebar-category-block">
          <div className="sidebar-category-title">System</div>
          <button
            className={`sidebar-subitem-btn ${activeNav === 'system_settings' ? 'active' : ''}`}
            onClick={() => handleNavSelect('system_settings')}
            title="Settings"
          >
            <Settings size={16} />
            <span className="sidebar-subitem-label">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Top Panoramic Desert Header */}
        <header className="top-header-banner">
          <div className="brand-section-desert">
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  setMobileMenuOpen(!mobileMenuOpen);
                } else {
                  setSidebarCollapsed(!sidebarCollapsed);
                }
              }}
              style={{ background: 'transparent', border: 'none', color: '#92400e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Toggle Sidebar"
            >
              <Menu size={22} />
            </button>
            <div>
              <div className="title-primary">BAGHEWALA FIELD</div>
              <div className="title-secondary">DIGITAL TWIN &amp; AI OPTIMIZATION</div>
              <div className="title-location">HEAVY OIL (17°–19° API) &bull; RAJASTHAN, INDIA</div>
            </div>
            <button
              onClick={() => setShowLanding(true)}
              title="Replay Cinematic Uplink & Loading Video"
              style={{
                marginLeft: '0.6rem',
                background: 'rgba(217, 119, 6, 0.12)',
                border: '1px solid rgba(217, 119, 6, 0.35)',
                color: '#92400e',
                borderRadius: '9999px',
                padding: '0.22rem 0.6rem',
                fontSize: '0.62rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(217, 119, 6, 0.25)';
                e.currentTarget.style.borderColor = '#d97706';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(217, 119, 6, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(217, 119, 6, 0.35)';
              }}
            >
              <Play size={10} fill="#92400e" />
              <span>REPLAY INTRO</span>
            </button>
          </div>

          <div className="header-meta-group">
            {/* Live Well Selector Dropdown */}
            <div className="header-well-box">
              <span style={{ fontSize: '0.62rem', color: '#b45309', fontWeight: 800, letterSpacing: '0.04em' }}>WELL:</span>
              <select
                value={selectedWellId}
                onChange={(e) => setSelectedWellId(e.target.value)}
                style={{
                  background: 'transparent',
                  color: '#2b1d0c',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                  outline: 'none',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {['Pad-NK (North Field)', 'Pad-1 (North-Jodhpur)', 'Pad-2 (Central-GGS)', 'Pad-3 (South-Extension)', 'Pad-4 (East-Sandstone)', 'Pad-5 (Deep Jodhpur)'].map((padGroup) => {
                  const padWells = MASTER_BAGHEWALA_WELLS.filter((w) => w.pad === padGroup);
                  return (
                    <optgroup key={padGroup} label={`── ${padGroup.toUpperCase()} ──`} style={{ background: '#1c150e', color: '#ea580c', fontWeight: 800 }}>
                      {padWells.map((w) => {
                        const dynamicWell = wells && wells.find((dw) => (dw.well_name === w.id || dw.name === w.id || dw.id === w.id));
                        const status = dynamicWell?.status || w.status;
                        const lift = dynamicWell?.lift_type || dynamicWell?.lift_mechanism || w.lift;
                        return (
                          <option key={w.id} value={w.id} style={{ background: '#241d16', color: '#f5f5f4' }}>
                            Well {w.id} ({lift} • {status})
                          </option>
                        );
                      })}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            {/* Live Clock */}
            <div className="header-clock-box">
              <Clock size={12} color="#b45309" />
              <span>
                {currentTime || '26 Sep 2026 14:32:00 IST'}
              </span>
            </div>

            {/* Weather */}
            <div className="header-weather-box">
              <Sun size={13} color="#ea580c" />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span className="weather-temp">32°C</span>
                <span className="weather-sub">Rajasthan (26.3°N, 73.2°E)</span>
              </div>
            </div>

            {/* Quick Action: Official 4-Page PDF Report */}
            <button
              onClick={() => handleExport('pdf')}
              title="Generate & Download Official 4-Page Technical Dossier (OIL India Ltd Standard)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.85rem',
                background: 'linear-gradient(135deg, #9a3412 0%, #c2410c 100%)',
                color: '#ffffff',
                border: '1px solid rgba(217, 119, 6, 0.45)',
                borderRadius: '8px',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(154, 52, 18, 0.35)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(154, 52, 18, 0.55)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(154, 52, 18, 0.35)';
              }}
            >
              <FileText size={12} strokeWidth={2.5} />
              <span>OFFICIAL PDF DOSSIER</span>
            </button>
          </div>
        </header>

        {/* Global PDF Notification Toast */}
        {pdfToast && (
          <div
            style={{
              margin: '0.65rem 1.5rem 0 1.5rem',
              padding: '0.65rem 1.25rem',
              background: 'linear-gradient(135deg, rgba(236, 253, 245, 0.98), rgba(209, 250, 229, 0.98))',
              border: '1px solid #10b981',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
              zIndex: 100
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#065f46', fontSize: '0.82rem', fontWeight: 700 }}>
              <CheckCircle size={16} color="#059669" />
              <span>{pdfToast}</span>
            </div>
            <button
              onClick={() => setPdfToast(null)}
              style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', display: 'flex' }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Dynamic View Rendering based on activeNav */}
        <div className="dashboard-grid-layout">
          {/* ========================================================================= */}
          {/* 1. 🏠 COMMAND CENTER - MAIN DASHBOARD */}
          {/* ========================================================================= */}
          {activeNav === 'main_dashboard' && (
            <>
              {/* Upper Section Grid: Field Map + Field Output + Recent Activity */}
              <div className="upper-grid">
                {/* 1. Interactive Desert Satellite Map Card */}
                <BaghewalaSatelliteMap
                  wellPins={wells && wells.length > 0 ? wells : wellPins}
                  selectedWellId={selectedWellId}
                  onSelectWell={(wellId) => {
                    setSelectedWellId(wellId);
                    loadSelectedWellData(wellId);
                  }}
                  mapMode={mapMode}
                  setMapMode={setMapMode}
                  mapLayers={mapLayers}
                  setMapLayers={setMapLayers}
                />


                {/* 2. FIELD OUTPUT KPI Panel */}
                <div className="sandstone-card">
                  <div className="card-title-bar">
                    <div className="card-heading-bold">FIELD OUTPUT</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                      <span style={{ fontSize: '0.8rem' }}>●</span> LIVE &bull; 14:32 IST
                    </div>
                  </div>

                  {/* Oil Production */}
                  <div className="output-metric-block">
                    <div className="metric-label-row">
                      <span className="metric-tag">OIL PRODUCTION</span>
                      <span className="metric-delta up">+{fieldOutput.oil_delta_pct}% vs. last 7 days</span>
                    </div>
                    <div className="metric-main-value">{fieldOutput.oil_production_bopd.toLocaleString()} BOPD</div>
                    <div className="metric-target-text">Target {fieldOutput.oil_target_bopd.toLocaleString()}</div>
                    <div className="progress-track-sand">
                      <div className="progress-fill-bar" style={{ width: `${Math.min(100, Math.round((fieldOutput.oil_production_bopd / 2200) * 100))}%`, background: '#78350f' }} />
                    </div>
                  </div>

                  {/* Water Cut */}
                  <div className="output-metric-block">
                    <div className="metric-label-row">
                      <span className="metric-tag">WATER CUT</span>
                      <span className="metric-delta up">{fieldOutput.water_cut_delta_pct}% vs. last 7 days</span>
                    </div>
                    <div className="metric-main-value">{fieldOutput.water_cut_pct} %</div>
                    <div className="metric-target-text">Target &le; {fieldOutput.water_cut_target_pct}%</div>
                    <div className="progress-track-sand">
                      <div className="progress-fill-bar" style={{ width: `${fieldOutput.water_cut_pct}%`, background: '#451a03' }} />
                    </div>
                  </div>

                  {/* Steam Injection */}
                  <div className="output-metric-block">
                    <div className="metric-label-row">
                      <span className="metric-tag">STEAM INJECTION</span>
                      <span className="metric-delta up">+{fieldOutput.steam_delta_pct}% vs. last 7 days</span>
                    </div>
                    <div className="metric-main-value">{fieldOutput.steam_injection_bpd.toLocaleString()} BPD</div>
                    <div className="metric-target-text">Target {fieldOutput.steam_target_bpd.toLocaleString()}</div>
                    <div className="progress-track-sand">
                      <div className="progress-fill-bar" style={{ width: `${Math.min(100, Math.round((fieldOutput.steam_injection_bpd / 3500) * 100))}%`, background: '#ea580c' }} />
                    </div>
                  </div>

                  {/* Active Wells & Reservoir Temp */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                    <div>
                      <div className="metric-tag">ACTIVE WELLS</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{fieldOutput.active_wells} / {fieldOutput.total_wells}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="metric-tag">RESERVOIR TEMP (AVG)</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                        {fieldOutput.reservoir_temp_c} °C <span style={{ fontSize: '0.7rem', color: 'var(--accent-orange)' }}>+{fieldOutput.reservoir_temp_delta_c}°C vs. 30 days</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. RECENT ACTIVITY & FIELD BALANCE Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Recent Activity Card */}
                  <div className="sandstone-card" style={{ padding: '0.9rem', flex: 1 }}>
                    <div className="card-title-bar">
                      <div className="card-heading-bold">RECENT ACTIVITY</div>
                      <select
                        value={activityFilter}
                        onChange={(e) => setActivityFilter(e.target.value)}
                        style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        <option value="All Activities">All Activities</option>
                        <option value="Wells">Wells</option>
                        <option value="Steam">Steam</option>
                        <option value="Facilities">Facilities</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '180px', overflowY: 'auto' }}>
                      {filteredActivities.map((act, i) => (
                        <div key={i} className="activity-item">
                          <span className="activity-time">{act.time}</span>
                          <div className="activity-text">
                            <strong>{act.well}</strong> &bull; {act.action}<br />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{act.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Field Balance */}
                  <div className="sandstone-card" style={{ padding: '0.9rem' }}>
                    <div className="card-title-bar">
                      <div className="card-heading-bold">FIELD BALANCE (CURRENT)</div>
                      <button
                        onClick={() => setBalanceUnits(balanceUnits === 'Imperial' ? 'Metric' : 'Imperial')}
                        className="badge"
                        style={{ background: '#ede4d6', color: 'var(--text-muted)', fontSize: '0.65rem', border: 'none', cursor: 'pointer' }}
                      >
                        UNITS: {balanceUnits}
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Oil Production</span>
                        <div style={{ width: '70px', height: '6px', background: '#d8cdbf', borderRadius: '3px' }}>
                          <div style={{ width: '85%', height: '100%', background: '#78350f', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontWeight: 700, minWidth: '70px', textAlign: 'right' }}>
                          {balanceUnits === 'Imperial' ? `${fieldOutput.oil_production_bopd.toLocaleString()} BOPD` : `${(fieldOutput.oil_production_bopd * 0.159).toFixed(0)} m³/d`}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Water Cut</span>
                        <div style={{ width: '70px', height: '6px', background: '#d8cdbf', borderRadius: '3px' }}>
                          <div style={{ width: `${fieldOutput.water_cut_pct}%`, height: '100%', background: '#451a03', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontWeight: 700, minWidth: '70px', textAlign: 'right' }}>{fieldOutput.water_cut_pct} %</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Steam Injection</span>
                        <div style={{ width: '70px', height: '6px', background: '#d8cdbf', borderRadius: '3px' }}>
                          <div style={{ width: '92%', height: '100%', background: '#ea580c', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontWeight: 700, minWidth: '70px', textAlign: 'right' }}>
                          {balanceUnits === 'Imperial' ? `${fieldOutput.steam_injection_bpd.toLocaleString()} BPD` : `${(fieldOutput.steam_injection_bpd * 0.159).toFixed(0)} t/d`}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Fuel Gas</span>
                        <div style={{ width: '70px', height: '6px', background: '#d8cdbf', borderRadius: '3px' }}>
                          <div style={{ width: '45%', height: '100%', background: '#78716c', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontWeight: 700, minWidth: '70px', textAlign: 'right' }}>0.42 MMSCFD</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI Strip (10 Main Dashboard KPIs - Dynamic from Backend Physics & ML Models) */}
              <div className="kpi-grid-10">
                <div className="kpi-tile">
                  <div className="kpi-tile-header">Total Active Wells <CheckCircle size={14} color="#b45309" /></div>
                  <div className="kpi-tile-val">{fieldOutput.active_wells} / {fieldOutput.total_wells}</div>
                  <div className="kpi-tile-sub">Field uptime {((fieldOutput.active_wells / Math.max(1, fieldOutput.total_wells)) * 100).toFixed(1)}%</div>
                </div>
                <div className="kpi-tile">
                  <div className="kpi-tile-header">Oil Production <Droplets size={14} color="#78350f" /></div>
                  <div className="kpi-tile-val">
                    {twinState?.surface?.oil_rate_bopd !== undefined ? twinState.surface.oil_rate_bopd : fieldOutput.oil_production_bopd.toLocaleString()}{' '}
                    <span style={{ fontSize: '0.8rem' }}>BOPD</span>
                  </div>
                  <div className="kpi-tile-sub" style={{ color: '#b45309' }}>
                    {selectedWellId} rate: {twinState?.surface?.oil_rate_m3_day ? `${twinState.surface.oil_rate_m3_day} m³/d` : '+6.2% vs target'}
                  </div>
                </div>
                <div className="kpi-tile">
                  <div className="kpi-tile-header">Steam Injection <Flame size={14} color="#ea580c" /></div>
                  <div className="kpi-tile-val">
                    {twinState?.reservoir?.cumulative_steam_injected_ton !== undefined ? `${Math.round(twinState.reservoir.cumulative_steam_injected_ton)}` : fieldOutput.steam_injection_bpd.toLocaleString()}{' '}
                    <span style={{ fontSize: '0.8rem' }}>{twinState?.reservoir?.cumulative_steam_injected_ton !== undefined ? 't' : 'BPD'}</span>
                  </div>
                  <div className="kpi-tile-sub">Cycle #{cutoffData?.cycle_number || 4} ({cutoffData?.cycle_status || 'Active'})</div>
                </div>
                <div className="kpi-tile">
                  <div className="kpi-tile-header">Average SOR <Sliders size={14} color="#b45309" /></div>
                  <div className="kpi-tile-val">
                    {(twinState?.surface?.sor !== undefined ? Number(twinState.surface.sor) : (economicsData?.energy_kpi?.sor !== undefined ? Number(economicsData.energy_kpi.sor) : 3.20)).toFixed(2)}{' '}
                    <span style={{ fontSize: '0.8rem' }}>t/m³</span>
                  </div>
                  <div className="kpi-tile-sub" style={{ color: (twinState?.surface?.sor || 3.2) <= 3.5 ? '#b45309' : '#ea580c' }}>
                    {(twinState?.surface?.sor || 3.2) <= 3.5 ? 'Optimal thermal ratio' : 'High steam duty'}
                  </div>
                </div>
                <div className="kpi-tile">
                  <div className="kpi-tile-header">Energy Consumption <Zap size={14} color="#f59e0b" /></div>
                  <div className="kpi-tile-val">
                    {(twinState?.surface?.energy_kwh_bbl !== undefined ? Number(twinState.surface.energy_kwh_bbl) : (economicsData?.energy_kpi?.kwh_per_bbl !== undefined ? Number(economicsData.energy_kpi.kwh_per_bbl) : 38.4)).toFixed(1)}{' '}
                    <span style={{ fontSize: '0.8rem' }}>kWh/bbl</span>
                  </div>
                  <div className="kpi-tile-sub">Duty: {(twinState?.srp?.power_kw || 7.1).toFixed(1)} kW</div>
                </div>
                <div className="kpi-tile">
                  <div className="kpi-tile-header">Avg Reservoir Temp <Thermometer size={14} color="#ef4444" /></div>
                  <div className="kpi-tile-val">
                    {(twinState?.reservoir?.temperature_c !== undefined ? Number(twinState.reservoir.temperature_c) : fieldOutput.reservoir_temp_c).toFixed(1)}{' '}
                    <span style={{ fontSize: '0.8rem' }}>°C</span>
                  </div>
                  <div className="kpi-tile-sub" style={{ color: '#ea580c' }}>
                    Visc: {Math.round(twinState?.reservoir?.viscosity_cp || 1850).toLocaleString()} cP
                  </div>
                </div>
                <div className="kpi-tile">
                  <div className="kpi-tile-header">Avg Pump Efficiency <Gauge size={14} color="#0284c7" /></div>
                  <div className="kpi-tile-val">
                    {(twinState?.srp?.pump_volumetric_efficiency_pct !== undefined ? Number(twinState.srp.pump_volumetric_efficiency_pct) : 74.2).toFixed(1)}{' '}
                    <span style={{ fontSize: '0.8rem' }}>%</span>
                  </div>
                  <div className="kpi-tile-sub">SPM: {(twinState?.srp?.spm || 4.2).toFixed(1)} | Str: {(twinState?.srp?.stroke_length_in || 72)}"</div>
                </div>
                <div className="kpi-tile">
                  <div className="kpi-tile-header">Active Alerts <AlertTriangle size={14} color="#dc2626" /></div>
                  <div className="kpi-tile-val" style={{ color: (recommendations.length > 0 || (twinState?.active_alerts?.length || 0) > 0) ? '#dc2626' : '#b45309' }}>
                    {recommendations.length || (twinState?.active_alerts?.length || 0)}{' '}
                    <span style={{ fontSize: '0.8rem' }}>Alerts</span>
                  </div>
                  <div className="kpi-tile-sub">
                    {recommendations[0]?.title ? recommendations[0].title.substring(0, 22) + '...' : `Well ${selectedWellId} monitored`}
                  </div>
                </div>
                <div className="kpi-tile">
                  <div className="kpi-tile-header">Rod Failure Risk <ShieldCheck size={14} color="#ea580c" /></div>
                  <div className="kpi-tile-val" style={{ color: (failureRiskData?.components?.sucker_rod_string?.risk_score || twinState?.srp?.rod_floating_risk_pct || 28) > 40 ? '#dc2626' : '#ea580c' }}>
                    {failureRiskData?.components?.sucker_rod_string?.risk_score !== undefined ? Math.round(failureRiskData.components.sucker_rod_string.risk_score) : (twinState?.srp?.rod_floating_risk_pct !== undefined ? Math.round(twinState.srp.rod_floating_risk_pct) : 28)}{' '}
                    <span style={{ fontSize: '0.8rem' }}>%</span>
                  </div>
                  <div className="kpi-tile-sub">
                    {failureRiskData?.components?.sucker_rod_string?.tier || ((twinState?.srp?.rod_floating_risk_pct || 28) > 30 ? 'Floating Risk' : 'Normal Tension')}
                  </div>
                </div>
                <div className="kpi-tile">
                  <div className="kpi-tile-header">Pump Failure Risk <Activity size={14} color="#b45309" /></div>
                  <div className="kpi-tile-val" style={{ color: (failureRiskData?.components?.subsurface_pump?.risk_score || 18) > 40 ? '#dc2626' : '#b45309' }}>
                    {failureRiskData?.components?.subsurface_pump?.risk_score !== undefined ? Math.round(failureRiskData.components.subsurface_pump.risk_score) : 18}{' '}
                    <span style={{ fontSize: '0.8rem' }}>%</span>
                  </div>
                  <div className="kpi-tile-sub">
                    {failureRiskData?.components?.subsurface_pump?.tier ? `${failureRiskData.components.subsurface_pump.tier} wear tier` : 'Low mechanical wear'}
                  </div>
                </div>
              </div>

              {/* Lower Section Grid: Production Chart + Well Status + Thermal Zones */}
              <div className="lower-grid">
                {/* 1. PRODUCTION & STEAM RESPONSE Chart */}
                <div className="sandstone-card">
                  <div className="card-title-bar">
                    <div className="card-heading-bold">PRODUCTION &amp; STEAM RESPONSE</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', background: 'rgba(237, 228, 214, 0.6)', borderRadius: '4px', padding: '2px', border: '1px solid var(--border-color)' }}>
                        {['7D', '30D', '90D', '1Y'].map((t) => (
                          <button
                            key={t}
                            onClick={() => {
                              setChartTimeframe(t);
                              api.getLiveDashboard(selectedWellId, t).then((d) => { if (d) setDashboardData(d); });
                            }}
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              background: chartTimeframe === t ? '#3d1a08' : 'transparent',
                              color: chartTimeframe === t ? '#fff' : 'var(--text-secondary)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Well: <strong>{selectedWellId}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Chart Legend with Color Swatches */}
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.65rem', fontWeight: 600, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ea580c', border: '1px solid #fff' }} /> Steam Injection (BPD)
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3d1a08', border: '1px solid #fff' }} /> Oil Production (BOPD)
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#57534e', border: '1px solid #fff' }} /> Water Cut (%)
                    </span>
                  </div>

                  {/* Dual-Axis Spline Area/Line Chart */}
                  <div style={{ background: 'transparent', position: 'relative', width: '100%', overflowX: 'auto' }}>
                    {(() => {
                      const dates = prodResp.dates || ['28 Aug', '31 Aug', '3 Sep', '6 Sep', '9 Sep', '12 Sep', '15 Sep', '18 Sep', '21 Sep', '24 Sep', '26 Sep'];
                      const numPoints = dates.length;
                      const startX = 38;
                      const endX = 490;
                      const stepX = (endX - startX) / Math.max(1, numPoints - 1);
                      const baseY = 140;

                      const steamRaw = prodResp.steam_injection_bpd || [210, 240, 270, 260, 310, 390, 420, 435, 440, 445, 450];
                      const oilRaw = prodResp.oil_production_bopd || [142, 146, 150, 153, 158, 170, 182, 190, 195, 202, 212];
                      const waterRaw = prodResp.water_cut_pct || [34, 32, 30, 29, 28, 26, 25, 24, 24, 23, 22];

                      const steamPts = steamRaw.map((v, i) => [startX + i * stepX, Math.max(22, baseY - (v / 500) * 115)]);
                      const oilPts = oilRaw.map((v, i) => [startX + i * stepX, Math.max(28, baseY - (v / 250) * 96)]);
                      const waterPts = waterRaw.map((v, i) => [startX + i * stepX, Math.max(40, baseY - (v / 100) * 85)]);

                      const eventIndex = 4; // ~10 Sep
                      const eventX = startX + eventIndex * stepX;

                      return (
                        <svg width="100%" height="165" viewBox="0 0 530 165" style={{ overflow: 'visible', minWidth: '460px' }}>
                          <defs>
                            {/* Layer 1: Steam Injection Orange Amber Gradient */}
                            <linearGradient id="mainSteamGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
                              <stop offset="60%" stopColor="#ea580c" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.0" />
                            </linearGradient>

                            {/* Layer 2: Oil Production Deep Warm Coffee Gradient */}
                            <linearGradient id="mainOilGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3d1a08" stopOpacity="0.48" />
                              <stop offset="65%" stopColor="#451a03" stopOpacity="0.22" />
                              <stop offset="100%" stopColor="#451a03" stopOpacity="0.04" />
                            </linearGradient>

                            {/* Layer 3: Water Cut Slate Gray Gradient */}
                            <linearGradient id="mainWaterGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#57534e" stopOpacity="0.3" />
                              <stop offset="80%" stopColor="#78716c" stopOpacity="0.08" />
                              <stop offset="100%" stopColor="#78716c" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Subtle Dotted Horizontal Grid Lines */}
                          <line x1="32" y1="25" x2="495" y2="25" stroke="rgba(140, 110, 80, 0.22)" strokeDasharray="3,3" />
                          <line x1="32" y1="54" x2="495" y2="54" stroke="rgba(140, 110, 80, 0.22)" strokeDasharray="3,3" />
                          <line x1="32" y1="83" x2="495" y2="83" stroke="rgba(140, 110, 80, 0.22)" strokeDasharray="3,3" />
                          <line x1="32" y1="112" x2="495" y2="112" stroke="rgba(140, 110, 80, 0.22)" strokeDasharray="3,3" />
                          <line x1="32" y1="140" x2="495" y2="140" stroke="rgba(140, 110, 80, 0.35)" />

                          {/* Left Y-Axis Ticks */}
                          <line x1="32" y1="25" x2="28" y2="25" stroke="#a89a85" />
                          <line x1="32" y1="54" x2="28" y2="54" stroke="#a89a85" />
                          <line x1="32" y1="83" x2="28" y2="83" stroke="#a89a85" />
                          <line x1="32" y1="112" x2="28" y2="112" stroke="#a89a85" />
                          <line x1="32" y1="140" x2="28" y2="140" stroke="#a89a85" />

                          {/* Left Y-Axis Numeric Labels */}
                          <text x="24" y="28" fill="#6b5845" fontSize="8" fontWeight="700" textAnchor="end">2,500</text>
                          <text x="24" y="57" fill="#6b5845" fontSize="8" fontWeight="700" textAnchor="end">2,000</text>
                          <text x="24" y="86" fill="#6b5845" fontSize="8" fontWeight="700" textAnchor="end">1,500</text>
                          <text x="24" y="115" fill="#6b5845" fontSize="8" fontWeight="700" textAnchor="end">1,000</text>
                          <text x="24" y="143" fill="#6b5845" fontSize="8" fontWeight="700" textAnchor="end">0</text>

                          {/* Right Y-Axis Ticks & Numeric Labels */}
                          <line x1="495" y1="25" x2="499" y2="25" stroke="#a89a85" />
                          <line x1="495" y1="54" x2="499" y2="54" stroke="#a89a85" />
                          <line x1="495" y1="83" x2="499" y2="83" stroke="#a89a85" />
                          <line x1="495" y1="112" x2="499" y2="112" stroke="#a89a85" />
                          <line x1="495" y1="140" x2="499" y2="140" stroke="#a89a85" />

                          <text x="504" y="28" fill="#6b5845" fontSize="8" fontWeight="700">80</text>
                          <text x="504" y="57" fill="#6b5845" fontSize="8" fontWeight="700">60</text>
                          <text x="504" y="86" fill="#6b5845" fontSize="8" fontWeight="700">40</text>
                          <text x="504" y="115" fill="#6b5845" fontSize="8" fontWeight="700">20</text>
                          <text x="504" y="143" fill="#6b5845" fontSize="8" fontWeight="700">0</text>

                          {/* 1. Steam Injection (Top Orange Curve with Area Gradient) */}
                          <path
                            d={getSmoothAreaPath(steamPts, baseY)}
                            fill="url(#mainSteamGrad)"
                            className="animated-graph-area"
                          />
                          <path
                            d={getSmoothSvgPath(steamPts)}
                            fill="none"
                            stroke="#ea580c"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="animated-graph-line"
                          />

                          {/* 2. Oil Production (Middle Dark Brown Curve with Area Gradient) */}
                          <path
                            d={getSmoothAreaPath(oilPts, baseY)}
                            fill="url(#mainOilGrad)"
                            className="animated-graph-area"
                          />
                          <path
                            d={getSmoothSvgPath(oilPts)}
                            fill="none"
                            stroke="#3d1a08"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="animated-graph-line"
                          />

                          {/* 3. Water Cut (Bottom Slate Gray Curve with Area Gradient) */}
                          <path
                            d={getSmoothAreaPath(waterPts, baseY)}
                            fill="url(#mainWaterGrad)"
                            className="animated-graph-area"
                          />
                          <path
                            d={getSmoothSvgPath(waterPts)}
                            fill="none"
                            stroke="#57534e"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="animated-graph-line"
                          />

                          {/* Event Marker & Annotation Callout matching User Image */}
                          <line
                            x1={eventX}
                            y1="12"
                            x2={eventX}
                            y2={baseY}
                            stroke="#181109"
                            strokeDasharray="3,3"
                            strokeWidth="1.5"
                          />
                          <circle cx={eventX} cy="14" r="3.5" fill="#181109" />
                          <text x={eventX + 10} y="16" fill="#181109" fontSize="10" fontWeight="800" fontFamily="var(--font-sans)">
                            {prodResp.annotation?.date || '10 Sep'}
                          </text>
                          <text x={eventX + 10} y="28" fill="#3d2f20" fontSize="8.5" fontWeight="700" fontFamily="var(--font-sans)">
                            {prodResp.annotation?.label || 'B-17 Injection Started'}
                          </text>
                          <text x={eventX + 10} y="40" fill="#ea580c" fontSize="8.5" fontWeight="800" fontFamily="var(--font-mono)">
                            — {prodResp.annotation?.value || '420 BPD'}
                          </text>

                          {/* Interactive Points on Steam Curve */}
                          {steamPts.map(([x, y], i) => (
                            <circle
                              key={`steam-${i}`}
                              cx={x}
                              cy={y}
                              r="3.8"
                              fill="#f59e0b"
                              stroke="#ffffff"
                              strokeWidth="1.2"
                              className="graph-interactive-dot"
                              onMouseEnter={() => setChartHover({ date: dates[i], steam: steamRaw[i], oil: oilRaw[i], water: waterRaw[i] })}
                              onMouseLeave={() => setChartHover(null)}
                            />
                          ))}

                          {/* Interactive Points on Oil Curve */}
                          {oilPts.map(([x, y], i) => (
                            <circle
                              key={`oil-${i}`}
                              cx={x}
                              cy={y}
                              r="3.8"
                              fill="#3d1a08"
                              stroke="#ffffff"
                              strokeWidth="1.2"
                              className="graph-interactive-dot"
                              onMouseEnter={() => setChartHover({ date: dates[i], steam: steamRaw[i], oil: oilRaw[i], water: waterRaw[i] })}
                              onMouseLeave={() => setChartHover(null)}
                            />
                          ))}

                          {/* Interactive Points on Water Curve */}
                          {waterPts.map(([x, y], i) => (
                            <circle
                              key={`water-${i}`}
                              cx={x}
                              cy={y}
                              r="3.2"
                              fill="#57534e"
                              stroke="#ffffff"
                              strokeWidth="1"
                              className="graph-interactive-dot"
                              onMouseEnter={() => setChartHover({ date: dates[i], steam: steamRaw[i], oil: oilRaw[i], water: waterRaw[i] })}
                              onMouseLeave={() => setChartHover(null)}
                            />
                          ))}

                          {/* Bottom X-Axis Date Labels & Ticks */}
                          {dates.map((d, i) => {
                            const x = startX + i * stepX;
                            return (
                              <g key={i}>
                                <line x1={x} y1={baseY} x2={x} y2={baseY + 4} stroke="#a89a85" />
                                <text x={x} y={baseY + 15} fill="#5c4c3b" fontSize="7.5" fontWeight="600" textAnchor="middle">
                                  {d}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      );
                    })()}

                    {/* Interactive Tooltip Card */}
                    {chartHover && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '12px',
                          background: 'rgba(28, 22, 16, 0.95)',
                          border: '1px solid #f59e0b',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '0.74rem',
                          color: '#fff',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          pointerEvents: 'none',
                          zIndex: 10
                        }}
                      >
                        <div style={{ fontWeight: 800, color: '#fcd34d', borderBottom: '1px solid rgba(245, 158, 11, 0.3)', paddingBottom: '2px' }}>
                          📅 {chartHover.date} Telemetry
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#fed7aa' }}>
                          <span>Steam Injection:</span>
                          <strong style={{ color: '#fb923c' }}>{chartHover.steam} BPD</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#fed7aa' }}>
                          <span>Oil Production:</span>
                          <strong style={{ color: '#ffffff' }}>{chartHover.oil} BOPD</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#fed7aa' }}>
                          <span>Water Cut:</span>
                          <strong style={{ color: '#94a3b8' }}>{chartHover.water}%</strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. WELL STATUS Table */}
                <div className="sandstone-card">
                  <div className="card-title-bar">
                    <div className="card-heading-bold">WELL STATUS</div>
                    <div style={{ display: 'flex', background: '#ede4d6', borderRadius: '4px', padding: '1px' }}>
                      {['All Wells', 'CSS', 'SRP', 'Injector', 'Producer'].map((f) => (
                        <button
                          key={f}
                          onClick={() => setTableFilter(f)}
                          style={{
                            padding: '2px 6px',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            background: tableFilter === f ? '#2b241c' : 'transparent',
                            color: tableFilter === f ? '#fff' : 'var(--text-secondary)'
                          }}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <table className="sandstone-table">
                      <thead>
                        <tr>
                          <th>WELL</th>
                          <th>MODE</th>
                          <th>OIL (BOPD)</th>
                          <th>STEAM (BPD)</th>
                          <th>TEMP (°C)</th>
                          <th>STATE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWellStatus.map((row) => {
                          const isRowActive = selectedWellId === row.id || selectedWellId.includes(row.id.replace('B-', ''));
                          return (
                            <tr
                              key={row.id}
                              className={`clickable ${isRowActive ? 'active-row' : ''}`}
                              onClick={() => {
                                setSelectedWellId(row.id);
                                loadSelectedWellData(row.id);
                              }}
                            >
                              <td style={{ fontWeight: isRowActive ? 800 : 600 }}>{row.id}</td>
                              <td>{row.mode}</td>
                              <td style={{ fontWeight: 700 }}>{row.bopd}</td>
                              <td>{row.steam}</td>
                              <td style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>{row.temp}</td>
                              <td>
                                <span className={`status-dot-indicator ${row.dot}`} />
                                {row.state}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. THERMAL ZONES Card */}
                <div className="sandstone-card">
                  <div className="card-title-bar">
                    <div className="card-heading-bold">THERMAL ZONES</div>
                    <div style={{ display: 'flex', background: '#ede4d6', borderRadius: '4px', padding: '1px' }}>
                      <button
                        onClick={() => setThermalView('Surface')}
                        style={{
                          padding: '2px 6px',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          background: thermalView === 'Surface' ? '#2b241c' : 'transparent',
                          color: thermalView === 'Surface' ? '#fff' : 'var(--text-secondary)'
                        }}
                      >
                        Surface
                      </button>
                      <button
                        onClick={() => setThermalView('Subsurface')}
                        style={{
                          padding: '2px 6px',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          background: thermalView === 'Subsurface' ? '#2b241c' : 'transparent',
                          color: thermalView === 'Subsurface' ? '#fff' : 'var(--text-secondary)'
                        }}
                      >
                        Subsurface
                      </button>
                    </div>
                  </div>

                  <div className="thermal-zones-card" style={{ height: '240px', background: '#0e0b08', position: 'relative', overflow: 'hidden' }}>
                    {/* Dynamic SVG Animated Radial Thermal Plume Preview */}
                    <svg viewBox="0 0 240 180" style={{ width: '100%', height: '100%', display: 'block' }}>
                      <defs>
                        <radialGradient id="dashPlumeGrad" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                          <stop offset="20%" stopColor="#fbbf24" stopOpacity="0.85" />
                          <stop offset="50%" stopColor="#ea580c" stopOpacity="0.75" />
                          <stop offset="78%" stopColor="#b91c1c" stopOpacity="0.5" />
                          <stop offset="95%" stopColor="#581c87" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#0e0b08" stopOpacity="0" />
                        </radialGradient>
                      </defs>

                      {/* Geological grid lines */}
                      <circle cx="120" cy="90" r="75" fill="none" stroke="rgba(217, 119, 6, 0.15)" strokeDasharray="3 3" />
                      <circle cx="120" cy="90" r="50" fill="none" stroke="rgba(217, 119, 6, 0.2)" strokeDasharray="3 3" />
                      <circle cx="120" cy="90" r="28" fill="none" stroke="rgba(217, 119, 6, 0.3)" />

                      {/* Thermal Plume Gradient Circle */}
                      <circle cx="120" cy="90" r="68" fill="url(#dashPlumeGrad)" />

                      {/* Animated Pulse Waves */}
                      <circle cx="120" cy="90" r="42" fill="none" stroke="#fef08a" strokeWidth="1.5" opacity="0.6">
                        <animate attributeName="r" values="18;65" dur="3s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0" dur="3s" repeatCount="indefinite" />
                      </circle>

                      {/* Center Wellbore Point */}
                      <circle cx="120" cy="90" r="6" fill="#f8fafc" stroke="#ea580c" strokeWidth="2.5" />
                      <text x="120" y="76" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                        {selectedWellId}
                      </text>
                      <text x="120" y="112" textAnchor="middle" fill="#fef08a" fontSize="8" fontWeight="bold">
                        {(twinState?.reservoir?.temperature_c || 76.4).toFixed(1)}°C
                      </text>
                    </svg>

                    {/* HUD Badge Overlays */}
                    <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(15, 12, 9, 0.85)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(217, 119, 6, 0.3)', fontSize: '0.65rem', color: '#fed7aa' }}>
                      R<sub>heat</sub>: <strong>{(twinState?.reservoir?.heated_radius_m || 7.8).toFixed(1)} m</strong>
                    </div>

                    <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(15, 12, 9, 0.85)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(217, 119, 6, 0.3)', fontSize: '0.65rem', color: '#fb923c' }}>
                      Visc: <strong>{(twinState?.reservoir?.viscosity_cp || 1850).toLocaleString()} cP</strong>
                    </div>

                    {/* Bottom Link to Full Thermal Twin */}
                    <button
                      onClick={() => setActiveNav('twin_thermal')}
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '10px',
                        right: '10px',
                        background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.9), rgba(180, 83, 9, 0.9))',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                      }}
                    >
                      <Compass size={12} /> Open Advanced 3D Thermal Twin &rarr;
                    </button>
                  </div>
                </div>
              </div>

              {/* 6 Main Dashboard Graphs Grid (User Architecture Requirement - Live Dynamic Sparklines) */}
              <div style={{ marginTop: '0.5rem' }}>
                <div className="card-heading-bold" style={{ marginBottom: '0.6rem' }}>MAIN DASHBOARD TELEMETRY GRAPHS — WELL {selectedWellId}</div>
                <div className="dashboard-graphs-grid-6">
                  {/* Graph 1: Production vs Time */}
                  <div className="mini-graph-card">
                    <div className="kpi-tile-header">Production: Oil vs Time (BOPD) <Droplets size={14} color="#78350f" /></div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.3rem 0' }}>
                      {twinState?.surface?.oil_rate_bopd !== undefined ? twinState.surface.oil_rate_bopd : fieldOutput.oil_production_bopd} BOPD
                    </div>
                    {renderSparkline(
                      prodResp.oil_production_bopd.map(v => Math.round(v * ((twinState?.surface?.oil_rate_bopd || 192) / 212))),
                      '#78350f',
                      ['30d ago', `${twinState?.surface?.oil_rate_bopd || 192} BOPD`]
                    )}
                  </div>

                  {/* Graph 2: Thermal: Reservoir Temperature vs Time */}
                  <div className="mini-graph-card">
                    <div className="kpi-tile-header">Thermal: Reservoir Temp vs Time (°C) <Thermometer size={14} color="#dc2626" /></div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.3rem 0' }}>
                      {(twinState?.reservoir?.temperature_c !== undefined ? Number(twinState.reservoir.temperature_c) : fieldOutput.reservoir_temp_c).toFixed(1)} °C
                    </div>
                    {renderSparkline(
                      [48, 54, 62, 70, 78, 85, Number((twinState?.reservoir?.temperature_c || 76.0).toFixed(1))],
                      '#dc2626',
                      ['Pre-Steam (48°)', `Now (${(twinState?.reservoir?.temperature_c || 76).toFixed(0)}°)`]
                    )}
                  </div>

                  {/* Graph 3: Steam: Steam Injection vs Time */}
                  <div className="mini-graph-card">
                    <div className="kpi-tile-header">Steam: Injection Rate vs Time <Flame size={14} color="#ea580c" /></div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.3rem 0' }}>
                      {twinState?.reservoir?.cumulative_steam_injected_ton !== undefined ? `${Math.round(twinState.reservoir.cumulative_steam_injected_ton)} t` : `${fieldOutput.steam_injection_bpd} BPD`}
                    </div>
                    {renderSparkline(
                      [210, 240, 290, 340, 390, 420, twinState?.reservoir?.cumulative_steam_injected_ton ? Math.round(twinState.reservoir.cumulative_steam_injected_ton / 4) : 450],
                      '#ea580c',
                      ['Cycle Start', 'Peak Rate']
                    )}
                  </div>

                  {/* Graph 4: Efficiency: SOR vs Time */}
                  <div className="mini-graph-card">
                    <div className="kpi-tile-header">Efficiency: SOR vs Time (t/m³) <Sliders size={14} color="#b45309" /></div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.3rem 0' }}>
                      {(twinState?.surface?.sor !== undefined ? Number(twinState.surface.sor) : 3.20).toFixed(2)} t/m³
                    </div>
                    {renderSparkline(
                      [4.4, 4.1, 3.8, 3.6, 3.4, 3.3, Number((twinState?.surface?.sor || 3.20).toFixed(2))],
                      '#b45309',
                      ['Baseline (4.4)', `Now (${(twinState?.surface?.sor || 3.2).toFixed(1)})`]
                    )}
                  </div>

                  {/* Graph 5: Energy: Consumption vs Time */}
                  <div className="mini-graph-card">
                    <div className="kpi-tile-header">Energy: kWh/bbl vs Time <Zap size={14} color="#f59e0b" /></div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.3rem 0' }}>
                      {(twinState?.surface?.energy_kwh_bbl !== undefined ? Number(twinState.surface.energy_kwh_bbl) : 38.4).toFixed(1)} kWh/bbl
                    </div>
                    {renderSparkline(
                      [52, 48, 44, 41, 38, 35, Number((twinState?.surface?.energy_kwh_bbl || 38.4).toFixed(1))],
                      '#f59e0b',
                      ['Cold Crude', `Tuned (${(twinState?.surface?.energy_kwh_bbl || 38.4).toFixed(0)})`]
                    )}
                  </div>

                  {/* Graph 6: Equipment: Pump Efficiency vs Time */}
                  <div className="mini-graph-card">
                    <div className="kpi-tile-header">Equipment: Pump Efficiency vs Time (%) <Gauge size={14} color="#0284c7" /></div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.3rem 0' }}>
                      {(twinState?.srp?.pump_volumetric_efficiency_pct !== undefined ? Number(twinState.srp.pump_volumetric_efficiency_pct) : 74.2).toFixed(1)} %
                    </div>
                    {renderSparkline(
                      [58, 62, 66, 69, 72, 74, Number((twinState?.srp?.pump_volumetric_efficiency_pct || 74.2).toFixed(1))],
                      '#0284c7',
                      ['Post-Soak', `Current (${(twinState?.srp?.pump_volumetric_efficiency_pct || 74.2).toFixed(0)}%)`]
                    )}
                  </div>
                </div>
              </div>

              {/* Alert Panel & AI Insights */}
              <div className="responsive-split-grid" style={{ marginTop: '0.5rem' }}>
                {/* Alert Panel */}
                <div className="sandstone-card">
                  <div className="card-title-bar">
                    <div className="card-heading-bold" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertTriangle size={16} color="#dc2626" /> ACTIVE ALERTS &amp; ACTION PANEL — WELL {selectedWellId}
                    </div>
                    <span className="badge badge-rose">
                      {(recommendations.length || (twinState?.active_alerts?.length || 0))} Actions Active
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {recommendations.length > 0 ? (
                      recommendations.slice(0, 3).map((rec, i) => (
                        <div
                          key={rec.recommendation_id || i}
                          style={{
                            background: rec.urgency === 'CRITICAL' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                            borderLeft: `4px solid ${rec.urgency === 'CRITICAL' ? '#dc2626' : '#f59e0b'}`,
                            padding: '0.6rem',
                            borderRadius: '4px'
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '0.78rem', color: rec.urgency === 'CRITICAL' ? '#991b1b' : '#92400e' }}>
                            {rec.urgency || 'ACTION'}: Well {rec.well_id} — {rec.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '2px' }}>
                            {rec.description}
                          </div>
                        </div>
                      ))
                    ) : twinState?.active_alerts && twinState.active_alerts.length > 0 ? (
                      twinState.active_alerts.map((al, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: al.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                            borderLeft: `4px solid ${al.severity === 'HIGH' ? '#dc2626' : '#f59e0b'}`,
                            padding: '0.6rem',
                            borderRadius: '4px'
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '0.78rem', color: al.severity === 'HIGH' ? '#991b1b' : '#92400e' }}>
                            {al.severity}: Well {selectedWellId} — {al.type}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '2px' }}>
                            {al.message}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ background: 'rgba(217, 119, 6, 0.08)', borderLeft: '4px solid #d97706', padding: '0.6rem', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#92400e' }}>
                          NORMAL: Well {selectedWellId} Operating Within Physics Boundaries
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '2px' }}>
                          Reservoir temperature {(twinState?.reservoir?.temperature_c || 76).toFixed(1)}°C, rod floating risk {(twinState?.srp?.rod_floating_risk_pct || 12).toFixed(1)}%. Pump unsetting safety factor {mechanicsData?.pump_unsetting_force_balance?.unsetting_safety_factor || 4.15}x.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Insights */}
                <div className="sandstone-card">
                  <div className="card-title-bar">
                    <div className="card-heading-bold" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Sparkles size={16} color="#d97706" /> AI OPTIMIZATION INSIGHTS — WELL {selectedWellId}
                    </div>
                    <span className="badge badge-amber">Baghewala Physics-Informed ML</span>
                  </div>

                  <div className="ai-insights-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="ai-insight-tile">
                      <div style={{ fontWeight: 700, fontSize: '0.76rem', color: '#92400e' }}>Production Prediction &amp; SPM Tuning</div>
                      <div style={{ fontSize: '0.72rem', color: '#444' }}>
                        Tuning SPM to {(twinState?.srp?.spm ? (twinState.srp.spm * 0.9).toFixed(1) : 3.8)} at current reservoir temp of {(twinState?.reservoir?.temperature_c || 76).toFixed(1)}°C is predicted to sustain {twinState?.surface?.oil_rate_bopd || 192} BOPD while keeping rod tension positive.
                      </div>
                    </div>
                    <div className="ai-insight-tile">
                      <div style={{ fontWeight: 700, fontSize: '0.76rem', color: '#92400e' }}>CSS Optimization &amp; Cut-Off Forecast</div>
                      <div style={{ fontSize: '0.72rem', color: '#444' }}>
                        Cycle #{cutoffData?.cycle_number || 4} status: <strong>{cutoffData?.cycle_status || 'PRODUCING'}</strong>. {cutoffData?.reason || 'Approaching economic threshold.'} Next boiler deployment recommended in {cutoffData?.recommended_days_to_re_steam ? cutoffData.recommended_days_to_re_steam.toFixed(1) : 11} days.
                      </div>
                    </div>
                    <div className="ai-insight-tile">
                      <div style={{ fontWeight: 700, fontSize: '0.76rem', color: '#92400e' }}>Equipment Protection &amp; Shock Absorption</div>
                      <div style={{ fontSize: '0.72rem', color: '#444' }}>
                        Current rod floating risk: <strong>{(twinState?.srp?.rod_floating_risk_pct || 28).toFixed(1)}%</strong>. Dynamic snap shock factor: <strong>{mechanicsData?.impact_loading?.snap_shock_factor || 1.15}x</strong>. {(twinState?.srp?.rod_floating_risk_pct || 28) > 35 ? 'Sinker bar installation recommended.' : 'Operating safely within API Spec 11B fatigue limits.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* 2. 🧬 DIGITAL TWIN - WELL-TO-SURFACE TWIN */}
          {/* ========================================================================= */}
          {/* 2. 🧬 DIGITAL TWIN - WELL-TO-SURFACE TWIN (3D MULTI-PHYSICS SIMULATION) */}
          {/* ========================================================================= */}
          {activeNav === 'twin_surface' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <WellDigitalTwin3D wellId={selectedWellId} />
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. 🧬 DIGITAL TWIN - RESERVOIR / THERMAL TWIN */}
          {/* ========================================================================= */}
          {activeNav === 'twin_thermal' && (
            <ReservoirThermalTwin
              selectedWellId={selectedWellId}
              twinState={twinState}
              depthProfileData={depthProfileData}
              asphalteneData={asphalteneData}
              cutoffData={cutoffData}
              onTriggerOptimization={(well) => setActiveNav('opt_css')}
            />
          )}

          {/* ========================================================================= */}
          {/* ========================================================================= */}
          {/* 4. 🧬 DIGITAL TWIN - WHAT-IF SIMULATION */}
          {/* ========================================================================= */}
          {activeNav === 'twin_whatif' && (
            <WhatIfSimulator
              selectedWellId={selectedWellId}
              twinState={twinState}
              onApplySetpoints={(setpoints) => {
                if (setpoints.spm) setSrpSimSpm(setpoints.spm);
                if (setpoints.stroke_length_in) setSrpSimStroke(setpoints.stroke_length_in);
                if (setpoints.vfd_frequency_hz) setSrpSimVfd(setpoints.vfd_frequency_hz);
                if (setpoints.steam_injection_ton) setCssSimSteam(setpoints.steam_injection_ton);
              }}
            />
          )}

          {/* ========================================================================= */}
          {/* 5. ⚙️ OPTIMIZATION - CSS OPTIMIZATION */}
          {/* ========================================================================= */}
          {activeNav === 'opt_css' && (
            <CssOptimization
              selectedWellId={selectedWellId}
              twinState={twinState}
              cutoffData={cutoffData}
              fleetData={fleetData}
              cssHistory={cssHistory}
              economicsData={economicsData}
              onApplySetpoints={(setpoints) => {
                if (setpoints.spm) setSrpSimSpm(setpoints.spm);
                if (setpoints.stroke_length_in) setSrpSimStroke(setpoints.stroke_length_in);
                if (setpoints.vfd_frequency_hz) setSrpSimVfd(setpoints.vfd_frequency_hz);
                if (setpoints.steam_injection_ton) setCssSimSteam(setpoints.steam_injection_ton);
              }}
            />
          )}

          {/* ========================================================================= */}
          {/* 6. ⚙️ OPTIMIZATION - SRP OPTIMIZATION */}
          {/* ========================================================================= */}
          {activeNav === 'opt_srp' && (
            <SrpOptimization
              selectedWellId={selectedWellId}
              twinState={twinState}
              mechanicsData={mechanicsData}
              dynoData={dynoData}
              customSinkerVisc={customSinkerVisc}
              customSinkerResult={customSinkerResult}
              isSizingSinker={isSizingSinker}
              onSizeSinkerLive={handleSizeSinkerLive}
              onApplySetpoints={(setpoints) => {
                if (setpoints.spm) setSrpSimSpm(setpoints.spm);
                if (setpoints.stroke_length_in) setSrpSimStroke(setpoints.stroke_length_in);
                else if (setpoints.stroke_in) setSrpSimStroke(setpoints.stroke_in);
                else if (setpoints.stroke_m) setSrpSimStroke(Math.round(setpoints.stroke_m * 39.37));
                if (setpoints.vfd_frequency_hz) setSrpSimVfd(setpoints.vfd_frequency_hz);
                else if (setpoints.vfd_hz) setSrpSimVfd(setpoints.vfd_hz);
                if (setpoints.steam_injection_ton) setCssSimSteam(setpoints.steam_injection_ton);
              }}
              onRefreshWellData={() => loadSelectedWellData(selectedWellId)}
            />
          )}



          {/* ========================================================================= */}
          {/* 7. ⚡ OPTIMIZATION - STEAM & ENERGY */}
          {/* ========================================================================= */}
          {activeNav === 'opt_energy' && (
            <SteamEnergyEconomics
              selectedWellId={selectedWellId}
              onBackToDashboard={() => setActiveNav('main_dashboard')}
              twinState={twinState}
            />
          )}

          {/* ========================================================================= */}
          {/* 8. 🛡️ HEALTH & MONITORING - ROD & PUMP HEALTH */}
          {/* ========================================================================= */}
          {activeNav === 'health_rod_pump' && (
            <RodPumpHealth selectedWellId={selectedWellId} />
          )}

          {/* ========================================================================= */}
          {/* 9. 🛡️ HEALTH & MONITORING - ANOMALY & ALERTS */}
          {/* ========================================================================= */}
          {activeNav === 'health_alerts' && (
            <AnomalyAlertCenter selectedWellId={selectedWellId} />
          )}

          {/* ========================================================================= */}
          {/* 10. 🛡️ HEALTH & MONITORING - PREDICTIVE MAINTENANCE & RUL */}
          {/* ========================================================================= */}
          {activeNav === 'health_pdm' && (
            <PredictiveMaintenanceRUL
              selectedWellId={selectedWellId}
              onSelectWell={setSelectedWellId}
              onBackToDashboard={() => setActiveNav('main_dashboard')}
            />
          )}

          {/* ========================================================================= */}
          {/* 11. 📊 ANALYTICS - PRODUCTION ANALYTICS & WELL COMPARISON */}
          {/* ========================================================================= */}
          {activeNav === 'analytics_production' && (
            <ProductionAnalytics
              selectedWellId={selectedWellId}
              onSelectWell={(wellId) => setSelectedWellId(wellId)}
              onBackToDashboard={() => setActiveNav('main_dashboard')}
            />
          )}

          {/* ========================================================================= */}
          {/* 12. 📊 ANALYTICS - AI PREDICTIONS */}
          {/* ========================================================================= */}
          {activeNav === 'analytics_predictions' && (
            <AIModelRegistry
              selectedWellId={selectedWellId}
              onBackToDashboard={() => setActiveNav('main_dashboard')}
              twinState={twinState}
            />
          )}

          {/* ========================================================================= */}
          {/* 13 & 14. 📊 ANALYTICS - HISTORICAL ANALYSIS & OPERATIONS TIMELINE */}
          {/* ========================================================================= */}
          {(activeNav === 'analytics_historical' || activeNav === 'analytics_timeline') && (
            <HistoricalAnalysis
              selectedWellId={selectedWellId}
              initialTab={activeNav === 'analytics_timeline' ? 'timeline' : 'overlay'}
              onTabChange={(tab) => {
                if (tab === 'timeline') setActiveNav('analytics_timeline');
                else setActiveNav('analytics_historical');
              }}
              onBackToDashboard={() => handleNavSelect('main_dashboard')}
            />
          )}


          {/* ========================================================================= */}
          {/* 16. 📑 REPORTING - TECHNICAL DOSSIER */}
          {/* ========================================================================= */}
          {activeNav === 'reporting_dossier' && (
            <TechnicalDossier
              selectedWellId={selectedWellId}
              userRole={userRole}
              currentTime={currentTime}
              dashboardData={dashboardData}
              twinState={twinState}
              economicsData={economicsData}
              recentActivities={filteredActivities}
            />
          )}

          {/* ========================================================================= */}
          {/* 17. ⚙️ SYSTEM - SETTINGS */}
          {/* ========================================================================= */}
          {activeNav === 'system_settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="sandstone-card">
                <div className="card-title-bar">
                  <div className="card-heading-bold">SYSTEM CONFIGURATION &amp; EDGE GATEWAYS</div>
                  <span className="badge badge-emerald">FastAPI Backend: Connected</span>
                </div>

                <div className="responsive-grid-2">
                  <div style={{ background: 'transparent', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div className="card-heading-bold" style={{ fontSize: '0.82rem', marginBottom: '0.5rem' }}>
                      DATA SOURCES &amp; TELEMETRY FREQUENCY
                    </div>
                    <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div>OPC-UA Edge Polling Rate: <strong>2 Hz (500 ms)</strong></div>
                      <div>Database: <strong>SQLite (baghewala_twin.db &bull; 33 Wells)</strong></div>
                      <div>Thermal Transient Solver: <strong>Explicit Finite-Volume PDE</strong></div>
                      <div>Gibbs Wave Equation Engine: <strong>Damped Wave 50 Harmonic Stations</strong></div>
                    </div>
                  </div>

                  <div style={{ background: 'transparent', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div className="card-heading-bold" style={{ fontSize: '0.82rem', marginBottom: '0.5rem' }}>
                      OPERATOR ACCESS CONTROL (RBAC)
                    </div>
                    <div style={{ fontSize: '0.75rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Active Role:</label>
                      <select
                        value={userRole}
                        onChange={(e) => setUserRole(e.target.value)}
                        style={{ padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.75rem' }}
                      >
                        <option value="Field Operator">Field Operator (Control Loop &amp; Actions)</option>
                        <option value="Production Engineer">Production Engineer (Well Optimization)</option>
                        <option value="Reservoir Engineer">Reservoir Engineer (Thermal EOR Modelling)</option>
                        <option value="Field Manager">Field Manager (Asset Techno-Economics)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
