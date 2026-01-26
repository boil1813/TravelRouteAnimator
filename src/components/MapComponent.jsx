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

// Custom hook component to handle animation logic
function MapAnimator({ locations, isPlaying, onAnimationEnd }) {
    const map = useMap();
    const markerRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        if (!isPlaying || locations.length < 2) return;

        let startTime = null;
        const segmentDuration = 2000; // 2 seconds per leg

        let currentSegment = 0;
        
        // Start from first location
        const startLoc = locations[0];
        
        // Initial setup
        if (markerRef.current) {
            markerRef.current.setLatLng([startLoc.lat, startLoc.lng]);
            markerRef.current.setOpacity(1);
        }
        
        // Zoom to start
        map.setView([startLoc.lat, startLoc.lng], 6, { animate: true });

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;

            if (elapsed < segmentDuration) {
                // Interpolate
                const progress = elapsed / segmentDuration;
                // Easing function for smoother start/stop per segment could be added here
                
                const start = locations[currentSegment];
                const end = locations[currentSegment + 1];

                const lat = start.lat + (end.lat - start.lat) * progress;
                const lng = start.lng + (end.lng - start.lng) * progress;

                if (markerRef.current) {
                    markerRef.current.setLatLng([lat, lng]);
                    
                    // Rotate icon based on bearing (simplified)
                    // In a real app, calculate bearing between start and end
                }
                
                // Follow the marker
                map.panTo([lat, lng], { animate: false }); 

                animationRef.current = requestAnimationFrame(animate);
            } else {
                // End of segment
                currentSegment++;
                if (currentSegment < locations.length - 1) {
                    // Next segment
                    startTime = null; // Reset time for next segment
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

        // Little delay before starting animation to let map zoom happen
        const timer = setTimeout(() => {
            animationRef.current = requestAnimationFrame(animate);
        }, 1000);

        return () => {
            clearTimeout(timer);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isPlaying, locations, map, onAnimationEnd]);

    // The moving object (a red circle marker for now to represent 'traveler')
    const travelerIcon = L.divIcon({
        className: 'custom-traveler-icon',
        html: `<div style="background-color: #ff0000; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
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

const MapComponent = ({ locations, isPlaying, onAnimationEnd }) => {
    // Default center (Europe/Africa view)
    const defaultCenter = [20, 0];
    const center = locations.length > 0 ? [locations[locations.length-1].lat, locations[locations.length-1].lng] : defaultCenter;

    return (
        <MapContainer center={center} zoom={2} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                attribution='&copy; Google Maps'
                url="https://mt0.google.com/vt/lyrs=m&hl=ko&x={x}&y={y}&z={z}"
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
            />
        </MapContainer>
    );
};

export default MapComponent;
