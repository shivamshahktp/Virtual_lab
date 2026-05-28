import { useState } from 'react'

const tools = [
  { id: 'cursor',  icon: 'cursor',   label: 'Select & Drag',   shortcut: 'V', desc: 'Move and select objects' },
  { id: 'box',     icon: 'box',      label: 'Box',             shortcut: 'B', desc: 'Place a rectangular body' },
  { id: 'circle',  icon: 'circle',   label: 'Circle',          shortcut: 'C', desc: 'Place a circular body' },
  { id: 'pivot',   icon: 'pivot',    label: 'Pin Pivot',       shortcut: 'P', desc: 'Anchor body to a fixed point' },
  { id: 'spring',  icon: 'spring',   label: 'Spring',          shortcut: 'S', desc: 'Elastic constraint' },
  { id: 'rod',     icon: 'rod',      label: 'Rigid Rod',       shortcut: 'R', desc: 'Fixed-length connection' },
  { id: 'rope',    icon: 'rope',     label: 'Rope',            shortcut: 'O', desc: 'Slack-capable rope' },
  { id: 'motor',   icon: 'motor',    label: 'Motor / Gear',    shortcut: 'M', desc: 'Motorized spinning body' },
]

function ToolIcon({ type, active }) {
  const color = active ? '#1e6fe8' : '#64748b'
  const icons = {
    cursor: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 2l11 7-5 1-2 5L3 2z" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/>
      </svg>
    ),
    box: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="3" y="3" width="12" height="12" rx="2" stroke={color} strokeWidth="1.6"/>
      </svg>
    ),
    circle: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="6" stroke={color} strokeWidth="1.6"/>
      </svg>
    ),
    pivot: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="5" r="2.5" stroke={color} strokeWidth="1.6"/>
        <line x1="9" y1="7.5" x2="9" y2="15" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="6" y1="15" x2="12" y2="15" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    spring: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2v2M9 4c-2 1-2 2 0 3s2 2 0 3-2 2 0 3M9 13v3" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    rod: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <line x1="3" y1="9" x2="15" y2="9" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="3" cy="9" r="2" fill={color}/>
        <circle cx="15" cy="9" r="2" fill={color}/>
      </svg>
    ),
    rope: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 4c4 0 4 10 8 10s4-10 8-10" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none" transform="scale(0.7) translate(2,2)"/>
        <path d="M3 6Q6 12 9 12Q12 12 15 6" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none"/>
        <circle cx="3" cy="6" r="1.5" fill={color}/>
        <circle cx="15" cy="6" r="1.5" fill={color}/>
      </svg>
    ),
    motor: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="6" stroke={color} strokeWidth="1.6"/>
        <circle cx="9" cy="9" r="2" fill={color}/>
        <line x1="9" y1="3" x2="9" y2="5" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="9" y1="13" x2="9" y2="15" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="3" y1="9" x2="5" y2="9" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="13" y1="9" x2="15" y2="9" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  }
  return icons[type] || null
}

export default function Toolbar({ activeTool, setActiveTool, material, setMaterial }) {
  const [showSpringMenu, setShowSpringMenu] = useState(false)
  const [showMotorMenu, setShowMotorMenu] = useState(false)
  const [showRopeMenu, setShowRopeMenu] = useState(false)
  const [showRodMenu, setShowRodMenu] = useState(false)
  const [tooltip, setTooltip] = useState(null)

  const toggleMenu = (e, toolId) => {
    e.stopPropagation()
    if (toolId === 'spring') {
      setShowSpringMenu(!showSpringMenu)
      setShowMotorMenu(false)
      setShowRopeMenu(false)
      setShowRodMenu(false)
      setActiveTool('spring')
    } else if (toolId === 'motor') {
      setShowMotorMenu(!showMotorMenu)
      setShowSpringMenu(false)
      setShowRopeMenu(false)
      setShowRodMenu(false)
      setActiveTool('motor')
    } else if (toolId === 'rope') {
      setShowRopeMenu(!showRopeMenu)
      setShowSpringMenu(false)
      setShowMotorMenu(false)
      setShowRodMenu(false)
      setActiveTool('rope')
    } else if (toolId === 'rod') {
      setShowRodMenu(!showRodMenu)
      setShowSpringMenu(false)
      setShowMotorMenu(false)
      setShowRopeMenu(false)
      setActiveTool('rod')
    }
  }

  return (
    <div className="absolute top-0 left-0 h-full w-[60px] border-r border-gray-200 bg-white flex flex-col items-center py-2 z-10">


      <div className="flex flex-col gap-2 w-full px-2" style={{ width: '100%' }}>


        <div style={{ padding: '4px 6px 6px', borderBottom: '1px solid var(--color-lab-border-light)', marginBottom: '4px' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#1e6fe8" opacity="0.08"/>
            <path d="M11 7h10M12 7v8l-5 9a1 1 0 00.9 1.5h16.2A1 1 0 0025 24l-5-9V7" stroke="#1e6fe8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="14.5" cy="21" r="1.2" fill="#1e6fe8"/>
            <circle cx="18" cy="23" r="1" fill="#3b82f6"/>
          </svg>
        </div>

        {tools.map((tool) => {
          const isActive = activeTool === tool.id
          return (
            <div key={tool.id} style={{ position: 'relative' }}>
              <button
                id={`tool-${tool.id}`}
                onClick={() => {
                  setActiveTool(tool.id)
                  if (tool.id !== 'spring') setShowSpringMenu(false)
                  if (tool.id !== 'motor') setShowMotorMenu(false)
                  if (tool.id !== 'rope') setShowRopeMenu(false)
                  if (tool.id !== 'rod') setShowRodMenu(false)
                }}
                onMouseEnter={() => setTooltip(tool.id)}
                onMouseLeave={() => setTooltip(null)}
                title={tool.label}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isActive ? '1.5px solid var(--color-lab-accent)' : '1.5px solid transparent',
                  background: isActive ? 'var(--color-lab-accent-dim)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 0 0 3px rgba(30,111,232,0.1)' : 'none',
                  position: 'relative',
                }}
              >
                <ToolIcon type={tool.icon} active={isActive} />

                {isActive && (
                  <span style={{
                    position: 'absolute',
                    bottom: '3px',
                    right: '3px',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: 'var(--color-lab-accent)',
                  }} />
                )}
              </button>


              {(tool.id === 'spring' || tool.id === 'motor' || tool.id === 'rope' || tool.id === 'rod') && (
                <button
                  onClick={(e) => toggleMenu(e, tool.id)}
                  style={{
                    position: 'absolute',
                    right: '-10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'var(--color-lab-surface-alt)',
                    border: '1px solid var(--color-lab-border-light)',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 10,
                    color: 'var(--color-lab-text-muted)'
                  }}
                  title="Settings"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              )}


              {tooltip === tool.id && (
                <div style={{
                  position: 'absolute',
                  left: '46px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'var(--color-lab-text)',
                  color: '#fff',
                  padding: '5px 10px',
                  borderRadius: '7px',
                  fontSize: '11px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 100,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}>
                  <div>{tool.label}</div>
                  <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '1px' }}>{tool.desc}</div>
                  <div style={{
                    position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)',
                    width: 0, height: 0,
                    borderTop: '5px solid transparent',
                    borderBottom: '5px solid transparent',
                    borderRight: '5px solid var(--color-lab-text)'
                  }} />
                </div>
              )}
            </div>
          )
        })}


        <div style={{ padding: '6px 0 2px', borderTop: '1px solid var(--color-lab-border-light)', marginTop: '4px', textAlign: 'center' }}>
          <span style={{ fontSize: '9px', color: 'var(--color-lab-text-subtle)', letterSpacing: '0.04em' }}>TOOLS</span>
        </div>
      </div>


      {showSpringMenu && (
        <div className="sci-panel animate-fade-in" style={{ position: 'absolute', left: '72px', top: '50%', transform: 'translateY(-50%)', padding: '14px', minWidth: '210px', zIndex: 100 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--color-lab-border-light)' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-lab-text)', letterSpacing: '0.03em' }}>Spring Settings</div>
              <div style={{ fontSize: '10px', color: 'var(--color-lab-text-muted)' }}>Hooke's Law — F = kx</div>
            </div>
            <button onClick={() => setShowSpringMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-lab-text-muted)', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}>×</button>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', color: 'var(--color-lab-text-muted)', fontWeight: 500 }}>Stiffness (k)</label>
              <span className="sci-chip">{material?.springStiffness || 0.05}</span>
            </div>
            <input
              type="range" min="0.001" max="0.5" step="0.001"
              value={material?.springStiffness || 0.05}
              onChange={(e) => setMaterial({ ...material, springStiffness: parseFloat(e.target.value) })}
              style={{ width: '100%', marginBottom: '12px' }}
            />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', color: 'var(--color-lab-text-muted)', fontWeight: 500 }}>Length (px)</label>
              <span className="sci-chip">{Math.round(material?.springLength || 120)}</span>
            </div>
            <input
              type="range" min="20" max="1200" step="5"
              value={material?.springLength || 120}
              onChange={(e) => setMaterial({ ...material, springLength: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}


      {showRopeMenu && (
        <div className="sci-panel animate-fade-in" style={{ position: 'absolute', left: '72px', top: '50%', transform: 'translateY(-50%)', padding: '14px', minWidth: '210px', zIndex: 100 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--color-lab-border-light)' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-lab-text)', letterSpacing: '0.03em' }}>Rope Settings</div>
              <div style={{ fontSize: '10px', color: 'var(--color-lab-text-muted)' }}>Slackable constraint</div>
            </div>
            <button onClick={() => setShowRopeMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-lab-text-muted)', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}>×</button>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', color: 'var(--color-lab-text-muted)', fontWeight: 500 }}>Length (px)</label>
              <span className="sci-chip">{Math.round(material?.ropeLength || 120)}</span>
            </div>
            <input
              type="range" min="20" max="1200" step="5"
              value={material?.ropeLength || 120}
              onChange={(e) => setMaterial({ ...material, ropeLength: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}


      {showRodMenu && (
        <div className="sci-panel animate-fade-in" style={{ position: 'absolute', left: '72px', top: '50%', transform: 'translateY(-50%)', padding: '14px', minWidth: '210px', zIndex: 100 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--color-lab-border-light)' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-lab-text)', letterSpacing: '0.03em' }}>Rod Settings</div>
              <div style={{ fontSize: '10px', color: 'var(--color-lab-text-muted)' }}>Rigid connector</div>
            </div>
            <button onClick={() => setShowRodMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-lab-text-muted)', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}>×</button>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', color: 'var(--color-lab-text-muted)', fontWeight: 500 }}>Length (px)</label>
              <span className="sci-chip">{Math.round(material?.rodLength || 120)}</span>
            </div>
            <input
              type="range" min="20" max="1200" step="5"
              value={material?.rodLength || 120}
              onChange={(e) => setMaterial({ ...material, rodLength: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}


      {showMotorMenu && (
        <div className="sci-panel animate-fade-in" style={{ position: 'absolute', left: '72px', top: '50%', transform: 'translateY(-50%)', padding: '14px', minWidth: '228px', zIndex: 100 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--color-lab-border-light)' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-lab-text)' }}>Motor / Gear</div>
              <div style={{ fontSize: '10px', color: 'var(--color-lab-text-muted)' }}>Rotational actuator settings</div>
            </div>
            <button onClick={() => setShowMotorMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-lab-text-muted)', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}>×</button>
          </div>


          <div style={{ display: 'flex', gap: '4px', background: 'var(--color-lab-surface-alt)', padding: '3px', borderRadius: '8px', marginBottom: '12px' }}>
            {['gear', 'rod'].map(type => (
              <button
                key={type}
                onClick={() => setMaterial({ ...material, motorType: type })}
                style={{
                  flex: 1, fontSize: '11px', fontWeight: 600, padding: '5px',
                  borderRadius: '6px', cursor: 'pointer', border: 'none',
                  background: (material?.motorType === type || (type === 'gear' && !material?.motorType)) ? 'var(--color-lab-accent)' : 'transparent',
                  color: (material?.motorType === type || (type === 'gear' && !material?.motorType)) ? '#fff' : 'var(--color-lab-text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {type === 'gear' ? '⚙ Gear' : '▬ Rod'}
              </button>
            ))}
          </div>


          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={material?.isMotorized ?? true}
              onChange={(e) => setMaterial({ ...material, isMotorized: e.target.checked })}
              style={{ width: '14px', height: '14px', accentColor: 'var(--color-lab-accent)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-lab-text)' }}>Self-motorized (auto-spins)</span>
          </label>

          {(material?.isMotorized ?? true) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-lab-text-muted)', fontWeight: 500 }}>Speed (ω)</label>
                  <span className="sci-chip">{material?.motorSpeed || 0.05}</span>
                </div>
                <input type="range" min="0.01" max="0.2" step="0.01"
                  value={material?.motorSpeed || 0.05}
                  onChange={(e) => setMaterial({ ...material, motorSpeed: parseFloat(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '4px', background: 'var(--color-lab-surface-alt)', padding: '3px', borderRadius: '8px' }}>
                {['clockwise', 'anticlockwise'].map(dir => (
                  <button
                    key={dir}
                    onClick={() => setMaterial({ ...material, motorDirection: dir })}
                    style={{
                      flex: 1, fontSize: '10px', fontWeight: 600, padding: '5px 4px',
                      borderRadius: '6px', cursor: 'pointer', border: 'none',
                      background: (material?.motorDirection || 'clockwise') === dir ? 'var(--color-lab-accent)' : 'transparent',
                      color: (material?.motorDirection || 'clockwise') === dir ? '#fff' : 'var(--color-lab-text-muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {dir === 'clockwise' ? '↻ CW' : '↺ CCW'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {material?.motorType !== 'rod' && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-lab-border-light)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-lab-text-muted)', fontWeight: 500 }}>Radius (r)</label>
                  <span className="sci-chip">{material?.gearRadius || 40}</span>
                </div>
                <input type="range" min="20" max="100" step="5"
                  value={material?.gearRadius || 40}
                  onChange={(e) => setMaterial({ ...material, gearRadius: parseInt(e.target.value, 10) })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-lab-text-muted)', fontWeight: 500 }}>Teeth (n)</label>
                  <span className="sci-chip">{material?.gearTeeth || 12}</span>
                </div>
                <input type="range" min="4" max="32" step="2"
                  value={material?.gearTeeth || 12}
                  onChange={(e) => setMaterial({ ...material, gearTeeth: parseInt(e.target.value, 10) })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
