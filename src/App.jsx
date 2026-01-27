import { useState } from 'react'
import { Button, ListGroup } from 'react-bootstrap'
import MapComponent from './components/MapComponent'
import Sidebar from './components/Sidebar'
import pkg from '../package.json'

function App() {
  const [locations, setLocations] = useState([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speed, setSpeed] = useState(1) // 0.1x to 3x
  const [vehicle, setVehicle] = useState('car-red') 

  const addLocation = (location) => {
    // location: { name: string, lat: number, lng: number }
    setLocations([...locations, location])
  }

  const removeLocation = (index) => {
    const newLocations = locations.filter((_, i) => i !== index)
    setLocations(newLocations)
  }

  const handlePlay = () => {
    setIsPlaying(true)
    setIsPaused(false)
  }

  const handlePause = () => {
    setIsPaused(true)
  }

  const handleResume = () => {
    setIsPaused(false)
  }

  const handleStop = () => {
    setIsPlaying(false)
    setIsPaused(false)
  }

  return (
    <div className="h-100 w-100 bg-light position-relative">
      
      {/* Setup Screen - Overlay when NOT playing */}
      {!isPlaying && (
        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-light" style={{ zIndex: 1050 }}>
           <Sidebar 
             locations={locations} 
             addLocation={addLocation} 
             removeLocation={removeLocation} 
             onPlay={handlePlay}
             onPause={handlePause}
             onResume={handleResume}
             onStop={handleStop}
             isPlaying={isPlaying}
             isPaused={isPaused}
             speed={speed}
             setSpeed={setSpeed}
             vehicle={vehicle}
             setVehicle={setVehicle}
             version={pkg.version}
           />
        </div>
      )}

      {/* Map Screen - Always mounted but z-index handled or hidden */}
      <div className={`container h-100 py-3 py-md-5 d-flex align-items-center justify-content-center ${!isPlaying ? 'd-none' : ''}`}>
          <div className="row w-100 shadow-lg bg-white rounded overflow-hidden" style={{ height: '85vh', minHeight: '500px' }}>
            {/* Map Area */}
            <div className="col-lg-8 col-md-7 p-0 position-relative bg-dark h-100">
              <MapComponent 
                  locations={locations} 
                  isPlaying={isPlaying} 
                  isPaused={isPaused}
                  onAnimationEnd={handleStop}
                  speed={speed}
                  vehicle={vehicle}
              />
              
              {/* Floating Controls */}
              <div className="position-absolute top-0 end-0 p-3" style={{ zIndex: 2000 }}>
                  <Button 
                    variant="light" 
                    className="shadow-lg rounded-circle p-0 d-flex align-items-center justify-content-center" 
                    style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}
                    onClick={handleStop} 
                    title="종료하고 돌아가기"
                  >
                      ✕
                  </Button>
              </div>
              
              <div className="position-absolute bottom-0 start-50 translate-middle-x pb-4" style={{ zIndex: 2000, width: '90%', maxWidth: '350px' }}>
                  <div className="bg-white p-2 rounded-pill shadow-lg d-flex gap-2 align-items-center justify-content-center border opacity-75 hover-opacity-100" style={{ transition: 'opacity 0.2s' }}>
                      {isPaused ? (
                         <Button variant="primary" size="sm" className="rounded-pill px-3 w-50" onClick={handleResume}>
                            ▶ 재개
                         </Button>
                      ) : (
                         <Button variant="warning" size="sm" className="text-white rounded-pill px-3 w-50" onClick={handlePause}>
                            ⏸ 일시정지
                         </Button>
                      )}
                      <div className="d-flex flex-column align-items-center border-start ps-2">
                          <span className="text-muted" style={{ fontSize: '0.6rem' }}>SPEED</span>
                          <span className="fw-bold text-primary small">{speed}x</span>
                      </div>
                  </div>
              </div>
            </div>

            {/* Side Panel (Routes & Ads) */}
            <div className="col-lg-4 col-md-5 bg-light p-3 d-flex flex-column border-start h-100 overflow-hidden">
                <h5 className="mb-3 text-primary fw-bold d-flex align-items-center gap-2">
                    <span>🗺️ 현재 여행 경로</span>
                </h5>

                <div className="flex-grow-1 overflow-auto mb-3 border rounded bg-white">
                    <ListGroup variant="flush">
                        {locations.map((loc, index) => (
                            <ListGroup.Item key={index} className="d-flex align-items-center py-2">
                                <span className="badge bg-secondary me-2 rounded-pill">{index + 1}</span>
                                <div className="text-truncate small fw-bold" title={loc.fullName}>{loc.name}</div>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </div>

                <div className="mt-auto pt-3 border-top">
                    <small className="text-muted d-block text-center mb-1" style={{ fontSize: '0.7rem' }}>Sponsored</small>
                    {/* [AdSense Area - Side Banner] */}
                    <div className="bg-white border rounded d-flex align-items-center justify-content-center text-muted small" 
                         style={{ height: '200px', backgroundColor: '#f8f9fa' }}>
                        Google AdSense<br/>(Side Banner)
                    </div>
                </div>
            </div>
          </div>
        </div>
    </div>
  )
}

export default App
