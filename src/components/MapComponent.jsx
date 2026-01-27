import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import * as THREE from 'three';
import { create3DVehicle } from '../utils/vehicleModels';

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
    const worldGroupRef = useRef(null); 
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

    const addThreeJSLayer = () => {
        const customLayer = {
            id: '3d-model',
            type: 'custom',
            renderingMode: '3d',
            onAdd: function (map, gl) {
                this.camera = new THREE.PerspectiveCamera();
                this.camera.matrixAutoUpdate = false;

                this.scene = new THREE.Scene();
                
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
                this.scene.add(ambientLight);
                const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
                sunLight.position.set(0, -100, 100);
                this.scene.add(sunLight);

                this.worldGroup = new THREE.Group();
                this.scene.add(this.worldGroup);

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
                worldGroupRef.current = this.worldGroup;
                
                updateVehicleModel(vehicle);
            },
            render: function (gl, matrix) {
                this.camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);
                this.camera.matrixWorldInverse.identity();
                this.camera.matrixWorld.identity();
                
                const canvas = map.getCanvas();
                this.renderer.setSize(canvas.width, canvas.height, false);
                this.renderer.resetState();
                this.renderer.render(this.scene, this.camera);
                map.triggerRepaint();
            }
        };

        if (!map.current.getLayer('3d-model')) {
            map.current.addLayer(customLayer);
        }
    };

    const updateVehicleModel = (vehType) => {
        if (!worldGroupRef.current) return;
        
        if (vehicleMeshRef.current) {
            worldGroupRef.current.remove(vehicleMeshRef.current);
        }
        
        const mesh = create3DVehicle(vehType);
        
        const modelScale = 3e-4; 
        mesh.scale.set(modelScale, modelScale, modelScale);
        mesh.rotation.x = Math.PI / 2;
        
        mesh.traverse((obj) => { if(obj.isMesh) obj.frustumCulled = false; });
        
        worldGroupRef.current.add(mesh);
        vehicleMeshRef.current = mesh;
    };
    
    useEffect(() => {
        updateVehicleModel(vehicle);
    }, [vehicle]);

    useEffect(() => {
        if (isPlaying && map.current) {
            setTimeout(() => {
                map.current.resize();
            }, 50);
        }
    }, [isPlaying]);

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

                if (vehicleMeshRef.current) {
                    const coord = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
                    vehicleMeshRef.current.position.set(coord.x, coord.y, coord.z + 0.000001);
                    
                    bearing = calculateBearing(currentPos[1], currentPos[0], nextPos[1], nextPos[0]);
                    const zRot = (-bearing + 90) * (Math.PI / 180);
                    vehicleMeshRef.current.rotation.set(Math.PI / 2, zRot, 0, 'ZXY'); 
                    
                    if (vehicleMeshRef.current.userData.isPlane) {
                         vehicleMeshRef.current.position.z += 0.00002; 
                    }
                }

                map.current.jumpTo({
                    center: [lng, lat],
                    zoom: 16, 
                    pitch: 60, 
                    bearing: 0 
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