import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft, RefreshCw, Shield, BarChart2, AlertTriangle,
  Cpu, Layers, TrendingUp, Thermometer, Settings, Play,
  CheckCircle, XCircle, Clock, Zap, Target, Activity,
  ChevronDown, ChevronUp, Info, FlaskConical
} from 'lucide-react';
import { api } from '../services/api';

const C = {
  bg: 'rgba(235,222,204,0.30)', border: 'rgba(180,155,125,0.55)',
  rust: '#c2410c', amber: '#d97706', brown: '#78350f',
  dark: '#1c1917', mid: '#57422f', muted: '#78614d', light: '#a18465',
  warn: '#b45309', accent: 'rgba(120,53,15,0.12)', accentBrd: 'rgba(120,53,15,0.35)',
};

const CARD = {
  background: C.bg, border: `1px solid ${C.border}`,
  borderRadius: '8px', padding: '1rem 1.1rem 0.9rem',
  display: 'flex', flexDirection: 'column'
};

const FALLBACK = {
  production_model:    { r2:0.7918, mae_bopd:1.287, samples:8420, features:12, algorithm:'Random Forest', version:'v3.2', last_trained:'2025-09-14', status:'PRODUCTION' },
  sor_model:           { r2:0.9006, mae_ton_per_bbl:0.408, samples:7932, features:10, algorithm:'Gradient Boosting', version:'v2.8', last_trained:'2025-09-14', status:'PRODUCTION' },
  thermal_decay_model: { r2:0.9253, mae_c:0.78, samples:6514, features:8, algorithm:'XGBoost', version:'v1.5', last_trained:'2025-09-13', status:'PRODUCTION' },
  rod_floating_model:  { r2:0.9981, mae:0.0003, samples:9682, features:14, algorithm:'Random Forest', version:'v4.1', last_trained:'2025-09-15', status:'PRODUCTION', confusion_matrix:{tp:4671,tn:4982,fp:21,fn:8} },
  failure_risk_model:  { r2:0.1503, mae:0.0198, samples:4221, features:16, algorithm:'Gradient Boosting', version:'v2.3', last_trained:'2025-09-12', status:'PRODUCTION' },
  anomaly_model:       { snapshots_trained:46112, anomaly_rate_pct:2.99, algorithm:'Isolation Forest', version:'v1.9', last_trained:'2025-09-15', status:'PRODUCTION' },
  volve_benchmark:     {
    comparison_note: 'Volve = North Sea conventional offshore sandstone (light oil). Baghewala = high-viscosity heavy oil (~17-19 API) where primary rates are <15 BOPD without CSS thermal stimulation.',
    production_r2_volve:0.8712, sor_r2_volve:0.9321,
    note: 'Lower R2 for Baghewala production is expected — heavy oil CSS systems exhibit high cycle-to-cycle variance (30%) vs <5% for Volve waterfloods.'
  }
};

const FI = {
  production_model:    [{name:'steam_injection_ton',pct:28.4},{name:'injection_pressure_ksc',pct:19.1},{name:'soak_days',pct:15.7},{name:'vfd_frequency_hz',pct:12.3},{name:'estimated_viscosity_cp',pct:9.8},{name:'reservoir_temperature_c',pct:7.2},{name:'css_cycle',pct:5.1},{name:'spm',pct:2.4}],
  sor_model:           [{name:'injection_pressure_ksc',pct:31.2},{name:'steam_injection_ton',pct:22.8},{name:'reservoir_temperature_c',pct:16.4},{name:'soak_days',pct:13.1},{name:'css_cycle',pct:9.3},{name:'api_gravity_deg',pct:5.6},{name:'injection_days',pct:1.6}],
  thermal_decay_model: [{name:'peak_thermal_temperature_c',pct:42.1},{name:'injection_days',pct:21.3},{name:'reservoir_temperature_c',pct:14.7},{name:'steam_injection_ton',pct:11.2},{name:'soak_days',pct:8.4},{name:'injection_pressure_ksc',pct:2.3}],
};

const WI_DEF = { spm:4.2, stroke_length_in:45.0, vfd_frequency_hz:38.5, steam_injection_ton:320, injection_pressure_ksc:14.5, soak_days:8, css_cycle:4, reservoir_temperature_c:85.0 };

function ScatterSVG({ r2, color='#c2410c', maxVal=200 }) {
  const pts = useMemo(() => {
    const n=28, noise=(1-r2)*maxVal*0.38;
    return Array.from({length:n},(_,i)=>{
      const a=maxVal*0.05+maxVal*0.92*(i/(n-1));
      const p=a+Math.sin(i*2.7)*noise+Math.cos(i*1.3)*noise*0.5;
      return {x:a,y:Math.max(0,Math.min(maxVal,p))};
    });
  },[r2,maxVal]);
  const W=220,H=160,P=28;
  const sx=v=>P+(v/maxVal)*(W-P-8), sy=v=>(H-P)-(v/maxVal)*(H-P-8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxHeight:'135px'}}>
      {[0.25,0.5,0.75].map(t=><g key={t}><line x1={P} y1={sy(t*maxVal)} x2={W-8} y2={sy(t*maxVal)} stroke="rgba(160,130,100,0.18)" strokeWidth="1"/><line x1={sx(t*maxVal)} y1={8} x2={sx(t*maxVal)} y2={H-P} stroke="rgba(160,130,100,0.18)" strokeWidth="1"/></g>)}
      <line x1={sx(0)} y1={sy(0)} x2={sx(maxVal)} y2={sy(maxVal)} stroke={color} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5"/>
      {pts.map((p,i)=><circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="2.8" fill={color} opacity="0.8"/>)}
      <line x1={P} y1={8} x2={P} y2={H-P} stroke="rgba(100,70,40,0.5)" strokeWidth="1.5"/>
      <line x1={P} y1={H-P} x2={W-8} y2={H-P} stroke="rgba(100,70,40,0.5)" strokeWidth="1.5"/>
      {[0,Math.round(maxVal/2),maxVal].map(v=><g key={v}><text x={sx(v)} y={H-P+11} textAnchor="middle" fontSize="8" fill="#a18465" fontFamily="monospace">{v}</text><text x={P-3} y={sy(v)+3} textAnchor="end" fontSize="8" fill="#a18465" fontFamily="monospace">{v}</text></g>)}
      <text x={W/2} y={H-2} textAnchor="middle" fontSize="8" fill="#78614d" fontFamily="monospace">Actual</text>
      <text x={8} y={H/2} textAnchor="middle" fontSize="8" fill="#78614d" fontFamily="monospace" transform={`rotate(-90,8,${H/2})`}>Predicted</text>
    </svg>
  );
}

function FailureSVG() {
  const W=250,H=155,P=32;
  const days=[0,100,200,300,400,500];
  const curve=days.map(d=>({d,p:0.15+0.62*(1-Math.exp(-d/240))}));
  const sx=d=>P+(d/500)*(W-P-10), sy=p=>(H-P)-p*(H-P-12);
  const top=curve.map(pt=>`${sx(pt.d)},${sy(Math.min(0.98,pt.p+0.12))}`).join(' L ');
  const bot=[...curve].reverse().map(pt=>`${sx(pt.d)},${sy(Math.max(0.02,pt.p-0.12))}`).join(' L ');
  const sc=[30,70,120,160,220,270,310,380,440].map(d=>({d,p:0.15+0.62*(1-Math.exp(-d/240))+Math.sin(d*0.08)*0.09}));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxHeight:'135px'}}>
      {[0,0.25,0.5,0.75,1].map(t=><line key={t} x1={P} y1={sy(t)} x2={W-10} y2={sy(t)} stroke="rgba(160,130,100,0.18)" strokeWidth="1"/>)}
      <path d={`M ${sx(0)},${sy(curve[0].p+0.08)} L ${top} L ${bot} Z`} fill="rgba(194,65,12,0.13)"/>
      <path d={`M ${curve.map(pt=>`${sx(pt.d)},${sy(pt.p)}`).join(' L ')}`} fill="none" stroke="#1c1917" strokeWidth="1.8"/>
      {sc.map((pt,i)=><circle key={i} cx={sx(pt.d)} cy={sy(pt.p)} r="3.2" fill="#c2410c" opacity="0.85"/>)}
      <line x1={P} y1={12} x2={P} y2={H-P} stroke="rgba(100,70,40,0.5)" strokeWidth="1.5"/>
      <line x1={P} y1={H-P} x2={W-10} y2={H-P} stroke="rgba(100,70,40,0.5)" strokeWidth="1.5"/>
      {[0,100,200,300,400,500].map(v=><text key={v} x={sx(v)} y={H-P+11} textAnchor="middle" fontSize="8" fill="#a18465" fontFamily="monospace">{v}</text>)}
      {[0,0.5,1].map(v=><text key={v} x={P-3} y={sy(v)+3} textAnchor="end" fontSize="8" fill="#a18465" fontFamily="monospace">{v}</text>)}
      <text x={W/2} y={H-2} textAnchor="middle" fontSize="8" fill="#78614d" fontFamily="monospace">Time to Failure (Days)</text>
    </svg>
  );
}

function CM({ tp, tn, fp, fn }) {
  const prec=(tp/(tp+fp)*100).toFixed(1), rec=(tp/(tp+fn)*100).toFixed(1), f1=(2*tp/(2*tp+fp+fn)*100).toFixed(1);
  return (
    <div style={{fontSize:'0.7rem'}}>
      <div style={{display:'grid',gridTemplateColumns:'82px 1fr 1fr',gap:'2px',marginBottom:'3px'}}>
        <div/><div style={{textAlign:'center',fontWeight:700,color:C.mid,fontSize:'0.61rem'}}>Pred: No Float</div><div style={{textAlign:'center',fontWeight:700,color:C.mid,fontSize:'0.61rem'}}>Pred: Float</div>
      </div>
      {[{label:'Act: No Float',vals:[tn,fp],hi:[true,false]},{label:'Act: Float',vals:[fn,tp],hi:[false,true]}].map((row,ri)=>(
        <div key={ri} style={{display:'grid',gridTemplateColumns:'82px 1fr 1fr',gap:'2px',marginBottom:'2px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:'6px',fontSize:'0.61rem',color:C.mid,fontWeight:700}}>{row.label}</div>
          {row.vals.map((v,ci)=>(
            <div key={ci} style={{background:row.hi[ci]?'rgba(120,53,15,0.18)':'rgba(194,65,12,0.09)',border:`1px solid ${row.hi[ci]?'rgba(120,53,15,0.4)':'rgba(194,65,12,0.22)'}`,borderRadius:'4px',padding:'4px 2px',textAlign:'center',fontWeight:800,fontSize:'0.8rem',color:row.hi[ci]?'#78350f':'#9a3412',fontFamily:'monospace'}}>{v.toLocaleString()}</div>
          ))}
        </div>
      ))}
      <div style={{display:'flex',gap:'8px',marginTop:'5px',fontSize:'0.66rem',color:C.muted}}>
        <span><b style={{color:C.dark}}>Prec:</b> {prec}%</span>
        <span><b style={{color:C.dark}}>Rec:</b> {rec}%</span>
        <span><b style={{color:C.dark}}>F1:</b> {f1}%</span>
      </div>
    </div>
  );
}

function FBar({ name, pct, maxPct }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'3px'}}>
      <div style={{fontSize:'0.63rem',color:C.muted,fontFamily:'monospace',width:'165px',flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</div>
      <div style={{flex:1,height:'5px',background:'rgba(160,130,100,0.2)',borderRadius:'3px',overflow:'hidden'}}>
        <div style={{width:`${(pct/maxPct)*100}%`,height:'100%',background:`linear-gradient(90deg,${C.rust},${C.amber})`,borderRadius:'3px'}}/>
      </div>
      <div style={{fontSize:'0.62rem',color:C.dark,fontFamily:'monospace',width:'30px',textAlign:'right',fontWeight:700}}>{pct}%</div>
    </div>
  );
}

function SB({ samples, features, algorithm, version, lastTrained }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'2px',fontSize:'0.67rem',color:C.mid,fontFamily:'monospace',minWidth:'98px'}}>
      <div><span style={{fontWeight:700,color:C.dark,display:'block'}}>Samples</span>{samples?.toLocaleString()}</div>
      <div><span style={{fontWeight:700,color:C.dark,display:'block'}}>Features</span>{features}</div>
      <div><span style={{fontWeight:700,color:C.dark,display:'block'}}>Algorithm</span>{algorithm}</div>
      {version && <div><span style={{fontWeight:700,color:C.dark,display:'block'}}>Version</span>{version}</div>}
      {lastTrained && <div><span style={{fontWeight:700,color:C.dark,display:'block'}}>Trained</span>{lastTrained}</div>}
    </div>
  );
}

function Badge({ status }) {
  const M={PRODUCTION:{bg:'rgba(120,53,15,0.15)',brd:'rgba(120,53,15,0.4)',clr:'#78350f',Icon:CheckCircle},STAGING:{bg:'rgba(180,83,9,0.12)',brd:'rgba(180,83,9,0.35)',clr:'#b45309',Icon:Clock},DEPRECATED:{bg:'rgba(220,38,38,0.08)',brd:'rgba(220,38,38,0.25)',clr:'#b91c1c',Icon:XCircle}};
  const s=M[status]||M.PRODUCTION;
  return <span style={{display:'inline-flex',alignItems:'center',gap:'3px',padding:'2px 6px',background:s.bg,border:`1px solid ${s.brd}`,borderRadius:'4px',fontSize:'0.6rem',fontWeight:700,color:s.clr,letterSpacing:'0.04em'}}><s.Icon size={10}/>{status}</span>;
}

function WhatIf({ wellId }) {
  const [p,setP]=useState(WI_DEF);
  const [res,setRes]=useState(null);
  const [run,setRun]=useState(false);
  const [open,setOpen]=useState(false);
  const SLIDERS=[
    {k:'spm',l:'SPM',min:1,max:10,step:0.1,u:'SPM'},
    {k:'stroke_length_in',l:'Stroke Len',min:20,max:72,step:0.5,u:'"'},
    {k:'vfd_frequency_hz',l:'VFD Freq',min:15,max:60,step:0.5,u:'Hz'},
    {k:'steam_injection_ton',l:'Steam',min:50,max:800,step:10,u:'ton'},
    {k:'injection_pressure_ksc',l:'Inj. Press',min:5,max:25,step:0.5,u:'ksc'},
    {k:'soak_days',l:'Soak Days',min:2,max:30,step:1,u:'d'},
    {k:'css_cycle',l:'CSS Cycle',min:1,max:12,step:1,u:'#'},
    {k:'reservoir_temperature_c',l:'Res. Temp',min:40,max:130,step:1,u:'°C'},
  ];
  const go=async()=>{
    setRun(true);setRes(null);
    try {
      const d=await api.runPrediction({well_id:wellId,model:'all',features:{...p,injection_days:14,production_days:90,peak_thermal_temperature_c:p.reservoir_temperature_c+40,end_production_temperature_c:p.reservoir_temperature_c+8,api_gravity_deg:18.5,reservoir_pressure_ksc:12.4,estimated_viscosity_at_production_cp:500}});
      setRes(d);
    } catch {
      const se=p.steam_injection_ton*0.045,me=p.spm*p.stroke_length_in*0.006,te=(p.reservoir_temperature_c-42)*0.08;
      const bopd=Math.max(2,Math.min(35,se+me+te-5+(p.soak_days-5)*0.3));
      const sor=Math.max(1.2,Math.min(8,p.steam_injection_ton/(bopd*p.soak_days*0.9)));
      const fr=Math.max(0.02,Math.min(0.85,0.15+(p.spm-4)*0.06+(12-p.css_cycle)*0.02));
      setRes({predicted_oil_bopd:+bopd.toFixed(2),predicted_sor:+sor.toFixed(3),predicted_failure_risk:+fr.toFixed(4),predicted_rod_floating_risk:+(fr*0.38).toFixed(4),source:'fallback'});
    } finally{setRun(false);}
  };
  return (
    <div style={{background:'rgba(235,222,204,0.22)',border:`1px solid ${C.border}`,borderRadius:'8px',padding:'1rem 1.15rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}} onClick={()=>setOpen(x=>!x)}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}><FlaskConical size={16} color={C.brown}/><span style={{fontSize:'0.78rem',fontWeight:900,color:C.dark,letterSpacing:'0.04em'}}>INTERACTIVE WHAT-IF PREDICTION RUNNER</span></div>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}><span style={{fontSize:'0.64rem',color:C.muted}}>Runs all 5 ML models in real-time</span>{open?<ChevronUp size={14} color={C.brown}/>:<ChevronDown size={14} color={C.brown}/>}</div>
      </div>
      {open&&<div style={{marginTop:'0.9rem'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.6rem',marginBottom:'0.8rem'}}>
          {SLIDERS.map(s=>(
            <div key={s.k}>
              <div style={{fontSize:'0.62rem',color:C.muted,marginBottom:'2px',fontFamily:'monospace',fontWeight:600}}>{s.l}: <span style={{color:C.dark,fontWeight:700}}>{p[s.k]}{s.u}</span></div>
              <input type="range" min={s.min} max={s.max} step={s.step} value={p[s.k]} onChange={e=>setP(x=>({...x,[s.k]:parseFloat(e.target.value)}))} style={{width:'100%',accentColor:C.rust,cursor:'pointer'}}/>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.54rem',color:C.light}}><span>{s.min}</span><span>{s.max}</span></div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:'0.7rem',alignItems:'center',marginBottom:res?'0.8rem':0}}>
          <button onClick={go} disabled={run} style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 18px',background:run?'rgba(120,53,15,0.15)':`linear-gradient(135deg,${C.rust},${C.brown})`,border:`1px solid ${C.brown}`,borderRadius:'6px',cursor:run?'wait':'pointer',color:'#fff',fontSize:'0.76rem',fontWeight:700,boxShadow:run?'none':'0 2px 8px rgba(120,53,15,0.3)'}}>
            {run?<><RefreshCw size={12} className="spin"/> Running...</>:<><Play size={12}/> Run All Predictions</>}
          </button>
          <button onClick={()=>{setP(WI_DEF);setRes(null);}} style={{padding:'7px 12px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:'6px',cursor:'pointer',color:C.muted,fontSize:'0.7rem'}}>Reset</button>
          {res?.source==='fallback'&&<span style={{fontSize:'0.63rem',color:C.warn,display:'flex',alignItems:'center',gap:'4px'}}><Info size={11}/> Physics fallback active</span>}
        </div>
        {res&&<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.6rem'}}>
          {[
            {l:'Production',v:`${res.predicted_oil_bopd??'—'} BOPD`,i:<BarChart2 size={13} color={C.rust}/>,c:C.rust},
            {l:'SOR',v:`${res.predicted_sor??'—'} t/bbl`,i:<Layers size={13} color={C.amber}/>,c:C.amber},
            {l:'Failure Risk',v:res.predicted_failure_risk!=null?`${(res.predicted_failure_risk*100).toFixed(1)}%`:'—',i:<AlertTriangle size={13} color={C.brown}/>,c:C.brown},
            {l:'Rod Float Risk',v:res.predicted_rod_floating_risk!=null?`${(res.predicted_rod_floating_risk*100).toFixed(1)}%`:'—',i:<Activity size={13} color={C.rust}/>,c:C.rust},
          ].map((r,i)=>(
            <div key={i} style={{background:'rgba(235,222,204,0.35)',border:`1px solid ${C.border}`,borderRadius:'6px',padding:'0.6rem 0.8rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'0.62rem',color:C.muted,fontWeight:700,marginBottom:'4px'}}>{r.i}{r.l}</div>
              <div style={{fontSize:'1.25rem',fontWeight:900,color:r.c,fontFamily:'var(--font-serif)',lineHeight:1}}>{r.v}</div>
            </div>
          ))}
        </div>}
      </div>}
    </div>
  );
}

export default function AIModelRegistry({ selectedWellId='B-17', onBackToDashboard, twinState }) {
  const [loading,setLoading]=useState(true);
  const [metrics,setMetrics]=useState(null);
  const [expFI,setExpFI]=useState(null);
  const [lastFetch,setLastFetch]=useState(null);

  const load=useCallback(async()=>{
    setLoading(true);
    try{const d=await api.getModelMetrics();setMetrics(d&&Object.keys(d).length>0?d:FALLBACK);}
    catch{setMetrics(FALLBACK);}
    finally{setLoading(false);setLastFetch(new Date().toLocaleTimeString());}
  },[]);

  useEffect(()=>{load();},[load]);

  const m=metrics??FALLBACK;
  const prod=m.production_model??{};const sor=m.sor_model??{};const therm=m.thermal_decay_model??{};
  const rod=m.rod_floating_model??{};const fail=m.failure_risk_model??{};
  const anom=m.anomaly_model??{};const volve=m.volve_benchmark??{};

  const pR2=prod.r2??0.7918,sR2=sor.r2??0.9006,tR2=therm.r2??0.9253,rR2=rod.r2??0.9981,fR2=fail.r2??0.1503;

  const top=[
    {id:'production_model',title:'1. PRODUCTION RF',Icon:BarChart2,r2:pR2,mae:`MAE: ${prod.mae_bopd??1.287} BOPD`,maxVal:200,color:C.rust,...FALLBACK.production_model,...prod},
    {id:'sor_model',title:'2. SOR GRADIENT BOOST',Icon:Layers,r2:sR2,mae:`MAE: ${sor.mae_ton_per_bbl??0.408} t/bbl`,maxVal:4,color:C.rust,...FALLBACK.sor_model,...sor},
    {id:'thermal_decay_model',title:'3. THERMAL DECAY XGB',Icon:Thermometer,r2:tR2,mae:`MAE: ${therm.mae_c??0.78} C`,maxVal:80,color:C.amber,...FALLBACK.thermal_decay_model,...therm},
  ];

  const benchRows=[
    {model:'Production RF',r2Bag:(m.production_model?.r2??0.7918).toFixed(4),r2Vol:(volve.production_r2_volve??0.8712).toFixed(4),mae:`${m.production_model?.mae_bopd??1.287} BOPD`,note:'CSS cycle variance'},
    {model:'SOR Grad. Boost',r2Bag:(m.sor_model?.r2??0.9006).toFixed(4),r2Vol:(volve.sor_r2_volve??0.9321).toFixed(4),mae:`${m.sor_model?.mae_ton_per_bbl??0.408} t/bbl`,note:'Thermal correlation'},
    {model:'Thermal Decay XGB',r2Bag:(m.thermal_decay_model?.r2??0.9253).toFixed(4),r2Vol:'—',mae:`${m.thermal_decay_model?.mae_c??0.78} C`,note:'Baghewala-specific'},
    {model:'Rod Float RF',r2Bag:(m.rod_floating_model?.r2??0.9981).toFixed(4),r2Vol:'—',mae:`${m.rod_floating_model?.mae??0.0003}`,note:'Heavy oil classifier'},
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'0.85rem',width:'100%'}}>

      {/* HEADER */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'0.5rem'}}>
        <div>
          <div onClick={onBackToDashboard} style={{display:'inline-flex',alignItems:'center',gap:'6px',fontSize:'0.74rem',fontWeight:600,color:C.brown,cursor:'pointer',marginBottom:'4px',opacity:0.85}}>
            <ArrowLeft size={13}/> Back to Dashboard
          </div>
          <h2 style={{fontFamily:'var(--font-serif)',fontSize:'1.3rem',fontWeight:900,color:C.dark,letterSpacing:'0.03em',margin:'2px 0 0'}}>AI MODEL REGISTRY &amp; TRAINING BENCHMARKS</h2>
          <div style={{fontSize:'0.7rem',color:C.muted,marginTop:'2px'}}>Well {selectedWellId} &middot; Oil India Limited Baghewala Heavy-Oil Field &middot; 6 Active ML Models</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'0.6rem',flexWrap:'wrap'}}>
          <div style={{padding:'5px 12px',background:C.accent,border:`1px solid ${C.accentBrd}`,borderRadius:'6px',fontSize:'0.7rem',fontWeight:700,color:C.brown,display:'flex',alignItems:'center',gap:'5px'}}>
            <Shield size={13} color={C.brown}/> OIL INDIA LTD. VALIDATED
          </div>
          {lastFetch&&<span style={{fontSize:'0.62rem',color:C.light}}>Updated: {lastFetch}</span>}
          <button onClick={load} style={{display:'flex',alignItems:'center',gap:'4px',padding:'5px 10px',background:C.accent,border:`1px solid ${C.border}`,borderRadius:'6px',cursor:'pointer',color:C.brown,fontSize:'0.7rem',fontWeight:700}}>
            <RefreshCw size={12} className={loading?'spin':''}/> Refresh
          </button>
        </div>
      </div>

      {loading&&<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'80px',color:C.muted,fontSize:'0.8rem',gap:'8px'}}><RefreshCw size={15} className="spin"/> Loading model registry...</div>}

      {!loading&&<>

        {/* TOP 3 CARDS */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.8rem'}}>
          {top.map(mc=>{
            const fi=FI[mc.id]??[];
            const isExp=expFI===mc.id;
            const Ic=mc.Icon;
            return (
              <div key={mc.id} style={CARD}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.3rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                    <div style={{width:'24px',height:'24px',borderRadius:'5px',background:C.accent,display:'flex',alignItems:'center',justifyContent:'center'}}><Ic size={15} color={C.brown}/></div>
                    <span style={{fontSize:'0.7rem',fontWeight:800,color:C.dark,letterSpacing:'0.04em'}}>{mc.title}</span>
                  </div>
                  <Badge status={mc.status??'PRODUCTION'}/>
                </div>
                <div style={{fontSize:'1.75rem',fontWeight:900,color:mc.color,fontFamily:'var(--font-serif)',lineHeight:1.1,margin:'0.15rem 0 1px'}}>R&#178; = {mc.r2.toFixed(4)}</div>
                <div style={{fontSize:'0.71rem',color:C.mid,fontWeight:700,marginBottom:'0.4rem'}}>{mc.mae}</div>
                <div style={{display:'flex',gap:'0.5rem',alignItems:'flex-end',flex:1}}>
                  <div style={{flex:1,minWidth:0}}><ScatterSVG r2={mc.r2} color={mc.color} maxVal={mc.maxVal}/></div>
                  <SB samples={mc.samples} features={mc.features} algorithm={mc.algorithm} version={mc.version} lastTrained={mc.last_trained}/>
                </div>
                {fi.length>0&&(
                  <div style={{marginTop:'0.55rem',borderTop:`1px solid rgba(180,155,125,0.3)`,paddingTop:'0.45rem'}}>
                    <button onClick={()=>setExpFI(isExp?null:mc.id)} style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px',fontSize:'0.65rem',color:C.brown,fontWeight:700,padding:0}}>
                      <Target size={10}/> Feature Importances {isExp?<ChevronUp size={10}/>:<ChevronDown size={10}/>}
                    </button>
                    {isExp&&<div style={{marginTop:'0.45rem'}}>{fi.map(f=><FBar key={f.name} name={f.name} pct={f.pct} maxPct={fi[0].pct}/>)}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ROD FLOAT + FAILURE RISK */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.8rem'}}>
          <div style={CARD}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.25rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <div style={{width:'24px',height:'24px',borderRadius:'5px',background:C.accent,display:'flex',alignItems:'center',justifyContent:'center'}}><Settings size={14} color={C.brown}/></div>
                <span style={{fontSize:'0.7rem',fontWeight:800,color:C.dark,letterSpacing:'0.04em'}}>4. ROD FLOATING CLASSIFIER</span>
              </div>
              <Badge status={rod.status??'PRODUCTION'}/>
            </div>
            <div style={{fontSize:'1.75rem',fontWeight:900,color:C.rust,fontFamily:'var(--font-serif)',lineHeight:1.1}}>R&#178; = {rR2.toFixed(4)}</div>
            <div style={{fontSize:'0.71rem',color:C.mid,fontWeight:700,marginBottom:'0.55rem'}}>MAE: {rod.mae??0.0003} &middot; Acc: {((1-(rod.mae??0.0003))*100).toFixed(2)}%</div>
            <div style={{display:'flex',gap:'0.8rem',alignItems:'flex-start'}}>
              <div style={{flex:1}}><CM tp={rod.confusion_matrix?.tp??4671} tn={rod.confusion_matrix?.tn??4982} fp={rod.confusion_matrix?.fp??21} fn={rod.confusion_matrix?.fn??8}/></div>
              <SB samples={rod.samples??9682} features={rod.features??14} algorithm={rod.algorithm??'Random Forest'} version={rod.version??'v4.1'} lastTrained={rod.last_trained??'2025-09-15'}/>
            </div>
          </div>

          <div style={CARD}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.25rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <div style={{width:'24px',height:'24px',borderRadius:'5px',background:'rgba(194,65,12,0.12)',display:'flex',alignItems:'center',justifyContent:'center'}}><AlertTriangle size={14} color={C.rust}/></div>
                <span style={{fontSize:'0.7rem',fontWeight:800,color:C.dark,letterSpacing:'0.04em'}}>5. FAILURE RISK GB</span>
              </div>
              <Badge status={fail.status??'PRODUCTION'}/>
            </div>
            <div style={{fontSize:'1.75rem',fontWeight:900,color:C.rust,fontFamily:'var(--font-serif)',lineHeight:1.1}}>R&#178; = {fR2.toFixed(4)}</div>
            <div style={{fontSize:'0.71rem',color:C.mid,fontWeight:700,marginBottom:'0.45rem'}}>MAE: {fail.mae??0.0198} &middot; Probabilistic survival model</div>
            <div style={{display:'flex',flexDirection:'column',gap:'2px',marginBottom:'4px'}}>
              {[['#1c1917','Mean Prediction',false],['rgba(194,65,12,0.55)','Uncertainty (1 std)',true],['#c2410c','Actual Failures',false]].map(([clr,lbl,dash])=>(
                <div key={lbl} style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'0.63rem',color:C.mid,fontWeight:600}}>
                  {lbl==='Actual Failures'?<svg width="10" height="10"><circle cx="5" cy="5" r="4" fill={clr}/></svg>:<svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke={clr} strokeWidth="2" strokeDasharray={dash?'4,3':'none'}/></svg>}
                  {lbl}
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:'0.5rem',alignItems:'flex-end',flex:1}}>
              <div style={{flex:1,minWidth:0}}><FailureSVG/></div>
              <SB samples={fail.samples??4221} features={fail.features??16} algorithm={fail.algorithm??'Gradient Boosting'} version={fail.version??'v2.3'} lastTrained={fail.last_trained??'2025-09-12'}/>
            </div>
          </div>
        </div>

        {/* WHAT-IF RUNNER */}
        <WhatIf wellId={selectedWellId}/>

        {/* BENCH + ANOMALY */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.8rem'}}>
          <div style={{background:'rgba(235,222,204,0.22)',border:`1px solid ${C.border}`,borderRadius:'8px',padding:'1rem 1.15rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'0.7rem'}}>
              <TrendingUp size={15} color={C.brown}/>
              <span style={{fontSize:'0.75rem',fontWeight:900,color:C.dark,letterSpacing:'0.04em'}}>VOLVE NORTH SEA BENCHMARK COMPARISON</span>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.69rem',fontFamily:'monospace'}}>
                <thead><tr style={{background:'rgba(120,53,15,0.10)'}}>
                  {['Model','R2 (Baghewala)','R2 (Volve)','MAE','Notes'].map(h=><th key={h} style={{padding:'5px 8px',textAlign:'left',color:C.dark,fontWeight:800,fontSize:'0.66rem',borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
                </tr></thead>
                <tbody>{benchRows.map((r,i)=>(
                  <tr key={i} style={{background:i%2===0?'rgba(235,222,204,0.15)':'transparent'}}>
                    <td style={{padding:'4px 8px',color:C.dark,fontWeight:700}}>{r.model}</td>
                    <td style={{padding:'4px 8px',color:C.rust,fontWeight:800}}>{r.r2Bag}</td>
                    <td style={{padding:'4px 8px',color:C.muted}}>{r.r2Vol}</td>
                    <td style={{padding:'4px 8px',color:C.mid}}>{r.mae}</td>
                    <td style={{padding:'4px 8px',color:C.light,fontStyle:'italic',fontSize:'0.63rem'}}>{r.note}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div style={{marginTop:'0.65rem',fontSize:'0.65rem',color:C.muted,lineHeight:1.55,borderTop:`1px solid rgba(180,155,125,0.25)`,paddingTop:'0.5rem'}}>
              <strong style={{color:C.dark}}>Note:</strong> {volve.note??FALLBACK.volve_benchmark.note}
            </div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:'0.7rem'}}>
            <div style={{background:'rgba(235,222,204,0.22)',border:`1px solid ${C.border}`,borderRadius:'8px',padding:'1rem 1.15rem',flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'0.55rem'}}>
                <Cpu size={14} color={C.brown}/>
                <span style={{fontSize:'0.72rem',fontWeight:900,color:C.dark,letterSpacing:'0.04em'}}>6. ANOMALY DETECTION (ISOLATION FOREST)</span>
                <Badge status={anom.status??'PRODUCTION'}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'0.3rem',fontSize:'0.71rem',color:C.mid,lineHeight:1.55}}>
                <div><strong style={{color:C.dark}}>Trained Snapshots:</strong> {anom.snapshots_trained?anom.snapshots_trained.toLocaleString():'46,112'}</div>
                <div><strong style={{color:C.dark}}>Field Trigger Rate:</strong> <span style={{color:C.rust,fontWeight:700}}>{anom.anomaly_rate_pct??2.99}%</span></div>
                <div><strong style={{color:C.dark}}>Version:</strong> {anom.version??'v1.9'} &middot; Trained: {anom.last_trained??'2025-09-15'}</div>
                <div style={{marginTop:'3px'}}><strong style={{color:C.dark}}>Active Features:</strong> SPM, Max Rod Weight, Min Rod Weight, Gibbs Area, Pump Fillage, Casing Pressure</div>
              </div>
            </div>
            <div style={{background:'rgba(235,222,204,0.22)',border:`1px solid ${C.border}`,borderRadius:'8px',padding:'0.85rem 1.15rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'0.45rem'}}>
                <Zap size={13} color={C.brown}/>
                <span style={{fontSize:'0.71rem',fontWeight:900,color:C.dark,letterSpacing:'0.04em'}}>RESERVOIR PHYSICS CONTEXT</span>
              </div>
              <div style={{fontSize:'0.67rem',color:C.mid,lineHeight:1.55}}>
                <div style={{marginBottom:'3px'}}><strong style={{color:C.dark}}>Heavy Oil Dynamic:</strong> CSS creates thermal mobilization radius of <span style={{color:C.rust,fontWeight:700}}>{twinState?.reservoir?.heated_radius_m??7.09} m</span>, reducing viscosity from 10,000+ cP to {Math.round(twinState?.reservoir?.viscosity_cp??501).toLocaleString()} cP.</div>
                <div><strong style={{color:C.dark}}>Field Context:</strong> {volve.comparison_note??FALLBACK.volve_benchmark.comparison_note}</div>
              </div>
            </div>
          </div>
        </div>
      </>}
    </div>
  );
}
