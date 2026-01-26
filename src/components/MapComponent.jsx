import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Haversine formula to calculate distance (km)
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

// Custom hook component to handle animation logic
function MapAnimator({ locations, isPlaying, onAnimationEnd, speed }) {
    const map = useMap();
    const markerRef = useRef(null);
    const animationRef = useRef(null);
    const [isFlying, setIsFlying] = useState(false);

    useEffect(() => {
        if (!isPlaying || locations.length < 2) return;

        let startTime = null;
        let currentSegment = 0;
        
        // Start from first location
        const startLoc = locations[0];
        
        if (markerRef.current) {
            markerRef.current.setLatLng([startLoc.lat, startLoc.lng]);
            markerRef.current.setOpacity(1);
        }
        
        map.setView([startLoc.lat, startLoc.lng], 6, { animate: true });

        // Determine initial mode
        const firstDist = calculateDistance(locations[0].lat, locations[0].lng, locations[1].lat, locations[1].lng);
        setIsFlying(firstDist > 400);

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            
            // Adjust duration by speed
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
                // End of segment
                currentSegment++;
                if (currentSegment < locations.length - 1) {
                    // Next segment
                    startTime = null; 
                    
                    // Check next segment distance
                    const nextStart = locations[currentSegment];
                    const nextEnd = locations[currentSegment + 1];
                    const dist = calculateDistance(nextStart.lat, nextStart.lng, nextEnd.lat, nextEnd.lng);
                    setIsFlying(dist > 400);

                    animationRef.current = requestAnimationFrame(animate);
                } else {
                    // Animation finished
                    if (markerRef.current) {
                        const last = locations[locations.length - 1];
                        markerRef.current.setLatLng([last.lat, last.lng]);
                    }
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
        html: `<div class="car-icon" style="font-size: 30px;">${isFlying ? '✈️' : '🚗'}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
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
    // Default center (South Korea)
    const defaultCenter = [36.5, 127.5]; 
    const center = locations.length > 0 ? [locations[locations.length-1].lat, locations[locations.length-1].lng] : defaultCenter;
    // Default zoom adjusted for Korea
    const defaultZoom = locations.length > 0 ? 2 : 7;

    return (
        <MapContainer center={center} zoom={defaultZoom} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Markers for all locations */}
            {locations.map((loc, idx) => (
                <Marker key={idx} position={[loc.lat, loc.lng]}>
                    <Popup>{loc.name}</Popup>
                </Marker>
            ))}

            {/* Polyline connecting them */}
            {locations.length > 1 && (
                <Polyline 
                    positions={locations.map(l => [l.lat, l.lng])} 
                    pathOptions={{ color: 'blue', dashArray: '10, 10', weight: 3, opacity: 0.6 }}
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
