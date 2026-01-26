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
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=ko`);
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
            <h4 className="mb-4 text-primary fw-bold">✈️ 여행 경로 애니메이터</h4>
            
            <Form onSubmit={handleSearch} className="mb-3">
                <Form.Group className="mb-2">
                    <Form.Control 
                        type="text" 
                        placeholder="도시 이름 입력 (예: 파리, 도쿄)..." 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={isPlaying}
                    />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100" disabled={loading || isPlaying}>
                    {loading ? <Spinner size="sm" animation="border" /> : '여행지 추가'}
                </Button>
                {error && <div className="text-danger mt-1 small">{error}</div>}
            </Form>

            <div className="d-flex justify-content-between align-items-center mb-2">
                <small className="text-muted">여행 경로 ({locations.length})</small>
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
                            위 검색창에서 여행지를 추가해보세요!
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
                            재생 중...
                        </>
                    ) : '▶ 경로 애니메이션 재생'}
                </Button>
            </div>
            {locations.length < 2 && (
                <div className="text-center mt-2 small text-muted">최소 2개 이상의 장소를 추가해주세요.</div>
            )}
        </div>
    );
};

export default Sidebar;
