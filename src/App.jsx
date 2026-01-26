import { useState } from 'react'
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
    <div className="d-flex h-100 w-100">
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
      <div className="flex-grow-1 position-relative" style={{ height: '100%' }}>
        <MapComponent 
            locations={locations} 
            isPlaying={isPlaying} 
            isPaused={isPaused}
            onAnimationEnd={handleStop}
            speed={speed}
            vehicle={vehicle}
        />
      </div>
    </div>
  )
}

export default App
