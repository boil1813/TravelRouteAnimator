import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

// Helper functions (Distance, Bearing)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

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

// 3D-ish SVG Icons (Isometric Rear View)
const getVehicleSVG = (type, isFlying) => {
    const shadow = 'filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));';
    
    // Auto-switch to plane for long distances if not already a plane
    if (isFlying && type !== 'plane') {
        return `<svg viewBox="0 0 64 64" width="80" height="80" style="${shadow} overflow: visible;">
            <g transform="rotate(0 32 32)">
                <path fill="#9c27b0" d="M32 2 L38 22 L62 32 L38 38 L32 62 L26 38 L2 32 L26 22 Z" />
                <path fill="#7b1fa2" d="M32 2 L32 62 L26 38 L26 22 Z" opacity="0.5"/>
                <circle cx="32" cy="32" r="5" fill="white" opacity="0.8"/>
            </g>
        </svg>`;
    }

    switch (type) {
        case 'car-blue':
            // Blue SUV
            return `<svg viewBox="0 0 64 64" width="60" height="60" style="${shadow}">
                <path fill="#1565c0" d="M12 40 L16 16 L48 16 L52 40 Z" /> <!-- Roof/Windshield -->
                <path fill="#0d47a1" d="M12 40 L52 40 L52 56 L12 56 Z" /> <!-- Back -->
                <rect x="14" y="44" width="10" height="6" fill="#ff5252" /> <!-- Left Light -->
                <rect x="40" y="44" width="10" height="6" fill="#ff5252" /> <!-- Right Light -->
                <rect x="20" y="20" width="24" height="12" fill="#81d4fa" opacity="0.6" /> <!-- Rear Window -->
            </svg>`;
        case 'bus':
            // Yellow Bus
            return `<svg viewBox="0 0 64 64" width="70" height="70" style="${shadow}">
                <rect x="14" y="10" width="36" height="40" fill="#fbc02d" rx="2" /> <!-- Top -->
                <rect x="14" y="50" width="36" height="12" fill="#f9a825" /> <!-- Back -->
                <rect x="16" y="52" width="8" height="6" fill="#d32f2f" />
                <rect x="40" y="52" width="8" height="6" fill="#d32f2f" />
                <rect x="18" y="14" width="28" height="26" fill="#4fc3f7" opacity="0.6" /> <!-- Window -->
            </svg>`;
        case 'plane':
            // White Plane
            return `<svg viewBox="0 0 64 64" width="80" height="80" style="${shadow}">
                <path fill="#eeeeee" d="M32 4 L40 24 L62 36 L40 42 L32 60 L24 42 L2 36 L24 24 Z" />
                <path fill="#bdbdbd" d="M32 4 L32 60 L24 42 L24 24 Z" opacity="0.5"/>
            </svg>`;
        case 'car-red':
        default:
            // Red Sports Car (Default)
            return `<svg viewBox="0 0 64 64" width="60" height="60" style="${shadow}">
                <path fill="#d32f2f" d="M16 36 L20 16 L44 16 L48 36 Z" /> <!-- Roof -->
                <path fill="#b71c1c" d="M12 36 L52 36 L50 52 L14 52 Z" /> <!-- Back Body -->
                <rect x="14" y="40" width="10" height="5" fill="#ffeb3b" /> <!-- Light -->
                <rect x="40" y="40" width="10" height="5" fill="#ffeb3b" /> <!-- Light -->
                <rect x="20" y="20" width="24" height="10" fill="#212121" opacity="0.8" /> <!-- Window -->
            </svg>`;
    }
};

const MapComponent = ({ locations, isPlaying, onAnimationEnd, speed, vehicle }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const marker = useRef(null);
    const animationRef = useRef(null);

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
                        tiles: [
                            'https://mt0.google.com/vt/lyrs=m&hl=ko&x={x}&y={y}&z={z}'
                        ],
                        tileSize: 256,
                        attribution: 'Google Maps'
                    }
                },
                layers: [
                    {
                        id: 'google-tiles-layer',
                        type: 'raster',
                        source: 'google-tiles',
                        minzoom: 0,
                        maxzoom: 22
                    }
                ]
            },
            center: [127.5, 36.5],
            zoom: 6,
            pitch: 0,
            bearing: 0
        });

        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

        // Initial Marker
        const el = document.createElement('div');
        el.className = 'traveler-marker';
        el.innerHTML = `<div id="traveler-icon-wrapper" style="transition: transform 0.1s linear;"></div>`;
        
        marker.current = new maplibregl.Marker({ element: el })
            .setLngLat([127.5, 36.5])
            .addTo(map.current);
            
        marker.current.getElement().style.opacity = '0';

    }, []);

    // Draw Route Logic
    useEffect(() => {
        if (!map.current) return;
        const mapInstance = map.current;

        const draw = () => {
            if (locations.length > 0) {
                 marker.current.setLngLat([locations[0].lng, locations[0].lat]);
                 marker.current.getElement().style.opacity = '1';
                 // Show initial icon
                 const iconWrapper = document.getElementById('traveler-icon-wrapper');
                 if (iconWrapper) {
                     // Check if first leg is flight
                     let isFlying = false;
                     if (locations.length > 1) {
                         const dist = calculateDistance(locations[0].lat, locations[0].lng, locations[1].lat, locations[1].lng);
                         isFlying = dist > 400;
                     }
                     iconWrapper.innerHTML = getVehicleSVG(vehicle, isFlying);
                 }
            }

            if (mapInstance.getSource('route')) {
                if (mapInstance.getLayer('route-layer')) mapInstance.removeLayer('route-layer');
                mapInstance.removeSource('route');
            }

            if (locations.length > 1) {
                const coordinates = locations.map(l => [l.lng, l.lat]);
                
                mapInstance.addSource('route', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'LineString',
                            coordinates: coordinates
                        }
                    }
                });

                mapInstance.addLayer({
                    id: 'route-layer',
                    type: 'line',
                    source: 'route',
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    paint: {
                        'line-color': '#ff0055', // More visible pink/red color like Travel Boast
                        'line-width': 8,
                        'line-opacity': 0.9
                    }
                });
                
                if (!isPlaying) {
                    const bounds = new maplibregl.LngLatBounds();
                    coordinates.forEach(coord => bounds.extend(coord));
                    mapInstance.fitBounds(bounds, { padding: 100, pitch: 0, bearing: 0 });
                }
            }
        };

        if (mapInstance.loaded()) {
            draw();
        } else {
            mapInstance.once('load', draw);
        }
    }, [locations, isPlaying, vehicle]);

    // Animation Logic
    useEffect(() => {
        if (!isPlaying || locations.length < 2 || !map.current) return;

        const mapInstance = map.current;
        let startTime = null;
        let currentSegment = 0;
        
        const startLoc = locations[0];
        mapInstance.jumpTo({
            center: [startLoc.lng, startLoc.lat],
            zoom: 13,
            pitch: 60,
            bearing: calculateBearing(startLoc.lat, startLoc.lng, locations[1].lat, locations[1].lng)
        });

        const iconWrapper = document.getElementById('traveler-icon-wrapper');

        const updateIcon = (flying) => {
             if (iconWrapper) {
                 iconWrapper.innerHTML = getVehicleSVG(vehicle, flying);
             }
        };

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            
            // Adjusted speed: Base 5000ms (slower) / speed factor
            // speed 0.1 => 50000ms (50s) per segment (very slow)
            // speed 1.0 => 5000ms (5s) per segment
            // speed 3.0 => 1666ms (1.6s) per segment
            const segmentDuration = 5000 / speed;

            if (elapsed < segmentDuration) {
                const progress = elapsed / segmentDuration;
                const start = locations[currentSegment];
                const end = locations[currentSegment + 1];

                const lat = start.lat + (end.lat - start.lat) * progress;
                const lng = start.lng + (end.lng - start.lng) * progress;
                
                marker.current.setLngLat([lng, lat]);
                
                const bearing = calculateBearing(start.lat, start.lng, end.lat, end.lng);
                
                if (iconWrapper) {
                    const vibe = Math.sin(timestamp / 50) * 1.5; // Stronger vibe
                    iconWrapper.style.transform = `translateY(${vibe}px)`; 
                }

                mapInstance.jumpTo({
                    center: [lng, lat],
                    bearing: bearing, 
                    pitch: 60,
                    zoom: 13 // Constant close zoom
                });

                animationRef.current = requestAnimationFrame(animate);
            } else {
                currentSegment++;
                if (currentSegment < locations.length - 1) {
                    startTime = null; 
                    
                    const nextStart = locations[currentSegment];
                    const nextEnd = locations[currentSegment + 1];
                    const dist = calculateDistance(nextStart.lat, nextStart.lng, nextEnd.lat, nextEnd.lng);
                    updateIcon(dist > 400);

                    animationRef.current = requestAnimationFrame(animate);
                } else {
                    onAnimationEnd();
                    // Zoom out to see full path
                    const coordinates = locations.map(l => [l.lng, l.lat]);
                    const bounds = new maplibregl.LngLatBounds();
                    coordinates.forEach(coord => bounds.extend(coord));
                    mapInstance.fitBounds(bounds, { padding: 50, pitch: 0, bearing: 0 });
                }
            }
        };
        
        const firstDist = calculateDistance(locations[0].lat, locations[0].lng, locations[1].lat, locations[1].lng);
        updateIcon(firstDist > 400);

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isPlaying, locations, speed, onAnimationEnd, vehicle]);

    return (
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    );
};

export default MapComponent;