import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PhysicsCanvas from '../components/PhysicsCanvas'
import Toolbar from '../components/Toolbar'
import MaterialPicker from '../components/MaterialPicker'
import AnalyticsPanel from '../components/AnalyticsPanel'
import socket from '../socket'
import { Settings, Users, Share2, Play, Square, RotateCcw, ChevronDown, Menu, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LabRoom() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // Protect route
  useEffect(() => {
    if (!user) {
      navigate('/signin')
    }
  }, [user, navigate])

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
  const [leftTab, setLeftTab] = useState('Build')
  const [rightTab, setRightTab] = useState('Live Analytics')
  const [showMenu, setShowMenu] = useState(false)
  const [vectorSettings, setVectorSettings] = useState({
    velocity: false,
    gravity: false,
    wireframes: false
  })
  const [simSpeed, setSimSpeed] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)

  useEffect(() => {
    if (!roomId) return

    socket.connect()

    // Ensure we join the room immediately, and ALSO re-join if the socket reconnects
    const joinRoom = () => socket.emit('join-room', roomId)
    joinRoom() // Call once immediately in case it's already connected
    socket.on('connect', joinRoom)

    const onUserJoined = (data) => setUserCount(data.userCount)
    const onUserLeft = (data) => setUserCount(data.userCount)
    const onRoomUserCount = (data) => setUserCount(data.userCount)

    socket.on('user-joined', onUserJoined)
    socket.on('user-left', onUserLeft)
    socket.on('room-user-count', onRoomUserCount)

    return () => {
      socket.off('connect', joinRoom)
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

  const handleShareRoom = () => {
    const fullUrl = window.location.origin + '/room/' + roomId;
    navigator.clipboard.writeText(fullUrl)
    alert('Room link copied to clipboard: ' + fullUrl)
  }

  const handleSaveRoom = () => {
    window.dispatchEvent(new CustomEvent('trigger-save'))
  }

  if (!user) return null;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f8fafc]">
      {/* ── Top Header Bar (Screenshot 4) ── */}
      <header className="h-[60px] shrink-0 flex items-center justify-between px-6 bg-white border-b border-gray-200 z-20">
        {/* Left: Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="#1e6fe8" strokeWidth="1.5" strokeDasharray="4 2" />
            <path d="M16 6C10 6 6 16 6 16s4 10 10 10 10-10 10-10-4-10-10-10z" stroke="#1e6fe8" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="2.5" fill="#ef4444" />
          </svg>
          <div>
            <h1 className="font-bold text-[#1e6fe8] text-[14px] m-0 leading-tight">VIRTUAL-LAB</h1>
            <span className="text-[10px] text-gray-400 font-medium">Physics Sandbox</span>
          </div>
        </div>

        {/* Center: Room Name */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-md hover:bg-gray-50">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Room</span>
          <span className="text-[16px] font-mono font-bold text-[#1e6fe8] bg-blue-50 px-3 py-1 rounded border border-blue-100">{roomId}</span>
          <div className="flex items-center gap-1.5 ml-4 px-3 py-1 bg-green-50 rounded-full border border-green-100">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[11px] font-bold text-green-700">{userCount} Online</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSaveRoom}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-[#1e6fe8] border border-[#1e6fe8] rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <Settings size={14} />
            Save Room
          </button>
          
          <button 
            onClick={handleShareRoom}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-[#1e6fe8] border border-[#1e6fe8] rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <Share2 size={14} />
            Share Room
          </button>

          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 text-[13px] font-bold text-white bg-[#ef4444] rounded-md hover:bg-red-600 transition-colors shadow-sm"
          >
            Leave Room
          </button>
          
          <div className="w-[1px] h-[24px] bg-gray-200 mx-2"></div>
          
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="text-gray-500 hover:text-gray-700 p-1">
              <Menu size={20} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-100 mb-1">
                    <p className="text-[12px] font-semibold text-gray-800 truncate">{user.username}</p>
                    <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                  </div>
                  <button onClick={() => navigate('/my-experiments')} className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">My Experiments</button>
                  <button onClick={() => navigate('/browse')} className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">Browse Library</button>
                  <button onClick={() => navigate('/about')} className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">About</button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Workspace ── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ── Left Sidebar ── */}
        <div className="w-[320px] shrink-0 flex flex-col bg-white border-r border-gray-200 z-10 animate-slide-left">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {['Build', 'Connectors', 'Materials'].map(tab => (
              <button 
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={`flex-1 py-3 text-[13px] font-semibold transition-colors ${
                  leftTab === tab ? 'text-[#1e6fe8] border-b-2 border-[#1e6fe8]' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          {/* Content */}
          <div className="flex-1 flex overflow-hidden relative">
            <Toolbar activeTool={activeTool} setActiveTool={setActiveTool} material={material} setMaterial={setMaterial} />
            
            {/* The toolbar is modified to be fixed inside the left sidebar instead of absolute */}
            <div className="pl-[70px] pr-4 py-4 w-full h-full overflow-y-auto">
               {leftTab === 'Connectors' && (
                 <div>
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Connector Tool</h3>
                    <p className="text-[12px] text-gray-500 mb-6 leading-relaxed">
                      Choose a connector, then drag on the canvas: press on the first body, move, release on the second body. Pivot / motor: release on the anchor point in space.
                    </p>
                    
                    <div className="flex flex-col gap-2">
                      {/* Spring */}
                      <button onClick={() => setActiveTool('spring')} className={`text-left p-3 rounded-lg border transition-all hover:translate-x-1 ${activeTool === 'spring' ? 'border-[#3b82f6] bg-blue-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}>
                        <div className="font-semibold text-[13px] text-gray-800">Spring</div>
                        <div className="text-[11px] text-gray-500">Drag from object A → B</div>
                      </button>
                      
                      {/* Rope */}
                      <button onClick={() => setActiveTool('rope')} className={`text-left p-3 rounded-lg border transition-all hover:translate-x-1 ${activeTool === 'rope' ? 'border-[#3b82f6] bg-blue-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}>
                        <div className="font-semibold text-[13px] text-gray-800">String (rope)</div>
                        <div className="text-[11px] text-gray-500">Soft link, high damping</div>
                      </button>
                      
                      {/* Rod */}
                      <button onClick={() => setActiveTool('rod')} className={`text-left p-3 rounded-lg border transition-all hover:translate-x-1 ${activeTool === 'rod' ? 'border-[#3b82f6] bg-blue-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}>
                        <div className="font-semibold text-[13px] text-gray-800">Rod</div>
                        <div className="text-[11px] text-gray-500">Rigid link</div>
                      </button>
                      
                      {/* Pivot */}
                      <button onClick={() => setActiveTool('pivot')} className={`text-left p-3 rounded-lg border transition-all hover:translate-x-1 ${activeTool === 'pivot' ? 'border-[#3b82f6] bg-blue-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}>
                        <div className="font-semibold text-[13px] text-gray-800">Pivot</div>
                        <div className="text-[11px] text-gray-500">Drag anchor point on canvas</div>
                      </button>
                      
                      {/* Motor */}
                      <button onClick={() => setActiveTool('motor')} className={`text-left p-3 rounded-lg border transition-all hover:translate-x-1 ${activeTool === 'motor' ? 'border-[#3b82f6] bg-blue-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}>
                        <div className="font-semibold text-[13px] text-gray-800">Motor</div>
                        <div className="text-[11px] text-gray-500">Pivot + constant spin</div>
                      </button>
                    </div>
                 </div>
               )}
               {leftTab === 'Materials' && (
                 <div className="mt-[-16px] ml-[-16px]">
                   <MaterialPicker
                     material={material}
                     setMaterial={setMaterial}
                     activeTool={activeTool}
                     selectedConstraintType={selectedConstraintType}
                   />
                 </div>
               )}
               {leftTab === 'Build' && (
                 <div>
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Build Tools</h3>
                    <p className="text-[12px] text-gray-500 mb-6 leading-relaxed">
                      Select a shape to spawn, or use the cursor to drag and interact with objects.
                    </p>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => setActiveTool('cursor')} className={`text-left p-3 rounded-lg border transition-all hover:translate-x-1 ${activeTool === 'cursor' ? 'border-[#3b82f6] bg-blue-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}>
                        <div className="font-semibold text-[13px] text-gray-800">Select & Drag</div>
                      </button>
                      <button onClick={() => setActiveTool('box')} className={`text-left p-3 rounded-lg border transition-all hover:translate-x-1 ${activeTool === 'box' ? 'border-[#3b82f6] bg-blue-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}>
                        <div className="font-semibold text-[13px] text-gray-800">Box</div>
                      </button>
                      <button onClick={() => setActiveTool('circle')} className={`text-left p-3 rounded-lg border transition-all hover:translate-x-1 ${activeTool === 'circle' ? 'border-[#3b82f6] bg-blue-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}>
                        <div className="font-semibold text-[13px] text-gray-800">Circle</div>
                      </button>
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* ── Center Canvas Area ── */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#fafcff]">
          {/* Top Control Bar */}
          <div className="h-[50px] flex justify-center items-center gap-3 border-b border-gray-200 bg-white shadow-sm z-10">
            <button 
              onClick={() => setIsPaused(false)}
              className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[13px] font-bold transition-all hover:scale-105 active:scale-95 ${!isPaused ? 'bg-[#3b82f6] text-white shadow-md shadow-blue-200 animate-pulse' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Play size={14} fill={!isPaused ? 'currentColor' : 'none'} /> Play
            </button>
            <button 
              onClick={() => setIsPaused(true)}
              className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[13px] font-bold transition-all hover:scale-105 active:scale-95 ${isPaused ? 'bg-amber-100 text-amber-700 shadow-md shadow-amber-100/50' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Square size={14} fill={isPaused ? 'currentColor' : 'none'} /> Pause
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('trigger-clear'))}
              className="flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[13px] font-bold text-gray-500 hover:bg-gray-100 transition-all hover:scale-105 active:scale-95"
            >
              <RotateCcw size={14} /> Reset All
            </button>

            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('trigger-delete-selected'))}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-bold text-red-500 hover:bg-red-50 transition-all hover:scale-105 active:scale-95"
              title="Delete Selected Object (Backspace)"
            >
              <Trash2 size={14} /> Delete
            </button>
            
            <div className="w-[1px] h-[20px] bg-gray-200 mx-1"></div>

            <div className="relative">
              <button 
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold text-gray-600 hover:bg-gray-100 transition-all hover:scale-105 active:scale-95"
              >
                Speed {simSpeed}x <ChevronDown size={14} />
              </button>
              {showSpeedMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSpeedMenu(false)}></div>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 min-w-[100px] overflow-hidden">
                    {[0.25, 0.5, 1, 2, 4].map(speed => (
                      <button
                        key={speed}
                        onClick={() => { setSimSpeed(speed); setShowSpeedMenu(false); }}
                        className={`w-full text-center px-4 py-2 text-[13px] font-semibold transition-colors ${
                          simSpeed === speed
                            ? 'bg-blue-50 text-[#1e6fe8]'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {speed}x {speed === 1 ? '(Normal)' : speed < 1 ? '(Slow)' : '(Fast)'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div className="flex-1 p-6 relative animate-fade-in">
            <div className="w-full h-full border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white relative physics-grid-bg">
              <PhysicsCanvas roomId={roomId} activeTool={activeTool} material={material} isPaused={isPaused} vectorSettings={vectorSettings} simSpeed={simSpeed} />
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="w-[320px] shrink-0 flex flex-col bg-white border-l border-gray-200 z-10 animate-fade-in">
          <div className="flex border-b border-gray-200">
            {['Live Analytics', 'Vectors'].map(tab => (
              <button 
                key={tab}
                onClick={() => setRightTab(tab)}
                className={`flex-1 py-3 text-[13px] font-semibold transition-colors ${
                  rightTab === tab ? 'text-[#1e6fe8] border-b-2 border-[#1e6fe8]' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto relative p-4">
             {rightTab === 'Live Analytics' && (
               <div className="mt-[-16px] ml-[-16px] w-[320px]">
                 <AnalyticsPanel />
               </div>
             )}
             {rightTab === 'Vectors' && (
               <div className="flex flex-col gap-5">
                 <div>
                   <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Display Settings</h3>
                   
                   <label className="flex items-center gap-3 cursor-pointer group mb-3">
                     <input 
                       type="checkbox" 
                       checked={vectorSettings.velocity} 
                       onChange={e => setVectorSettings(prev => ({...prev, velocity: e.target.checked}))}
                       className="w-4 h-4 rounded border-gray-300 text-[#1e6fe8] focus:ring-[#1e6fe8]" 
                     />
                     <div className="flex flex-col">
                       <span className="text-[13px] font-semibold text-gray-700 group-hover:text-[#1e6fe8] transition-colors">Velocity Vectors</span>
                       <span className="text-[10px] text-gray-400">Shows object movement direction</span>
                     </div>
                   </label>
                   
                   <label className="flex items-center gap-3 cursor-pointer group mb-3">
                     <input 
                       type="checkbox" 
                       checked={vectorSettings.gravity} 
                       onChange={e => setVectorSettings(prev => ({...prev, gravity: e.target.checked}))}
                       className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" 
                     />
                     <div className="flex flex-col">
                       <span className="text-[13px] font-semibold text-gray-700 group-hover:text-purple-600 transition-colors">Gravity Forces</span>
                       <span className="text-[10px] text-gray-400">Visualizes gravitational pull</span>
                     </div>
                   </label>

                   <label className="flex items-center gap-3 cursor-pointer group">
                     <input 
                       type="checkbox" 
                       checked={vectorSettings.wireframes} 
                       onChange={e => setVectorSettings(prev => ({...prev, wireframes: e.target.checked}))}
                       className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" 
                     />
                     <div className="flex flex-col">
                       <span className="text-[13px] font-semibold text-gray-700 group-hover:text-green-600 transition-colors">Wireframe Mode</span>
                       <span className="text-[10px] text-gray-400">Shows underlying physical geometry</span>
                     </div>
                   </label>
                 </div>
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  )
}
