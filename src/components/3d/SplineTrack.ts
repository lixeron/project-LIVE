import * as THREE from 'three';

/**
 * High-precision 3D spline track defining the interactive camera pathway.
 * Coordinates are mapped explicitly across deep spatial scene thresholds.
 */
const SPLINE_POINTS = [
  new THREE.Vector3(0, 15, 0),      // Point 0 (Stratosphere Start)
  new THREE.Vector3(0, 5, -15),     // Point 1 (The Descent Pitch)
  new THREE.Vector3(-4, 0, -35),    // Point 2 (Canopy Valley Level Out)
  new THREE.Vector3(4, -1, -55),    // Point 3 (Winding Past Windmills)
  new THREE.Vector3(0, -6, -80),    // Point 4 (Creek Plunge Submersion)
  new THREE.Vector3(-2, -7, -105),  // Point 5 (Following the Creek Bed)
  new THREE.Vector3(0, -4, -130),   // Point 6 (Coastal Ocean Break Out)
  new THREE.Vector3(0, 18, -155),   // Point 7 (The Great Vertical Ascent)
  new THREE.Vector3(0, 45, -175),   // Point 8 (Cloud Break & Atmosphere Exit)
  new THREE.Vector3(0, 50, -200)    // Point 9 (Stable Space Orbit Destination)
];

export const NARRATIVE_SPLINE_TRACK = new THREE.CatmullRomCurve3(
  SPLINE_POINTS,
  false,         // Curve is open
  'centripetal', // Catmull-Rom type for smoother interpolation without self-intersections
  0.5            // Tension parameter
);
export type NarrativeSplineTrackType = typeof NARRATIVE_SPLINE_TRACK;
