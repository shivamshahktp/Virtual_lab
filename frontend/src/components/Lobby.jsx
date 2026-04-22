import { useState, useEffect } from 'react'

export default function Lobby({ onJoinRoom }) {
  const [roomCode, setRoomCode] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  
  const [gallery, setGallery] = useState([])
  const [isLoadingGallery, setIsLoadingGallery] = useState(true)

  const API_URL = 'http://localhost:5001/api'

  // Fetch the experiment library on mount
  useEffect(() => {
    fetch(`${API_URL}/rooms`)
      .then(res => res.json())
      .then(data => {
        setGallery(data)
        setIsLoadingGallery(false)
      })
      .catch(err => {
        console.error('Failed to load gallery', err)
        setIsLoadingGallery(false)
      })
  }, [])

  // Create a brand-new room
  const handleCreate = async () => {
    setIsCreating(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/rooms`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        onJoinRoom(data.roomId) // Pass the new room code up to App
      } else {
        setError(data.error || 'Failed to create room')
      }
    } catch (err) {
      setError('Cannot reach server. Is the backend running on port 5001?')
    } finally {
      setIsCreating(false)
    }
  }

  // Join an existing room by code
  const handleJoin = async () => {
    const code = roomCode.trim().toUpperCase()
    if (code.length === 0) {
      setError('Please enter a room code')
      return
    }
    setIsJoining(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/rooms/${code}`)
      const data = await res.json()
      if (res.ok) {
        onJoinRoom(data.roomId) // Room exists — join it
      } else {
        setError(data.error || 'Room not found')
      }
    } catch (err) {
      setError('Cannot reach server. Is the backend running on port 5001?')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-lab-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">⚛️</div>
          <h1 className="text-4xl font-bold text-lab-text mb-2">Virtual Lab</h1>
          <p className="text-lab-text-muted text-lg">
            Collaborative 2D Physics Sandbox
          </p>
        </div>

        {/* Card */}
        <div className="bg-lab-surface border border-lab-border rounded-2xl p-8 shadow-2xl">
          {/* Create Room Button */}
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full py-4 rounded-xl font-semibold text-lg text-white
                       bg-lab-accent hover:bg-lab-accent-light
                       transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       cursor-pointer mb-6"
          >
            {isCreating ? '⏳ Creating...' : '🚀 Create New Room'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-lab-border" />
            <span className="text-lab-text-muted text-sm uppercase tracking-wider">
              or join existing
            </span>
            <div className="flex-1 h-px bg-lab-border" />
          </div>

          {/* Join Room Input */}
          <div className="flex gap-3">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="Enter room code"
              maxLength={6}
              className="flex-1 px-4 py-3 rounded-xl
                         bg-lab-surface-light border border-lab-border
                         text-lab-text text-center text-xl font-mono
                         tracking-[0.3em] uppercase
                         placeholder:text-lab-text-muted placeholder:tracking-normal
                         placeholder:font-sans placeholder:text-base
                         focus:outline-none focus:border-lab-accent
                         transition-colors duration-200"
            />
            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="px-6 py-3 rounded-xl font-semibold text-white
                         bg-lab-success hover:brightness-110
                         transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         cursor-pointer"
            >
              {isJoining ? '⏳' : 'Join'}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-lab-danger/10 border border-lab-danger/30 text-lab-danger text-sm text-center">
              {error}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p className="text-center text-lab-text-muted text-sm mt-6">
          Share your room code with friends to collaborate in real-time
        </p>

        {/* Experiment Library Gallery */}
        {!isLoadingGallery && gallery.length > 0 && (
          <div className="mt-12 animate-fade-in">
            <h2 className="text-xl font-bold text-lab-text mb-4 text-center flex items-center justify-center gap-2">
              <span>📚</span> Experiment Library
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {gallery.map(room => (
                <button
                  key={room.roomId}
                  onClick={() => onJoinRoom(room.roomId)}
                  className="bg-lab-surface border border-lab-border rounded-xl p-4 text-left hover:border-lab-accent hover:bg-lab-surface-light hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-all duration-200 cursor-pointer group"
                >
                  <div className="text-lg font-mono font-bold text-lab-accent-light mb-2 group-hover:text-white transition-colors">{room.roomId}</div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="px-2 py-1 bg-lab-bg rounded-md text-lab-text-muted border border-lab-border">
                      {room.bodyCount} Objects
                    </span>
                    <span className="text-lab-text-muted text-[10px]">
                      {new Date(room.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
