import { useState } from 'react'
import MapComponent from './components/MapComponent'
import Sidebar from './components/Sidebar'

function App() {
  const [locations, setLocations] = useState([])
  const [isPlaying, setIsPlaying] = useState(false)

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
  }

  const handleStop = () => {
    setIsPlaying(false)
  }

  return (
    <div className="d-flex h-100 w-100">
      <Sidebar 
        locations={locations} 
        addLocation={addLocation} 
        removeLocation={removeLocation} 
        onPlay={handlePlay}
        isPlaying={isPlaying}
      />
      <div className="flex-grow-1 position-relative" style={{ height: '100%' }}>
        <MapComponent 
            locations={locations} 
            isPlaying={isPlaying} 
            onAnimationEnd={handleStop}
        />
      </div>
    </div>
  )
}

export default App
