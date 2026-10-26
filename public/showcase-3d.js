/**
 * YazhGo Taxi Service - Ultra-Realistic Interactive 3D Car Showcase
 * Powered by Three.js & WebGL
 * Features:
 *  - Real-time PBR automotive rendering with studio lighting & contact shadow
 *  - Cinematic vehicle arrival animation with acceleration, braking dive & suspension settle
 *  - Physically proportional wheel rotation and braking stop
 *  - 360-degree OrbitControls with smooth damping and safe zoom limits
 *  - Camera presets (3/4 Beauty, Front, Side, Rear, Top, Reset)
 *  - Dual high-intensity real-time headlights with ground beam projection
 *  - Exterior automotive paint finish switcher (Glacier White, Deep Onyx, 24K Gold, Titanium Silver)
 *  - Seamless two-way integration with YazhGo booking engine and Telegram bot dispatch
 *  - Graceful WebGL fallback & responsive auto-resizing
 */

(function () {
  'use strict';

  // Vehicle Configurations & Metadata
  const SHOWCASE_VEHICLES = {
    sedan: {
      id: 'sedan',
      name: 'Sedan Prime',
      badge: 'Most Popular Taxi ★',
      models: 'Maruti Swift Dzire, Toyota Etios, Honda Amaze',
      oneWayRate: 15,
      roundTripRate: 14,
      passengers: '4 Passengers',
      luggage: '3 Medium Bags',
      ac: 'Chilled Air Conditioning',
      driver: 'Verified Professional Chauffeur',
      batta: 400,
      scale: 1.15,
      yOffset: 0.0,
      modelUrls: [
        './models/sedan.glb',
        'models/sedan.glb',
        'public/models/sedan.glb',
        'https://raw.githubusercontent.com/3DStreet/3dstreet-assets-dist/main/objects/vehicles-rig/sedan-rig.glb'
      ],
      wheelRadius: 0.34,
      defaultPaint: 0xF8FAFC
    },
    suv: {
      id: 'suv',
      name: 'Spacious SUV',
      badge: 'Family & Group Travel',
      models: 'Toyota Innova, Maruti Ertiga, Mahindra Xylo, Marazzo',
      oneWayRate: 20,
      roundTripRate: 19,
      passengers: '6 - 7 Passengers',
      luggage: '5 Large Bags',
      ac: 'Dual-Zone AC Vents',
      driver: 'Expert Highway Captain',
      batta: 400,
      scale: 1.12,
      yOffset: 0.0,
      modelUrls: [
        './models/suv.glb',
        'models/suv.glb',
        'public/models/suv.glb',
        'https://raw.githubusercontent.com/3DStreet/3dstreet-assets-dist/main/objects/vehicles-rig/suv-rig.glb'
      ],
      wheelRadius: 0.38,
      defaultPaint: 0xF1F5F9
    },
    crysta: {
      id: 'crysta',
      name: 'Innova Crysta',
      badge: 'VIP Executive Luxury',
      models: 'Toyota Innova Crysta (Captain Seats & Dual AC)',
      oneWayRate: 24,
      roundTripRate: 23,
      passengers: '7 Passengers',
      luggage: '5+ Large Bags',
      ac: 'Automatic Climate Control',
      driver: 'Senior Executive VIP Chauffeur',
      batta: 400,
      scale: 1.12,
      yOffset: 0.0,
      modelUrls: [
        './models/crysta.glb',
        'models/crysta.glb',
        './models/suv.glb',
        'public/models/crysta.glb',
        'https://raw.githubusercontent.com/3DStreet/3dstreet-assets-dist/main/objects/vehicles-rig/suv-rig.glb'
      ],
      wheelRadius: 0.38,
      defaultPaint: 0x0A0E17
    }
  };

  // Preset Camera Angles
  const CAMERA_PRESETS = {
    beauty: { pos: new THREE.Vector3(4.2, 1.8, 5.0), target: new THREE.Vector3(0, 0.6, 0) },
    front:  { pos: new THREE.Vector3(0.0, 1.3, 5.6), target: new THREE.Vector3(0, 0.6, 0) },
    side:   { pos: new THREE.Vector3(6.2, 1.3, 0.0), target: new THREE.Vector3(0, 0.6, 0) },
    rear:   { pos: new THREE.Vector3(0.0, 1.4, -5.6), target: new THREE.Vector3(0, 0.6, 0) },
    top:    { pos: new THREE.Vector3(0.0, 8.5, 0.1), target: new THREE.Vector3(0, 0.0, 0) }
  };

  // Color Swatches Map
  const PAINT_COLORS = {
    white:  { hex: 0xF8FAFC, metalness: 0.65, roughness: 0.18 },
    onyx:   { hex: 0x0A0E17, metalness: 0.90, roughness: 0.14 },
    gold:   { hex: 0xB48228, metalness: 0.85, roughness: 0.16 },
    silver: { hex: 0x94A3B8, metalness: 0.92, roughness: 0.15 }
  };

  // State
  let scene, camera, renderer, controls;
  let currentVehicleId = 'sedan';
  let loadedVehicles = {};
  let activeCarGroup = null;
  let activeCarMesh = null;
  let activeWheelBones = [];
  let contactShadowMesh = null;
  let stagePlatformGroup = null;

  // Headlights
  let leftHeadlight = null;
  let rightHeadlight = null;
  let headlightsOn = true;

  // Animation State
  let isAnimatingArrival = false;
  let arrivalStartTime = 0;
  const ARRIVAL_DURATION = 2.6; // seconds
  const START_Z = -22.0;
  let lastCarZ = START_Z;
  let suspensionPitch = 0;
  let suspensionSettleTimer = 0;

  // Camera Transition State
  let isCameraTransitioning = false;
  let camStartPos = new THREE.Vector3();
  let camEndPos = new THREE.Vector3();
  let camStartTarget = new THREE.Vector3();
  let camEndTarget = new THREE.Vector3();
  let camTransitionProgress = 1;
  const CAM_TRANSITION_DURATION = 1.0;

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

  // Initialize Showcase
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

    // Initial Load
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
    dom.hint = document.getElementById('viewportHint');

    dom.carStatusBadge = document.getElementById('carStatusBadge');
    dom.carStatusText = document.getElementById('carStatusText');

    dom.hudBadge = document.getElementById('hudBadge');
    dom.hudCarName = document.getElementById('hudCarName');
    dom.hudCarModels = document.getElementById('hudCarModels');
    dom.hudOneWayRate = document.getElementById('hudOneWayRate');
    dom.hudRoundTripRate = document.getElementById('hudRoundTripRate');
    dom.hudPassengers = document.getElementById('hudPassengers');
    dom.hudLuggage = document.getElementById('hudLuggage');
    dom.hudAc = document.getElementById('hudAc');
    dom.hudDriver = document.getElementById('hudDriver');
    dom.hudBatta = document.getElementById('hudBatta');
    dom.hudBtnCarName = document.getElementById('hudBtnCarName');

    dom.btnLights = document.getElementById('btnToggleHeadlights');
    dom.btnRotate = document.getElementById('btnToggleRotate');
  }

  function setupScene(container) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF8FAFC);
    scene.fog = new THREE.FogExp2(0xF8FAFC, 0.022);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.copy(CAMERA_PRESETS.beauty.pos);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.appendChild(renderer.domElement);
  }

  function setupLights() {
    // Ambient Light (Soft executive fill)
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.95);
    scene.add(ambientLight);

    // Sky/Ground Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xCBD5E1, 0.65);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Studio Key Directional Light with Soft Shadows
    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 1.4);
    keyLight.position.set(7, 14, 9);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 35;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Studio Fill Rim Light
    const rimLight = new THREE.DirectionalLight(0xE2E8F0, 0.8);
    rimLight.position.set(-8, 10, -7);
    scene.add(rimLight);

    // Overhead Center Turntable Spot
    const topSpot = new THREE.SpotLight(0xFFFFFF, 0.75);
    topSpot.position.set(0, 10, 0);
    topSpot.angle = Math.PI / 4;
    topSpot.penumbra = 0.8;
    scene.add(topSpot);

    // Headlight SpotLights (Cast real-time light beams forward)
    leftHeadlight = new THREE.SpotLight(0xFFF9E6, 2.5, 20, Math.PI / 6, 0.6, 1.2);
    leftHeadlight.position.set(0.65, 0.72, 2.3);
    leftHeadlight.target.position.set(0.7, 0.0, 12.0);
    scene.add(leftHeadlight);
    scene.add(leftHeadlight.target);

    rightHeadlight = new THREE.SpotLight(0xFFF9E6, 2.5, 20, Math.PI / 6, 0.6, 1.2);
    rightHeadlight.position.set(-0.65, 0.72, 2.3);
    rightHeadlight.target.position.set(-0.7, 0.0, 12.0);
    scene.add(rightHeadlight);
    scene.add(rightHeadlight.target);
  }

  function setupStageFloor() {
    stagePlatformGroup = new THREE.Group();

    // 1. Circular Turntable Stage (Beveled metallic disk)
    const stageGeo = new THREE.CylinderGeometry(5.2, 5.4, 0.12, 64);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.35,
      metalness: 0.15
    });
    const stageMesh = new THREE.Mesh(stageGeo, stageMat);
    stageMesh.position.y = -0.06;
    stageMesh.receiveShadow = true;
    stagePlatformGroup.add(stageMesh);

    // 2. Turntable Accent Rings (24K Gold & Onyx)
    const ringGeo = new THREE.RingGeometry(5.12, 5.24, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xB48228,
      metalness: 0.9,
      roughness: 0.2,
      side: THREE.DoubleSide
    });
    const goldRing = new THREE.Mesh(ringGeo, ringMat);
    goldRing.rotation.x = -Math.PI / 2;
    goldRing.position.y = 0.002;
    stagePlatformGroup.add(goldRing);

    // 3. Inner Radial Grid Lines for high-tech showroom feel
    const innerRingGeo = new THREE.RingGeometry(3.2, 3.24, 64);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xE2E8F0,
      side: THREE.DoubleSide
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.003;
    stagePlatformGroup.add(innerRing);

    // 4. Infinite Ground Floor Plane to receive soft distant shadows
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xF1F5F9,
      roughness: 0.8,
      metalness: 0.05
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.07;
    groundMesh.receiveShadow = true;
    stagePlatformGroup.add(groundMesh);

    scene.add(stagePlatformGroup);

    // 5. Dynamic Vehicle Contact Shadow (Smooth radial shadow that tracks the car)
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const ctx = shadowCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
    grad.addColorStop(0, 'rgba(10, 14, 23, 0.75)');
    grad.addColorStop(0.5, 'rgba(10, 14, 23, 0.35)');
    grad.addColorStop(1, 'rgba(10, 14, 23, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(3.6, 5.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.8,
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
    controls.dampingFactor = 0.06;
    controls.target.set(0, 0.6, 0);

    // Safe boundaries: prevent camera from dipping underground or zooming inside car
    controls.minDistance = 3.2;
    controls.maxDistance = 11.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minPolarAngle = 0.15;
    controls.enablePan = false;

    // Fade out hint on first user interaction
    controls.addEventListener('start', () => {
      if (dom.hint) {
        dom.hint.style.opacity = '0';
        dom.hint.style.pointerEvents = 'none';
      }
    });
  }

  // Load and Show a Vehicle
  function loadAndShowVehicle(carId, playArrival) {
    const config = SHOWCASE_VEHICLES[carId];
    if (!config) return;

    currentVehicleId = carId;
    updateTabSelection(carId);
    updateHUDDetails(config);

    if (loadedVehicles[carId]) {
      activateVehicleModel(loadedVehicles[carId], config, playArrival);
      return;
    }

    // Show Loader
    showLoader(config.name);

    // Load with URL Fallbacks
    loadGLBWithFallbacks(config.modelUrls, 0, (gltf) => {
      hideLoader();
      enhanceVehicleMaterials(gltf.scene, config);
      loadedVehicles[carId] = gltf.scene;
      activateVehicleModel(gltf.scene, config, playArrival);
    }, (err) => {
      hideLoader();
      console.warn('Failed to load 3D vehicle model:', err);
      showFallback();
    });
  }

  // Recursive loader with multiple path fallbacks
  function loadGLBWithFallbacks(urls, index, onSuccess, onError) {
    if (index >= urls.length) {
      onError(new Error('All model fallback URLs exhausted'));
      return;
    }

    const loader = new THREE.GLTFLoader();
    const currentUrl = urls[index];

    loader.load(
      currentUrl,
      (gltf) => {
        onSuccess(gltf);
      },
      (xhr) => {
        if (xhr.lengthComputable && dom.loaderPercent && dom.loaderProgressBar) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          dom.loaderProgressBar.style.width = pct + '%';
          dom.loaderPercent.textContent = pct + '%';
        }
      },
      (error) => {
        console.warn(`URL failed [${index}]: ${currentUrl}, attempting fallback...`);
        loadGLBWithFallbacks(urls, index + 1, onSuccess, onError);
      }
    );
  }

  // Enhance Materials with Photorealistic PBR Car Paint, Glass, & Emissive Highlights
  function enhanceVehicleMaterials(rootObject, config) {
    rootObject.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          const mat = child.material;

          // Check if it's glass
          const isGlass = mat.name && mat.name.toLowerCase().includes('glass') || 
                          child.name.toLowerCase().includes('glass') ||
                          child.name.toLowerCase().includes('window');

          if (isGlass) {
            child.material = new THREE.MeshPhysicalMaterial({
              color: 0x1E293B,
              metalness: 0.1,
              roughness: 0.05,
              transparent: true,
              opacity: 0.45,
              reflectivity: 0.95,
              clearcoat: 1.0,
              clearcoatRoughness: 0.05
            });
          } else {
            // High-grade metallic car paint
            mat.roughness = 0.22;
            mat.metalness = 0.65;
            mat.envMapIntensity = 1.35;
          }
        }
      }
    });
  }

  // Activate & Mount Model into Scene
  function activateVehicleModel(modelScene, config, playArrival) {
    // Remove previous model
    if (activeCarGroup && activeCarGroup.parent) {
      scene.remove(activeCarGroup);
    }

    // Create wrapper for pitch/suspension rotation
    activeCarGroup = new THREE.Group();
    activeCarMesh = modelScene;

    // Apply scale & orientation
    activeCarMesh.scale.set(config.scale, config.scale, config.scale);
    activeCarMesh.position.set(0, config.yOffset, 0);
    activeCarGroup.add(activeCarMesh);

    // Locate wheel nodes/bones for rotation
    activeWheelBones = [];
    activeCarMesh.traverse((child) => {
      const lower = child.name.toLowerCase();
      if (lower.includes('wheel') || lower.includes('tire') || lower.includes('tyre')) {
        activeWheelBones.push(child);
      }
    });

    // Add to scene
    scene.add(activeCarGroup);

    // Apply default paint
    applyCarPaintColor(config.defaultPaint);

    if (playArrival) {
      startArrivalSequence();
    } else {
      activeCarGroup.position.set(0, 0, 0);
      activeCarGroup.rotation.set(0, 0, 0);
      contactShadowMesh.position.set(0, 0.015, 0);
      contactShadowMesh.visible = true;
      updateStatusBadge('Ready for 360° Inspection', 'green');
    }
  }

  // Start Cinematic Arrival Animation
  function startArrivalSequence() {
    isAnimatingArrival = true;
    arrivalStartTime = clock.getElapsedTime();
    lastCarZ = START_Z;
    suspensionPitch = 0;
    suspensionSettleTimer = 0;

    activeCarGroup.position.set(0, 0, START_Z);
    activeCarGroup.rotation.set(0, 0, 0);
    contactShadowMesh.position.set(0, 0.015, START_Z);

    // Headlights start dim, then illuminate
    setHeadlightsIntensity(0.2);

    // Smoothly frame camera to entrance angle
    animateCameraTo(CAMERA_PRESETS.beauty.pos, CAMERA_PRESETS.beauty.target, 1.8);

    updateStatusBadge('Vehicle Arriving...', 'gold');
  }

  // Animation Frame Loop
  function animate() {
    animFrameId = requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // 1. Driving Arrival Animation
    if (isAnimatingArrival && activeCarGroup) {
      const config = SHOWCASE_VEHICLES[currentVehicleId];
      const animElapsed = elapsedTime - arrivalStartTime;
      const t = Math.min(animElapsed / ARRIVAL_DURATION, 1.0);

      // Smooth custom deceleration curve (cubic ease-out)
      const ease = 1 - Math.pow(1 - t, 3.2);
      const currentZ = START_Z + (0.0 - START_Z) * ease;

      // Calculate instantaneous movement delta
      const deltaZ = currentZ - lastCarZ;
      lastCarZ = currentZ;

      // Update Car Position
      activeCarGroup.position.z = currentZ;
      contactShadowMesh.position.z = currentZ;

      // Rotate Wheel Bones proportional to forward travel distance: deltaTheta = deltaZ / r
      if (deltaZ > 0.0001 && config) {
        const deltaTheta = deltaZ / config.wheelRadius;
        for (let i = 0; i < activeWheelBones.length; i++) {
          activeWheelBones[i].rotateX(deltaTheta);
        }
      }

      // Headlight luminous flare during drive-in
      if (t > 0.15 && t < 0.6) {
        const lightRatio = (t - 0.15) / 0.45;
        setHeadlightsIntensity(0.2 + lightRatio * 2.3);
      }

      // Realistic suspension braking dive: chassis tilts forward while decelerating
      const speedNorm = (1 - t) * (1 - t);
      if (t < 0.94) {
        // Diving forward
        activeCarGroup.rotation.x = -speedNorm * 0.024;
      } else {
        // Braking rebound settling (damped oscillation)
        suspensionSettleTimer += delta * 12;
        const settle = Math.sin(suspensionSettleTimer) * Math.exp(-suspensionSettleTimer * 0.35) * 0.014;
        activeCarGroup.rotation.x = settle;
      }

      // Check arrival completion
      if (t >= 1.0) {
        isAnimatingArrival = false;
        activeCarGroup.position.z = 0;
        activeCarGroup.rotation.x = 0;
        contactShadowMesh.position.z = 0;
        setHeadlightsIntensity(headlightsOn ? 2.5 : 0);
        updateStatusBadge('Arrived • 360° Inspection Ready', 'green');
      }
    }

    // 2. Smooth Camera Interpolation
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

    // 3. Auto-Rotation (if enabled)
    if (autoRotateActive && !isAnimatingArrival && !isCameraTransitioning) {
      stagePlatformGroup.rotation.y += delta * 0.25;
      if (activeCarGroup) {
        activeCarGroup.rotation.y += delta * 0.25;
      }
    }

    // 4. Update Orbit Controls
    controls.update();

    // 5. Render Scene
    renderer.render(scene, camera);
  }

  // Smoothly Animate Camera to Target
  function animateCameraTo(targetPos, targetLookAt, duration) {
    camStartPos.copy(camera.position);
    camEndPos.copy(targetPos);
    camStartTarget.copy(controls.target);
    camEndTarget.copy(targetLookAt);
    camTransitionProgress = 0;
    isCameraTransitioning = true;
  }

  // Switch Car Category via UI Tab
  window.switchShowcaseCar = function (carId) {
    if (carId === currentVehicleId && !isAnimatingArrival) {
      startArrivalSequence();
      return;
    }
    loadAndShowVehicle(carId, true);
  };

  // Replay Arrival Animation
  window.replayArrival = function () {
    if (activeCarGroup) {
      startArrivalSequence();
    }
  };

  // Set Camera Preset Angle
  window.setCameraAngle = function (angleKey) {
    const preset = CAMERA_PRESETS[angleKey];
    if (preset) {
      animateCameraTo(preset.pos, preset.target, 0.9);
      updateCameraButtons(angleKey);
    }
  };

  window.resetCameraAngle = function () {
    window.setCameraAngle('beauty');
  };

  // Toggle Headlights
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

  // Toggle Auto-Rotate 360
  window.toggleAutoRotate = function () {
    autoRotateActive = !autoRotateActive;
    if (dom.btnRotate) {
      dom.btnRotate.classList.toggle('active', autoRotateActive);
    }
  };

  // Change Paint Color
  window.changeCarColor = function (colorName) {
    const swatch = PAINT_COLORS[colorName];
    if (swatch) {
      applyCarPaintColor(swatch.hex, swatch.metalness, swatch.roughness);

      // Update swatch active state in UI
      const swatches = document.querySelectorAll('.color-swatch');
      swatches.forEach(s => s.classList.remove('active'));
      const activeSwatch = document.querySelector(`.color-swatch[data-color="${colorName}"]`);
      if (activeSwatch) activeSwatch.classList.add('active');
    }
  };

  function applyCarPaintColor(hex, metalness = 0.75, roughness = 0.2) {
    if (!activeCarMesh) return;

    activeCarMesh.traverse((child) => {
      if (child.isMesh && child.material) {
        const mat = child.material;
        const name = (mat.name || '').toLowerCase();
        const meshName = (child.name || '').toLowerCase();

        // Paint target meshes (excluding glass, rubber, chrome)
        const isGlass = name.includes('glass') || meshName.includes('glass');
        const isTire = name.includes('tire') || name.includes('rubber') || meshName.includes('wheel');
        const isLight = name.includes('light') || meshName.includes('light');

        if (!isGlass && !isTire && !isLight) {
          mat.color.setHex(hex);
          mat.metalness = metalness;
          mat.roughness = roughness;
          mat.needsUpdate = true;
        }
      }
    });
  }

  // Direct Booking Handler
  window.bookShowcaseCar = function () {
    // 1. Scroll smoothly to booking form
    const bookingSection = document.getElementById('booking');
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 2. Pre-select this car in the core booking engine
    if (typeof window.selectFleetAndBook === 'function') {
      window.selectFleetAndBook(currentVehicleId);
    } else {
      // Direct fallback state update
      const cabBtn = document.querySelector(`.cab-btn[data-cab="${currentVehicleId}"]`);
      if (cabBtn) cabBtn.click();
    }
  };

  // UI Helpers
  function updateTabSelection(carId) {
    const tabs = document.querySelectorAll('.showcase-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-car') === carId);
    });
  }

  function updateHUDDetails(config) {
    if (dom.hudBadge) dom.hudBadge.textContent = config.badge;
    if (dom.hudCarName) dom.hudCarName.textContent = config.name;
    if (dom.hudCarModels) dom.hudCarModels.textContent = config.models;
    if (dom.hudOneWayRate) dom.hudOneWayRate.innerHTML = `₹${config.oneWayRate} <small>/ km</small>`;
    if (dom.hudRoundTripRate) dom.hudRoundTripRate.innerHTML = `₹${config.roundTripRate} <small>/ km</small>`;
    if (dom.hudPassengers) dom.hudPassengers.textContent = config.passengers;
    if (dom.hudLuggage) dom.hudLuggage.textContent = config.luggage;
    if (dom.hudAc) dom.hudAc.textContent = config.ac;
    if (dom.hudDriver) dom.hudDriver.textContent = config.driver;
    if (dom.hudBatta) dom.hudBatta.textContent = `₹${config.batta}`;
    if (dom.hudBtnCarName) dom.hudBtnCarName.textContent = config.name;
  }

  function updateStatusBadge(text, color) {
    if (dom.carStatusText) dom.carStatusText.textContent = `${SHOWCASE_VEHICLES[currentVehicleId].name} • ${text}`;
    if (dom.carStatusBadge) {
      dom.carStatusBadge.className = `badge-status-pill status-${color}`;
    }
  }

  function updateCameraButtons(activeAngle) {
    const btns = document.querySelectorAll('.cam-btn');
    btns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-angle') === activeAngle);
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
    if (dom.loaderProgressBar) dom.loaderProgressBar.style.width = '15%';
    if (dom.loaderPercent) dom.loaderPercent.textContent = '15%';
  }

  function hideLoader() {
    if (dom.loader) {
      dom.loader.style.opacity = '0';
      setTimeout(() => {
        dom.loader.style.display = 'none';
      }, 350);
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

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => checkAndInit());
  } else {
    checkAndInit();
  }

})();
