import { useState, useEffect } from 'react'

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api`

export default function Lobby({ onJoinRoom }) {
  const [roomCode, setRoomCode] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  const [gallery, setGallery] = useState([])
  const [isLoadingGallery, setIsLoadingGallery] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('virtual-lab-token')
    if (!token) {
      setIsLoadingGallery(false)
      return
    }

    fetch(`${API_URL}/rooms/my-experiments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed')
        return res.json()
      })
      .then(data => { setGallery(data); setIsLoadingGallery(false) })
      .catch(() => setIsLoadingGallery(false))
  }, [])

  const handleCreate = async () => {
    setIsCreating(true); setError('')
    try {
      const res = await fetch(`${API_URL}/rooms`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('virtual-lab-token')}`
        }
      })
      const data = await res.json()
      if (res.ok) onJoinRoom(data.roomId)
      else setError(data.error || 'Failed to create room')
    } catch {
      setError('Cannot reach server. Is the backend running on port 5001?')
    } finally { setIsCreating(false) }
  }

  const handleJoin = async () => {
    const code = roomCode.trim().toUpperCase()
    if (!code) { setError('Please enter a room code'); return }
    setIsJoining(true); setError('')
    try {
      const res = await fetch(`${API_URL}/rooms/${code}`)
      const data = await res.json()
      if (res.ok) onJoinRoom(data.roomId)
      else setError(data.error || 'Room not found')
    } catch {
      setError('Cannot reach server. Is the backend running on port 5001?')
    } finally { setIsJoining(false) }
  }

  return (
    <div style={{
      minHeight: '100svh',
      background: '#f0f4f8',
      backgroundImage: `
        linear-gradient(rgba(99,143,220,0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(99,143,220,0.1) 1px, transparent 1px),
        linear-gradient(rgba(99,143,220,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(99,143,220,0.05) 1px, transparent 1px)
      `,
      backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px',
      fontFamily: 'Space Grotesk, Inter, sans-serif',
    }}>


      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '3px',
        background: 'linear-gradient(90deg, #1e6fe8, #3b82f6, #60a5fa, #3b82f6, #1e6fe8)',
        backgroundSize: '200% 100%',
      }} />

      <div style={{ width: '100%', maxWidth: '440px' }}>


        <div style={{ textAlign: 'center', marginBottom: '36px' }}>

          <div style={{
            width: '72px', height: '72px', borderRadius: '20px',
            background: 'white',
            border: '1px solid rgba(30,111,232,0.15)',
            boxShadow: '0 4px 24px rgba(30,111,232,0.12), 0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M14 8h12M15 8v10l-7 13a1.5 1.5 0 001.3 2.2h21.4A1.5 1.5 0 0032 31L25 18V8" stroke="#1e6fe8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="18" cy="26" r="1.8" fill="#1e6fe8"/>
              <circle cx="23" cy="30" r="1.4" fill="#3b82f6"/>
              <circle cx="26" cy="24" r="1.1" fill="#60a5fa"/>
            </svg>
          </div>

          <h1 style={{
            fontSize: '32px', fontWeight: 800, color: '#1a202c',
            margin: '0 0 8px', letterSpacing: '-0.02em', lineHeight: 1.1,
            fontFamily: 'Space Grotesk, sans-serif',
          }}>
            Virtual Lab
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0, fontWeight: 400 }}>
            Collaborative 2D Physics Simulation Engine
          </p>


          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
            {['Real-time Sync', 'Matter.js Engine', 'MongoDB Persistence'].map(tag => (
              <span key={tag} style={{
                fontSize: '10px', fontWeight: 600, padding: '3px 10px',
                borderRadius: '20px', letterSpacing: '0.04em',
                background: 'rgba(30,111,232,0.08)',
                border: '1px solid rgba(30,111,232,0.15)',
                color: '#1e6fe8',
              }}>{tag}</span>
            ))}
          </div>
        </div>


        <div style={{
          background: 'white',
          border: '1px solid rgba(203,213,224,0.8)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)',
        }}>


          <button
            id="btn-create-room"
            onClick={handleCreate}
            disabled={isCreating}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              color: '#fff',
              background: isCreating
                ? '#93c5fd'
                : 'linear-gradient(135deg, #1e6fe8 0%, #3b82f6 100%)',
              border: 'none',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              boxShadow: isCreating ? 'none' : '0 2px 12px rgba(30,111,232,0.35)',
              transition: 'all 0.2s',
              letterSpacing: '0.02em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontFamily: 'Space Grotesk, sans-serif',
            }}
          >
            {isCreating ? (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
                  <path d="M8 2a6 6 0 016 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Creating…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5"/>
                  <path d="M8 5v6M5 8h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                New Experiment Room
              </>
            )}
          </button>


          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '18px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-lab-border-light)' }} />
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              or join existing
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-lab-border-light)' }} />
          </div>


          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              id="input-room-code"
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="ROOM CODE"
              maxLength={6}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '9px',
                border: '1.5px solid var(--color-lab-border)',
                background: 'var(--color-lab-surface-alt)',
                fontSize: '15px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                textAlign: 'center',
                letterSpacing: '0.25em',
                color: 'var(--color-lab-text)',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#1e6fe8'}
              onBlur={e => e.target.style.borderColor = 'var(--color-lab-border)'}
            />
            <button
              id="btn-join-room"
              onClick={handleJoin}
              disabled={isJoining}
              style={{
                padding: '10px 18px',
                borderRadius: '9px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#fff',
                background: '#059669',
                border: 'none',
                cursor: isJoining ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 6px rgba(5,150,105,0.3)',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                fontFamily: 'Space Grotesk, sans-serif',
              }}
            >
              {isJoining ? '…' : 'Join →'}
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: '12px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'var(--color-lab-danger-dim)',
              border: '1px solid rgba(220,38,38,0.2)',
              color: 'var(--color-lab-danger)',
              fontSize: '12px',
              fontWeight: 500,
            }}>
              ⚠ {error}
            </div>
          )}
        </div>


        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', marginTop: '16px', fontWeight: 400 }}>
          Share your room code to collaborate in real-time
        </p>


        {!isLoadingGallery && gallery.length > 0 && (
          <div style={{ marginTop: '32px' }} className="animate-fade-in">
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '14px',
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-lab-border-light)' }} />
              <h2 style={{
                fontSize: '11px', fontWeight: 700, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0,
              }}>
                My Experiments
              </h2>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-lab-border-light)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {gallery.map(room => (
                <button
                  key={room.roomId}
                  onClick={() => onJoinRoom(room.roomId)}
                  style={{
                    background: 'white',
                    border: '1px solid var(--color-lab-border-light)',
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    fontFamily: 'Space Grotesk, sans-serif',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#1e6fe8'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,111,232,0.08), 0 2px 8px rgba(0,0,0,0.06)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--color-lab-border-light)'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
                  }}
                >
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px', fontWeight: 700,
                    color: '#1e6fe8', marginBottom: '8px',
                    letterSpacing: '0.1em',
                  }}>{room.roomId}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 600,
                      color: '#64748b',
                      background: 'var(--color-lab-accent-dim)',
                      padding: '2px 7px', borderRadius: '5px',
                    }}>
                      {room.bodyCount} bodies
                    </span>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                      {new Date(room.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}


        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <span style={{ fontSize: '11px', color: '#cbd5e0', fontWeight: 400 }}>
            Powered by Matter.js · Socket.io · MongoDB
          </span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
