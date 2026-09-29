# Baghewala Field Heavy-Oil 3D Well to Surface Digital Twin

High-fidelity, interactive 3D digital twin of a heavy-oil Cyclic Steam Stimulation (CSS) and Sucker Rod Pump (SRP) production well, built with **React**, **Three.js**, **@react-three/fiber**, and **@react-three/drei**.

---

## 🌟 Highlights

- **Complete Well-to-Surface Assembly**:
  - Animated surface SRP pumpjack with true 4-bar linkage kinematics.
  - Surface facilities: Wellhead Christmas tree, steam pipeline, test separator, and power module.
  - 7-horizon subterranean geological formation with real Rajasthan lithology textures.
  - Modular completion string with 6 armor vertebrae, tool joint collars, perforated liner, and centralizers.
- **Three Specialized Visualization Modes**:
  - **Solid Mode**: Heavy API brushed steel tubulars with metallic PBR shading.
  - **X-Ray Glass Mode**: Crystal-clear technical glass outer casing (`0.16` center opacity, `0.88` electric cyan rim Fresnel), rich golden brass coupling collars (`#d4af37`), fine ascending fluid stream micro-particles, and perforation ingress particles.
  - **Thermal Mode**: 100% solid metallic Ironbow thermal temper shader depicting continuous wellhead-to-bottomhole heat gradient with isothermal rings.
- **Rich Operator HUDs**:
  - DynoCard Mini for surface & downhole pump stroke analysis.
  - Real-time telemetry cards and mechanical physics side panel.
  - Subterranean depth/caliper thermal probe inspector.
  - CSS 72-day lifecycle scrubber.

---

## 🚀 Quick Setup

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for full installation and drop-in instructions.

```bash
# 1. Install dependencies
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing lucide-react

# 2. Copy src/components/digital_twin_viz into your src/components/
# 3. Copy public/textures into your public/textures/
# 4. Copy public/assets and src/assets into your project
```

```jsx
import WellDigitalTwin3D from './components/digital_twin_viz/WellDigitalTwin3D';

<WellDigitalTwin3D wellId="B-17" />
```
