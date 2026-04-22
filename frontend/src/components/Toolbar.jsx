import { useState } from 'react';

export default function Toolbar({ activeTool, setActiveTool, material, setMaterial }) {
  const [showSpringMenu, setShowSpringMenu] = useState(false);
  const [showMotorMenu, setShowMotorMenu] = useState(false);

  const tools = [
    { id: 'cursor', icon: '👆', label: 'Select / Drag' },
    { id: 'box', icon: '🟥', label: 'Spawn Box' },
    { id: 'circle', icon: '🟢', label: 'Spawn Circle' },
    { id: 'pivot', icon: '📌', label: 'Pin / Pivot (Click a body)' },
    { id: 'spring', icon: '〰️', label: 'Spring (Click 2 bodies) - Right-Click to adjust stiffness' },
    { id: 'motor', icon: '⚙️', label: 'Spawn Motor/Gear (Right-Click for Settings)' },
  ]

  const handleContextMenu = (e, toolId) => {
    if (toolId === 'spring') {
      e.preventDefault();
      setShowSpringMenu(!showSpringMenu);
      setShowMotorMenu(false);
      setActiveTool('spring');
    } else if (toolId === 'motor') {
      e.preventDefault();
      setShowMotorMenu(!showMotorMenu);
      setShowSpringMenu(false);
      setActiveTool('motor');
    }
  };

  return (
    <div className="absolute top-4 left-4 z-10 flex gap-4 items-start">
      <div className="bg-lab-surface border border-lab-border rounded-xl shadow-2xl p-2 flex flex-col gap-2">
      {tools.map(tool => (
        <button
          key={tool.id}
          onClick={() => {
            setActiveTool(tool.id);
            if (tool.id !== 'spring') setShowSpringMenu(false);
            if (tool.id !== 'motor') setShowMotorMenu(false);
          }}
          onContextMenu={(e) => handleContextMenu(e, tool.id)}
          title={tool.label}
          className={`
            w-12 h-12 rounded-lg flex items-center justify-center text-2xl
            transition-all duration-200 border cursor-pointer
            ${activeTool === tool.id 
              ? 'bg-lab-accent/20 border-lab-accent text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
              : 'bg-transparent border-transparent text-lab-text-muted hover:bg-lab-surface-light hover:text-white'
            }
          `}
        >
          {tool.icon}
        </button>
      ))}
      </div>

      {/* Spring Settings Menu */}
      {showSpringMenu && (
        <div className="bg-lab-surface border border-lab-border rounded-xl shadow-2xl p-4 flex flex-col gap-4 min-w-[220px]">
          <div className="flex justify-between items-center border-b border-lab-border pb-2">
            <h3 className="text-sm font-semibold text-lab-text">Spring Settings</h3>
            <button 
              onClick={() => setShowSpringMenu(false)} 
              className="text-lab-text-muted hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-lab-text-muted flex justify-between">
              <span>Stiffness (k)</span>
              <span className="text-lab-accent-light font-mono">{material?.springStiffness || 0.05}</span>
            </label>
            <input
              type="range"
              min="0.001"
              max="0.5"
              step="0.001"
              value={material?.springStiffness || 0.05}
              onChange={(e) => setMaterial({ ...material, springStiffness: parseFloat(e.target.value) })}
              className="w-full accent-lab-accent"
            />
            <p className="text-[10px] text-lab-text-muted mt-1 leading-tight">
              Higher stiffness makes the spring harder to stretch.
            </p>
          </div>
        </div>
      )}

      {/* Motor / Gear Settings Menu */}
      {showMotorMenu && (
        <div className="bg-lab-surface border border-lab-border rounded-xl shadow-2xl p-4 flex flex-col gap-4 min-w-[240px]">
          <div className="flex justify-between items-center border-b border-lab-border pb-2">
            <h3 className="text-sm font-semibold text-lab-text">Motor / Gear Settings</h3>
            <button 
              onClick={() => setShowMotorMenu(false)} 
              className="text-lab-text-muted hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          
          <div className="flex flex-col gap-3">
            {/* Type Selection */}
            <div className="flex gap-2 bg-lab-surface-light p-1 rounded-lg">
              <button
                onClick={() => setMaterial({ ...material, motorType: 'gear' })}
                className={`flex-1 text-xs py-1.5 rounded-md font-semibold transition-colors ${material?.motorType !== 'rod' ? 'bg-lab-accent text-white shadow-md' : 'text-lab-text-muted hover:text-lab-text'}`}
              >
                ⚙️ Gear
              </button>
              <button
                onClick={() => setMaterial({ ...material, motorType: 'rod' })}
                className={`flex-1 text-xs py-1.5 rounded-md font-semibold transition-colors ${material?.motorType === 'rod' ? 'bg-lab-accent text-white shadow-md' : 'text-lab-text-muted hover:text-lab-text'}`}
              >
                🏏 Rod
              </button>
            </div>

            {/* Motorized Toggle */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={material?.isMotorized ?? true}
                onChange={(e) => setMaterial({ ...material, isMotorized: e.target.checked })}
                className="w-4 h-4 rounded accent-lab-accent bg-lab-surface border-lab-border"
              />
              <span className="text-sm text-lab-text group-hover:text-white transition-colors">Is Motorized? (Spins by itself)</span>
            </label>

            {/* Speed & Direction (if motorized) */}
            {(material?.isMotorized ?? true) && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-lab-text-muted flex justify-between">
                    <span>Speed</span>
                    <span className="text-lab-accent-light font-mono">{material?.motorSpeed || 0.05}</span>
                  </label>
                  <input
                    type="range"
                    min="0.01" max="0.2" step="0.01"
                    value={material?.motorSpeed || 0.05}
                    onChange={(e) => setMaterial({ ...material, motorSpeed: parseFloat(e.target.value) })}
                    className="w-full accent-lab-accent"
                  />
                </div>
                <div className="flex gap-2 bg-lab-surface-light p-1 rounded-lg">
                  <button
                    onClick={() => setMaterial({ ...material, motorDirection: 'clockwise' })}
                    className={`flex-1 text-xs py-1.5 rounded-md font-semibold transition-colors ${(material?.motorDirection || 'clockwise') === 'clockwise' ? 'bg-lab-accent text-white shadow-md' : 'text-lab-text-muted hover:text-lab-text'}`}
                  >
                    ↻ Clockwise
                  </button>
                  <button
                    onClick={() => setMaterial({ ...material, motorDirection: 'anticlockwise' })}
                    className={`flex-1 text-xs py-1.5 rounded-md font-semibold transition-colors ${material?.motorDirection === 'anticlockwise' ? 'bg-lab-accent text-white shadow-md' : 'text-lab-text-muted hover:text-lab-text'}`}
                  >
                    ↺ Anti-CW
                  </button>
                </div>
              </div>
            )}

            {/* Gear Specific Options */}
            {material?.motorType !== 'rod' && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-lab-text-muted flex justify-between">
                    <span>Radius</span>
                    <span className="text-lab-accent-light font-mono">{material?.gearRadius || 40}</span>
                  </label>
                  <input
                    type="range"
                    min="20" max="100" step="5"
                    value={material?.gearRadius || 40}
                    onChange={(e) => setMaterial({ ...material, gearRadius: parseInt(e.target.value) })}
                    className="w-full accent-lab-accent"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-lab-text-muted flex justify-between">
                    <span>Teeth Count</span>
                    <span className="text-lab-accent-light font-mono">{material?.gearTeeth || 12}</span>
                  </label>
                  <input
                    type="range"
                    min="4" max="32" step="2"
                    value={material?.gearTeeth || 12}
                    onChange={(e) => setMaterial({ ...material, gearTeeth: parseInt(e.target.value) })}
                    className="w-full accent-lab-accent"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
