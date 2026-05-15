import { useState, useEffect } from 'react'
import './index.css'
import Lobby from './components/Lobby'
import PhysicsCanvas from './components/PhysicsCanvas'
import Toolbar from './components/Toolbar'
import MaterialPicker from './components/MaterialPicker'
import AnalyticsPanel from './components/AnalyticsPanel'
import socket from './socket'

function App() {
  const [roomId, setRoomId] = useState(null)
  const [userCount, setUserCount] = useState(1)
  const [activeTool, setActiveTool] = useState('cursor')
  const [material, setMaterial] = useState({
    restitution: 0.6,
    friction: 0.1,
    density: 0.001,
    ropeLength: 120,
    springStiffness: 0.05,
    motorType: 'gear',
    gearTeeth: 12,
    gearRadius: 40,
    isMotorized: true,
    motorSpeed: 0.05,
    motorDirection: 'clockwise'
  })
  const [isPaused, setIsPaused] = useState(false)
  const [selectedConstraintType, setSelectedConstraintType] = useState(null)

  useEffect(() => {
    if (!roomId) return

    socket.connect()
    socket.emit('join-room', roomId)

    const onUserJoined = (data) => setUserCount(data.userCount)
    const onUserLeft = (data) => setUserCount(data.userCount)
    const onRoomUserCount = (data) => setUserCount(data.userCount)

    socket.on('user-joined', onUserJoined)
    socket.on('user-left', onUserLeft)
    socket.on('room-user-count', onRoomUserCount)

    return () => {
      socket.off('user-joined', onUserJoined)
      socket.off('user-left', onUserLeft)
      socket.off('room-user-count', onRoomUserCount)
      socket.disconnect()
    }
  }, [roomId])

  useEffect(() => {
    const handleConstraintSelectionChange = (event) => {
      const detail = event.detail || null
      setSelectedConstraintType(detail?.type || null)

      if (typeof detail?.length === 'number') {
        setMaterial((prev) => ({ ...prev, ropeLength: detail.length }))
      }
    }

    window.addEventListener('constraint-selection-change', handleConstraintSelectionChange)
    return () => window.removeEventListener('constraint-selection-change', handleConstraintSelectionChange)
  }, [])

  useEffect(() => {
    const handleBodySelectionChange = (event) => {
      const detail = event.detail || null
      if (!detail) return

      setMaterial((prev) => ({
        ...prev,
        restitution: typeof detail.restitution === 'number' ? detail.restitution : prev.restitution,
        friction: typeof detail.friction === 'number' ? detail.friction : prev.friction,
        density: typeof detail.density === 'number' ? detail.density : prev.density,
      }))
    }

    window.addEventListener('body-selection-change', handleBodySelectionChange)
    return () => window.removeEventListener('body-selection-change', handleBodySelectionChange)
  }, [])

  if (!roomId) {
    return <Lobby onJoinRoom={(id) => setRoomId(id)} />
  }

  return (
    <div className="h-screen w-screen bg-lab-bg flex flex-col">
      <header className="h-12 bg-lab-surface border-b border-lab-border flex items-center justify-between px-4 shrink-0 z-20 relative">
        <h1 className="text-lg font-semibold text-lab-text">Virtual Lab</h1>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-lab-success">
            <span className="w-2 h-2 rounded-full bg-lab-success animate-pulse" />
            {userCount} online
          </span>
          <span className="text-sm text-lab-text-muted">Room:</span>
          <code className="px-3 py-1 rounded-lg bg-lab-accent/20 text-lab-accent-light font-mono text-sm font-semibold tracking-wider">
            {roomId}
          </code>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors shadow-lg cursor-pointer flex items-center gap-2 ${
              isPaused
                ? 'bg-lab-warning hover:bg-yellow-500 text-white'
                : 'bg-lab-success hover:bg-green-500 text-white'
            }`}
          >
            <span>{isPaused ? 'Play' : 'Pause'}</span>
          </button>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent('trigger-clear'))}
            className="px-3 py-1 bg-lab-danger hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg cursor-pointer flex items-center gap-2"
          >
            <span>Clear Canvas</span>
          </button>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent('trigger-delete-selected'))}
            className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg cursor-pointer flex items-center gap-2"
          >
            <span>Delete Selected</span>
          </button>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent('trigger-save'))}
            className="px-3 py-1 bg-lab-accent hover:bg-lab-accent-light text-white rounded-lg text-sm font-semibold transition-colors shadow-lg cursor-pointer flex items-center gap-2"
          >
            <span>Save to DB</span>
          </button>

          <button
            onClick={() => setRoomId(null)}
            className="text-sm text-lab-text-muted hover:text-lab-danger transition-colors cursor-pointer ml-2"
          >
            Leave
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        <Toolbar activeTool={activeTool} setActiveTool={setActiveTool} material={material} setMaterial={setMaterial} />
        <MaterialPicker
          material={material}
          setMaterial={setMaterial}
          activeTool={activeTool}
          selectedConstraintType={selectedConstraintType}
        />
        <AnalyticsPanel />
        <PhysicsCanvas roomId={roomId} activeTool={activeTool} material={material} isPaused={isPaused} />
      </main>
    </div>
  )
}

export default App
