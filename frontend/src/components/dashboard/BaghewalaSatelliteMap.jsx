import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './satellite_map.css';
import {
  Layers,
  Maximize2,
  Minimize2,
  Crosshair,
  Compass,
  ChevronDown,
  Activity,
  Flame,
  Droplets,
  Thermometer,
  Zap,
  Info,
  Check,
  Globe,
  MapPin,
  Search,
  X,
  Sliders
} from 'lucide-react';

// Coordinates Context
// Rajasthan / Thar Desert regional center (shows Bikaner-Nagaur basin, Jaisalmer, Pokhran & Baghewala)
const RAJASTHAN_CENTER = [27.4200, 71.9500];
const RAJASTHAN_ZOOM = 8;

// Baghewala Field Center
const FIELD_CENTER = [27.5340, 71.9160];
const FIELD_ZOOM = 13;

// Rajasthan Regional Reference Landmarks (Visible at lower zoom)
const RAJASTHAN_LANDMARKS = [
  {
    id: 'BIKANER',
    name: 'Bikaner',
    sub: 'Regional Project HQ (OIL)',
    coords: [28.0229, 73.3119],
    type: 'city'
  },
  {
    id: 'JAISALMER',
    name: 'Jaisalmer',
    sub: 'Basin District HQ',
    coords: [26.9157, 70.9083],
    type: 'city'
  },
  {
    id: 'POKHRAN',
    name: 'Pokhran',
    sub: 'Supply & Logistics Base',
    coords: [26.9200, 71.9100],
    type: 'hub'
  }
];

// Exact Geographically Distributed Coordinates for all Baghewala Wells (Across 52.4 km² Field)
const FIELD_WELL_COORDS = {
  // Pad-NK (North Cluster - Sector NK)
  'NK-68': [27.5580, 71.9160],
  'NK-75': [27.5560, 71.9240],
  'NK-76': [27.5520, 71.9120],
  'NK-82': [27.5610, 71.9280],
  'NK-91': [27.5540, 71.9360],
  'NK-93': [27.5590, 71.9050],
  'NK-7':  [27.5630, 71.9380],

  // Pad-01 (North-West Sector - Jodhpur Sandstone)
  'B-01': [27.5460, 71.8860],
  'B-02': [27.5490, 71.8940],
  'B-03': [27.5430, 71.8920],
  'B-04': [27.5470, 71.9020],
  'B-05': [27.5410, 71.8980],
  'B-06': [27.5440, 71.9060],

  // Pad-02 (Central Sector - CPF & STG Header)
  'B-07': [27.5340, 71.9040],
  'B-08': [27.5370, 71.9120],
  'B-09': [27.5310, 71.9100],
  'B-10': [27.5350, 71.9180],
  'B-11': [27.5280, 71.9150],
  'B-12': [27.5320, 71.9220],

  // Pad-03 (South Sector - Extension Area)
  'B-13': [27.5180, 71.8880],
  'B-14': [27.5210, 71.8960],
  'B-15': [27.5140, 71.8940],
  'B-16': [27.5170, 71.9040],
  'B-17': [27.5110, 71.9000],
  'B-18': [27.5150, 71.9100],

  // Pad-04 (East Sector - Sandstone Pay)
  'B-19': [27.5320, 71.9340],
  'B-20': [27.5360, 71.9420],
  'B-21': [27.5280, 71.9380],
  'B-22': [27.5330, 71.9480],
  'B-23': [27.5240, 71.9440],
  'B-24': [27.5290, 71.9520],

  // Pad-05 (South-East Sector - Deep Jodhpur)
  'B-25': [27.5160, 71.9220],
  'B-26': [27.5190, 71.9300],
  'B-27': [27.5120, 71.9260],
  'B-28': [27.5170, 71.9360],
  'B-29': [27.5080, 71.9320],
  'B-30': [27.5140, 71.9420]
};

// Multi-Well Drilling Pads & Engineering Parcels
const DRILLING_PADS = [
  {
    id: 'PAD-NK',
    name: 'Pad-NK (North Heavy Oil Cluster)',
    sector: 'Sector-NK (North Field)',
    bounds: [
      [27.5640, 71.9020],
      [27.5640, 71.9400],
      [27.5500, 71.9400],
      [27.5500, 71.9020]
    ],
    wells: ['NK-68', 'NK-75', 'NK-76', 'NK-82', 'NK-91', 'NK-93', 'NK-7'],
    pattern: '5-Spot Inverted Thermal Pattern',
    color: '#d97706'
  },
  {
    id: 'PAD-01',
    name: 'Pad-1 (North-Jodhpur Sector)',
    sector: 'North-Jodhpur Sector',
    bounds: [
      [27.5500, 71.8820],
      [27.5500, 71.9080],
      [27.5390, 71.9080],
      [27.5390, 71.8820]
    ],
    wells: ['B-01', 'B-02', 'B-03', 'B-04', 'B-05', 'B-06'],
    pattern: 'Line-Drive CSS Pattern',
    color: '#ea580c'
  },
  {
    id: 'PAD-02',
    name: 'Pad-2 (Central-GGS Sector)',
    sector: 'Central-GGS Sector',
    bounds: [
      [27.5390, 71.9020],
      [27.5390, 71.9260],
      [27.5260, 71.9260],
      [27.5260, 71.9020]
    ],
    wells: ['B-07', 'B-08', 'B-09', 'B-10', 'B-11', 'B-12'],
    pattern: '5-Spot CSS + SRP Drive',
    color: '#c2410c'
  },
  {
    id: 'PAD-03',
    name: 'Pad-3 (South-Extension Sector)',
    sector: 'South-Extension Sector',
    bounds: [
      [27.5230, 71.8840],
      [27.5230, 71.9120],
      [27.5080, 71.9120],
      [27.5080, 71.8840]
    ],
    wells: ['B-13', 'B-14', 'B-15', 'B-16', 'B-17', 'B-18'],
    pattern: 'Inverted 9-Spot Thermal Flood',
    color: '#ea580c'
  },
  {
    id: 'PAD-04',
    name: 'Pad-4 (East-Sandstone Sector)',
    sector: 'East-Sandstone Sector',
    bounds: [
      [27.5380, 71.9300],
      [27.5380, 71.9540],
      [27.5220, 71.9540],
      [27.5220, 71.9300]
    ],
    wells: ['B-19', 'B-20', 'B-21', 'B-22', 'B-23', 'B-24'],
    pattern: '7-Spot CSS Pattern',
    color: '#b45309'
  },
  {
    id: 'PAD-05',
    name: 'Pad-5 (Deep Jodhpur Heavy Oil Sector)',
    sector: 'Deep Jodhpur Sector',
    bounds: [
      [27.5210, 71.9180],
      [27.5210, 71.9460],
      [27.5060, 71.9460],
      [27.5060, 71.9180]
    ],
    wells: ['B-25', 'B-26', 'B-27', 'B-28', 'B-29', 'B-30'],
    pattern: 'CSS Heavy Viscous Flood',
    color: '#9a3412'
  }
];

// Subsurface Depth Structural Contours of Jodhpur Sandstone Top (m MSL)
const STRUCTURAL_CONTOURS = [
  {
    depth: '-1000m MSL',
    color: '#ea580c',
    coords: [
      [27.5580, 71.8920],
      [27.5560, 71.9150],
      [27.5520, 71.9350],
      [27.5480, 71.9500]
    ]
  },
  {
    depth: '-1025m MSL',
    color: '#d97706',
    coords: [
      [27.5460, 71.8880],
      [27.5440, 71.9120],
      [27.5390, 71.9340],
      [27.5340, 71.9480]
    ]
  },
  {
    depth: '-1050m MSL (Crestal Pay)',
    color: '#fbbf24',
    coords: [
      [27.5340, 71.8850],
      [27.5310, 71.9100],
      [27.5260, 71.9300],
      [27.5210, 71.9460]
    ]
  },
  {
    depth: '-1075m MSL',
    color: '#f97316',
    coords: [
      [27.5220, 71.8820],
      [27.5180, 71.9060],
      [27.5130, 71.9270],
      [27.5080, 71.9420]
    ]
  },
  {
    depth: '-1100m MSL (Oil-Water Contact)',
    color: '#b91c1c',
    coords: [
      [27.5110, 71.8800],
      [27.5070, 71.9020],
      [27.5020, 71.9220],
      [27.4980, 71.9380]
    ]
  }
];

// Geological Fault Lines
const FAULT_LINES = [
  {
    id: 'F-1',
    name: 'F1 North Sealing Boundary Fault',
    coords: [
      [27.5600, 71.8950],
      [27.5560, 71.9200],
      [27.5500, 71.9450]
    ],
    throw: 'Throw: 45m (Downthrown South)'
  },
  {
    id: 'F-2',
    name: 'F2 Central Transcurrent Fault',
    coords: [
      [27.5480, 71.8850],
      [27.5330, 71.9150],
      [27.5150, 71.9380]
    ],
    throw: 'Throw: 20m (Strike-Slip)'
  }
];

// Field Access Road Corridors
const ACCESS_ROADS = [
  [
    [27.5100, 71.8750],
    [27.5180, 71.8900],
    [27.5260, 71.9020]
  ],
  [
    [27.5260, 71.9020],
    [27.5350, 71.8980],
    [27.5440, 71.8960],
    [27.5540, 71.9200]
  ],
  [
    [27.5260, 71.9020],
    [27.5310, 71.9120],
    [27.5400, 71.9280]
  ],
  [
    [27.5260, 71.9020],
    [27.5160, 71.9020],
    [27.5260, 71.9360]
  ]
];

// Central Facilities Coordinates (Well-Spaced)
const FACILITIES = [
  {
    id: 'CPF-01',
    name: 'Central Processing Facility (CPF / GGS)',
    shortName: 'CPF / GGS',
    type: 'GGS / CPF Complex',
    subtext: '3-Phase Heated Separation, Free-Water Knockout & Desalting (5,000 BOPD)',
    coords: [27.5260, 71.9020],
    color: '#ea580c',
    icon: '🏭'
  },
  {
    id: 'STG-01',
    name: 'Central Steam Generation Plant (STG)',
    shortName: 'Central Steam Plant',
    type: 'Steam Plant Complex',
    subtext: '4x Once-Through Steam Generators (OTSG) • 200 TPD @ 80% Quality (280°C, 120 bar)',
    coords: [27.5350, 71.9080],
    color: '#ea580c',
    icon: '🔥'
  },
  {
    id: 'WTP-01',
    name: 'Water Demineralization Plant',
    shortName: 'Water Demin Plant',
    type: 'Water Facility',
    subtext: 'Produced Water Deoiling, Walnut Shell Filtration & Softening Units',
    coords: [27.5390, 71.9180],
    color: '#d97706',
    icon: '💧'
  },
  {
    id: 'SUB-01',
    name: '33/11 kV Field Electrical Substation',
    shortName: '33/11 kV Substation',
    type: 'Electrical Substation',
    subtext: 'VFD Inverters & Dedicated Power Feeder for SRP Rod Pump Motors',
    coords: [27.5200, 71.9160],
    color: '#eab308',
    icon: '⚡'
  },
  {
    id: 'TNK-01',
    name: 'Baghewala Crude Storage Battery',
    shortName: 'Crude Storage Battery',
    type: 'Storage & Export Terminal',
    subtext: '4x 10,000 bbl Heated Crude Storage Tanks with Steam Coils',
    coords: [27.5230, 71.8940],
    color: '#d97706',
    icon: '🛢️'
  }
];

// Reservoir Lease Boundary Polygon (Baghewala Field Plan Boundary Area: 52.4 km²)
const RESERVOIR_BOUNDARY = [
  [27.5640, 71.8820],
  [27.5660, 71.9380],
  [27.5500, 71.9560],
  [27.5200, 71.9520],
  [27.5050, 71.9300],
  [27.5030, 71.8860],
  [27.5280, 71.8740],
  [27.5640, 71.8820]
];

// Production Flowlines (STG / CPF connections)
const FLOWLINE_SEGMENTS = [
  [
    [27.5540, 71.9200],
    [27.5450, 71.9100],
    [27.5350, 71.9040],
    [27.5260, 71.9020]
  ],
  [
    [27.5440, 71.8960],
    [27.5350, 71.8980],
    [27.5260, 71.9020]
  ],
  [
    [27.5310, 71.9120],
    [27.5280, 71.9060],
    [27.5260, 71.9020]
  ],
  [
    [27.5160, 71.9020],
    [27.5200, 71.9018],
    [27.5260, 71.9020]
  ],
  [
    [27.5300, 71.9400],
    [27.5260, 71.9200],
    [27.5260, 71.9020]
  ],
  [
    [27.5140, 71.9300],
    [27.5180, 71.9150],
    [27.5260, 71.9020]
  ]
];

// Steam Injection Distribution Trunklines
const STEAMLINE_SEGMENTS = [
  [
    [27.5350, 71.9080],
    [27.5450, 71.9120],
    [27.5540, 71.9200]
  ],
  [
    [27.5350, 71.9080],
    [27.5420, 71.9000],
    [27.5440, 71.8960]
  ],
  [
    [27.5350, 71.9080],
    [27.5310, 71.9120]
  ],
  [
    [27.5350, 71.9080],
    [27.5270, 71.9030],
    [27.5160, 71.9020]
  ],
  [
    [27.5350, 71.9080],
    [27.5330, 71.9250],
    [27.5300, 71.9400]
  ],
  [
    [27.5350, 71.9080],
    [27.5220, 71.9200],
    [27.5140, 71.9300]
  ]
];

export default function BaghewalaSatelliteMap({
  wellPins = [],
  selectedWellId = 'B-17',
  onSelectWell = () => {},
  mapMode = 'Satellite',
  setMapMode = () => {},
  mapLayers = {
    wells: true,
    productionLines: true,
    steamLines: true,
    facilities: true,
    thermalZones: true,
    reservoirBoundary: true
  },
  setMapLayers = () => {}
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const labelLayerRef = useRef(null);
  const featureGroupRef = useRef(null);
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorCoords, setCursorCoords] = useState({ lat: 27.5340, lon: 71.9160, elev: 194 });
  const [currentZoom, setCurrentZoom] = useState(FIELD_ZOOM);
  const [searchQuery, setSearchQuery] = useState('');

  // Process well data with accurate, spread-out GIS positions
  const processedWells = useMemo(() => {
    // Collect unique well records across field
    const wellMap = new Map();

    // 1. Seed with 30 official Baghewala Field Wells distributed across 6 pads
    Object.keys(FIELD_WELL_COORDS).forEach((id, idx) => {
      const isInj = id === 'B-07' || id === 'B-17' || id === 'NK-76' || id === 'B-22';
      const isSoak = id === 'B-09' || id === 'B-19' || id === 'NK-93';
      const [lat, lon] = FIELD_WELL_COORDS[id];

      wellMap.set(id, {
        id,
        name: id,
        lat,
        lon,
        state: isInj ? 'Injection' : (isSoak ? 'Soak' : 'Producing'),
        type: isInj ? 'CSS' : 'CSS + SRP',
        bopd: isInj || isSoak ? 0 : Math.round(95 + ((idx % 6) * 22)),
        steam: isInj ? 380 : null,
        temp: isInj ? 82 : (isSoak ? 78 : 72),
        spm: isInj || isSoak ? 0 : 4.4,
        waterCut: isInj ? 0 : 62 + ((idx % 5) * 3),
        bhp: isInj ? 118 : 45
      });
    });

    // 2. Merge any live wellPins overrides
    if (wellPins && wellPins.length > 0) {
      wellPins.forEach((w) => {
        const id = w.id || w.name;
        if (!id) return;
        const existing = wellMap.get(id);
        const coords = FIELD_WELL_COORDS[id] || (existing ? [existing.lat, existing.lon] : null);
        if (coords) {
          wellMap.set(id, {
            ...existing,
            ...w,
            id,
            name: w.name || id,
            lat: Number(w.latitude || coords[0]),
            lon: Number(w.longitude || coords[1]),
            state: w.state || (w.status === 'INJECTION' ? 'Injection' : w.status === 'SOAK' ? 'Soak' : 'Producing'),
            bopd: w.bopd !== undefined ? w.bopd : (existing?.bopd ?? 125),
            steam: w.steam || (existing?.steam ?? null),
            temp: w.temp || (existing?.temp ?? 74),
            type: w.type || w.mode || (existing?.type ?? 'CSS + SRP')
          });
        }
      });
    }

    return Array.from(wellMap.values());
  }, [wellPins]);

  // Filtered wells for search
  const filteredWells = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return processedWells.filter((w) => w.id.toLowerCase().includes(searchQuery.toLowerCase().trim()));
  }, [processedWells, searchQuery]);

  // Selected well detailed profile state
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [drawerWellId, setDrawerWellId] = useState(selectedWellId);

  // Helper to get comprehensive digital twin telemetry profile for any well
  const getWellFullProfile = (wellId) => {
    const targetWell = processedWells.find(
      (w) => w.id === wellId || (wellId && wellId.includes(w.id.replace('B-', '')))
    ) || processedWells[0] || { id: wellId || 'B-17', lat: 27.5170, lon: 71.9040, state: 'Producing' };

    const targetId = targetWell.id;
    const num = parseInt(targetId.replace(/\D/g, '') || '17', 10);
    const pad = DRILLING_PADS.find((p) => p.wells.includes(targetId)) || DRILLING_PADS[2];

    const isInj = targetWell.state === 'Injection' || targetId === 'B-07' || targetId === 'B-17' || targetId === 'NK-76' || targetId === 'B-22';
    const isSoak = targetWell.state === 'Soak' || targetId === 'B-09' || targetId === 'B-19' || targetId === 'NK-93';

    const bopd = isInj || isSoak ? 0 : (targetWell.bopd || Math.round(95 + ((num % 6) * 22)));
    const waterCut = isInj ? 0 : (targetWell.waterCut || 62 + ((num % 5) * 3));
    const grossLiquid = isInj ? 0 : Math.round(bopd / Math.max(0.1, (100 - waterCut) / 100));
    const steamRate = isInj ? (targetWell.steam || 380) : null;
    const temp = targetWell.temp || (isInj ? 86 : isSoak ? 80 : 74);
    const baselineTemp = 42.0;
    const viscosity = Math.max(18, Math.round(4500 * Math.exp(-0.065 * (temp - 30))));
    const viscosityReduction = (4500 / viscosity).toFixed(1);
    const bhp = isInj ? 118.5 : 46.2 + ((num % 4) * 2.1);
    const casingPress = isInj ? 112.0 : 12.4 + ((num % 3) * 1.5);
    const tubingPress = isInj ? 115.8 : 8.6 + ((num % 3) * 0.8);
    const steamRadius = isInj ? 120 : (isSoak ? 85 : Math.round(45 + ((num % 4) * 8)));
    const spm = isInj || isSoak ? 0 : 4.4 + ((num % 3) * 0.4);
    const rodLoad = isInj || isSoak ? 0 : Math.round(13800 + ((num % 5) * 650));
    const motorTorque = isInj || isSoak ? 0 : 64 + ((num % 4) * 5);
    const pumpFillage = isInj || isSoak ? 0 : 91.5 + ((num % 3) * 2.1);
    const cycleNum = (num % 4) + 1;
    const cumOil = Math.round(9200 + ((num * 1150) % 8500));
    const cumSteam = Math.round(18000 + ((num * 2100) % 13500));
    const csor = (cumSteam / Math.max(cumOil, 1)).toFixed(2);

    return {
      id: targetId,
      name: targetWell.name || targetId,
      lat: targetWell.lat,
      lon: targetWell.lon,
      state: isInj ? 'Injection' : (isSoak ? 'Soak' : 'Producing'),
      type: isInj ? 'CSS Thermal Injection' : (isSoak ? 'Thermal Soaking' : 'CSS + SRP Rod Lift'),
      padName: pad.name,
      sector: pad.sector,
      pattern: pad.pattern,
      padColor: pad.color,
      bopd,
      waterCut,
      grossLiquid,
      gor: 14.5,
      steamRate,
      steamQuality: 80,
      steamEnthalpy: 2780,
      temp,
      baselineTemp,
      viscosity,
      viscosityReduction,
      steamRadius,
      bhp: bhp.toFixed(1),
      casingPress: casingPress.toFixed(1),
      tubingPress: tubingPress.toFixed(1),
      drawdown: (bhp - casingPress).toFixed(1),
      spm: spm.toFixed(1),
      strokeLength: 120,
      rodLoad,
      motorTorque,
      pumpFillage: pumpFillage.toFixed(1),
      cycleNum,
      phaseName: isInj ? `Cycle ${cycleNum} — Steam Injection Phase` : (isSoak ? `Cycle ${cycleNum} — Thermal Soaking Phase` : `Cycle ${cycleNum} — Peak SRP Production Phase`),
      phaseDays: isInj ? 'Day 14 of 21' : (isSoak ? 'Day 6 of 10' : 'Day 48 of 90'),
      cumOil,
      cumSteam,
      csor,
      formation: 'Jodhpur Sandstone (Proterozoic)',
      targetDepth: '1,048 m MSL',
      wellheadElevation: '194 m MSL'
    };
  };

  const activeWellProfile = useMemo(() => {
    return getWellFullProfile(drawerWellId || selectedWellId);
  }, [drawerWellId, selectedWellId, processedWells]);

  // 1. Initialize Leaflet Map (Default starts at Rajasthan Satellite Regional View)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: FIELD_CENTER,
      zoom: FIELD_ZOOM,
      minZoom: 6,
      maxZoom: 20,
      zoomSnap: 1,
      zoomDelta: 1,
      wheelPxPerZoomLevel: 120,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('mousemove', (e) => {
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      const pseudoElev = Math.round(180 + Math.sin(lat * 50) * 15 + Math.cos(lon * 50) * 10);
      setCursorCoords({
        lat: parseFloat(lat.toFixed(5)),
        lon: parseFloat(lon.toFixed(5)),
        elev: pseudoElev
      });
    });

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });
    map.on('zoom', () => {
      setCurrentZoom(map.getZoom());
    });

    featureGroupRef.current = L.featureGroup().addTo(map);
    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Escape key handler to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Invalidate map size seamlessly on fullscreen toggle & window resize
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const triggerInvalidate = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    triggerInvalidate();
    const t1 = setTimeout(triggerInvalidate, 80);
    const t2 = setTimeout(triggerInvalidate, 250);
    const t3 = setTimeout(triggerInvalidate, 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isFullscreen]);

  // 2. Official Google Maps Satellite Layer (High-Resolution Optical Hybrid Imagery)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    tileLayerRef.current = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      {
        maxZoom: 21,
        maxNativeZoom: 20,
        attribution: '© Google Maps Satellite'
      }
    ).addTo(map);
  }, []);

  // 3. Render Progressive Level of Detail (LOD) based on Zoom Level
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = featureGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const isFieldPlan = mapMode === 'Field Plan';
    const isRegionalZoom = currentZoom < 11; // Zoom 6 - 10: Rajasthan Regional View
    const isFieldOverviewZoom = currentZoom >= 11 && currentZoom < 14; // Zoom 11 - 13: Field Plan Overview
    const isOperationalZoom = currentZoom >= 14 && currentZoom < 16; // Zoom 14 - 15: Operational Detailed View
    const isMicroWellZoom = currentZoom >= 16; // Zoom 16+: Micro Pad / Wellhead View

    // =========================================================================
    // LEVEL 1: RAJASTHAN REGIONAL CONTEXT LANDMARKS (Visible when currentZoom < 12)
    // =========================================================================
    if (isRegionalZoom) {
      RAJASTHAN_LANDMARKS.forEach((lm) => {
        const landmarkIcon = L.divIcon({
          className: 'custom-landmark-icon',
          html: `
            <div class="rajasthan-landmark-badge">
              <span class="landmark-dot ${lm.type}"></span>
              <div class="landmark-label-box">
                <span class="landmark-name">${lm.name}</span>
                <span class="landmark-sub">${lm.sub}</span>
              </div>
            </div>
          `,
          iconSize: [120, 28],
          iconAnchor: [60, 14]
        });

        const marker = L.marker(lm.coords, { icon: landmarkIcon });
        marker.bindTooltip(
          `<div style="font-weight:700;font-size:0.75rem;color:#fcd34d;">${lm.name}</div><div style="font-size:0.65rem;color:#cbd5e1;">${lm.sub}</div>`,
          { sticky: true, className: 'leaflet-desert-tooltip' }
        );
        group.addLayer(marker);
      });
    }

    // =========================================================================
    // LEVEL 2: BAGHEWALA FIELD PLAN BOUNDARY (52.4 km² High-Visibility Perimeter)
    // =========================================================================
    if (mapLayers.reservoirBoundary) {
      // High-contrast dark shadow underlay for boundary
      const boundaryShadow = L.polygon(RESERVOIR_BOUNDARY, {
        color: '#000000',
        weight: 5,
        opacity: 0.85,
        fillColor: 'transparent',
        fillOpacity: 0
      });
      group.addLayer(boundaryShadow);

      // Vibrant golden boundary line
      const boundaryPolygon = L.polygon(RESERVOIR_BOUNDARY, {
        color: '#fbbf24',
        weight: 3.5,
        dashArray: '10, 6',
        fillColor: '#f59e0b',
        fillOpacity: isFieldPlan ? 0.08 : 0.03
      });

      boundaryPolygon.bindTooltip(
        `<div style="font-weight:800;color:#fbbf24;font-size:0.8rem;">📍 BAGHEWALA HEAVY OIL FIELD</div>
         <div style="font-size:0.68rem;color:#f1f5f9;">Basin: Bikaner-Nagaur • Area: 52.4 km²</div>
         <div style="font-size:0.62rem;color:#fcd34d;">Click to Zoom into Field Area 🔍</div>`,
        { sticky: true, className: 'leaflet-desert-tooltip' }
      );

      boundaryPolygon.on('click', () => {
        if (currentZoom < 13) {
          map.flyTo(FIELD_CENTER, 13, { duration: 1.2 });
        }
      });

      group.addLayer(boundaryPolygon);
    }

    // =========================================================================
    // LEVEL 3: MULTI-WELL DRILLING PADS & SECTORS (Visible at Zoom >= 11)
    // =========================================================================
    if (!isRegionalZoom) {
      DRILLING_PADS.forEach((pad) => {
        const padPolygon = L.polygon(pad.bounds, {
          color: isFieldPlan ? pad.color : '#f59e0b',
          weight: 2,
          dashArray: '5, 5',
          fillColor: pad.color,
          fillOpacity: isFieldPlan ? 0.12 : 0.04
        });
        padPolygon.bindTooltip(
          `<div style="font-weight:800;color:${pad.color};font-size:0.75rem;">${pad.name}</div>
           <div style="font-size:0.65rem;color:#cbd5e1;">Pattern: <strong>${pad.pattern}</strong></div>
           <div style="font-size:0.62rem;color:#94a3b8;">Wells: ${pad.wells.join(', ')}</div>`,
          { sticky: true, className: 'leaflet-desert-tooltip' }
        );
        padPolygon.on('click', () => {
          const centerLat = (pad.bounds[0][0] + pad.bounds[2][0]) / 2;
          const centerLon = (pad.bounds[0][1] + pad.bounds[1][1]) / 2;
          map.flyTo([centerLat, centerLon], 15, { duration: 1.0 });
        });
        group.addLayer(padPolygon);
      });
    }

    // =========================================================================
    // LEVEL 4: GEOLOGICAL CONTOURS, FAULTS & ACCESS ROADS (Field Plan Mode)
    // =========================================================================
    if (isFieldPlan && !isRegionalZoom) {
      STRUCTURAL_CONTOURS.forEach((c) => {
        const line = L.polyline(c.coords, {
          color: c.color,
          weight: 2,
          dashArray: '5, 5',
          opacity: 0.85
        });
        line.bindTooltip(
          `<div style="font-weight:700;color:${c.color};font-size:0.68rem;">Top Jodhpur Sandstone Depth: ${c.depth}</div>`,
          { sticky: true, className: 'leaflet-desert-tooltip' }
        );
        group.addLayer(line);
      });

      FAULT_LINES.forEach((fault) => {
        const faultLine = L.polyline(fault.coords, {
          color: '#ef4444',
          weight: 3,
          opacity: 0.95
        });
        faultLine.bindTooltip(
          `<div style="font-weight:800;color:#f87171;font-size:0.72rem;">⚠️ ${fault.name}</div><div style="font-size:0.62rem;color:#fecaca;">${fault.throw}</div>`,
          { sticky: true, className: 'leaflet-desert-tooltip' }
        );
        group.addLayer(faultLine);
      });

      ACCESS_ROADS.forEach((road) => {
        const roadLine = L.polyline(road, {
          color: '#64748b',
          weight: 3,
          opacity: 0.7,
          dashArray: '2, 6'
        });
        group.addLayer(roadLine);
      });
    }

    // =========================================================================
    // LEVEL 5: HIGH-CONTRAST PRODUCTION GATHERING & STEAM TRUNKLINES (Zoom >= 13)
    // =========================================================================
    if (currentZoom >= 13) {
      if (mapLayers.productionLines) {
        FLOWLINE_SEGMENTS.forEach((segment, idx) => {
          // Dark casing shadow underlay for high contrast
          const shadowLine = L.polyline(segment, {
            color: '#000000',
            weight: 5,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
          });
          group.addLayer(shadowLine);

          // Bright High-Visibility Flowline (Copper-Orange Pipeline)
          const polyline = L.polyline(segment, {
            color: '#ea580c',
            weight: 3.5,
            opacity: 1.0,
            lineCap: 'round',
            lineJoin: 'round'
          });
          polyline.bindTooltip(
            `<div style="font-weight:700;font-size:0.7rem;color:#ea580c;">6" Heated Crude Gathering Line #${idx + 1}</div><div style="font-size:0.62rem;color:#431407;">Flow to CPF Gathering Header (8.5 bar)</div>`,
            { sticky: true, className: 'leaflet-desert-tooltip' }
          );
          group.addLayer(polyline);
        });
      }

      if (mapLayers.steamLines) {
        STEAMLINE_SEGMENTS.forEach((segment, idx) => {
          // Dark casing shadow underlay
          const shadowLine = L.polyline(segment, {
            color: '#000000',
            weight: 5.5,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
          });
          group.addLayer(shadowLine);

          // Vibrant High-Visibility Steam Line (Flame Orange Header)
          const steamLine = L.polyline(segment, {
            color: '#d97706',
            weight: 3.5,
            dashArray: '8, 5',
            opacity: 1.0,
            lineCap: 'round',
            lineJoin: 'round'
          });
          steamLine.bindTooltip(
            `<div style="font-weight:800;font-size:0.7rem;color:#d97706;">10" Insulated Steam Header #${idx + 1}</div><div style="font-size:0.62rem;color:#7c2d12;">Superheated Steam @ 280°C • 120 bar • 80% Quality</div>`,
            { sticky: true, className: 'leaflet-desert-tooltip' }
          );
          group.addLayer(steamLine);
        });
      }
    }

    // =========================================================================
    // LEVEL 6: CENTRAL FACILITIES (Google Maps POI Style - Clean Icons + Floating Text)
    // =========================================================================
    if (mapLayers.facilities && currentZoom >= 12) {
      FACILITIES.forEach((fac) => {
        const facHtml = `
          <div class="gmaps-facility-marker">
            <div class="gmaps-facility-pin" style="background-color: ${fac.color};">
              <span class="gmaps-fac-icon">${fac.icon}</span>
            </div>
            <div class="gmaps-poi-label">
              <span class="gmaps-facility-title">${fac.shortName}</span>
              <span class="gmaps-facility-sub">${fac.type}</span>
            </div>
          </div>
        `;

        const facIcon = L.divIcon({
          className: 'gmaps-custom-div-icon',
          html: facHtml,
          iconSize: [160, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker(fac.coords, { icon: facIcon });
        marker.bindTooltip(
          `<div style="font-weight:700;font-size:0.75rem;color:#f8fafc;">${fac.icon} ${fac.name}</div><div style="font-size:0.62rem;color:#94a3b8;">${fac.subtext}</div>`,
          { sticky: true, className: 'leaflet-desert-tooltip' }
        );
        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 220px; color: #1c1917; padding: 4px;">
            <div style="font-weight: 800; font-size: 0.85rem; color: #1c1917; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              <span>${fac.icon}</span> ${fac.name}
            </div>
            <div style="font-size: 0.72rem; color: #431407; margin-bottom: 8px;">${fac.subtext}</div>
            <div style="font-size: 0.68rem; background: #fef3c7; padding: 6px 8px; border-radius: 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; border: 1px solid rgba(234, 88, 12, 0.3);">
              <div><strong>Status:</strong> <span style="color:#ea580c; font-weight:700;">● Operational</span></div>
              <div><strong>Grid:</strong> Baghewala-01</div>
              <div><strong>Lat:</strong> ${fac.coords[0]}°N</div>
              <div><strong>Lon:</strong> ${fac.coords[1]}°E</div>
            </div>
          </div>
        `);
        group.addLayer(marker);
      });
    }

    // =========================================================================
    // LEVEL 7: THERMAL DRAINAGE HALOS (Visible at Zoom >= 15)
    // =========================================================================
    if (mapLayers.thermalZones && currentZoom >= 15) {
      processedWells.forEach((well) => {
        if (well.state === 'Injection' || well.state === 'Soak' || (well.temp && well.temp >= 75)) {
          const radius = well.state === 'Injection' ? 120 : 80;
          const thermalCircle = L.circle([well.lat, well.lon], {
            radius: radius,
            color: well.state === 'Injection' ? '#c2410c' : '#d97706',
            weight: 1.5,
            fillColor: well.state === 'Injection' ? '#ea580c' : '#f59e0b',
            fillOpacity: isFieldPlan ? 0.16 : 0.22,
            dashArray: '3, 3'
          });
          thermalCircle.bindTooltip(
            `<div style="font-weight:800;color:#c2410c;font-size:0.7rem;">Thermal Drainage Halo • Well ${well.id}</div><div style="font-size:0.62rem;color:#431407;">Radius: ${radius}m • Bottomhole Temp: ${well.temp}°C</div>`,
            { sticky: true, className: 'leaflet-desert-tooltip' }
          );
          group.addLayer(thermalCircle);
        }
      });
    }

    // =========================================================================
    // LEVEL 8: PROMINENT GOOGLE MAPS STYLE WELL POI MARKERS
    // =========================================================================
    if (mapLayers.wells) {
      processedWells.forEach((well) => {
        const isSelected = selectedWellId === well.id || (selectedWellId && selectedWellId.includes(well.id.replace('B-', '')));
        const isInjection = well.state === 'Injection';
        const isSoak = well.state === 'Soak';

        let dotColor = '#ea580c'; // High-Contrast Burnt Orange
        let glowColor = 'rgba(234, 88, 12, 0.85)';
        let pinIconSymbol = '🛢️';
        let statusTag = 'PROD';
        if (isInjection) {
          dotColor = '#c2410c'; // Deep Fire Orange
          glowColor = 'rgba(194, 65, 12, 0.85)';
          pinIconSymbol = '🔥';
          statusTag = 'INJ';
        } else if (isSoak) {
          dotColor = '#d97706'; // Warm Amber
          glowColor = 'rgba(217, 119, 6, 0.85)';
          pinIconSymbol = '💧';
          statusTag = 'SOAK';
        }

        // Distinct, highly prominent Google Maps POI style marker
        let wellHtml = '';
        if (isSelected) {
          wellHtml = `
            <div class="gmaps-poi-marker is-selected">
              <div class="gmaps-poi-pin selected-pin" style="background: ${dotColor}; border-color: #fef08a;">
                <span class="gmaps-poi-icon">📍</span>
                <span class="selected-radar-pulse" style="border-color: ${dotColor};"></span>
              </div>
              <div class="gmaps-poi-label">
                <div class="gmaps-poi-title-row">
                  <span class="gmaps-poi-title selected-title">★ ${well.id}</span>
                  <span class="gmaps-poi-status-tag selected-tag" style="background: ${dotColor};">${statusTag}</span>
                </div>
                <span class="gmaps-poi-sub selected-sub">${isInjection ? `${well.steam || 380} BPD Steam` : `${well.bopd || 120} BOPD Oil`}</span>
              </div>
            </div>
          `;
        } else {
          wellHtml = `
            <div class="gmaps-poi-marker prominent-well">
              <div class="gmaps-poi-pin prominent-pin" style="background: ${dotColor}; box-shadow: 0 0 12px ${glowColor}, 0 2px 8px rgba(0,0,0,0.85);">
                <span class="gmaps-pin-inner-symbol">${pinIconSymbol}</span>
              </div>
              <div class="gmaps-poi-label">
                <div class="gmaps-poi-title-row">
                  <span class="gmaps-poi-title prominent-title">${well.id}</span>
                  <span class="gmaps-poi-status-tag" style="background: ${dotColor};">${statusTag}</span>
                </div>
                ${currentZoom >= 13 ? `<span class="gmaps-poi-sub prominent-sub">${isInjection ? `${well.steam || 380}b` : `${well.bopd || 120}b`}</span>` : ''}
              </div>
            </div>
          `;
        }

        const wellIcon = L.divIcon({
          className: 'gmaps-custom-div-icon',
          html: wellHtml,
          iconSize: isSelected ? [160, 36] : [140, 32],
          iconAnchor: isSelected ? [14, 18] : [12, 16]
        });

        const marker = L.marker([well.lat, well.lon], { icon: wellIcon, zIndexOffset: isSelected ? 1000 : 100 });

        marker.bindTooltip(
          `<div style="font-weight:900;color:#1c1917;font-size:0.82rem;display:flex;align-items:center;gap:6px;">
             <span>${pinIconSymbol}</span> <strong>${well.name}</strong> (${well.type})
           </div>
           <div style="font-size:0.7rem;color:#431407;margin-top:2px;">Status: <strong style="color:${isInjection ? '#c2410c' : (isSoak ? '#d97706' : '#ea580c')}">${well.state.toUpperCase()}</strong></div>
           <div style="font-size:0.7rem;color:#431407;">Rate: <strong>${isInjection ? `${well.steam || 380} BPD Steam` : `${well.bopd || 120} BOPD Oil`}</strong></div>
           <div style="font-size:0.64rem;color:#7c2d12;font-weight:700;">Temp: ${well.temp}°C • Click to Focus Deep Telemetry ↗</div>`,
          { sticky: true, direction: 'top', offset: [0, -10], className: 'leaflet-desert-tooltip' }
        );

        marker.on('click', () => {
          onSelectWell(well.id);
          setDrawerWellId(well.id);
          setIsDetailDrawerOpen(true);
          map.flyTo([well.lat, well.lon], 18, { duration: 1.0 });
        });

        group.addLayer(marker);
      });
    }
  }, [processedWells, selectedWellId, mapLayers, mapMode, currentZoom, onSelectWell]);

  // Quick Zoom Navigation Actions
  const handleZoomToRajasthan = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(RAJASTHAN_CENTER, RAJASTHAN_ZOOM, { duration: 1.2 });
  };

  const handleZoomToField = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(FIELD_CENTER, FIELD_ZOOM, { duration: 1.2 });
  };

  // Deep Focus on Selected Well with Rich Telemetry Drawer
  const handleFocusSelectedWell = () => {
    if (!mapInstanceRef.current) return;
    const target = processedWells.find(
      (w) => w.id === selectedWellId || (selectedWellId && selectedWellId.includes(w.id.replace('B-', '')))
    );
    if (target) {
      setDrawerWellId(target.id);
      setIsDetailDrawerOpen(true);
      mapInstanceRef.current.flyTo([target.lat, target.lon], 18, { duration: 1.2 });
    }
  };

  const handleSelectAndFly = (well) => {
    onSelectWell(well.id);
    setDrawerWellId(well.id);
    setSearchQuery('');
    setIsDetailDrawerOpen(true);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([well.lat, well.lon], 18, { duration: 1.0 });
    }
  };

  return (
    <div className={`map-viewport-card ${isFullscreen ? 'map-viewport-fullscreen' : ''}`}>
      {/* 1. Leaflet Map Container */}
      <div ref={mapContainerRef} className="leaflet-real-satellite-container" tabIndex={0} />

      {/* Fullscreen Overlay Header Bar */}
      {isFullscreen && (
        <div className="map-fullscreen-topbar">
          <div className="fullscreen-brand">
            <Globe size={18} color="#ea580c" />
            <div className="fullscreen-brand-text">
              <span className="fullscreen-title">BAGHEWALA HEAVY OIL FIELD • SATELLITE GIS</span>
              <span className="fullscreen-subtitle">Bikaner-Nagaur Basin &bull; Thar Desert Live Telemetry</span>
            </div>
          </div>

          <div className="fullscreen-actions">
            <button
              className="fullscreen-action-btn"
              onClick={handleZoomToField}
              title="Center Baghewala Field"
            >
              <Crosshair size={14} />
              <span>Center Field</span>
            </button>
            <button
              className="fullscreen-action-btn exit-btn"
              onClick={() => setIsFullscreen(false)}
              title="Exit Fullscreen (Esc)"
            >
              <Minimize2 size={14} />
              <span>Exit Fullscreen</span>
              <span className="esc-key-badge">ESC</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Top-Right: GIS Action Buttons (Visible in Normal Mode) */}
      {!isFullscreen && (
        <div className="map-top-right-controls">
          <button
            className="map-action-pill-btn"
            onClick={handleZoomToField}
            title="Recenter Baghewala Field"
          >
            <Crosshair size={13} />
            <span>Center Field</span>
          </button>

          <button
            className="map-action-pill-btn fullscreen-toggle-btn"
            onClick={() => setIsFullscreen(true)}
            title="Expand Map to Fullscreen"
          >
            <Maximize2 size={13} />
            <span>Fullscreen</span>
          </button>
        </div>
      )}

      {/* 6. Well Quick-Search Searchbar on Map */}
      <div className="map-well-search-floating">
        <div className="map-search-input-box">
          <Search size={12} className="search-icon-dim" />
          <input
            type="text"
            placeholder="Search Well (e.g., B-06, NK-76)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="map-search-field"
          />
        </div>
        {filteredWells.length > 0 && (
          <div className="map-search-dropdown-results">
            {filteredWells.slice(0, 5).map((w) => (
              <div
                key={w.id}
                className="search-result-item"
                onClick={() => handleSelectAndFly(w)}
              >
                <span className="search-result-dot" style={{ backgroundColor: w.state === 'Injection' ? '#c2410c' : (w.state === 'Soak' ? '#d97706' : '#ea580c') }}></span>
                <strong className="search-result-name">{w.id}</strong>
                <span className="search-result-type">({w.type})</span>
                <span className="search-result-rate">{w.state === 'Injection' ? `${w.steam || 380} BPD Steam` : `${w.bopd || 120} BOPD`}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. Bottom-Left: Live Scale Bar, Compass & GPS Coordinate HUD */}
      <div className="map-scale-box">
        <div className="north-arrow" onClick={handleZoomToField} title="North Indicator (Click to reset)" style={{ cursor: 'pointer' }}>
          <span>▲</span>
          <span>N</span>
        </div>
        <div className="map-scale-details">
          <div className="map-scale-line-bar" />
          <div className="map-scale-labels">
            <span>0</span>
            <span>{currentZoom < 11 ? '20' : '1'}</span>
            <span>{currentZoom < 11 ? '50' : '2'}</span>
            <span>{currentZoom < 11 ? '100 km' : '4 km'}</span>
          </div>
          <div className="map-gps-readout">
            <span className="gps-pill">GPS: {cursorCoords.lat}°N, {cursorCoords.lon}°E</span>
            <span className="gps-pill elev">Elev: {cursorCoords.elev}m MSL</span>
            <span className="gps-pill field-tag">RAJASTHAN • THAR DESERT</span>
          </div>
        </div>
      </div>

      {/* 8. Bottom-Right: Active Well Quick Target Pill */}
      <div className="map-active-well-dock">
        <button
          className="active-well-pill-btn"
          onClick={handleFocusSelectedWell}
          title="Zoom to Selected Well in Digital Twin & View Deep Telemetry"
        >
          <span className="pulse-beacon"></span>
          <span>Active: <strong>{selectedWellId}</strong></span>
          <span className="view-link">Focus ↗</span>
        </button>
      </div>

      {/* 9. Deep Digital Twin Wellhead Telemetry Drawer (Opens on Focus / Marker Click) */}
      {isDetailDrawerOpen && activeWellProfile && (
        <div className="well-telemetry-detail-drawer">
          {/* Drawer Header */}
          <div className="drawer-header-bar">
            <div className="drawer-header-left">
              <div className="drawer-title-row">
                <span
                  className="drawer-status-dot"
                  style={{
                    backgroundColor:
                      activeWellProfile.state === 'Injection'
                        ? '#c2410c'
                        : activeWellProfile.state === 'Soak'
                        ? '#d97706'
                        : '#ea580c'
                  }}
                />
                <span className="drawer-well-name">WELL {activeWellProfile.id}</span>
                <span
                  className="drawer-badge-status"
                  style={{
                    borderColor: '#431407',
                    backgroundColor: '#431407',
                    color: '#fef3c7'
                  }}
                >
                  {activeWellProfile.state.toUpperCase()}
                </span>
              </div>
              <div className="drawer-sub-row">
                <span>{activeWellProfile.padName}</span>
                <span>&bull;</span>
                <span>{activeWellProfile.formation}</span>
              </div>
            </div>

            <div className="drawer-header-actions">
              <button
                className="drawer-icon-btn"
                onClick={() => {
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([activeWellProfile.lat, activeWellProfile.lon], 19, { duration: 0.8 });
                  }
                }}
                title="Micro Wellhead Zoom (19x)"
              >
                <Crosshair size={13} />
              </button>
              <button
                className="drawer-icon-btn close-btn"
                onClick={() => setIsDetailDrawerOpen(false)}
                title="Close Telemetry View"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Clean Geological & Location Chips */}
          <div className="drawer-metadata-chips">
            <span className="meta-chip">
              <span className="meta-lbl">Depth:</span>
              <strong className="meta-val">{activeWellProfile.targetDepth}</strong>
            </span>
            <span className="meta-chip">
              <span className="meta-lbl">Pattern:</span>
              <strong className="meta-val">{activeWellProfile.pattern}</strong>
            </span>
            <span className="meta-chip">
              <span className="meta-lbl">GPS:</span>
              <strong className="meta-val">{activeWellProfile.lat.toFixed(4)}°N, {activeWellProfile.lon.toFixed(4)}°E</strong>
            </span>
          </div>

          {/* Telemetry Cards Grid */}
          <div className="drawer-telemetry-body">
            {/* 1. Primary Flow & Thermodynamics */}
            <div className="drawer-metric-section">
              <div className="section-title">
                <Activity size={12} className="section-icon" />
                <span>Production & Thermal Thermodynamics</span>
              </div>
              <div className="telemetry-grid-2x2">
                <div className="telemetry-card highlight-metric">
                  <span className="t-label">{activeWellProfile.state === 'Injection' ? 'STEAM INJECTION' : 'HEAVY OIL RATE'}</span>
                  <span className="t-value large-val">
                    {activeWellProfile.state === 'Injection'
                      ? `${activeWellProfile.steamRate} BPD`
                      : `${activeWellProfile.bopd} BOPD`}
                  </span>
                  <span className="t-sub">{activeWellProfile.state === 'Injection' ? '80% Quality @ 280°C' : `Gross: ${activeWellProfile.grossLiquid} BFPD`}</span>
                </div>

                <div className="telemetry-card">
                  <span className="t-label">WATER CUT %</span>
                  <span className="t-value" style={{ color: activeWellProfile.waterCut > 70 ? '#c2410c' : '#ea580c' }}>
                    {activeWellProfile.waterCut}%
                  </span>
                  <span className="t-sub">GOR: {activeWellProfile.gor} m³/m³</span>
                </div>

                <div className="telemetry-card">
                  <span className="t-label">BOTTOMHOLE TEMP</span>
                  <span className="t-value" style={{ color: '#ea580c' }}>
                    {activeWellProfile.temp}°C
                  </span>
                  <span className="t-sub">Baseline: {activeWellProfile.baselineTemp}°C (+{(activeWellProfile.temp - activeWellProfile.baselineTemp).toFixed(0)}°C)</span>
                </div>

                <div className="telemetry-card">
                  <span className="t-label">IN-SITU VISCOSITY</span>
                  <span className="t-value" style={{ color: '#9a3412' }}>
                    {activeWellProfile.viscosity} cP
                  </span>
                  <span className="t-sub">{activeWellProfile.viscosityReduction}x Mobility Boost</span>
                </div>
              </div>
            </div>

            {/* 2. Hydraulics & Wellhead Pressures */}
            <div className="drawer-metric-section">
              <div className="section-title">
                <Thermometer size={12} className="section-icon" />
                <span>Hydraulics & Pressure Dynamics</span>
              </div>
              <div className="telemetry-grid-2x2">
                <div className="telemetry-card">
                  <span className="t-label">BOTTOMHOLE PRESS (BHP)</span>
                  <span className="t-value">{activeWellProfile.bhp} bar</span>
                  <span className="t-sub">Drawdown: {activeWellProfile.drawdown} bar</span>
                </div>
                <div className="telemetry-card">
                  <span className="t-label">CASING HEAD PRESS</span>
                  <span className="t-value">{activeWellProfile.casingPress} bar</span>
                  <span className="t-sub">Tubing: {activeWellProfile.tubingPress} bar</span>
                </div>
                <div className="telemetry-card">
                  <span className="t-label">STEAM HALO RADIUS</span>
                  <span className="t-value" style={{ color: '#ea580c' }}>{activeWellProfile.steamRadius} m</span>
                  <span className="t-sub">Thermal Sweep Zone</span>
                </div>
                <div className="telemetry-card">
                  <span className="t-label">LIFT MECHANISM</span>
                  <span className="t-value" style={{ fontSize: '0.74rem' }}>{activeWellProfile.type}</span>
                  <span className="t-sub">Downhole SRP Pump</span>
                </div>
              </div>
            </div>

            {/* 3. Artificial Lift / SRP Rod Pump Telemetry (if producer) */}
            {activeWellProfile.state !== 'Injection' && (
              <div className="drawer-metric-section">
                <div className="section-title">
                  <Zap size={12} className="section-icon" />
                  <span>SRP Rod Lift Real-Time Dynamics</span>
                </div>
                <div className="telemetry-grid-2x2">
                  <div className="telemetry-card">
                    <span className="t-label">PUMP SPEED</span>
                    <span className="t-value">{activeWellProfile.spm} SPM</span>
                    <span className="t-sub">Stroke: {activeWellProfile.strokeLength}"</span>
                  </div>
                  <div className="telemetry-card">
                    <span className="t-label">POLISHED ROD LOAD</span>
                    <span className="t-value">{activeWellProfile.rodLoad.toLocaleString()} lbs</span>
                    <span className="t-sub">72% Rating Factor</span>
                  </div>
                  <div className="telemetry-card">
                    <span className="t-label">MOTOR TORQUE</span>
                    <span className="t-value">{activeWellProfile.motorTorque}%</span>
                    <span className="t-sub">18.5 kW VFD Drive</span>
                  </div>
                  <div className="telemetry-card">
                    <span className="t-label">PUMP FILLAGE</span>
                    <span className="t-value" style={{ color: '#ea580c' }}>{activeWellProfile.pumpFillage}%</span>
                    <span className="t-sub">Normal Fluid Intake</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. CSS Thermal Recovery Cycle Stats */}
            <div className="drawer-metric-section">
              <div className="section-title">
                <Flame size={12} className="section-icon" />
                <span>CSS Thermal Cycle Progress</span>
              </div>
              <div className="drawer-cycle-card">
                <div className="cycle-header-row">
                  <strong style={{ color: '#1c1917' }}>{activeWellProfile.phaseName}</strong>
                  <span className="cycle-badge">{activeWellProfile.phaseDays}</span>
                </div>
                <div className="cycle-stats-row">
                  <div>
                    <span className="c-stat-lbl">CUM OIL</span>
                    <span className="c-stat-val">{activeWellProfile.cumOil.toLocaleString()} bbls</span>
                  </div>
                  <div>
                    <span className="c-stat-lbl">CUM STEAM</span>
                    <span className="c-stat-val">{activeWellProfile.cumSteam.toLocaleString()} bbls</span>
                  </div>
                  <div>
                    <span className="c-stat-lbl">CSOR</span>
                    <span className="c-stat-val" style={{ color: '#ea580c' }}>{activeWellProfile.csor}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
