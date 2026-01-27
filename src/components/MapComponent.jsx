import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import * as THREE from 'three';

// --- 3D Model Generators ---

const create3DVehicle = (type) => {
    const group = new THREE.Group();
    
    // Use BasicMaterial for guaranteed visibility (unaffected by lighting)
    const wheelMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const glassMaterial = new THREE.MeshBasicMaterial({ color: 0x81d4fa, transparent: true, opacity: 0.8 });
    
    // Helper to create wheels
    const createWheels = (xOffset, zOffset, yPos = 0.5) => {
        const wheelGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16);
        wheelGeo.rotateX(Math.PI / 2);
        
        const w1 = new THREE.Mesh(wheelGeo, wheelMaterial);
        w1.position.set(xOffset, yPos, zOffset);
        
        const w2 = new THREE.Mesh(wheelGeo, wheelMaterial);
        w2.position.set(xOffset, yPos, -zOffset);
        
        return [w1, w2];
    };

    if (type === 'plane') {
        const bodyColor = new THREE.MeshBasicMaterial({ color: 0xffffff }); 
        const wingColor = new THREE.MeshBasicMaterial({ color: 0x2196f3 });

        // Fuselage
        const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 4, 4, 8), bodyColor);
        fuselage.rotation.z = Math.PI / 2;
        fuselage.position.y = 8; 
        group.add(fuselage);

        // Wings
        const wingGeo = new THREE.BoxGeometry(2, 0.2, 10);
        const wings = new THREE.Mesh(wingGeo, wingColor);
        wings.position.set(0, 8, 0);
        group.add(wings);

        // Tail
        const tailGeo = new THREE.BoxGeometry(1, 0.2, 3);
        const tail = new THREE.Mesh(tailGeo, wingColor);
        tail.position.set(-2, 8.5, 0);
        group.add(tail);
        
        // Propeller
        const propGeo = new THREE.BoxGeometry(0.2, 2.5, 0.2);
        const prop = new THREE.Mesh(propGeo, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        prop.position.set(2.2, 8, 0);
        group.add(prop);
        
        group.userData.isPlane = true;

    } else if (type === 'bus') {
        const busColor = new THREE.MeshBasicMaterial({ color: 0xffc107 }); 

        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 2.4), busColor);
        body.position.y = 2.0; 
        group.add(body);
        
        // Windows
        const windows = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1, 2.5), glassMaterial);
        windows.position.y = 2.5;
        group.add(windows);

        // Wheels
        const wheels = [
            ...createWheels(1.8, 1.2, 0.6),
            ...createWheels(-1.8, 1.2, 0.6)
        ];
        wheels.forEach(w => group.add(w));

    } else {
        // --- CAR MODEL ---
        let carColorHex = 0xd32f2f; // Red
        if (type === 'car-blue') carColorHex = 0x1976d2; // Blue
        
        const carMat = new THREE.MeshBasicMaterial({ color: carColorHex });

        // Chassis
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 1.8), carMat);
        chassis.position.y = 1.0;
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
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
        
        const hl1 = new THREE.Mesh(lightGeo, lightMat);
        hl1.position.set(1.75, 1.2, 0.5);
        group.add(hl1);
        
        const hl2 = new THREE.Mesh(lightGeo, lightMat);
        hl2.position.set(1.75, 1.2, -0.5);
        group.add(hl2);
    }
    
    return group;
};

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
            antialias: true 
        });
        
        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
        
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
                this.camera = new THREE.Camera();
                this.scene = new THREE.Scene();
                
                // Brighter Lights
                const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Full bright
                this.scene.add(ambientLight);
                
                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
                directionalLight.position.set(100, 100, 100);
                this.scene.add(directionalLight);

                this.renderer = new THREE.WebGLRenderer({
                    canvas: map.getCanvas(),
                    context: gl,
                    antialias: true,
                    alpha: true
                });
                this.renderer.autoClear = false;

                cameraRef.current = this.camera;
                sceneRef.current = this.scene;
                rendererRef.current = this.renderer;
                
                updateVehicleModel(vehicle);
            },
            render: function (gl, matrix) {
                // IMPORTANT: MapLibre passes a matrix that expects Mercator coordinates (0..1)
                const m = new THREE.Matrix4().fromArray(matrix);
                this.camera.projectionMatrix = m;
                this.camera.matrixWorldInverse.identity();
                this.camera.matrixWorld.identity();
                
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
        
        if (vehicleMeshRef.current) {
            sceneRef.current.remove(vehicleMeshRef.current);
        }
        
        const mesh = create3DVehicle(vehType);
        
        // DRAMATICALLY INCREASED SCALE (2e-4)
        const modelScale = 2e-4; 
        mesh.scale.set(modelScale, modelScale, modelScale);
        
        // ROTATE TO STAND UP (Y-up to Z-up)
        mesh.rotation.x = Math.PI / 2;
        
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

            // Safe Layer Addition
            const beforeId = mapInstance.getLayer('3d-model') ? '3d-model' : undefined;

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
            }, beforeId);

            if (!isPlaying) {
                const bounds = new maplibregl.LngLatBounds();
                routePath.forEach(p => bounds.extend(p));
                mapInstance.fitBounds(bounds, { padding: 80, pitch: 0, bearing: 0 });
            }
        };

        if (mapInstance.loaded()) draw();
        else mapInstance.once('load', draw);
    }, [routePath, isPlaying]);

    // Handle Resize on Play
    useEffect(() => {
        if (isPlaying && map.current) {
            setTimeout(() => {
                map.current.resize();
            }, 50);
        }
    }, [isPlaying]);

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
            lastTimeRef.current = timestamp;

            const pointsPerFrame = speed * 0.3; 
            
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

                let bearing = 0;

                // Update 3D Model Position
                if (vehicleMeshRef.current) {
                    const coord = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
                    vehicleMeshRef.current.position.set(coord.x, coord.y, coord.z + 0.0000005);
                    
                    bearing = calculateBearing(currentPos[1], currentPos[0], nextPos[1], nextPos[0]);
                    const zRot = (-bearing + 90) * (Math.PI / 180);
                    
                    // Rotate Z (bearing) then X (stand up) using ZXY order
                    vehicleMeshRef.current.rotation.set(Math.PI / 2, zRot, 0, 'ZXY'); 
                    
                    if (vehicleMeshRef.current.userData.isPlane) {
                         vehicleMeshRef.current.position.z += 0.00002; 
                    }
                }

                // Camera Logic
                map.current.jumpTo({
                    center: [lng, lat],
                    zoom: 16, 
                    pitch: 60, 
                    bearing: 0 // FIXED NORTH UP
                });
                
                map.current.triggerRepaint();

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
