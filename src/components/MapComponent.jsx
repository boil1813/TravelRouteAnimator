import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import * as THREE from 'three';

// --- 3D Model Generators ---

const create3DVehicle = (type) => {
    const group = new THREE.Group();
    
    // Common Materials
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x81d4fa, transparent: true, opacity: 0.8 });
    const whiteMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    
    // Helper to create wheels
    const createWheels = (xOffset, zOffset, yPos = 0.5) => {
        const wheelGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16);
        wheelGeo.rotateX(Math.PI / 2);
        
        const w1 = new THREE.Mesh(wheelGeo, wheelMaterial);
        w1.position.set(xOffset, yPos, zOffset); // Left
        w1.castShadow = true;
        
        const w2 = new THREE.Mesh(wheelGeo, wheelMaterial);
        w2.position.set(xOffset, yPos, -zOffset); // Right
        w2.castShadow = true;
        
        return [w1, w2];
    };

    if (type === 'plane') {
        // --- PLANE MODEL ---
        const bodyColor = new THREE.MeshStandardMaterial({ color: 0xffffff }); // White plane
        const wingColor = new THREE.MeshStandardMaterial({ color: 0x2196f3 }); // Blue wings

        // Fuselage
        const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 4, 4, 8), bodyColor);
        fuselage.rotation.z = Math.PI / 2;
        fuselage.position.y = 8; // Flying high
        fuselage.castShadow = true;
        group.add(fuselage);

        // Wings
        const wingGeo = new THREE.BoxGeometry(2, 0.2, 8);
        const wings = new THREE.Mesh(wingGeo, wingColor);
        wings.position.set(0, 8, 0);
        wings.castShadow = true;
        group.add(wings);

        // Tail
        const tailGeo = new THREE.BoxGeometry(1, 0.2, 3);
        const tail = new THREE.Mesh(tailGeo, wingColor);
        tail.position.set(-2, 8.5, 0);
        tail.castShadow = true;
        group.add(tail);
        
        // Propeller (Simplified)
        const propGeo = new THREE.BoxGeometry(0.2, 2.5, 0.2);
        const prop = new THREE.Mesh(propGeo, new THREE.MeshStandardMaterial({ color: 0xff0000 }));
        prop.position.set(2.2, 8, 0);
        
        // Animate propeller later if possible, but static for now is fine
        group.add(prop);
        
        // Shadow (Fake shadow on ground)
        const shadowGeo = new THREE.CircleGeometry(2, 16);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 });
        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.2; // Just above ground
        group.add(shadow);
        
        // Store type for altitude handling
        group.userData.isPlane = true;

    } else if (type === 'bus') {
        // --- BUS MODEL ---
        const busColor = new THREE.MeshStandardMaterial({ color: 0xffc107 }); // Yellow

        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 2.4), busColor);
        body.position.y = 2.0; // Lift up
        body.castShadow = true;
        group.add(body);
        
        // Windows
        const windowGeo = new THREE.BoxGeometry(5.8, 1, 2.5);
        const windows = new THREE.Mesh(windowGeo, glassMaterial);
        windows.position.y = 2.5;
        group.add(windows);

        // Wheels
        const wheels = [
            ...createWheels(1.8, 1.2, 0.6),
            ...createWheels(-1.8, 1.2, 0.6)
        ];
        wheels.forEach(w => group.add(w));

    } else {
        // --- CAR MODEL (Default & Red & Blue) ---
        let carColorHex = 0xd32f2f; // Red default
        if (type === 'car-blue') carColorHex = 0x1976d2; // Blue
        
        const carMat = new THREE.MeshStandardMaterial({ color: carColorHex });

        // Chassis
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 1.8), carMat);
        chassis.position.y = 1.0;
        chassis.castShadow = true;
        group.add(chassis);

        // Cabin
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1.6), glassMaterial);
        cabin.position.set(-0.2, 2.1, 0);
        group.add(cabin);
        
        // Roof
        const roof = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1.6), carMat);
        roof.position.set(-0.2, 2.65, 0);
        group.add(roof);

        // Wheels
        const wheels = [
            ...createWheels(1.0, 1.0, 0.6),
            ...createWheels(-1.0, 1.0, 0.6)
        ];
        wheels.forEach(w => group.add(w));
        
        // Headlights
        const lightGeo = new THREE.BoxGeometry(0.1, 0.4, 0.4);
        const lightMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b, emissive: 0xffeb3b, emissiveIntensity: 0.5 });
        
        const hl1 = new THREE.Mesh(lightGeo, lightMat);
        hl1.position.set(1.75, 1.2, 0.5);
        group.add(hl1);
        
        const hl2 = new THREE.Mesh(lightGeo, lightMat);
        hl2.position.set(1.75, 1.2, -0.5);
        group.add(hl2);
    }
    
    // Scale the whole group to fit map units roughly
    // Map units are large? No, we will scale at insertion.
    // Let's keep local scale 1.0 and scale in the map layer.
    
    // Rotate so +X is forward?
    // In our models:
    // Car: Length is X axis (3.5), Width is Z axis (1.8).
    // Headlights at +X.
    // So +X is forward.
    
    return group;
};

// --- Helper Math ---
function calculateBearing(lat1, lon1, lat2, lon2) {
    const startLat = lat1 * Math.PI / 180;
    const startLng = lon1 * Math.PI / 180;
    const endLat = lat2 * Math.PI / 180;
    const endLng = lon2 * Math.PI / 180;

    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
    const brng = Math.atan2(y, x);
    return (brng * 180 / Math.PI + 360) % 360;
}

const MapComponent = ({ locations, isPlaying, isPaused, onAnimationEnd, speed, vehicle }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const animationRef = useRef(null);
    
    // Three.js refs
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const vehicleMeshRef = useRef(null);
    
    const [routePath, setRoutePath] = useState([]);
    const progressRef = useRef(0);
    const lastTimeRef = useRef(0);

    // Initialize Map
    useEffect(() => {
        if (map.current) return;
        
        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: {
                    'google-tiles': {
                        type: 'raster',
                        tiles: ['https://mt0.google.com/vt/lyrs=m&hl=ko&x={x}&y={y}&z={z}'],
                        tileSize: 256,
                        attribution: 'Google Maps'
                    }
                },
                layers: [{
                    id: 'google-tiles-layer',
                    type: 'raster',
                    source: 'google-tiles',
                    minzoom: 0, maxzoom: 22
                }]
            },
            center: [127.5, 36.5],
            zoom: 7,
            pitch: 0,
            bearing: 0,
            antialias: true // Important for 3D
        });
        
        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
        
        // Add 3D Layer when loaded
        map.current.on('load', () => {
             addThreeJSLayer();
        });

    }, []);

    // Function to add the custom Three.js layer
    const addThreeJSLayer = () => {
        const customLayer = {
            id: '3d-model',
            type: 'custom',
            renderingMode: '3d',
            onAdd: function (map, gl) {
                // 1. Setup Three.js
                this.camera = new THREE.Camera();
                this.scene = new THREE.Scene();
                
                // Lights
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
                this.scene.add(ambientLight);
                
                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
                directionalLight.position.set(0, 70, 100).normalize();
                this.scene.add(directionalLight);

                // Renderer
                this.renderer = new THREE.WebGLRenderer({
                    canvas: map.getCanvas(),
                    context: gl,
                    antialias: true,
                    alpha: true
                });
                this.renderer.autoClear = false;
                this.renderer.shadowMap.enabled = true;

                // Save refs
                cameraRef.current = this.camera;
                sceneRef.current = this.scene;
                rendererRef.current = this.renderer;
                
                // Add initial vehicle
                updateVehicleModel(vehicle);
            },
            render: function (gl, matrix) {
                const m = new THREE.Matrix4().fromArray(matrix);
                const l = new THREE.Matrix4()
                    .makeTranslation(maplibregl.MercatorCoordinate.fromLngLat([0, 0], 0).x, maplibregl.MercatorCoordinate.fromLngLat([0, 0], 0).y, 0)
                    .scale(new THREE.Vector3(1, -1, 1)); // Flip Y for Three.js
                
                // This is simpler: just set projection matrix.
                this.camera.projectionMatrix = m;
                
                this.renderer.resetState();
                this.renderer.render(this.scene, this.camera);
                map.triggerRepaint();
            }
        };

        if (!map.current.getLayer('3d-model')) {
            map.current.addLayer(customLayer);
        }
    };

    // Update Vehicle Mesh when type changes
    const updateVehicleModel = (vehType) => {
        if (!sceneRef.current) return;
        
        // Remove old
        if (vehicleMeshRef.current) {
            sceneRef.current.remove(vehicleMeshRef.current);
        }
        
        // Create new
        const mesh = create3DVehicle(vehType);
        
        // Scale it. 
        // MapLibre Mercator units are 0..1 world space.
        // At zoom 0, world is 512px (roughly).
        // We need a scale factor.
        // Usually, 1 meter approx.
        // Let's pick a scale that looks good. 
        // 1 Mercator unit = Earth Circumference.
        // We need it to be small. 
        // maplibregl.MercatorCoordinate.fromLngLat(lng, lat, altitude) gives coords.
        // 1 meter in mercator units is tiny.
        const modelScale = 2e-7; // Trial and error or calculation
        // Actually, let's use a standard scaling factor based on latitude, but for visual effect constant is okay.
        
        mesh.scale.set(modelScale, modelScale, modelScale);
        
        sceneRef.current.add(mesh);
        vehicleMeshRef.current = mesh;
    };
    
    useEffect(() => {
        updateVehicleModel(vehicle);
    }, [vehicle]);

    // 1. Calculate Route (OSRM)
    useEffect(() => {
        if (locations.length < 2) {
            setRoutePath([]);
            progressRef.current = 0;
            return;
        }

        const fetchRoute = async () => {
            const coords = locations.map(l => `${l.lng},${l.lat}`).join(';');
            try {
                const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
                const data = await response.json();
                if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                    setRoutePath(data.routes[0].geometry.coordinates);
                } else {
                    throw new Error('OSRM No route');
                }
            } catch (err) {
                console.warn("Routing fallback", err);
                setRoutePath(locations.map(l => [l.lng, l.lat]));
            }
        };
        fetchRoute();
        progressRef.current = 0;
    }, [locations]);

    // 2. Draw Path (Line Layer)
    useEffect(() => {
        if (!map.current || routePath.length === 0) return;
        const mapInstance = map.current;

        const draw = () => {
            if (mapInstance.getSource('route')) {
                if (mapInstance.getLayer('route-layer')) mapInstance.removeLayer('route-layer');
                mapInstance.removeSource('route');
            }

            mapInstance.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: routePath }
                }
            });

            mapInstance.addLayer({
                id: 'route-layer',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': '#ff0055',
                    'line-width': 8,
                    'line-opacity': 0.8
                }
            }, '3d-model'); // Draw line BELOW model

            if (!isPlaying) {
                const bounds = new maplibregl.LngLatBounds();
                routePath.forEach(p => bounds.extend(p));
                mapInstance.fitBounds(bounds, { padding: 80, pitch: 0, bearing: 0 });
            }
        };

        if (mapInstance.loaded()) draw();
        else mapInstance.once('load', draw);
    }, [routePath, isPlaying]);

    // 3. Animation Loop
    useEffect(() => {
        if (!isPlaying || isPaused || routePath.length < 2 || !map.current) {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            lastTimeRef.current = 0;
            return;
        }

        if (progressRef.current >= routePath.length - 1) {
            progressRef.current = 0;
        }

        const animate = (timestamp) => {
            if (!lastTimeRef.current) lastTimeRef.current = timestamp;
            // const deltaTime = timestamp - lastTimeRef.current; // Not used yet
            lastTimeRef.current = timestamp;

            const pointsPerFrame = speed * 0.3; // Speed factor
            
            if (!animationRef.currentProgress) animationRef.currentProgress = progressRef.current;
            animationRef.currentProgress += pointsPerFrame;
            
            const idx = Math.floor(animationRef.currentProgress);
            const nextIdx = idx + 1;

            if (nextIdx < routePath.length) {
                progressRef.current = idx;
                
                const currentPos = routePath[idx];
                const nextPos = routePath[nextIdx];
                const residue = animationRef.currentProgress - idx;
                
                const lng = currentPos[0] + (nextPos[0] - currentPos[0]) * residue;
                const lat = currentPos[1] + (nextPos[1] - currentPos[1]) * residue;

                // Update 3D Model Position
                if (vehicleMeshRef.current) {
                    const coord = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
                    vehicleMeshRef.current.position.set(coord.x, coord.y, coord.z);
                    
                    // Bearing
                    const bearing = calculateBearing(currentPos[1], currentPos[0], nextPos[1], nextPos[0]);
                    // Three.js rotation is radians.
                    // Map bearing: 0 is North (up). +Rotation is CW.
                    // Three.js: +Y is Up in screen (usually), but here we map mercator.
                    // Usually Mercator X is East, Y is South (in Web Mercator?). 
                    // Wait, MapLibre coords: (0,0) top left. X right, Y down.
                    // So North is -Y.
                    // Bearing 0 (North) -> should face -Y.
                    
                    // Let's calibrate rotation visually. 
                    // Standard math bearing (0 = N, 90 = E).
                    // Convert to radians: -bearing * (PI/180).
                    // Also need offset.
                    // Let's try: rotation.z = -bearing * Math.PI / 180 + offset.
                    
                    // Experiment:
                    // If bearing is 90 (East), car should face +X.
                    // If bearing is 180 (South), car should face +Y.
                    // Our Car Model +X is forward.
                    // So 90 deg bearing -> 0 deg rotation (if 0 is +X).
                    // 180 deg bearing -> -90 deg rotation?
                    
                    // Bearing: N(0), E(90), S(180), W(270)
                    // Unit circle: E(0), N(90), W(180), S(270)
                    // Relation: MathAngle = 90 - Bearing.
                    
                    // Our model forward is +X.
                    // So we want model to point to MathAngle.
                    // rotation.z = (90 - bearing) * deg2rad.
                    // But MapLibre Y is down? 
                    // Let's assume standard right-handed Z up for now in Three.js layer setup?
                    // Actually we scaled Y by -1 in render function: .scale(new THREE.Vector3(1, -1, 1));
                    // So Y is Up in Three.js space relative to map? No, Y is South if inverted?
                    
                    // Simplest: rotation.z = (-bearing + 90) * (Math.PI / 180);
                    // If bearing 90 (E), rot=0. Model +X faces E. Correct.
                    // If bearing 0 (N), rot=90. Model +X faces N (-Y in map? +Y in three if flipped?).
                    
                    vehicleMeshRef.current.rotation.z = (-bearing + 90) * (Math.PI / 180);
                    
                    // Tilt for plane
                    if (vehicleMeshRef.current.userData.isPlane) {
                         vehicleMeshRef.current.position.z += 0.00002; // Height offset in Mercator (approx)
                         // Banking effect could be added here
                    }
                }

                // Camera Logic
                map.current.jumpTo({
                    center: [lng, lat],
                    zoom: 16, // Close up for 3D view
                    pitch: 60, // Angled view
                    bearing: bearing // Camera follows car
                });

                animationRef.current = requestAnimationFrame(animate);
            } else {
                progressRef.current = routePath.length - 1;
                onAnimationEnd();
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isPlaying, isPaused, routePath, speed]);

    return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
};

export default MapComponent;
