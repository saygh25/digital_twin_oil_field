/**
 * Centralized API service for Baghewala Heavy-Oil Digital Twin Frontend.
 * Seamlessly connects to the FastAPI backend at /api (proxied via Vite).
 */

const BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api`;

export const api = {
  // Liveness check
  async checkHealth() {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  // Wells
  async getWells() {
    const res = await fetch(`${BASE_URL}/wells`);
    if (!res.ok) throw new Error(`Failed to fetch wells: ${res.statusText}`);
    return res.json();
  },

  // Digital Twin state for a specific well (4 physical layers + 7-day trajectory)
  async getDigitalTwinState(wellId) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/digital-twin/state`);
    if (!res.ok) throw new Error(`Failed to fetch twin state: ${res.statusText}`);
    return res.json();
  },

  // AI predictions for a well
  async getWellPredictions(wellId) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/predictions`);
    if (!res.ok) throw new Error(`Failed to fetch predictions: ${res.statusText}`);
    return res.json();
  },

  // Run interactive ML what-if prediction on backend (Production RF, SOR GB, Thermal GB, Rod Floating GB, Failure Risk GB)
  async runPrediction(payload) {
    const res = await fetch(`${BASE_URL}/predictions/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Prediction run failed: ${res.statusText}`);
    return res.json();
  },

  // Run Joint CSS + SRP Multi-Objective Constrained Optimizer on backend
  async optimizeJoint(wellId) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/css/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`Joint optimization failed: ${res.statusText}`);
    return res.json();
  },

  // Failure risk decomposition & root cause breakdown
  async getFailureRisk(wellId) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/failure-risk`);
    if (!res.ok) throw new Error(`Failed to fetch failure risk: ${res.statusText}`);
    return res.json();
  },

  // Historical failures & workover intervention logs
  async getWellFailures(wellId) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/failures`);
    if (!res.ok) throw new Error(`Failed to fetch failures: ${res.statusText}`);
    return res.json();
  },


  // Actionable recommendations for operator loop
  async getRecommendations(wellId) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/recommendations`);
    if (!res.ok) throw new Error(`Failed to fetch recommendations: ${res.statusText}`);
    return res.json();
  },

  // Acknowledge / Accept / Reject recommendation
  async acknowledgeRecommendation(recId, status, feedbackNotes = '') {
    const res = await fetch(`${BASE_URL}/recommendations/${recId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, feedback_notes: feedbackNotes }),
    });
    if (!res.ok) throw new Error(`Failed to acknowledge recommendation: ${res.statusText}`);
    return res.json();
  },

  // Model Registry training metrics (R2, MAE, feature importances)
  async getModelMetrics() {
    const res = await fetch(`${BASE_URL}/models/metrics`);
    if (!res.ok) throw new Error(`Failed to fetch model metrics: ${res.statusText}`);
    return res.json();
  },

  // CSS Cycle history
  async getCSSHistory(wellId) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/css`);
    if (!res.ok) throw new Error(`Failed to fetch CSS history: ${res.statusText}`);
    return res.json();
  },

  // SRP-only optimizer (POST /api/wells/{wellId}/srp/optimize)
  async optimizeSrp(wellId, params = {}) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/srp/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error(`Failed to optimize SRP: ${res.statusText}`);
    return res.json();
  },

  // Apply SRP Setpoint (POST /api/wells/{wellId}/srp/apply)
  async applySrpSetpoint(wellId, payload) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/srp/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Failed to apply SRP setpoint: ${res.statusText}`);
    return res.json();
  },

  // Joint CSS + SRP Multi-Objective Optimization
  async optimizeJointCss(wellId, params = {}) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/css/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error(`Failed to optimize CSS: ${res.statusText}`);
    return res.json();
  },

  // 1. Surface & Downhole Dynamometer Cards
  async getDynoCard(wellId) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/dyno-card`);
    if (!res.ok) throw new Error(`Failed to fetch dyno card: ${res.statusText}`);
    return res.json();
  },

  // 2. Impact Loading & Pump Unsetting Force Balance
  async getMechanicsDiagnostics(wellId) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/mechanics/impact-and-unsetting`);
    if (!res.ok) throw new Error(`Failed to fetch mechanics diagnostics: ${res.statusText}`);
    return res.json();
  },

  // 3. Sinker Bar Sizing Tool
  async sizeSinkerBars(wellId, payload) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/mechanics/sinker-bar-sizing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Failed to size sinker bars: ${res.statusText}`);
    return res.json();
  },

  // 4. Continuous Wellbore Depth Profile
  async getWellboreDepthProfile(wellId) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/wellbore/depth-profile`);
    if (!res.ok) throw new Error(`Failed to fetch depth profile: ${res.statusText}`);
    return res.json();
  },

  // 5. Thermodynamic Asphaltene Precipitation Model
  async getAsphalteneRisk(wellId) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/asphaltene-risk`);
    if (!res.ok) throw new Error(`Failed to fetch asphaltene risk: ${res.statusText}`);
    return res.json();
  },

  // 6. Automated CSS Economic Cut-off Evaluation
  async getCssCutoff(wellId) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/css/cutoff-evaluation`);
    if (!res.ok) throw new Error(`Failed to fetch CSS cut-off evaluation: ${res.statusText}`);
    return res.json();
  },

  // 7. Techno-Economics ($/bbl & ₹/bbl)
  async getEconomics(wellId) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/economics`);
    if (!res.ok) throw new Error(`Failed to fetch economics: ${res.statusText}`);
    return res.json();
  },

  // 8. Mobile Boiler Fleet Scheduler
  async getFleetSchedule() {
    const res = await fetch(`${BASE_URL}/field/fleet-schedule`);
    if (!res.ok) throw new Error(`Failed to fetch fleet schedule: ${res.statusText}`);
    return res.json();
  },

  // 9. GIS Geospatial Field Map
  async getGisMap() {
    const res = await fetch(`${BASE_URL}/field/gis-map`);
    if (!res.ok) throw new Error(`Failed to fetch GIS map: ${res.statusText}`);
    return res.json();
  },

  // 10. Live Field Dashboard (Eliminates all hardcoding)
  async getLiveDashboard(selectedWell = 'B-17', timeframe = '30D') {
    const res = await fetch(`${BASE_URL}/field/live-dashboard?selected_well=${encodeURIComponent(selectedWell)}&timeframe=${encodeURIComponent(timeframe)}`);
    if (!res.ok) throw new Error(`Failed to fetch live dashboard: ${res.statusText}`);
    return res.json();
  },

  // 11. Dedicated Field-Wide Production Analytics & Well Comparison
  async getFieldProductionAnalytics(selectedWell = 'B-17', timeframe = '30D') {
    const res = await fetch(`${BASE_URL}/field/production-analytics?selected_well=${encodeURIComponent(selectedWell)}&timeframe=${encodeURIComponent(timeframe)}`);
    if (!res.ok) throw new Error(`Failed to fetch production analytics: ${res.statusText}`);
    return res.json();
  },

  // 12. Multivariate Field Anomalies & Classification (FR-26, FR-27)
  async getFieldAnomalies() {
    const res = await fetch(`${BASE_URL}/anomalies`);
    if (!res.ok) throw new Error(`Failed to fetch field anomalies: ${res.statusText}`);
    return res.json();
  },

  // 13. Well-Specific Multivariate Anomalies
  async getWellAnomalies(wellId) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/anomalies`);
    if (!res.ok) throw new Error(`Failed to fetch well anomalies: ${res.statusText}`);
    return res.json();
  },

  // 14. Anomaly Acknowledgment & Operator Action Loop (FR-47..FR-49)
  async acknowledgeAnomaly(anomalyId, payload) {
    const res = await fetch(`${BASE_URL}/anomalies/${anomalyId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Failed to acknowledge anomaly: ${res.statusText}`);
    return res.json();
  },

  // 15. Real-Time Telemetry Anomaly Detection (Isolation Forest)
  async runAnomalyDetection(payload) {
    const res = await fetch(`${BASE_URL}/anomalies/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Failed to run anomaly detector: ${res.statusText}`);
    return res.json();
  },

  // 16. Field Recommendations & Alerts
  async getRecommendations(wellId) {
    const res = await fetch(`${BASE_URL}/wells/${wellId}/recommendations`);
    if (!res.ok) throw new Error(`Failed to fetch recommendations: ${res.statusText}`);
    return res.json();
  },

  // 17. Acknowledge Recommendation
  async acknowledgeRecommendation(recId, payload) {
    const res = await fetch(`${BASE_URL}/recommendations/${recId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Failed to acknowledge recommendation: ${res.statusText}`);
    return res.json();
  }
};

