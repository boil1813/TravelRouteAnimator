import React, { useState } from 'react';
import { Button, Form, ListGroup, Spinner } from 'react-bootstrap';

const getPreviewSVG = (type) => {
    switch (type) {
        case 'car-blue':
            return (
                <svg viewBox="0 0 64 64" width="80" height="80">
                    <g transform="translate(0, -4)">
                        <circle cx="18" cy="48" r="7" fill="#333" />
                        <circle cx="46" cy="48" r="7" fill="#333" />
                        <circle cx="18" cy="48" r="3" fill="#ddd" />
                        <circle cx="46" cy="48" r="3" fill="#ddd" />
                        <path d="M10 48 L10 36 Q10 20 32 20 Q54 20 54 36 L54 48 Z" fill="#42a5f5" />
                        <rect x="8" y="38" width="48" height="12" rx="4" fill="#1e88e5" />
                        <path d="M16 36 L16 30 Q16 24 32 24 Q48 24 48 30 L48 36 Z" fill="#e3f2fd" />
                        <circle cx="10" cy="40" r="2.5" fill="#ffeb3b" />
                        <circle cx="54" cy="40" r="2.5" fill="#ffeb3b" />
                    </g>
                </svg>
            );
        case 'bus':
            return (
                <svg viewBox="0 0 64 64" width="90" height="90">
                    <g transform="translate(0, -4)">
                        <circle cx="16" cy="50" r="6" fill="#333" />
                        <circle cx="48" cy="50" r="6" fill="#333" />
                        <circle cx="16" cy="50" r="2.5" fill="#999" />
                        <circle cx="48" cy="50" r="2.5" fill="#999" />
                        <rect x="8" y="14" width="48" height="38" rx="8" fill="#fbc02d" />
                        <rect x="8" y="34" width="48" height="18" rx="4" fill="#f9a825" />
                        <rect x="6" y="30" width="52" height="4" fill="#d32f2f" rx="1" />
                        <rect x="12" y="18" width="10" height="10" rx="2" fill="#e1f5fe" />
                        <rect x="24" y="18" width="10" height="10" rx="2" fill="#e1f5fe" />
                        <rect x="36" y="18" width="10" height="10" rx="2" fill="#e1f5fe" />
                        <circle cx="10" cy="44" r="2" fill="#fff" />
                        <circle cx="54" cy="44" r="2" fill="#fff" />
                    </g>
                </svg>
            );
        case 'plane':
            return (
                <svg viewBox="0 0 64 64" width="100" height="100">
                    <g transform="rotate(-45 32 32)">
                        <path d="M32 24 L56 36 L32 44 L8 36 Z" fill="#90caf9" />
                        <path d="M32 52 L42 60 L22 60 Z" fill="#64b5f6" />
                        <ellipse cx="32" cy="32" rx="14" ry="24" fill="#eeeeee" />
                        <ellipse cx="32" cy="18" rx="8" ry="5" fill="#4fc3f7" />
                        <circle cx="32" cy="10" r="2" fill="#ef5350" />
                    </g>
                </svg>
            );
        case 'car-red':
        default:
            return (
                <svg viewBox="0 0 64 64" width="80" height="80">
                    <g transform="translate(0, -4)">
                        <circle cx="18" cy="48" r="7" fill="#333" />
                        <circle cx="46" cy="48" r="7" fill="#333" />
                        <circle cx="18" cy="48" r="3" fill="#ddd" />
                        <circle cx="46" cy="48" r="3" fill="#ddd" />
                        <path d="M10 48 L10 36 Q10 22 32 22 Q54 22 54 36 L54 48 Z" fill="#ef5350" />
                        <rect x="8" y="38" width="48" height="12" rx="4" fill="#c62828" />
                        <path d="M16 36 L16 32 Q16 26 32 26 Q48 26 48 32 L48 36 Z" fill="#ffebee" />
                        <circle cx="10" cy="40" r="2.5" fill="#fff59d" />
                        <circle cx="54" cy="40" r="2.5" fill="#fff59d" />
                    </g>
                </svg>
            );
    }
};

const Sidebar = ({ locations, addLocation, removeLocation, onPlay, onPause, onResume, onStop, isPlaying, isPaused, speed, setSpeed, vehicle, setVehicle, version }) => {
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
        <div className="d-flex flex-column bg-white p-4 shadow rounded" style={{ width: '100%', maxWidth: '500px', margin: '0 auto', height: 'auto', minHeight: '80vh' }}>
            <h3 className="mb-4 text-primary fw-bold d-flex align-items-center justify-content-between">
                <span>✈️ 여행 경로 설정</span>
                <span className="badge bg-secondary rounded-pill fs-6 fw-normal" style={{ fontSize: '0.5em' }}>v{version}</span>
            </h3>
            
            <Form onSubmit={handleSearch} className="mb-3">
                <Form.Group className="mb-2">
                    <Form.Control 
                        type="text" 
                        placeholder="도시 이름 입력 (예: 파리, 도쿄)..." 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                    {loading ? <Spinner size="sm" animation="border" /> : '여행지 추가'}
                </Button>
                {error && <div className="text-danger mt-1 small">{error}</div>}
            </Form>

            <div className="mb-2">
                {/* [AdSense Area - Top] */}
                <div className="bg-light border rounded d-flex align-items-center justify-content-center text-muted small" 
                     style={{ height: '60px', fontSize: '0.7rem' }}>
                    Sponsored (Top)
                </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-2">
                <small className="text-muted">여행 경로 ({locations.length})</small>
            </div>

            <div className="flex-grow-1 overflow-auto mb-3 border rounded bg-light" style={{ minHeight: '200px' }}>
                <ListGroup variant="flush">
                    {locations.map((loc, index) => (
                        <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center bg-transparent">
                            <div className="text-truncate me-2" title={loc.fullName}>
                                <span className="badge bg-secondary me-2 rounded-pill">{index + 1}</span>
                                {loc.name}
                            </div>
                            <Button variant="outline-danger" size="sm" onClick={() => removeLocation(index)} style={{ lineHeight: 1, padding: '0.25rem 0.5rem' }}>
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

            <div className="mb-4 px-1">
                <Form.Label className="small text-muted mb-1">이동 수단</Form.Label>
                <div className="d-flex gap-2 align-items-center mb-3">
                    <Form.Select 
                        value={vehicle} 
                        onChange={(e) => setVehicle(e.target.value)} 
                        size="sm"
                        className="flex-grow-1"
                    >
                        <option value="car-red">🚗 스포츠카 (빨강)</option>
                        <option value="car-blue">🚙 SUV (파랑)</option>
                        <option value="bus">🚌 투어 버스</option>
                        <option value="plane">✈️ 비행기 (전용)</option>
                    </Form.Select>
                    <div className="bg-light border rounded d-flex align-items-center justify-content-center p-1" style={{ width: '60px', height: '60px' }}>
                        {getPreviewSVG(vehicle)}
                    </div>
                </div>

                <Form.Label className="small text-muted d-flex justify-content-between mb-1">
                    <span>이동 속도</span>
                    <span className="fw-bold">{speed}x</span>
                </Form.Label>
                <Form.Range 
                    min={0.1} 
                    max={3.0} 
                    step={0.1} 
                    value={speed} 
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                />
            </div>

            <div className="d-grid gap-2 mb-3">
                <Button 
                    variant="success" 
                    size="lg"
                    onClick={onPlay}
                    disabled={locations.length < 2}
                    className="fw-bold py-3"
                >
                    ▶ 여행 시작하기
                </Button>
            </div>
            {locations.length < 2 && (
                <div className="text-center mb-3 small text-muted">최소 2개 이상의 장소를 추가해주세요.</div>
            )}
            
            <div className="mt-auto pt-3 border-top">
                <small className="text-muted d-block text-center mb-1" style={{ fontSize: '0.75rem' }}>Sponsored</small>
                {/* 
                    [Google AdSense Area] 
                    Paste your AdSense script code here.
                    For example: <ins className="adsbygoogle" ...></ins>
                */}
                <div className="bg-light border rounded d-flex align-items-center justify-content-center text-muted small" 
                     style={{ height: '90px' }}>
                    Google AdSense Area
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
