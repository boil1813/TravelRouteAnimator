import { useState } from 'react'
import { Button } from 'react-bootstrap'
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
    <div className="h-100 w-100 bg-light">
      {!isPlaying ? (
        <div className="container h-100 d-flex flex-column align-items-center justify-content-center py-4">
           {/* Setup Screen */}
           <Sidebar 
             locations={locations} 
             addLocation={addLocation} 
             removeLocation={removeLocation} 
             onPlay={handlePlay}
             // These props are no longer used by Sidebar for display, but kept for interface consistency if needed, 
             // though Sidebar ignores them now.
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
      ) : (
        <div className="position-relative h-100 w-100 bg-dark">
          {/* Map Screen */}
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
                style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}
                onClick={handleStop} 
                title="종료하고 돌아가기"
              >
                  ✕
              </Button>
          </div>
          
          <div className="position-absolute bottom-0 start-50 translate-middle-x pb-5" style={{ zIndex: 2000, width: '90%', maxWidth: '400px' }}>
              <div className="bg-white p-3 rounded-pill shadow-lg d-flex gap-3 align-items-center justify-content-center border">
                  {isPaused ? (
                     <Button variant="primary" size="lg" className="rounded-pill px-4 w-50" onClick={handleResume}>
                        ▶ 재개
                     </Button>
                  ) : (
                     <Button variant="warning" size="lg" className="text-white rounded-pill px-4 w-50" onClick={handlePause}>
                        ⏸ 일시정지
                     </Button>
                  )}
                  <div className="d-flex flex-column align-items-center border-start ps-3">
                      <span className="text-muted small" style={{ fontSize: '0.7rem' }}>SPEED</span>
                      <span className="fw-bold text-primary">{speed}x</span>
                  </div>
              </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
