export default function MaterialPicker({ material, setMaterial }) {
  return (
    <div className="absolute top-4 right-4 bg-lab-surface border border-lab-border rounded-xl shadow-2xl p-5 w-72 z-10 text-sm">
      <h3 className="text-lab-text font-semibold mb-5 border-b border-lab-border pb-2">Material Properties</h3>
      
      {/* Restitution (Bounciness) */}
      <div className="mb-5">
        <div className="flex justify-between mb-2">
          <label className="text-lab-text-muted">Bounciness</label>
          <span className="text-lab-accent-light font-mono bg-lab-bg px-2 rounded">{material.restitution.toFixed(1)}</span>
        </div>
        <input 
          type="range" min="0" max="1.5" step="0.1" 
          value={material.restitution}
          onChange={(e) => setMaterial({...material, restitution: parseFloat(e.target.value)})}
          className="w-full accent-lab-accent cursor-pointer"
        />
      </div>

      {/* Friction */}
      <div className="mb-5">
        <div className="flex justify-between mb-2">
          <label className="text-lab-text-muted">Friction</label>
          <span className="text-lab-accent-light font-mono bg-lab-bg px-2 rounded">{material.friction.toFixed(2)}</span>
        </div>
        <input 
          type="range" min="0" max="1" step="0.05" 
          value={material.friction}
          onChange={(e) => setMaterial({...material, friction: parseFloat(e.target.value)})}
          className="w-full accent-lab-accent cursor-pointer"
        />
      </div>

      {/* Density */}
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-lab-text-muted">Density</label>
          <span className="text-lab-accent-light font-mono bg-lab-bg px-2 rounded">{material.density.toFixed(3)}</span>
        </div>
        <input 
          type="range" min="0.001" max="0.1" step="0.001" 
          value={material.density}
          onChange={(e) => setMaterial({...material, density: parseFloat(e.target.value)})}
          className="w-full accent-lab-accent cursor-pointer"
        />
      </div>
    </div>
  )
}
