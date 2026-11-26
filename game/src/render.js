// AERORIDGE — the renderer: WebGL setup, lights, resize handling and the
// one render call. Shadows stay off (speed + headless determinism); the
// hemisphere + sun directional give the island its golden-hour look.

import * as THREE from 'three';

/** Create the renderer on the page canvas and the scene's lights. */
export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xbfd9ee, 900, 3600);

  // Warm late-afternoon sun from the south-west, matching the sky dome.
  const sun = new THREE.DirectionalLight(0xfff0c8, 2.4);
  sun.position.set(-900, 700, -1200);
  scene.add(sun);
  // Cool sky bounce so shadowed slopes stay readable.
  const hemi = new THREE.HemisphereLight(0xbfd9ee, 0x4a6b3a, 1.1);
  scene.add(hemi);

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);
  return { renderer, scene, resize };
}

/** One frame: render the scene from the camera. */
export function renderFrame(renderer, scene, camera) {
  renderer.render(scene, camera);
}
