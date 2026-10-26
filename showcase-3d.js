/**
 * YazhGo Taxi Service — Futuristic Cinematic 3D Automotive Showroom
 * Powered by Three.js & WebGL
 *
 * Features:
 *  - Dark reflective automotive studio environment with radiant electric-red neon floor ring
 *  - Cinematic vehicle arrival animation with acceleration, braking dive & suspension settle
 *  - Wheel rotation physically synchronized with driving velocity
 *  - Dual real-time LED headlights with ground beam projection and flare
 *  - Subtle electric-red studio rim lighting for photorealistic automotive curves
 *  - High-fidelity PBR metallic paint, tinted glass, alloy rims & rubber tires
 *  - Built-in procedural 3D automotive generator backup so 3D car ALWAYS renders
 *  - Interactive 360-degree OrbitControls with damping and safe zoom limits
 *  - Camera presets (3/4 Beauty, Front, Side, Rear, Top, Reset)
 *  - Paint color switcher (Titanium Silver, Obsidian Black, Pure White, Crimson Red, Midnight Blue)
 *  - Headlight toggle & continuous 360° turntable spin
 *  - Two-way synchronization with "Plan Your Ride" booking form & "CHOOSE YOUR RIDE" fleet selector
 */

(function () {
  'use strict';

  // Vehicle Configurations & Official Tariffs
  const SHOWCASE_VEHICLES = {
    sedan: {
      id: 'sedan',
      name: 'Sedan Prime',
      badge: 'Most Popular Taxi ★',
      models: 'Maruti Swift Dzire, Toyota Etios, Honda Amaze',
      oneWayRate: 15,
      roundTripRate: 14,
      passengers: '4 Seats',
      luggage: '2 Bags',
      ac: 'Chilled Air Conditioning',
      driver: 'Verified Professional Chauffeur',
      batta: 400,
      scale: 1.15,
      yOffset: 0.0,
      modelUrls: [
        './models/sedan.glb',
        'models/sedan.glb',
        './models/taxi.glb',
        'models/taxi.glb',
        'https://raw.githubusercontent.com/3DStreet/3dstreet-assets-dist/main/objects/vehicles-rig/sedan-rig.glb'
      ],
      wheelRadius: 0.34,
      defaultPaint: 0xC0C5CE, // Titanium Silver
      proceduralType: 'sedan'
    },
    suv: {
      id: 'suv',
      name: 'Spacious SUV',
      badge: 'Family & Group Travel',
      models: 'Toyota Innova, Maruti Ertiga, Mahindra Xylo, Marazzo',
      oneWayRate: 20,
      roundTripRate: 19,
      passengers: '6 - 7 Seats',
      luggage: '4 Bags',
      ac: 'Dual-Zone AC Vents',
      driver: 'Expert Highway Captain',
      batta: 400,
      scale: 1.14,
      yOffset: 0.0,
      modelUrls: [
        './models/suv.glb',
        'models/suv.glb',
        'https://raw.githubusercontent.com/3DStreet/3dstreet-assets-dist/main/objects/vehicles-rig/suv-rig.glb'
      ],
      wheelRadius: 0.38,
      defaultPaint: 0xB0B7C3, // Cool Titanium Silver
      proceduralType: 'suv'
    },
    crysta: {
      id: 'crysta',
      name: 'Innova Crysta VIP',
      badge: 'VIP Executive Luxury',
      models: 'Toyota Innova Crysta (Reclining Captain Seats)',
      oneWayRate: 24,
      roundTripRate: 23,
      passengers: '7 Seats',
      luggage: '5 Large Bags',
      ac: 'Dual-Zone Automatic Climate Control',
      driver: 'Senior Executive VIP Chauffeur',
      batta: 400,
      scale: 1.15,
      yOffset: 0.0,
      modelUrls: [
        './models/crysta.glb',
        'models/crysta.glb',
        './models/suv.glb',
        'models/suv.glb',
        'https://raw.githubusercontent.com/3DStreet/3dstreet-assets-dist/main/objects/vehicles-rig/suv-rig.glb'
      ],
      wheelRadius: 0.39,
      defaultPaint: 0x1A1D24, // Obsidian Metallic Black
      proceduralType: 'crysta'
    }
  };

  // Camera Presets
  const CAMERA_PRESETS = {
    beauty: { pos: new THREE.Vector3(4.6, 1.7, 5.2), target: new THREE.Vector3(0, 0.55, 0) },
    front:  { pos: new THREE.Vector3(0.0, 1.25, 5.8), target: new THREE.Vector3(0, 0.55, 0) },
    side:   { pos: new THREE.Vector3(6.4, 1.3, 0.0), target: new THREE.Vector3(0, 0.55, 0) },
    rear:   { pos: new THREE.Vector3(-3.8, 1.6, -5.2), target: new THREE.Vector3(0, 0.55, 0) },
    top:    { pos: new THREE.Vector3(0.0, 8.8, 0.1), target: new THREE.Vector3(0, 0.0, 0) }
  };

  // Color Swatches Map
  const PAINT_COLORS = {
    silver: { hex: 0xC0C5CE, metalness: 0.88, roughness: 0.16 }, // Titanium Silver
    onyx:   { hex: 0x0A0B0E, metalness: 0.92, roughness: 0.12 }, // Obsidian Black
    white:  { hex: 0xF8FAFC, metalness: 0.65, roughness: 0.18 }, // Pure Pearl White
    red:    { hex: 0x8B0000, metalness: 0.85, roughness: 0.15 }, // Crimson Racing Red
    blue:   { hex: 0x0C1826, metalness: 0.90, roughness: 0.14 }  // Midnight Metallic Blue
  };

  // Core Three.js State
  let scene, camera, renderer, controls;
  let currentVehicleId = 'sedan';
  let loadedVehicles = {};
  let activeCarGroup = null;
  let activeCarMesh = null;
  let activeWheelBones = [];
  let contactShadowMesh = null;
  let stagePlatformGroup = null;

  // Real-time Headlights
  let leftHeadlight = null;
  let rightHeadlight = null;
  let headlightsOn = true;

  // Cinematic Arrival Animation State
  let isAnimatingArrival = false;
  let arrivalStartTime = 0;
  const ARRIVAL_DURATION = 2.4; // seconds
  const START_POS = new THREE.Vector3(12.0, 0, -18.0); // Drives in smoothly from back-right
  const END_POS = new THREE.Vector3(0, 0, 0);
  let lastCarPos = new THREE.Vector3();
  let suspensionSettleTimer = 0;

  // Camera Transition State
  let isCameraTransitioning = false;
  let camStartPos = new THREE.Vector3();
  let camEndPos = new THREE.Vector3();
  let camStartTarget = new THREE.Vector3();
  let camEndTarget = new THREE.Vector3();
  let camTransitionProgress = 1;
  const CAM_TRANSITION_DURATION = 0.9;

  let animFrameId = null;
  let clock = new THREE.Clock();
  let autoRotateActive = false;

  // DOM Elements Cache
  let dom = {};

  // Check WebGL availability
  function isWebGLSupported() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  // Initialize 3D Showroom
  function init() {
    const container = document.getElementById('threejsCanvasWrapper');
    if (!container) return;

    if (!isWebGLSupported() || typeof THREE === 'undefined') {
      showFallback();
      return;
    }

    cacheDOMElements();

    // Setup Three.js Core
    setupScene(container);
    setupLights();
    setupStageFloor();
    setupControls();

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);

    // Initial Load & Arrival
    loadAndShowVehicle('sedan', true);

    // Start Render Loop
    animate();
  }

  function cacheDOMElements() {
    dom.viewport = document.getElementById('showcaseViewport');
    dom.loader = document.getElementById('showcaseLoader');
    dom.loaderTitle = document.getElementById('loaderTitle');
    dom.loaderProgressBar = document.getElementById('loaderProgressBar');
    dom.loaderPercent = document.getElementById('loaderPercent');
    dom.fallback = document.getElementById('showcaseFallback');
    dom.btn360Pill = document.getElementById('btn360Pill');
    dom.btnLights = document.getElementById('btnToggleHeadlights');
  }

  function setupScene(container) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07080B); // Obsidian Black
    scene.fog = new THREE.FogExp2(0x07080B, 0.025);

    const width = container.clientWidth || 750;
    const height = container.clientHeight || 480;

    camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.copy(CAMERA_PRESETS.beauty.pos);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
  }

  function setupLights() {
    // 1. Soft Ambient Fill
    const ambientLight = new THREE.AmbientLight(0x161822, 1.2);
    scene.add(ambientLight);

    // 2. Sky / Ground Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0x2A2E3D, 0x0A0B0E, 0.9);
    hemiLight.position.set(0, 25, 0);
    scene.add(hemiLight);

    // 3. Studio Overhead Key Light (Generates soft shadows on vehicle and stage)
    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 1.8);
    keyLight.position.set(5.5, 12, 6.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0006;
    scene.add(keyLight);

    // 4. Subtle Titanium Fill Light (Softens contrast on side flanks)
    const fillLight = new THREE.DirectionalLight(0x94A3B8, 0.9);
    fillLight.position.set(-6, 8, 4);
    scene.add(fillLight);

    // 5. Signature Electric-Red Studio Rim Light (Highlights car curves with cinematic red edge)
    const rimLight = new THREE.DirectionalLight(0xFF2A3A, 2.4);
    rimLight.position.set(-7, 3.5, -6);
    scene.add(rimLight);

    // Secondary subtle red ground glow
    const groundRim = new THREE.PointLight(0xE50914, 1.5, 12, 1.8);
    groundRim.position.set(0, 0.15, -4.5);
    scene.add(groundRim);

    // 6. Real-time Projector Headlights
    leftHeadlight = new THREE.SpotLight(0xF8FAFC, 2.5, 22, 0.42, 0.55, 1.2);
    leftHeadlight.position.set(-0.75, 0.68, 1.9);
    leftHeadlight.target.position.set(-0.75, 0, 10);
    scene.add(leftHeadlight);
    scene.add(leftHeadlight.target);

    rightHeadlight = new THREE.SpotLight(0xF8FAFC, 2.5, 22, 0.42, 0.55, 1.2);
    rightHeadlight.position.set(0.75, 0.68, 1.9);
    rightHeadlight.target.position.set(0.75, 0, 10);
    scene.add(rightHeadlight);
    scene.add(rightHeadlight.target);
  }

  function setupStageFloor() {
    stagePlatformGroup = new THREE.Group();

    // 1. Polished Obsidian Turntable Platform
    const stageGeo = new THREE.CylinderGeometry(5.2, 5.3, 0.1, 64);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x0B0D13,
      roughness: 0.18,
      metalness: 0.88
    });
    const stageMesh = new THREE.Mesh(stageGeo, stageMat);
    stageMesh.position.y = -0.05;
    stageMesh.receiveShadow = true;
    stagePlatformGroup.add(stageMesh);

    // 2. Radiant Electric-Red Neon Ring (The signature luminous ring from design)
    const neonRingGeo = new THREE.RingGeometry(4.7, 4.88, 64);
    const neonRingMat = new THREE.MeshBasicMaterial({
      color: 0xFF2A3A,
      side: THREE.DoubleSide
    });
    const neonRing = new THREE.Mesh(neonRingGeo, neonRingMat);
    neonRing.rotation.x = -Math.PI / 2;
    neonRing.position.y = 0.003;
    stagePlatformGroup.add(neonRing);

    // 3. Subtle Inner Concentric Ring
    const innerRingGeo = new THREE.RingGeometry(3.1, 3.16, 64);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x334155,
      side: THREE.DoubleSide
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.004;
    stagePlatformGroup.add(innerRing);

    // 4. Infinite Dark Ground Floor
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x050608,
      roughness: 0.75,
      metalness: 0.1
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.06;
    groundMesh.receiveShadow = true;
    stagePlatformGroup.add(groundMesh);

    scene.add(stagePlatformGroup);

    // 5. Dynamic Vehicle Contact Shadow
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const ctx = shadowCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(3.8, 5.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    contactShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadowMesh.rotation.x = -Math.PI / 2;
    contactShadowMesh.position.set(0, 0.015, 0);
    scene.add(contactShadowMesh);
  }

  function setupControls() {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.55, 0);

    // Limits
    controls.minDistance = 3.0;
    controls.maxDistance = 9.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minPolarAngle = 0.15;
    controls.enablePan = false;
  }

  // Load and Show a Vehicle
  function loadAndShowVehicle(carId, playArrival) {
    const config = SHOWCASE_VEHICLES[carId];
    if (!config) return;

    currentVehicleId = carId;
    syncUIWithVehicle(carId);

    // If already loaded in memory, activate directly
    if (loadedVehicles[carId]) {
      activateVehicleModel(loadedVehicles[carId], config, playArrival);
      return;
    }

    showLoader(config.name);

    // Load GLB with fallback sequence
    loadGLBWithFallbacks(config.modelUrls, 0, (gltf) => {
      hideLoader();
      enhanceVehicleMaterials(gltf.scene, config);
      loadedVehicles[carId] = gltf.scene;
      activateVehicleModel(gltf.scene, config, playArrival);
    }, () => {
      // If GLB fails on network, build high-detail procedural 3D model backup
      hideLoader();
      console.log(`[Showcase3D] Building high-precision 3D procedural vehicle for ${config.name}`);
      const proceduralCar = buildProceduralAutomotive(config);
      loadedVehicles[carId] = proceduralCar;
      activateVehicleModel(proceduralCar, config, playArrival);
    });
  }

  // Recursive GLB loader across multiple paths
  function loadGLBWithFallbacks(urls, index, onSuccess, onError) {
    if (index >= urls.length) {
      onError();
      return;
    }

    if (typeof THREE.GLTFLoader === 'undefined') {
      onError();
      return;
    }

    const loader = new THREE.GLTFLoader();
    const currentUrl = urls[index];

    loader.load(
      currentUrl,
      (gltf) => onSuccess(gltf),
      (xhr) => {
        if (xhr.lengthComputable && dom.loaderPercent && dom.loaderProgressBar) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          dom.loaderProgressBar.style.width = pct + '%';
          dom.loaderPercent.textContent = pct + '%';
        }
      },
      () => {
        loadGLBWithFallbacks(urls, index + 1, onSuccess, onError);
      }
    );
  }

  // Enhance Materials with Photorealistic Metallic Paint, Glass, & Alloy Shaders
  function enhanceVehicleMaterials(rootObject, config) {
    rootObject.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          const name = (child.material.name || child.name || '').toLowerCase();
          const isGlass = name.includes('glass') || name.includes('window') || name.includes('windshield');
          const isTire = name.includes('tire') || name.includes('wheel') || name.includes('rubber');
          const isLight = name.includes('light') || name.includes('lamp');

          if (isGlass) {
            child.material = new THREE.MeshPhysicalMaterial({
              color: 0x111622,
              metalness: 0.1,
              roughness: 0.05,
              transparent: true,
              opacity: 0.45,
              clearcoat: 1.0,
              clearcoatRoughness: 0.05
            });
          } else if (isTire) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0x1A1C22,
              roughness: 0.75,
              metalness: 0.1
            });
          } else if (isLight) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xFFFFFF,
              emissive: 0xFFFFFF,
              emissiveIntensity: 1.5
            });
          } else {
            // Metallic Car Paint
            child.material = new THREE.MeshStandardMaterial({
              color: config.defaultPaint,
              roughness: 0.18,
              metalness: 0.85
            });
          }
        }
      }
    });
  }

  // Procedural 3D Automotive Builder (Guarantees zero blank screens & instant rendering)
  function buildProceduralAutomotive(config) {
    const car = new THREE.Group();
    const paintColor = config.defaultPaint;
    const bodyMat = new THREE.MeshStandardMaterial({ color: paintColor, metalness: 0.88, roughness: 0.18 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0F1420, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.5 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x181A20, roughness: 0.8, metalness: 0.1 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xD8DEE9, metalness: 0.95, roughness: 0.1 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xE2E8F0, metalness: 0.95, roughness: 0.08 });
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xF8FAFC, emissive: 0xFFFFFF, emissiveIntensity: 2.0 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xE50914, emissive: 0xE50914, emissiveIntensity: 2.2 });

    const isSuv = config.proceduralType === 'suv' || config.proceduralType === 'crysta';
    const bodyHeight = isSuv ? 1.05 : 0.85;
    const roofHeight = isSuv ? 0.72 : 0.62;
    const length = isSuv ? 4.6 : 4.4;
    const width = 1.9;

    // 1. Lower Chassis
    const chassisGeo = new THREE.BoxGeometry(width, bodyHeight * 0.6, length);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = bodyHeight * 0.45;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    car.add(chassis);

    // 2. Cabin / Roof (Tapered)
    const cabinLength = isSuv ? length * 0.72 : length * 0.58;
    const cabinGeo = new THREE.BoxGeometry(width * 0.88, roofHeight, cabinLength);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(0, bodyHeight * 0.75 + roofHeight * 0.5, isSuv ? -0.1 : -0.2);
    cabin.castShadow = true;
    car.add(cabin);

    // 3. Tinted Glass Windows
    const glassGeo = new THREE.BoxGeometry(width * 0.89, roofHeight * 0.82, cabinLength * 0.92);
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.copy(cabin.position);
    car.add(glass);

    // 4. Front Grille & Chrome Badge
    const grillGeo = new THREE.BoxGeometry(width * 0.65, 0.28, 0.08);
    const grill = new THREE.Mesh(grillGeo, chromeMat);
    grill.position.set(0, 0.52, length * 0.5 + 0.02);
    car.add(grill);

    // 5. LED Headlights
    [-0.72, 0.72].forEach(x => {
      const headGeo = new THREE.BoxGeometry(0.32, 0.16, 0.1);
      const head = new THREE.Mesh(headGeo, lightMat);
      head.position.set(x, 0.62, length * 0.5 + 0.03);
      car.add(head);

      // Tail lights
      const tailGeo = new THREE.BoxGeometry(0.34, 0.18, 0.1);
      const tail = new THREE.Mesh(tailGeo, tailMat);
      tail.position.set(x, 0.72, -length * 0.5 - 0.03);
      car.add(tail);
    });

    // 6. Wheels with explicit bone naming for rotation
    const wheelPositions = [
      { name: 'wheel_F_L', x: -width * 0.52, z: length * 0.32 },
      { name: 'wheel_F_R', x: width * 0.52, z: length * 0.32 },
      { name: 'wheel_B_L', x: -width * 0.52, z: -length * 0.32 },
      { name: 'wheel_B_R', x: width * 0.52, z: -length * 0.32 }
    ];

    const wheelRadius = config.wheelRadius;
    const wheelThickness = 0.26;

    wheelPositions.forEach(wp => {
      const wheelGroup = new THREE.Group();
      wheelGroup.name = wp.name;
      wheelGroup.position.set(wp.x, wheelRadius, wp.z);

      // Tire
      const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 32);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Alloy Rim
      const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, wheelThickness + 0.02, 16);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      wheelGroup.add(rim);

      car.add(wheelGroup);
    });

    return car;
  }

  // Activate & Mount Model into Scene
  function activateVehicleModel(modelScene, config, playArrival) {
    // If another car is in scene, remove it cleanly
    if (activeCarGroup && activeCarGroup.parent) {
      scene.remove(activeCarGroup);
    }

    activeCarGroup = new THREE.Group();
    activeCarMesh = modelScene;

    // Apply scale & orientation
    activeCarMesh.scale.set(config.scale, config.scale, config.scale);
    activeCarMesh.position.set(0, config.yOffset, 0);
    activeCarGroup.add(activeCarMesh);

    // Locate wheel nodes for synchronized spinning
    activeWheelBones = [];
    activeCarMesh.traverse((child) => {
      const lower = child.name.toLowerCase();
      if (lower.includes('wheel') || lower.includes('tire') || lower.includes('tyre')) {
        activeWheelBones.push(child);
      }
    });

    scene.add(activeCarGroup);

    // Apply default paint
    applyCarPaintColor(config.defaultPaint);

    if (playArrival) {
      startArrivalSequence();
    } else {
      activeCarGroup.position.set(0, 0, 0);
      activeCarGroup.rotation.set(0, 0, 0);
      contactShadowMesh.position.set(0, 0.015, 0);
    }
  }

  // Start Cinematic Arrival Animation
  function startArrivalSequence() {
    isAnimatingArrival = true;
    arrivalStartTime = clock.getElapsedTime();
    lastCarPos.copy(START_POS);
    suspensionSettleTimer = 0;

    activeCarGroup.position.copy(START_POS);
    // Face car towards entrance trajectory
    activeCarGroup.rotation.set(0, Math.PI * 0.12, 0);
    contactShadowMesh.position.set(START_POS.x, 0.015, START_POS.z);

    // Dim headlights initially, then flare up
    setHeadlightsIntensity(0.3);

    // Smoothly orbit camera to dramatic arrival angle
    animateCameraTo(CAMERA_PRESETS.beauty.pos, CAMERA_PRESETS.beauty.target, 1.8);
  }

  // Render & Animation Loop
  function animate() {
    animFrameId = requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // 1. Driving Arrival Animation
    if (isAnimatingArrival && activeCarGroup) {
      const config = SHOWCASE_VEHICLES[currentVehicleId];
      const animElapsed = elapsedTime - arrivalStartTime;
      const t = Math.min(animElapsed / ARRIVAL_DURATION, 1.0);

      // Deceleration curve (Cubic Ease-Out)
      const ease = 1 - Math.pow(1 - t, 3.2);

      const currentPos = new THREE.Vector3().lerpVectors(START_POS, END_POS, ease);
      const deltaDistance = currentPos.distanceTo(lastCarPos);
      lastCarPos.copy(currentPos);

      activeCarGroup.position.copy(currentPos);
      contactShadowMesh.position.set(currentPos.x, 0.015, currentPos.z);

      // Smooth steering back to 0 angle
      activeCarGroup.rotation.y = (1 - ease) * (Math.PI * 0.12);

      // Synchronize Wheel Rotation: deltaTheta = deltaDistance / wheelRadius
      if (deltaDistance > 0.0001 && config) {
        const deltaTheta = deltaDistance / config.wheelRadius;
        for (let i = 0; i < activeWheelBones.length; i++) {
          activeWheelBones[i].rotateX(deltaTheta);
        }
      }

      // Headlight Flare during approach
      if (t > 0.2 && t < 0.7) {
        const lightRatio = (t - 0.2) / 0.5;
        setHeadlightsIntensity(0.3 + lightRatio * 2.2);
      }

      // Suspension Braking Dive & Damped Spring Rebound
      const speedFactor = (1 - t) * (1 - t);
      if (t < 0.92) {
        // Forward braking pitch
        activeCarGroup.rotation.x = -speedFactor * 0.026;
      } else {
        // Rebound oscillation settling
        suspensionSettleTimer += delta * 14;
        const settle = Math.sin(suspensionSettleTimer) * Math.exp(-suspensionSettleTimer * 0.38) * 0.016;
        activeCarGroup.rotation.x = settle;
      }

      // Check arrival completion
      if (t >= 1.0) {
        isAnimatingArrival = false;
        activeCarGroup.position.set(0, 0, 0);
        activeCarGroup.rotation.set(0, 0, 0);
        contactShadowMesh.position.set(0, 0.015, 0);
        setHeadlightsIntensity(headlightsOn ? 2.5 : 0);
      }
    }

    // 2. Camera Interpolation
    if (isCameraTransitioning) {
      camTransitionProgress += delta / CAM_TRANSITION_DURATION;
      const ct = Math.min(camTransitionProgress, 1.0);
      const ease = ct < 0.5 ? 2 * ct * ct : 1 - Math.pow(-2 * ct + 2, 2) / 2;

      camera.position.lerpVectors(camStartPos, camEndPos, ease);
      controls.target.lerpVectors(camStartTarget, camEndTarget, ease);

      if (ct >= 1.0) {
        isCameraTransitioning = false;
      }
    }

    // 3. 360° Continuous Turntable Spin
    if (autoRotateActive && !isAnimatingArrival && !isCameraTransitioning) {
      stagePlatformGroup.rotation.y += delta * 0.22;
      if (activeCarGroup) {
        activeCarGroup.rotation.y += delta * 0.22;
      }
    }

    // 4. Update Orbit Controls
    controls.update();

    // 5. Render Scene
    renderer.render(scene, camera);
  }

  // Smoothly Animate Camera to Angle
  function animateCameraTo(targetPos, targetLookAt, duration) {
    camStartPos.copy(camera.position);
    camEndPos.copy(targetPos);
    camStartTarget.copy(controls.target);
    camEndTarget.copy(targetLookAt);
    camTransitionProgress = 0;
    isCameraTransitioning = true;
  }

  // Two-Way UI Synchronization
  function syncUIWithVehicle(carId) {
    // 1. Sync Choose Your Ride cards
    const cards = document.querySelectorAll('.choose-ride-card, .showcase-tab');
    cards.forEach(card => {
      const match = card.getAttribute('data-car') === carId;
      card.classList.toggle('active', match);
    });

    // 2. Sync Carousel Dots
    const dots = document.querySelectorAll('.showroom-dot');
    dots.forEach(dot => {
      dot.classList.toggle('active', dot.getAttribute('data-car') === carId);
    });

    // 3. Sync Plan Your Ride dropdown
    const selectElem = document.getElementById('vehicleTypeSelect') || document.getElementById('selectedVehicle');
    if (selectElem && selectElem.value !== carId) {
      selectElem.value = carId;
    }

    // 4. Sync rate banner in hero
    const config = SHOWCASE_VEHICLES[carId];
    if (config) {
      const rateDetail = document.getElementById('formRateDetail');
      const fareDisplay = document.getElementById('formEstimatedFare');
      const fareLabel = document.getElementById('formFareLabel');

      if (fareDisplay) fareDisplay.textContent = `₹${config.oneWayRate}/km`;
      if (fareLabel) fareLabel.textContent = `${config.name} (One-Way Drop)`;
      if (rateDetail) rateDetail.textContent = `₹${config.oneWayRate}/km + ₹${config.batta} Driver Batta • Actual distance`;
    }
  }

  // Switch Car Category via UI
  window.switchShowcaseCar = function (carId) {
    if (carId === currentVehicleId && !isAnimatingArrival) {
      startArrivalSequence();
      return;
    }

    // Sync booking state if global state exists
    if (window.state) {
      window.state.selectedCab = carId;
      if (typeof window.calculateFormFare === 'function') {
        window.calculateFormFare();
      }
    }

    loadAndShowVehicle(carId, true);
  };

  // 360 View Pill Toggle
  window.toggleShowcase360 = function () {
    autoRotateActive = !autoRotateActive;
    if (dom.btn360Pill) {
      dom.btn360Pill.classList.toggle('active', autoRotateActive);
    }
  };

  // Camera Presets
  window.setCameraAngle = function (angleKey) {
    const preset = CAMERA_PRESETS[angleKey];
    if (preset) {
      animateCameraTo(preset.pos, preset.target, 0.9);
    }
  };

  window.resetCameraAngle = function () {
    window.setCameraAngle('beauty');
  };

  // Headlight Toggle
  window.toggleHeadlights = function () {
    headlightsOn = !headlightsOn;
    setHeadlightsIntensity(headlightsOn ? 2.5 : 0);
    if (dom.btnLights) {
      dom.btnLights.classList.toggle('active', headlightsOn);
    }
  };

  function setHeadlightsIntensity(val) {
    if (leftHeadlight && rightHeadlight) {
      leftHeadlight.intensity = val;
      rightHeadlight.intensity = val;
    }
  }

  // Paint Color Switcher
  window.changeCarColor = function (colorName) {
    const swatch = PAINT_COLORS[colorName];
    if (swatch) {
      applyCarPaintColor(swatch.hex, swatch.metalness, swatch.roughness);

      const swatches = document.querySelectorAll('.paint-swatch');
      swatches.forEach(s => s.classList.remove('active'));
      const active = document.querySelector(`.paint-swatch[data-color="${colorName}"]`);
      if (active) active.classList.add('active');
    }
  };

  function applyCarPaintColor(hex, metalness = 0.88, roughness = 0.16) {
    if (!activeCarMesh) return;

    activeCarMesh.traverse((child) => {
      if (child.isMesh && child.material) {
        const name = (child.material.name || child.name || '').toLowerCase();
        const isGlass = name.includes('glass') || name.includes('window');
        const isTire = name.includes('tire') || name.includes('wheel') || name.includes('rubber');
        const isLight = name.includes('light') || name.includes('lamp') || name.includes('tail');

        if (!isGlass && !isTire && !isLight) {
          child.material.color.setHex(hex);
          child.material.metalness = metalness;
          child.material.roughness = roughness;
          child.material.needsUpdate = true;
        }
      }
    });
  }

  function showLoader(vehicleName) {
    if (dom.loader) {
      dom.loader.style.display = 'flex';
      dom.loader.style.opacity = '1';
    }
    if (dom.loaderTitle) {
      dom.loaderTitle.textContent = `Loading ${vehicleName} 3D Model...`;
    }
    if (dom.loaderProgressBar) dom.loaderProgressBar.style.width = '20%';
    if (dom.loaderPercent) dom.loaderPercent.textContent = '20%';
  }

  function hideLoader() {
    if (dom.loader) {
      dom.loader.style.opacity = '0';
      setTimeout(() => {
        dom.loader.style.display = 'none';
      }, 300);
    }
  }

  function showFallback() {
    if (dom.fallback) dom.fallback.style.display = 'flex';
    if (dom.loader) dom.loader.style.display = 'none';
  }

  function onWindowResize() {
    const container = document.getElementById('threejsCanvasWrapper');
    if (!container || !renderer || !camera) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

  function checkAndInit(attempts = 0) {
    if (typeof THREE !== 'undefined' && typeof THREE.GLTFLoader !== 'undefined' && typeof THREE.OrbitControls !== 'undefined') {
      init();
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    } else if (attempts < 25) {
      setTimeout(() => checkAndInit(attempts + 1), 120);
    } else {
      init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => checkAndInit());
  } else {
    checkAndInit();
  }

})();
