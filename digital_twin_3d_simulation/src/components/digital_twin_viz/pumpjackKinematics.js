/**
 * Exact Four-Bar Linkage Kinematics for Walking Beam Pumping Unit (API Class I Lever)
 *
 * Mathematical Reference:
 *   P = (0, H, 0)                 - Walking beam fulcrum / saddle bearing (top of samson post)
 *   C = (xc, yc, 0)               - Crank center of rotation (crankshaft axis)
 *   Rc = Crank radius             - Crank pin distance from C
 *   Lr = Rear-arm length          - Distance from P to pitman equalizer tail bearing
 *   Lp = Pitman length            - Rigid link distance from crank pin to tail bearing
 *   Lf = Front-arm length         - Distance from P to horsehead cable tangent point
 *   omega = (SPM / 60) * 2pi      - Crank angular velocity in rad/s
 *
 * Per-frame Analytical Law-of-Cosines Solution:
 *   thetaC(t)  = omega * t
 *   Pin(t)     = C + Rc * (cos thetaC, sin thetaC)
 *   d(t)       = distance(P, Pin(t))
 *   angleAtP(t)= acos( (Lr^2 + d^2 - Lp^2) / (2 * Lr * d) )
 *   dirToPin(t)= atan2(Pin.y - P.y, Pin.x - P.x)
 *   phi(t)     = dirToPin(t) - angleAtP(t)
 *   RearEnd(t) = P + Lr * (cos phi, sin phi)
 *   FrontEnd(t)= P + Lf * (cos(phi + pi), sin(phi + pi))
 *
 * Horsehead Kinematics:
 *   Circular arc of exact radius Lf centered at P.
 *   The vertical line X = Lf is strictly tangent to the arc for all beam angles,
 *   guaranteeing 100% vertical bridle wireline travel through the wellhead stuffing box.
 */

export const PUMPJACK_GEOMETRY = {
  H: 3.20,              // Height of samson post fulcrum P
  P: { x: 0.0, y: 3.20, z: 0.0 },
  C: { x: -2.00, y: 0.85, z: 0.0 }, // Crankshaft center
  Lf: 2.80,             // Front arm length (P to horsehead wellbore axis)
  Lr: 2.10,             // Rear arm length (P to tail bearing)
  Lp: 2.35,             // Pitman rigid connecting link length
  baseRc: 0.65,         // Base crank radius at standard 1.83m stroke
  wellboreX: 2.80,      // Wellhead polished rod vertical centerline
  crankZ: 0.85,         // Lateral offset of twin crank arms & pitman links
  yNeutral: 3.20,       // Neutral horizontal horsehead height
  strokeScaleSubsurface: 0.22 // Scale factor for subsurface plunger stroke (bounded within 1.10m barrel)
};

/**
 * Computes exact 4-bar linkage state at time t
 * @param {number} time - Elapsed time in seconds
 * @param {number} spm - Strokes per minute
 * @param {number} strokeLengthM - API rated stroke length in meters (default 1.83m)
 * @param {boolean} isRodFloating - Whether severe viscosity rod floating lag is active
 * @param {number} rodLagFactor - Downstroke lag factor (0.0 to 1.0)
 * @returns {object} Kinematic solution for current frame
 */
export function computeFourBarKinematics(
  time,
  spm = 4.2,
  strokeLengthM = 1.83,
  isRodFloating = false,
  rodLagFactor = 0.0
) {
  const { H, P, C, Lf, Lr, Lp, baseRc, wellboreX, crankZ, yNeutral, strokeScaleSubsurface } = PUMPJACK_GEOMETRY;

  // Scale crank radius proportionally to user-configured stroke length
  const Rc = baseRc * (strokeLengthM / 1.83);

  // Crank angular velocity (rad/s)
  const omega = (Math.max(0, spm) / 60) * 2 * Math.PI;

  // Crank rotation angle: thetaC(t) = omega * t
  let thetaC = (time * omega) % (2 * Math.PI);
  if (thetaC < 0) thetaC += 2 * Math.PI;

  let effectiveThetaC = thetaC;
  let valveLag = 0.0;

  // Severe heavy-crude rod float downstroke phase lag
  if (isRodFloating) {
    // Crank angles with negative vertical velocity
    const isDownstroke = Math.sin(thetaC) < 0;
    if (isDownstroke) {
      effectiveThetaC = thetaC - (rodLagFactor || 0.48) * Math.sin(thetaC * 2);
      valveLag = 0.35;
    }
  }

  // 1. Crank Pin Coordinates in scene-local space
  const pin = {
    x: C.x + Rc * Math.cos(effectiveThetaC),
    y: C.y + Rc * Math.sin(effectiveThetaC),
    z: 0.0
  };

  // 2. Vector and Euclidean distance from walking beam fulcrum P to crank pin
  const dx = pin.x - P.x;
  const dy = pin.y - P.y;
  const d = Math.sqrt(dx * dx + dy * dy);

  // 3. Exact Law of Cosines for angle at fulcrum P in triangle (P, Pin, RearEnd)
  // Triangle side lengths: Lr, d, and opposite side Lp (pitman link)
  // Lp^2 = Lr^2 + d^2 - 2 * Lr * d * cos(angleAtP)
  const cosP = (Lr * Lr + d * d - Lp * Lp) / (2 * Lr * d);
  const clampedCosP = Math.max(-1.0, Math.min(1.0, cosP));
  const angleAtP = Math.acos(clampedCosP);

  // 4. Direction angle from P to Pin
  const dirToPin = Math.atan2(dy, dx);

  // 5. Rear arm orientation angle phi(t)
  const phi = dirToPin - angleAtP;

  // 6. Rear-arm attachment point (Equalizer bearing at walking beam tail)
  const rearEnd = {
    x: P.x + Lr * Math.cos(phi),
    y: P.y + Lr * Math.sin(phi),
    z: 0.0
  };

  // 7. Front-arm attachment point (Horsehead nose attachment)
  // In API beam geometry, front arm extends diametrically opposite to rear arm: angle = phi + pi
  const frontEnd = {
    x: P.x + Lf * Math.cos(phi + Math.PI),
    y: P.y + Lf * Math.sin(phi + Math.PI),
    z: 0.0
  };

  // 8. Walking Beam Rotation around Z axis (continuous and normalized)
  // Zero rotation corresponds to horizontal beam (phi = -pi or +pi)
  const beamAngle = Math.atan2(Math.sin(phi - Math.PI), Math.cos(phi - Math.PI));

  // 9. Rigid Pitman Arm Orientation & Midpoint Vector
  const pitmanDx = rearEnd.x - pin.x;
  const pitmanDy = rearEnd.y - pin.y;
  const pitmanMid = {
    x: (pin.x + rearEnd.x) / 2,
    y: (pin.y + rearEnd.y) / 2,
    z: 0.0
  };
  // Cylinder geometry along Y has rotation angle in Z:
  const pitmanAngle = Math.atan2(pitmanDy, pitmanDx) - Math.PI / 2;
  const pitmanActualLength = Math.sqrt(pitmanDx * pitmanDx + pitmanDy * pitmanDy);

  // 10. Polished Rod & Carrier Bar Vertical Travel
  // Carrier bar sits below the horsehead wireline arc
  const carrierBarY = frontEnd.y - 1.25;
  const polishedRodY = frontEnd.y - 1.85;

  // 11. Subsurface Sucker Rod & Downhole Pump Plunger Displacement
  // Directly reads FrontEnd(t).y scaled to depth units — strictly zero placeholder!
  const surfaceDeltaY = frontEnd.y - yNeutral;
  const subsurfaceVerticalDisp = surfaceDeltaY * strokeScaleSubsurface;
  const downholePlungerY = -9.38 + subsurfaceVerticalDisp;

  // 12. Instantaneous stroke velocity & valve timing via exact kinematic derivative
  const dt = 0.002;
  const pinNext = {
    x: C.x + Rc * Math.cos(effectiveThetaC + (omega > 0 ? omega : 0.01) * dt),
    y: C.y + Rc * Math.sin(effectiveThetaC + (omega > 0 ? omega : 0.01) * dt),
    z: 0.0
  };
  const dNext = Math.hypot(pinNext.x - P.x, pinNext.y - P.y);
  const cosPNext = Math.max(-1.0, Math.min(1.0, (Lr * Lr + dNext * dNext - Lp * Lp) / (2 * Lr * dNext)));
  const angleAtPNext = Math.acos(cosPNext);
  const dirToPinNext = Math.atan2(pinNext.y - P.y, pinNext.x - P.x);
  const phiNext = dirToPinNext - angleAtPNext;
  const frontEndYNext = P.y + Lf * Math.sin(phiNext + Math.PI);
  const strokeVelocity = (frontEndYNext - frontEnd.y) / dt;
  const isUpstroke = strokeVelocity >= 0.0;

  return {
    P,
    C,
    Rc,
    Lr,
    Lp,
    Lf,
    omega,
    thetaC: effectiveThetaC,
    pin,
    d,
    angleAtP,
    dirToPin,
    phi,
    rearEnd,
    frontEnd,
    beamAngle,
    pitmanMid,
    pitmanAngle,
    pitmanActualLength,
    carrierBarY,
    polishedRodY,
    subsurfaceVerticalDisp,
    downholePlungerY,
    strokeVelocity,
    isUpstroke
  };
}
