import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Haversine formula for distance
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

// Function to calculate bearing between two points
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

function MapAnimator({ locations, isPlaying, onAnimationEnd, speed }) {
    const map = useMap();
    const markerRef = useRef(null);
    const animationRef = useRef(null);
    const [isFlying, setIsFlying] = useState(false);
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        if (!isPlaying || locations.length < 2) return;

        let startTime = null;
        let currentSegment = 0;
        
        const startLoc = locations[0];
        if (markerRef.current) {
            markerRef.current.setLatLng([startLoc.lat, startLoc.lng]);
            markerRef.current.setOpacity(1);
        }
        
        map.setView([startLoc.lat, startLoc.lng], 6, { animate: true });

        const updateMode = (seg) => {
            const start = locations[seg];
            const end = locations[seg + 1];
            const dist = calculateDistance(start.lat, start.lng, end.lat, end.lng);
            setIsFlying(dist > 400);
            setRotation(calculateBearing(start.lat, start.lng, end.lat, end.lng));
        };

        updateMode(0);

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

                if (markerRef.current) {
                    markerRef.current.setLatLng([lat, lng]);
                }
                map.panTo([lat, lng], { animate: false }); 
                animationRef.current = requestAnimationFrame(animate);
            } else {
                currentSegment++;
                if (currentSegment < locations.length - 1) {
                    startTime = null; 
                    updateMode(currentSegment);
                    animationRef.current = requestAnimationFrame(animate);
                } else {
                    onAnimationEnd();
                }
            }
        };

        const timer = setTimeout(() => {
            animationRef.current = requestAnimationFrame(animate);
        }, 1000);

        return () => {
            clearTimeout(timer);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isPlaying, locations, map, onAnimationEnd, speed]);

    const travelerIcon = L.divIcon({
        className: 'custom-traveler-icon',
        html: `<div class="traveler-wrapper" style="transform: rotate(${isFlying ? rotation - 45 : rotation + 90}deg);">
                <div class="car-icon">${isFlying ? '✈️' : '🚗'}</div>
               </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    return isPlaying ? (
        <Marker 
            position={[locations[0].lat, locations[0].lng]} 
            ref={markerRef}
            icon={travelerIcon}
            zIndexOffset={1000}
        /> 
    ) : null;
}

const MapComponent = ({ locations, isPlaying, onAnimationEnd, speed }) => {
    const defaultCenter = [36.5, 127.5]; 
    const center = locations.length > 0 ? [locations[locations.length-1].lat, locations[locations.length-1].lng] : defaultCenter;
    const defaultZoom = locations.length > 0 ? 4 : 7;

    return (
        <MapContainer center={center} zoom={defaultZoom} style={{ height: '100%', width: '100%' }}>
            {/* Google Maps 한글 타일 - HTTPS 적용 */}
            <TileLayer
                attribution='&copy; Google Maps'
                url="https://mt0.google.com/vt/lyrs=m&hl=ko&x={x}&y={y}&z={z}"
            />
            
            {locations.map((loc, idx) => (
                <Marker key={idx} position={[loc.lat, loc.lng]}>
                </Marker>
            ))}

            {locations.length > 1 && (
                <Polyline 
                    positions={locations.map(l => [l.lat, l.lng])} 
                    pathOptions={{ 
                        color: '#3388ff', 
                        dashArray: isPlaying ? '1, 0' : '10, 10', 
                        weight: 5, 
                        opacity: 0.8,
                        lineJoin: 'round'
                    }} 
                />
            )}

            <MapAnimator 
                locations={locations} 
                isPlaying={isPlaying} 
                onAnimationEnd={onAnimationEnd}
                speed={speed}
            />
        </MapContainer>
    );
};

export default MapComponent;