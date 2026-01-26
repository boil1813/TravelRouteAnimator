import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

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

const getVehicleSVG = (type, isFlying) => {
    const shadow = 'filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));';
    if (isFlying && type !== 'plane') {
        return `<svg viewBox="0 0 64 64" width="80" height="80" style="${shadow} overflow: visible;"><g transform="rotate(0 32 32)"><path fill="#9c27b0" d="M32 2 L38 22 L62 32 L38 38 L32 62 L26 38 L2 32 L26 22 Z" /><path fill="#7b1fa2" d="M32 2 L32 62 L26 38 L26 22 Z" opacity="0.5"/><circle cx="32" cy="32" r="5" fill="white" opacity="0.8"/></g></svg>`;
    }
    switch (type) {
        case 'car-blue': return `<svg viewBox="0 0 64 64" width="60" height="60" style="${shadow}"><path fill="#1565c0" d="M12 40 L16 16 L48 16 L52 40 Z" /><path fill="#0d47a1" d="M12 40 L52 40 L52 56 L12 56 Z" /><rect x="14" y="44" width="10" height="6" fill="#ff5252" /><rect x="40" y="44" width="10" height="6" fill="#ff5252" /><rect x="20" y="20" width="24" height="12" fill="#81d4fa" opacity="0.6" /></svg>`;
        case 'bus': return `<svg viewBox="0 0 64 64" width="70" height="70" style="${shadow}"><rect x="14" y="10" width="36" height="40" fill="#fbc02d" rx="2" /><rect x="14" y="50" width="36" height="12" fill="#f9a825" /><rect x="16" y="52" width="8" height="6" fill="#d32f2f" /><rect x="40" y="52" width="8" height="6" fill="#d32f2f" /><rect x="18" y="14" width="28" height="26" fill="#4fc3f7" opacity="0.6" /></svg>`;
        case 'plane': return `<svg viewBox="0 0 64 64" width="80" height="80" style="${shadow}"><path fill="#eeeeee" d="M32 4 L40 24 L62 36 L40 42 L32 60 L24 42 L2 36 L24 24 Z" /><path fill="#bdbdbd" d="M32 4 L32 60 L24 42 L24 24 Z" opacity="0.5"/></svg>`;
        case 'car-red': default: return `<svg viewBox="0 0 64 64" width="60" height="60" style="${shadow}"><path fill="#d32f2f" d="M16 36 L20 16 L44 16 L48 36 Z" /><path fill="#b71c1c" d="M12 36 L52 36 L50 52 L14 52 Z" /><rect x="14" y="40" width="10" height="5" fill="#ffeb3b" /><rect x="40" y="40" width="10" height="5" fill="#ffeb3b" /><rect x="20" y="20" width="24" height="10" fill="#212121" opacity="0.8" /></svg>`;
    }
};

const MapComponent = ({ locations, isPlaying, isPaused, onAnimationEnd, speed, vehicle }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const marker = useRef(null);
    const animationRef = useRef(null);
    
    // Store the detailed path (coordinates)
    const [routePath, setRoutePath] = useState([]);
    
    // Track animation progress
    const progressRef = useRef(0); // Index in routePath
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
            bearing: 0
        });
        
        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
        
        const el = document.createElement('div');
        el.className = 'traveler-marker';
        // Icon wrapper for rotation
        el.innerHTML = `<div id="traveler-icon-wrapper" style="width:60px; height:60px; transition: transform 0.1s linear;"></div>`;
        
        marker.current = new maplibregl.Marker({ element: el })
            .setLngLat([127.5, 36.5])
            .addTo(map.current);
            
        marker.current.getElement().style.opacity = '0';
    }, []);

    // 1. Calculate Route (OSRM)
    useEffect(() => {
        if (locations.length < 2) {
            setRoutePath([]);
            progressRef.current = 0;
            return;
        }

        const fetchRoute = async () => {
            // Build coordinate string for OSRM
            const coords = locations.map(l => `${l.lng},${l.lat}`).join(';');
            
            try {
                // Try OSRM for driving route
                // Note: OSRM might fail for very long distances or ocean crossing.
                // We will handle fallback below.
                const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
                const data = await response.json();
                
                if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                    setRoutePath(data.routes[0].geometry.coordinates);
                } else {
                    // Fallback to straight line
                    throw new Error('OSRM No route');
                }
            } catch (err) {
                console.warn("Routing fallback to straight line:", err);
                // Fallback: Generate points between locations for smoother animation if needed, 
                // but MapLibre can animate straight lines too.
                // Just use the main locations as the path.
                const fallbackPath = locations.map(l => [l.lng, l.lat]);
                setRoutePath(fallbackPath);
            }
        };

        fetchRoute();
        progressRef.current = 0; // Reset progress when route changes
    }, [locations]);

    // 2. Draw Path & Update Initial Icon
    useEffect(() => {
        if (!map.current || routePath.length === 0) return;
        const mapInstance = map.current;

        const draw = () => {
            // Set start pos
            marker.current.setLngLat(routePath[0]);
            marker.current.getElement().style.opacity = '1';
            
            // Set Icon
            const iconWrapper = document.getElementById('traveler-icon-wrapper');
            if (iconWrapper) {
                iconWrapper.innerHTML = getVehicleSVG(vehicle, false);
            }

            // Route Line
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
                    'line-width': 6,
                    'line-opacity': 0.8
                }
            });

            if (!isPlaying) {
                const bounds = new maplibregl.LngLatBounds();
                routePath.forEach(p => bounds.extend(p));
                mapInstance.fitBounds(bounds, { padding: 80, pitch: 0, bearing: 0 });
            }
        };

        if (mapInstance.loaded()) draw();
        else mapInstance.once('load', draw);
    }, [routePath, vehicle, isPlaying]); // Redraw if vehicle changes too

    // 3. Animation Loop
    useEffect(() => {
        if (!isPlaying || isPaused || routePath.length < 2) {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            lastTimeRef.current = 0;
            return;
        }

        const mapInstance = map.current;
        const iconWrapper = document.getElementById('traveler-icon-wrapper');

        // Reset if starting fresh
        if (progressRef.current >= routePath.length - 1) {
            progressRef.current = 0;
        }

        const animate = (timestamp) => {
            if (!lastTimeRef.current) lastTimeRef.current = timestamp;
            const deltaTime = timestamp - lastTimeRef.current;
            lastTimeRef.current = timestamp;

            // Speed logic: 
            // OSRM points are dense. We can move point by point.
            // Adjust "points per second" based on speed.
            // Base: 30 points/sec * speed.
            // Since we use RAF, we just increment index.
            
            // Accumulate float index
            // Let's use a simpler approach: Move 1 index per X ms.
            // Or just increment index by (speed * factor).
            
            // To make it smooth, we interpolate between current index and next.
            // But let's keep it simple: Just advance integer index for now, 
            // maybe skip points if speed is high.
            
            // For now: 1 point per frame is too fast.
            // We need a timer or float accumulator.
            
            // Let's use a "time bucket" approach
            // Target: 60fps.
            // speed 1.0 => traverse entire path in ... say 10 seconds?
            // Depends on path length.
            // Let's just say we advance based on speed.
            
            // Better: Constant speed on map.
            // But OSRM segments vary in length.
            // Simple: Skip points based on speed.
            
            const pointsPerFrame = speed * 0.5; // Tweak this factor
            
            // Since progressRef is integer in previous logic, let's make it float?
            // Let's rely on the previous float logic if we want smooth interp.
            // But with OSRM (thousands of points), integer stepping is fine.
            
            // Just use a frame counter or simple addition
            // We need to store float progress in a Ref
            if (!animationRef.currentProgress) animationRef.currentProgress = progressRef.current;
            
            animationRef.currentProgress += pointsPerFrame;
            
            const idx = Math.floor(animationRef.currentProgress);
            const nextIdx = idx + 1;

            if (nextIdx < routePath.length) {
                progressRef.current = idx;
                
                const currentPos = routePath[idx];
                const nextPos = routePath[nextIdx];
                
                // Interpolate for smoothness between the two points
                const residue = animationRef.currentProgress - idx;
                
                const lng = currentPos[0] + (nextPos[0] - currentPos[0]) * residue;
                const lat = currentPos[1] + (nextPos[1] - currentPos[1]) * residue;

                marker.current.setLngLat([lng, lat]);

                // Calculate Rotation
                const bearing = calculateBearing(currentPos[1], currentPos[0], nextPos[1], nextPos[0]);
                
                // Rotate ICON, not Map
                if (iconWrapper) {
                    iconWrapper.style.transform = `rotate(${bearing}deg)`;
                }

                // Camera Logic: North Up (Fixed Bearing 0), Pitch 40 (Slight 3D), Follow Center
                mapInstance.jumpTo({
                    center: [lng, lat],
                    zoom: 10, // Further out as requested
                    pitch: 40,
                    bearing: 0 // North up fixed
                });

                animationRef.current = requestAnimationFrame(animate);
            } else {
                // End
                progressRef.current = routePath.length - 1;
                onAnimationEnd();
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isPlaying, isPaused, routePath, speed]); // Re-run if these change

    return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
};

export default MapComponent;
