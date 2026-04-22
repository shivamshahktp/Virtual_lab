export default function Toolbar({ activeTool, setActiveTool }) {
  const tools = [
    { id: 'cursor', icon: '👆', label: 'Select / Drag' },
    { id: 'box', icon: '🟥', label: 'Spawn Box' },
    { id: 'circle', icon: '🟢', label: 'Spawn Circle' },
    { id: 'pivot', icon: '📌', label: 'Pin / Pivot (Click a body)' },
    { id: 'spring', icon: '〰️', label: 'Spring (Click 2 bodies)' },
    { id: 'motor', icon: '⚙️', label: 'Spawn Motor (Spinning paddle)' },
  ]

  return (
    <div className="absolute top-4 left-4 bg-lab-surface border border-lab-border rounded-xl shadow-2xl p-2 flex flex-col gap-2 z-10">
      {tools.map(tool => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
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
  )
}
