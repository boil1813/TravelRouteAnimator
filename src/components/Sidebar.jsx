import React, { useState } from 'react';
import { Button, Form, ListGroup, Spinner } from 'react-bootstrap';

const Sidebar = ({ locations, addLocation, removeLocation, onPlay, isPlaying }) => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const place = data[0];
                addLocation({
                    name: place.display_name.split(',')[0],
                    fullName: place.display_name,
                    lat: parseFloat(place.lat),
                    lng: parseFloat(place.lon)
                });
                setQuery('');
            } else {
                setError('Place not found');
            }
        } catch (err) {
            setError('Error fetching data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex flex-column bg-light border-end p-3 shadow-sm" style={{ width: '350px', height: '100%', minWidth: '300px', zIndex: 1000 }}>
            <h4 className="mb-4 text-primary fw-bold">✈️ Route Animator</h4>
            
            <Form onSubmit={handleSearch} className="mb-3">
                <Form.Group className="mb-2">
                    <Form.Control 
                        type="text" 
                        placeholder="Enter city (e.g., Paris, Tokyo)..." 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={isPlaying}
                    />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100" disabled={loading || isPlaying}>
                    {loading ? <Spinner size="sm" animation="border" /> : 'Add Destination'}
                </Button>
                {error && <div className="text-danger mt-1 small">{error}</div>}
            </Form>

            <div className="d-flex justify-content-between align-items-center mb-2">
                <small className="text-muted">Itinerary ({locations.length})</small>
            </div>

            <div className="flex-grow-1 overflow-auto mb-3 border rounded bg-white">
                <ListGroup variant="flush">
                    {locations.map((loc, index) => (
                        <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                            <div className="text-truncate me-2" title={loc.fullName}>
                                <span className="badge bg-secondary me-2 rounded-pill">{index + 1}</span>
                                {loc.name}
                            </div>
                            <Button variant="outline-danger" size="sm" onClick={() => removeLocation(index)} disabled={isPlaying} style={{ lineHeight: 1, padding: '0.25rem 0.5rem' }}>
                                ×
                            </Button>
                        </ListGroup.Item>
                    ))}
                    {locations.length === 0 && (
                        <div className="p-4 text-center text-muted">
                            Start by adding a location above!
                        </div>
                    )}
                </ListGroup>
            </div>

            <div className="d-grid gap-2">
                <Button 
                    variant={isPlaying ? "secondary" : "success"} 
                    size="lg"
                    onClick={onPlay}
                    disabled={locations.length < 2 || isPlaying}
                >
                    {isPlaying ? (
                        <>
                            <Spinner as="span" animation="grow" size="sm" role="status" aria-hidden="true" className="me-2"/>
                            Playing...
                        </>
                    ) : '▶ Play Animation'}
                </Button>
            </div>
            {locations.length < 2 && (
                <div className="text-center mt-2 small text-muted">Add at least 2 locations</div>
            )}
        </div>
    );
};

export default Sidebar;
