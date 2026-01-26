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

const MapComponent = ({ locations, isPlaying, onAnimationEnd, speed }) => {
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

        // Initial Marker (Hidden initially or default pos)
        const el = document.createElement('div');
        el.className = 'traveler-marker';
        // Wrapper for rotation
        el.innerHTML = `<div id="traveler-icon-wrapper" style="transition: transform 0.1s linear;"></div>`;
        
        marker.current = new maplibregl.Marker({ element: el })
            .setLngLat([127.5, 36.5])
            .addTo(map.current);
            
        // Hide marker initially until locations exist
        marker.current.getElement().style.opacity = '0';

    }, []);

    // Draw Route Logic
    useEffect(() => {
        if (!map.current) return;
        const mapInstance = map.current;

        const draw = () => {
            // Update Marker visibility
            if (locations.length > 0) {
                 marker.current.setLngLat([locations[0].lng, locations[0].lat]);
                 marker.current.getElement().style.opacity = '1';
            }

            // Remove existing route
            if (mapInstance.getSource('route')) {
                if (mapInstance.getLayer('route-layer')) mapInstance.removeLayer('route-layer');
                mapInstance.removeSource('route');
            }

            // Add Markers for start/stops (Simple HTML markers)
            // Note: For cleaner code, we are just drawing lines now. 
            // Ideally we should manage a list of Markers for each stop.

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
                        'line-color': '#3388ff',
                        'line-width': 8,
                        'line-opacity': 0.8
                    }
                });
                
                // Fit bounds if not playing
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
    }, [locations, isPlaying]);

    // Animation Logic
    useEffect(() => {
        if (!isPlaying || locations.length < 2 || !map.current) return;

        const mapInstance = map.current;
        let startTime = null;
        let currentSegment = 0;
        
        // Setup initial camera
        const startLoc = locations[0];
        mapInstance.jumpTo({
            center: [startLoc.lng, startLoc.lat],
            zoom: 14, // Closer zoom for "Travel Boast" feel
            pitch: 60, // 3D tilt
            bearing: calculateBearing(startLoc.lat, startLoc.lng, locations[1].lat, locations[1].lng)
        });

        const iconWrapper = document.getElementById('traveler-icon-wrapper');

        const updateIcon = (flying) => {
             if (iconWrapper) {
                 iconWrapper.innerHTML = flying 
                    ? `<svg viewBox="0 0 24 24" fill="#9c27b0" stroke="white" stroke-width="2" width="60" height="60" style="filter: drop-shadow(0 5px 10px rgba(0,0,0,0.5));"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`
                    : `<svg viewBox="0 0 24 24" fill="#f44336" stroke="white" stroke-width="2" width="60" height="60" style="filter: drop-shadow(0 5px 5px rgba(0,0,0,0.5));"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/> </svg>`;
             }
        };

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const segmentDuration = 2000 / speed;

            if (elapsed < segmentDuration) {
                const progress = elapsed / segmentDuration;
                const start = locations[currentSegment];
                const end = locations[currentSegment + 1];

                const lat = start.lat + (end.lat - start.lat) * progress;
                const lng = start.lng + (end.lng - start.lng) * progress;
                
                // Update marker
                marker.current.setLngLat([lng, lat]);
                
                const bearing = calculateBearing(start.lat, start.lng, end.lat, end.lng);
                
                // Rotate Icon Wrapper (Local rotation)
                // Note: Marker rotation in GL aligns with screen by default.
                // If we want the car to align with the road ON THE MAP, we set rotationAlignment to 'map'.
                // But here we are rotating the camera too.
                // "Travel Boast" style: Camera follows from behind. So the car stays relatively fixed in screen orientation (pointing up), and the map rotates under it.
                // Let's try that: Bearing sets the camera. Car points UP.
                
                // Option A: Camera follows bearing. Car points UP (fixed).
                if (iconWrapper) {
                    // Slight vibration
                    const vibe = Math.sin(timestamp / 50) * 1;
                    iconWrapper.style.transform = `translateY(${vibe}px)`; 
                    // No rotation needed if camera follows bearing! The car always faces forward (up).
                }

                mapInstance.jumpTo({
                    center: [lng, lat],
                    bearing: bearing, // Camera rotates to match path
                    pitch: 60,
                    zoom: 14 // Can vary zoom based on speed if desired
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
                    // Optional: Zoom out to see result
                }
            }
        };
        
        // Initial setup
        const firstDist = calculateDistance(locations[0].lat, locations[0].lng, locations[1].lat, locations[1].lng);
        updateIcon(firstDist > 400);

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isPlaying, locations, speed, onAnimationEnd]);

    return (
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    );
};

export default MapComponent;
