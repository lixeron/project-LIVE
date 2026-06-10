import React, { useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { NARRATIVE_SPLINE_TRACK, FRENET_FRAMES } from './SplineTrack';

interface ForestSceneLayerProps {
  scrollProgress: number;
}

export const ForestSceneLayer: React.FC<ForestSceneLayerProps> = () => {
  const trunkMeshRef = useRef<THREE.InstancedMesh>(null);
  const crownMeshRef = useRef<THREE.InstancedMesh>(null);
  const rockMeshRef = useRef<THREE.InstancedMesh>(null);

  // 1. Instantiate geometries and materials inside useMemo so we can explicitly dispose of them on unmount
  const trunkGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.08, 0.25, 1.0, 5);
    geo.translate(0, 0.5, 0); // Origin at bottom base
    return geo;
  }, []);

  const crownGeo = useMemo(() => {
    return new THREE.IcosahedronGeometry(1.0, 1);
  }, []);

  const rockGeo = useMemo(() => {
    return new THREE.DodecahedronGeometry(1.0, 0);
  }, []);

  const trunkMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      roughness: 0.9,
      metalness: 0.1,
    });
  }, []);

  const crownMat = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      roughness: 0.65,
      metalness: 0.08,
      clearcoat: 0.25,
      clearcoatRoughness: 0.35,
      side: THREE.DoubleSide,
    });
  }, []);

  const rockMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      roughness: 0.85,
      metalness: 0.15,
    });
  }, []);

  // 2. Precompute the transform matrices and colors for all instances (executed ONCE per mount on CPU)
  const forestData = useMemo(() => {
    const numTrees = 120;
    const numRocks = 150;

    const trunkMatrices: THREE.Matrix4[] = [];
    const trunkColors: THREE.Color[] = [];

    const crownMatrices: THREE.Matrix4[] = [];
    const crownColors: THREE.Color[] = [];

    const rockMatrices: THREE.Matrix4[] = [];
    const rockColors: THREE.Color[] = [];

    // Tapered bark palettes (minimalist warm dark grey barks)
    const TRUNK_PALETTE = [
      new THREE.Color('#3D3530'),
      new THREE.Color('#4A423E'),
      new THREE.Color('#2F2A27'),
    ];

    // Sage Green variations
    const CROWN_PALETTE = [
      new THREE.Color('#7A8B75'), // Sage Green Classic
      new THREE.Color('#8A9A86'), // Organic Sage 1
      new THREE.Color('#9CB097'), // Organic Sage 2
      new THREE.Color('#5F6F5D'), // Dark Forest Sage
      new THREE.Color('#B0BEAC'), // Light Frost Sage
    ];

    // Textured Ash Grey variations
    const ROCK_PALETTE = [
      new THREE.Color('#A4A8A3'), // Ash Grey
      new THREE.Color('#8C918A'), // Muted Grey Green
      new THREE.Color('#757A73'), // Deep Moss Grey
      new THREE.Color('#B0B5AF'), // Light Ash
      new THREE.Color('#62665F'), // Dark Slate
    ];

    const tempScale = new THREE.Vector3();
    const tempEuler = new THREE.Euler();
    const basisMatrix = new THREE.Matrix4();
    const localUp = new THREE.Vector3();
    const localRight = new THREE.Vector3();

    const framesCount = FRENET_FRAMES.binormals.length;

    // A. Generate Trees
    for (let i = 0; i < numTrees; i++) {
      // Linearly distribute along spline window [0.10, 0.25]
      const baseT = 0.10 + (i / (numTrees - 1)) * 0.15;
      const tJitter = (Math.random() - 0.5) * 0.004;
      const t = THREE.MathUtils.clamp(baseT + tJitter, 0.10, 0.25);

      const splinePos = NARRATIVE_SPLINE_TRACK.getPointAt(t);

      // Interpolate Frenet-Serret frames to get local space axes
      const virtualIndex = t * (framesCount - 1);
      const baseIndex = Math.floor(virtualIndex);
      const nextIndex = Math.min(baseIndex + 1, framesCount - 1);
      const alpha = virtualIndex - baseIndex;

      const binormal = new THREE.Vector3()
        .lerpVectors(FRENET_FRAMES.binormals[baseIndex], FRENET_FRAMES.binormals[nextIndex], alpha)
        .normalize();
      const normal = new THREE.Vector3()
        .lerpVectors(FRENET_FRAMES.normals[baseIndex], FRENET_FRAMES.normals[nextIndex], alpha)
        .normalize();
      const tangent = new THREE.Vector3()
        .lerpVectors(FRENET_FRAMES.tangents[baseIndex], FRENET_FRAMES.tangents[nextIndex], alpha)
        .normalize();

      // Flank the flight path. Alternating left and right offsets.
      const isLeft = i % 2 === 0;
      const offsetSide = (isLeft ? -1 : 1) * THREE.MathUtils.randFloat(3.2, 6.0);
      const offsetDown = -6.5; // rooted on forest floor
      const offsetForward = (Math.random() - 0.5) * 1.5;

      const trunkPos = new THREE.Vector3()
        .copy(splinePos)
        .addScaledVector(normal, offsetSide)
        .addScaledVector(binormal, offsetDown)
        .addScaledVector(tangent, offsetForward);

      // Align vertical growth with local Binormal, but add organic crooked tilt
      basisMatrix.makeBasis(normal, binormal, tangent);
      const basisQuat = new THREE.Quaternion().setFromRotationMatrix(basisMatrix);

      const tiltX = (Math.random() - 0.5) * 0.18;
      const tiltZ = (Math.random() - 0.5) * 0.18;
      tempEuler.set(tiltX, 0, tiltZ);
      const tiltQuat = new THREE.Quaternion().setFromEuler(tempEuler);
      const trunkQuat = basisQuat.clone().multiply(tiltQuat);

      // Height and width scaling
      const trunkHeight = THREE.MathUtils.randFloat(5.5, 8.5);
      const trunkWidth = THREE.MathUtils.randFloat(0.18, 0.32);
      tempScale.set(trunkWidth, trunkHeight, trunkWidth);

      const trunkMatrix = new THREE.Matrix4().compose(trunkPos, trunkQuat, tempScale);
      trunkMatrices.push(trunkMatrix);
      trunkColors.push(TRUNK_PALETTE[Math.floor(Math.random() * TRUNK_PALETTE.length)]);

      // Calculate world up/right vectors of trunk for crown relative offsets
      localUp.set(0, 1, 0).applyQuaternion(trunkQuat);
      localRight.set(1, 0, 0).applyQuaternion(trunkQuat);

      // Primary Crown (at top of trunk)
      const crownPos1 = new THREE.Vector3().copy(trunkPos).addScaledVector(localUp, trunkHeight);
      const crownScaleVal1 = THREE.MathUtils.randFloat(2.2, 3.4);
      const crownScale1 = new THREE.Vector3(
        crownScaleVal1,
        crownScaleVal1 * THREE.MathUtils.randFloat(0.85, 1.15),
        crownScaleVal1
      );
      const crownQuat1 = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      );

      const crownMatrix1 = new THREE.Matrix4().compose(crownPos1, crownQuat1, crownScale1);
      crownMatrices.push(crownMatrix1);
      crownColors.push(CROWN_PALETTE[Math.floor(Math.random() * CROWN_PALETTE.length)]);

      // Secondary Crown (slightly lower, overlapping, creating lush geometric hierarchy)
      const crownPos2 = new THREE.Vector3()
        .copy(trunkPos)
        .addScaledVector(localUp, trunkHeight * 0.78)
        .addScaledVector(localRight, (isLeft ? 1 : -1) * THREE.MathUtils.randFloat(0.4, 0.9));

      const crownScaleVal2 = crownScaleVal1 * THREE.MathUtils.randFloat(0.7, 0.85);
      const crownScale2 = new THREE.Vector3(
        crownScaleVal2,
        crownScaleVal2 * THREE.MathUtils.randFloat(0.9, 1.1),
        crownScaleVal2
      );
      const crownQuat2 = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      );

      const crownMatrix2 = new THREE.Matrix4().compose(crownPos2, crownQuat2, crownScale2);
      crownMatrices.push(crownMatrix2);
      crownColors.push(CROWN_PALETTE[Math.floor(Math.random() * CROWN_PALETTE.length)]);
    }

    // B. Generate Rocks
    for (let i = 0; i < numRocks; i++) {
      const baseT = 0.10 + (i / (numRocks - 1)) * 0.15;
      const tJitter = (Math.random() - 0.5) * 0.005;
      const t = THREE.MathUtils.clamp(baseT + tJitter, 0.10, 0.25);

      const splinePos = NARRATIVE_SPLINE_TRACK.getPointAt(t);

      const virtualIndex = t * (framesCount - 1);
      const baseIndex = Math.floor(virtualIndex);
      const nextIndex = Math.min(baseIndex + 1, framesCount - 1);
      const alpha = virtualIndex - baseIndex;

      const binormal = new THREE.Vector3()
        .lerpVectors(FRENET_FRAMES.binormals[baseIndex], FRENET_FRAMES.binormals[nextIndex], alpha)
        .normalize();
      const normal = new THREE.Vector3()
        .lerpVectors(FRENET_FRAMES.normals[baseIndex], FRENET_FRAMES.normals[nextIndex], alpha)
        .normalize();
      const tangent = new THREE.Vector3()
        .lerpVectors(FRENET_FRAMES.tangents[baseIndex], FRENET_FRAMES.tangents[nextIndex], alpha)
        .normalize();

      // Scatter rocks across forest floor path
      const offsetSide = THREE.MathUtils.randFloat(-8.5, 8.5);
      const offsetDown = -6.5 + (Math.random() - 0.5) * 0.3;
      const offsetForward = (Math.random() - 0.5) * 2.0;

      const rockPos = new THREE.Vector3()
        .copy(splinePos)
        .addScaledVector(normal, offsetSide)
        .addScaledVector(binormal, offsetDown)
        .addScaledVector(tangent, offsetForward);

      const rockQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      );

      // Mossy boulders: flatter and wider scaling properties
      const scaleX = THREE.MathUtils.randFloat(0.8, 2.4);
      const scaleY = THREE.MathUtils.randFloat(0.5, 1.2);
      const scaleZ = THREE.MathUtils.randFloat(0.8, 2.4);
      tempScale.set(scaleX, scaleY, scaleZ);

      const rockMatrix = new THREE.Matrix4().compose(rockPos, rockQuat, tempScale);
      rockMatrices.push(rockMatrix);
      rockColors.push(ROCK_PALETTE[Math.floor(Math.random() * ROCK_PALETTE.length)]);
    }

    return {
      numTrees,
      numRocks,
      trunkMatrices,
      trunkColors,
      crownMatrices,
      crownColors,
      rockMatrices,
      rockColors,
    };
  }, []);

  // 3. Write precomputed matrices and colors to the GPU InstancedMesh attributes
  useLayoutEffect(() => {
    const trunkMesh = trunkMeshRef.current;
    const crownMesh = crownMeshRef.current;
    const rockMesh = rockMeshRef.current;

    if (trunkMesh) {
      for (let i = 0; i < forestData.numTrees; i++) {
        trunkMesh.setMatrixAt(i, forestData.trunkMatrices[i]);
        trunkMesh.setColorAt(i, forestData.trunkColors[i]);
      }
      trunkMesh.instanceMatrix.needsUpdate = true;
      if (trunkMesh.instanceColor) {
        trunkMesh.instanceColor.needsUpdate = true;
      }
    }

    if (crownMesh) {
      const numCrownInstances = forestData.numTrees * 2;
      for (let i = 0; i < numCrownInstances; i++) {
        crownMesh.setMatrixAt(i, forestData.crownMatrices[i]);
        crownMesh.setColorAt(i, forestData.crownColors[i]);
      }
      crownMesh.instanceMatrix.needsUpdate = true;
      if (crownMesh.instanceColor) {
        crownMesh.instanceColor.needsUpdate = true;
      }
    }

    if (rockMesh) {
      for (let i = 0; i < forestData.numRocks; i++) {
        rockMesh.setMatrixAt(i, forestData.rockMatrices[i]);
        rockMesh.setColorAt(i, forestData.rockColors[i]);
      }
      rockMesh.instanceMatrix.needsUpdate = true;
      if (rockMesh.instanceColor) {
        rockMesh.instanceColor.needsUpdate = true;
      }
    }
  }, [forestData]);

  // 4. Cleanup Effect: Hook into unmount to explicitly call .dispose() on WebGL resources
  useEffect(() => {
    return () => {
      // Strict VRAM management guardrail: dispose of geometries and materials manually
      trunkGeo.dispose();
      crownGeo.dispose();
      rockGeo.dispose();

      trunkMat.dispose();
      crownMat.dispose();
      rockMat.dispose();
    };
  }, [trunkGeo, crownGeo, rockGeo, trunkMat, crownMat, rockMat]);

  return (
    <group>
      {/* GPU Instanced Tree Trunks */}
      <instancedMesh
        ref={trunkMeshRef}
        args={[trunkGeo, trunkMat, forestData.numTrees]}
        castShadow
        receiveShadow
      />

      {/* GPU Instanced Tree Crowns */}
      <instancedMesh
        ref={crownMeshRef}
        args={[crownGeo, crownMat, forestData.numTrees * 2]}
        castShadow
        receiveShadow
      />

      {/* GPU Instanced Floor Mossy Boulders */}
      <instancedMesh
        ref={rockMeshRef}
        args={[rockGeo, rockMat, forestData.numRocks]}
        castShadow
        receiveShadow
      />
    </group>
  );
};

export default ForestSceneLayer;
