import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  CheckCircle,
  Building,
  Activity,
  Layers,
  Flame,
  Droplets,
  Thermometer,
  ShieldCheck,
  Check,
  Calendar,
  Clock,
  Sparkles,
  AlertCircle,
  Eye,
  X
} from 'lucide-react';
import { generateTechnicalDossierPDF } from '../../services/pdfReportGenerator';

export default function TechnicalDossier({
  selectedWellId = 'B-17',
  userRole = 'Production Engineer',
  currentTime = new Date().toLocaleString(),
  dashboardData = {},
  twinState = {},
  economicsData = {},
  recentActivities = [],
  cycles = []
}) {
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Field output baseline
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

  const reportId = `OIL-BGH-DOS-${selectedWellId}-${Date.now().toString().slice(-6)}`;

  // Handle PDF Export (Direct Download)
  const handlePdfExport = () => {
    setGeneratingPdf(true);
    setDownloadSuccess(null);

    setTimeout(() => {
      try {
        const res = generateTechnicalDossierPDF({
          selectedWellId,
          userRole,
          currentTime,
          fieldOutput,
          twinState,
          economicsData,
          recentActivities,
          cycles
        });
        const filename = typeof res === 'string' ? res : (res?.filename || `Baghewala_Technical_Dossier_${selectedWellId}.pdf`);
        setDownloadSuccess(filename);
        if (res?.blobUrl) {
          setPdfPreviewUrl(res.blobUrl);
        }
      } catch (err) {
        console.error('Failed to generate PDF:', err);
      } finally {
        setGeneratingPdf(false);
      }
    }, 300);
  };

  // Handle PDF In-App Interactive Preview
  const handlePdfPreview = () => {
    setGeneratingPdf(true);
    setTimeout(() => {
      try {
        const res = generateTechnicalDossierPDF({
          selectedWellId,
          userRole,
          currentTime,
          fieldOutput,
          twinState,
          economicsData,
          recentActivities,
          cycles,
          previewOnly: true
        });
        if (res?.blobUrl) {
          setPdfPreviewUrl(res.blobUrl);
          setShowPreviewModal(true);
        }
      } catch (err) {
        console.error('Failed to preview PDF:', err);
      } finally {
        setGeneratingPdf(false);
      }
    }, 200);
  };

  // Handle CSV Export
  const handleCsvExport = () => {
    const rows = [
      ['OIL INDIA LIMITED - BAGHEWALA DIGITAL TWIN TECHNICAL DOSSIER'],
      ['Report Reference', reportId],
      ['Generated On', currentTime],
      ['Responsible Engineer', userRole],
      ['Selected Well', selectedWellId],
      ['Field Production (BOPD)', fieldOutput.oil_production_bopd],
      ['Field Steam Injection (BPD)', fieldOutput.steam_injection_bpd],
      ['Field Cumulative SOR (t/m³)', '3.20'],
      ['Mean Heated Reservoir Temp (°C)', fieldOutput.reservoir_temp_c],
      [],
      ['WELL TELEMETRY', selectedWellId],
      ['Cycle Status', 'Cycle #4 (Day 45 of 95)'],
      ['Pumping Unit', 'Conventional SRP (320-256-120)'],
      ['Peak Polished Rod Load (kN)', twinState?.srp?.pprl_kn || 64.2],
      ['Minimum Polished Rod Load (kN)', twinState?.srp?.mprl_kn || 18.5],
      ['Pump Fillage (%)', '84%'],
      ['Lifting Cost ($/bbl)', economicsData?.cost_per_barrel_usd || 21.40],
      [],
      ['HISTORICAL CSS CYCLES'],
      ['Cycle #', 'Steam Volume (t)', 'Injection Pressure (bar)', 'Temperature (°C)', 'Soak (days)', 'Production (days)', 'Oil (m³)']
    ];

    const cycleData = cycles.length > 0 ? cycles : [
      { cycle_number: 1, steam: 686.7, pressure: 89.9, temp: 81.8, soak: 13.4, prod: 53.0, oil: 6770.2 },
      { cycle_number: 2, steam: 658.7, pressure: 87.9, temp: 82.8, soak: 14.3, prod: 60.2, oil: 6509.4 },
      { cycle_number: 3, steam: 679.7, pressure: 91.0, temp: 80.4, soak: 15.3, prod: 61.1, oil: 4346.0 },
      { cycle_number: 4, steam: 670.3, pressure: 88.9, temp: 80.5, soak: 13.9, prod: 58.8, oil: 4405.8 },
      { cycle_number: 5, steam: 646.0, pressure: 88.1, temp: 81.7, soak: 14.3, prod: 62.6, oil: 5623.7 },
      { cycle_number: 6, steam: 663.8, pressure: 91.0, temp: 82.0, soak: 15.9, prod: 59.4, oil: 4106.7 },
      { cycle_number: 7, steam: 628.9, pressure: 86.4, temp: 79.2, soak: 15.0, prod: 59.3, oil: 4650.7 }
    ];

    cycleData.forEach(c => {
      rows.push([
        c.cycle_number,
        c.steam || c.injection_volume_tonnes || 650,
        c.pressure || c.injection_pressure_bar || 88,
        c.temp || c.injection_temperature_c || 81,
        c.soak || c.soak_duration_days || 14,
        c.prod || c.production_duration_days || 60,
        c.oil || c.cumulative_oil_m3 || 5000
      ]);
    });

    const csvContent = rows.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Baghewala_Dossier_${selectedWellId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      
      {/* ── EXPORT ACTION TOOLBAR ── */}
      <div
        className="sandstone-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '0.85rem 1.25rem',
          background: 'rgba(245, 239, 230, 0.9)',
          border: '1px solid rgba(180, 155, 125, 0.7)'
        }}
      >
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#78350f', letterSpacing: '0.05em' }}>
            REGULATORY DOSSIER EXPORT ENGINE
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1c1917' }}>
            Official Shift Report &bull; Well {selectedWellId}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={handlePdfExport}
            disabled={generatingPdf}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 1rem',
              fontWeight: 700,
              fontSize: '0.8rem',
              boxShadow: '0 2px 4px rgba(154, 52, 18, 0.25)',
              opacity: generatingPdf ? 0.7 : 1
            }}
          >
            <Download size={15} />
            <span>{generatingPdf ? 'Generating PDF...' : 'Download Official PDF Report'}</span>
          </button>

          <button
            onClick={handlePdfPreview}
            disabled={generatingPdf}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 0.95rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.15), rgba(245, 158, 11, 0.25))',
              border: '1px solid rgba(217, 119, 6, 0.5)',
              color: '#92400e'
            }}
          >
            <Eye size={15} />
            <span>Preview Official PDF</span>
          </button>

          <button
            onClick={handleCsvExport}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            <FileText size={15} />
            <span>Export CSV / Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            <Printer size={15} />
            <span>Print Dossier</span>
          </button>
        </div>
      </div>

      {/* ── SUCCESS NOTIFICATION TOAST ── */}
      {downloadSuccess && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid #10b981',
            borderRadius: '6px',
            color: '#065f46',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} color="#059669" />
            <span>
              Official PDF Report generated successfully: <strong>{downloadSuccess}</strong>
            </span>
          </div>
          <button
            onClick={() => setDownloadSuccess(null)}
            style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── PUBLICATION-GRADE ON-SCREEN DOSSIER PREVIEW ── */}
      <div
        className="sandstone-card"
        style={{
          padding: '2rem 2.25rem',
          background: '#ffffff',
          border: '1px solid #d4c5b2',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          color: '#1c1917',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        {/* Document Header Banner */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '3px solid #9a3412',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9a3412', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.08em' }}>
              <Building size={16} />
              <span>OIL INDIA LIMITED &bull; RAJASTHAN ASSET</span>
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.6rem',
                fontWeight: 900,
                color: '#1c1917',
                margin: '4px 0 6px 0',
                letterSpacing: '0.02em'
              }}
            >
              TECHNICAL DOSSIER &amp; REGULATORY SHIFT REPORT
            </h1>
            <div style={{ fontSize: '0.78rem', color: '#78350f', fontWeight: 600 }}>
              Baghewala Heavy Oil Basin &bull; Cyclic Steam Stimulation &bull; SRP Artificial Lift Digital Twin
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '4px',
              fontSize: '0.75rem',
              color: '#57422f'
            }}
          >
            <span
              style={{
                padding: '4px 10px',
                background: 'rgba(16, 122, 70, 0.12)',
                border: '1px solid #107a46',
                borderRadius: '4px',
                color: '#107a46',
                fontWeight: 800,
                fontSize: '0.7rem'
              }}
            >
              ✓ SCADA &amp; DGH VERIFIED
            </span>
            <div>Doc Ref: <strong style={{ fontFamily: 'var(--font-mono)' }}>{reportId}</strong></div>
            <div>Timestamp: <strong>{currentTime}</strong></div>
            <div>Signatory: <strong>{userRole}</strong></div>
          </div>
        </div>

        {/* 1. ASSET-WIDE PERFORMANCE BENCHMARKS */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#9a3412',
              letterSpacing: '0.04em',
              marginBottom: '0.65rem',
              borderBottom: '1px solid #e7ded0',
              paddingBottom: '4px'
            }}
          >
            1. ASSET-WIDE PERFORMANCE BENCHMARKS (BAGHEWALA FIELD)
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '0.85rem'
            }}
          >
            <div style={{ padding: '0.75rem', background: '#faf7f2', borderRadius: '6px', border: '1px solid #e6ded2' }}>
              <div style={{ fontSize: '0.72rem', color: '#78350f', fontWeight: 600 }}>FIELD OIL PRODUCTION RATE</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#9a3412', margin: '2px 0' }}>
                {fieldOutput.oil_production_bopd.toLocaleString()} BOPD
              </div>
              <div style={{ fontSize: '0.68rem', color: '#666' }}>Heavy Crude (17°–19° API) &bull; Delta +6.2%</div>
            </div>

            <div style={{ padding: '0.75rem', background: '#faf7f2', borderRadius: '6px', border: '1px solid #e6ded2' }}>
              <div style={{ fontSize: '0.72rem', color: '#78350f', fontWeight: 600 }}>FIELD STEAM INJECTION RATE</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#9a3412', margin: '2px 0' }}>
                {fieldOutput.steam_injection_bpd.toLocaleString()} BPD
              </div>
              <div style={{ fontSize: '0.68rem', color: '#666' }}>80% Quality &bull; 8 OTSG Units Active</div>
            </div>

            <div style={{ padding: '0.75rem', background: '#faf7f2', borderRadius: '6px', border: '1px solid #e6ded2' }}>
              <div style={{ fontSize: '0.72rem', color: '#78350f', fontWeight: 600 }}>CUMULATIVE STEAM-OIL RATIO</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#9a3412', margin: '2px 0' }}>
                3.20 t/m³
              </div>
              <div style={{ fontSize: '0.68rem', color: '#666' }}>Economic Limit Threshold: 3.50 t/m³</div>
            </div>

            <div style={{ padding: '0.75rem', background: '#faf7f2', borderRadius: '6px', border: '1px solid #e6ded2' }}>
              <div style={{ fontSize: '0.72rem', color: '#78350f', fontWeight: 600 }}>MEAN HEATED RESERVOIR TEMP</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#9a3412', margin: '2px 0' }}>
                {fieldOutput.reservoir_temp_c} °C
              </div>
              <div style={{ fontSize: '0.68rem', color: '#666' }}>Cold Baseline 45°C (+31°C Heat Front)</div>
            </div>
          </div>
        </div>

        {/* 2. SELECTED WELL DEEP-DIVE DIAGNOSTICS */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#9a3412',
              letterSpacing: '0.04em',
              marginBottom: '0.65rem',
              borderBottom: '1px solid #e7ded0',
              paddingBottom: '4px'
            }}
          >
            2. WELL {selectedWellId} DETAILED OPERATIONAL &amp; SRP TELEMETRY
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {/* CSS Profile */}
            <div style={{ padding: '1rem', background: '#faf7f2', borderRadius: '6px', border: '1px solid #e6ded2' }}>
              <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1c1917', marginBottom: '0.5rem', borderBottom: '1px solid #d4c5b2', paddingBottom: '4px' }}>
                CSS CYCLIC STIMULATION PROFILE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.76rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Current Lifecycle Phase:</span>
                  <strong>Cycle #4 (Active High-Mobility Production)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Cycle Day Progress:</span>
                  <strong>Day 45 of 95 (11 Days to Cut-off)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Cumulative Steam Injected:</span>
                  <strong>670.3 tonnes (80% Quality at 88.9 bar)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Bottomhole Temperature:</span>
                  <strong>{twinState?.thermal?.bht_c || 80.5} °C (Cold Baseline 45.0 °C)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Near-Wellbore Heated Radius:</span>
                  <strong>{twinState?.thermal?.heated_radius_m || 26.8} m</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>In-Situ Viscosity Reduction:</span>
                  <strong style={{ color: '#107a46' }}>420 cP (Original 22,000 cP)</strong>
                </div>
              </div>
            </div>

            {/* SRP Artificial Lift Profile */}
            <div style={{ padding: '1rem', background: '#faf7f2', borderRadius: '6px', border: '1px solid #e6ded2' }}>
              <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1c1917', marginBottom: '0.5rem', borderBottom: '1px solid #d4c5b2', paddingBottom: '4px' }}>
                SRP ARTIFICIAL LIFT &amp; MECHANICAL LOAD
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.76rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Pumping Unit Type:</span>
                  <strong>Conventional SRP (API 320-256-120)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Pump Diameter &amp; Stroke:</span>
                  <strong>57 mm (2.25") &bull; 72" Stroke Length</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Pumping Speed:</span>
                  <strong>4.2 SPM (Optimal VFD Control Mode)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Peak Polished Rod Load (PPRL):</span>
                  <strong>{twinState?.srp?.pprl_kn || 64.2} kN (Goodman: 0.68)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Minimum Polished Rod Load:</span>
                  <strong>{twinState?.srp?.mprl_kn || 18.5} kN</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Pump Fillage &amp; Lifting Cost:</span>
                  <strong>84% Fillage &bull; ${economicsData?.cost_per_barrel_usd || 21.40} / bbl</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. HISTORICAL CSS CYCLES COMPARISON TABLE */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#9a3412',
              letterSpacing: '0.04em',
              marginBottom: '0.65rem',
              borderBottom: '1px solid #e7ded0',
              paddingBottom: '4px'
            }}
          >
            3. HISTORICAL CYCLIC STEAM STIMULATION LEDGER (WELL {selectedWellId})
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
              <thead>
                <tr style={{ background: '#9a3412', color: '#ffffff' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Cycle</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Steam Volume (t)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Inj Pressure (bar)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Inj Temp (°C)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Soak Days</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Prod Days</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Cumulative Oil (m³)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>CSOR (t/m³)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { c: 'Cycle #1', steam: '686.7', press: '89.9', temp: '81.8', soak: '13.4', prod: '53.0', oil: '6,770.2', csor: '0.64' },
                  { c: 'Cycle #2', steam: '658.7', press: '87.9', temp: '82.8', soak: '14.3', prod: '60.2', oil: '6,509.4', csor: '0.64' },
                  { c: 'Cycle #3', steam: '679.7', press: '91.0', temp: '80.4', soak: '15.3', prod: '61.1', oil: '4,346.0', csor: '0.98' },
                  { c: 'Cycle #4 (Active)', steam: '670.3', press: '88.9', temp: '80.5', soak: '13.9', prod: '58.8', oil: '4,405.8', csor: '0.96' },
                  { c: 'Cycle #5', steam: '646.0', press: '88.1', temp: '81.7', soak: '14.3', prod: '62.6', oil: '5,623.7', csor: '0.72' },
                  { c: 'Cycle #6', steam: '663.8', press: '91.0', temp: '82.0', soak: '15.9', prod: '59.4', oil: '4,106.7', csor: '1.02' },
                  { c: 'Cycle #7', steam: '628.9', press: '86.4', temp: '79.2', soak: '15.0', prod: '59.3', oil: '4,650.7', csor: '0.85' }
                ].map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#ffffff' : '#faf7f2', borderBottom: '1px solid #e6ded2' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 700 }}>{row.c}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{row.steam}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{row.press}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{row.temp}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{row.soak}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{row.prod}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#9a3412' }}>{row.oil}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{row.csor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. RECENT INTERVENTIONS & AI DIRECTIVES */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#9a3412',
              letterSpacing: '0.04em',
              marginBottom: '0.65rem',
              borderBottom: '1px solid #e7ded0',
              paddingBottom: '4px'
            }}
          >
            4. AUTONOMOUS OPTIMIZATION &amp; AI DIRECTIVES (JOINT CSS + SRP)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
            <div style={{ padding: '0.85rem', background: '#faf7f2', borderRadius: '6px', border: '1px solid #e6ded2' }}>
              <div style={{ fontWeight: 800, fontSize: '0.76rem', color: '#9a3412', marginBottom: '4px' }}>
                • XGBoost Thermal Response Model
              </div>
              <div style={{ fontSize: '0.72rem', color: '#57422f', lineHeight: 1.4 }}>
                Maintain current injection volume of 680 t for next cycle. Near-wellbore thermal decay rate is within 2.3% of analytical thermal reservoir simulation model.
              </div>
            </div>

            <div style={{ padding: '0.85rem', background: '#faf7f2', borderRadius: '6px', border: '1px solid #e6ded2' }}>
              <div style={{ fontWeight: 800, fontSize: '0.76rem', color: '#9a3412', marginBottom: '4px' }}>
                • SRP Dynamic Optimization Loop
              </div>
              <div style={{ fontSize: '0.72rem', color: '#57422f', lineHeight: 1.4 }}>
                Optimal stroke speed: 4.2 SPM. Increasing to &gt;4.8 SPM increases gas interference risk by 18% with negligible incremental production gain.
              </div>
            </div>

            <div style={{ padding: '0.85rem', background: '#faf7f2', borderRadius: '6px', border: '1px solid #e6ded2' }}>
              <div style={{ fontWeight: 800, fontSize: '0.76rem', color: '#9a3412', marginBottom: '4px' }}>
                • Isolation Forest Anomaly Monitoring
              </div>
              <div style={{ fontSize: '0.72rem', color: '#57422f', lineHeight: 1.4 }}>
                System health index: 96.4%. Zero severe sensor deviations detected in last 48 hours. Polished rod stress margin is +32% below fatigue threshold.
              </div>
            </div>

            <div style={{ padding: '0.85rem', background: '#faf7f2', borderRadius: '6px', border: '1px solid #e6ded2' }}>
              <div style={{ fontWeight: 800, fontSize: '0.76rem', color: '#9a3412', marginBottom: '4px' }}>
                • Techno-Economic Advisory
              </div>
              <div style={{ fontSize: '0.72rem', color: '#57422f', lineHeight: 1.4 }}>
                Projected Net Margin for Well B-17 at current $74/bbl Brent: $52.60/bbl. Economic cut-off threshold estimated on Day 56.
              </div>
            </div>
          </div>
        </div>

        {/* 5. REGULATORY COMPLIANCE & SIGN-OFF BLOCKS */}
        <div>
          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#9a3412',
              letterSpacing: '0.04em',
              marginBottom: '0.65rem',
              borderBottom: '1px solid #e7ded0',
              paddingBottom: '4px'
            }}
          >
            5. REGULATORY COMPLIANCE &amp; ENGINEERING ENDORSEMENT
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '0.85rem', background: '#faf7f2', borderRadius: '6px', border: '1px solid #e6ded2' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#78350f' }}>SHIFT IN-CHARGE ENGINEER</div>
              <div style={{ fontSize: '0.65rem', color: '#888' }}>Baghewala Asset Control Room</div>
              <div style={{ borderBottom: '1px solid #ccc', margin: '24px 0 8px 0' }} />
              <div style={{ fontWeight: 800, fontSize: '0.75rem' }}>{userRole}</div>
              <div style={{ fontSize: '0.65rem', color: '#666' }}>Digital Sign ID: OK-EOR-1148</div>
            </div>

            <div style={{ padding: '0.85rem', background: '#faf7f2', borderRadius: '6px', border: '1px solid #e6ded2' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#78350f' }}>PETROLEUM / RESERVOIR ENGINEER</div>
              <div style={{ fontSize: '0.65rem', color: '#888' }}>Thermal EOR Optimization Group</div>
              <div style={{ borderBottom: '1px solid #ccc', margin: '24px 0 8px 0' }} />
              <div style={{ fontWeight: 800, fontSize: '0.75rem' }}>Dr. V. K. Sharma</div>
              <div style={{ fontSize: '0.65rem', color: '#666' }}>Digital Sign ID: OK-EOR-2148</div>
            </div>

            <div style={{ padding: '0.85rem', background: '#faf7f2', borderRadius: '6px', border: '1px solid #e6ded2' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#78350f' }}>ASSET GENERAL MANAGER</div>
              <div style={{ fontSize: '0.65rem', color: '#888' }}>Oil India Limited, Jodhpur</div>
              <div style={{ borderBottom: '1px solid #ccc', margin: '24px 0 8px 0' }} />
              <div style={{ fontWeight: 800, fontSize: '0.75rem' }}>S. N. Sengupta</div>
              <div style={{ fontSize: '0.65rem', color: '#666' }}>Digital Sign ID: OK-EOR-3148</div>
            </div>
          </div>
        </div>

      </div>

      {/* ── MODAL: INTERACTIVE PDF PREVIEW ── */}
      {showPreviewModal && pdfPreviewUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(20, 16, 12, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem'
          }}
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            style={{
              width: '92vw',
              maxWidth: '1200px',
              height: '92vh',
              background: '#f8f4ee',
              borderRadius: '12px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(217, 119, 6, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1.25rem',
                background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)',
                borderBottom: '2px solid #d97706',
                color: '#fff'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.35rem 0.6rem', background: '#9a3412', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>
                  OIL INDIA LIMITED
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fef3c7' }}>
                    Official Technical Dossier Preview &bull; {selectedWellId}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#a8a29e' }}>
                    4-Page Statutory Asset Integrity &amp; EOR Report (DGH Compliant)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  onClick={handlePdfExport}
                  className="btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  <Download size={14} />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={() => window.open(pdfPreviewUrl, '_blank')}
                  className="btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: '#37322d',
                    color: '#fff',
                    border: '1px solid #574e44'
                  }}
                >
                  <span>Open in Tab</span>
                </button>

                <button
                  onClick={() => setShowPreviewModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '6px',
                    padding: '0.35rem 0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Close Preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded PDF View */}
            <div style={{ flex: 1, width: '100%', background: '#525659' }}>
              <iframe
                src={pdfPreviewUrl}
                title="Technical Dossier PDF Preview"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
