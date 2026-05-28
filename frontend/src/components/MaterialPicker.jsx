function SliderRow({ label, symbol, value, display, min, max, step, onChange, hint }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '7px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-lab-text)' }}>{label}</label>
          {symbol && (
            <span style={{
              marginLeft: '5px', fontSize: '10px', fontWeight: 500,
              color: 'var(--color-lab-accent)', fontStyle: 'italic',
              fontFamily: 'Georgia, serif'
            }}>{symbol}</span>
          )}
        </div>
        <span className="sci-chip">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={onChange}
        style={{ width: '100%' }}
      />
      {hint && (
        <p style={{ fontSize: '10px', color: 'var(--color-lab-text-subtle)', marginTop: '5px', lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  )
}

export default function MaterialPicker({ material, setMaterial, activeTool, selectedConstraintType }) {
  const showLengthControl =
    ['rope', 'spring', 'rod'].includes(activeTool) ||
    ['rope', 'spring', 'rod'].includes(selectedConstraintType)

  const maxLinkLength =
    typeof window !== 'undefined' ? Math.round(window.innerWidth || 1200) : 1200

  return (
    <div
      className="w-full h-full p-4"
      id="material-picker"
    >

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '14px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--color-lab-border-light)',
      }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '7px',
          background: 'var(--color-lab-accent-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 13L8 3L13 13" stroke="#1e6fe8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 10h6" stroke="#1e6fe8" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-lab-text)', letterSpacing: '0.02em' }}>
            Material Properties
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-lab-text-muted)' }}>
            Physics parameters
          </div>
        </div>
      </div>


      <SliderRow
        label="Restitution"
        symbol="e"
        value={material.restitution}
        display={material.restitution.toFixed(2)}
        min="0" max="1" step="0.05"
        onChange={(e) => setMaterial({ ...material, restitution: parseFloat(e.target.value) })}
        hint="Coefficient of restitution — ratio of post- to pre-collision speed"
      />


      <SliderRow
        label="Friction"
        symbol="μ"
        value={material.friction}
        display={material.friction.toFixed(2)}
        min="0" max="1" step="0.05"
        onChange={(e) => setMaterial({ ...material, friction: parseFloat(e.target.value) })}
        hint="Coulomb friction coefficient — resistance to sliding contact"
      />


      <SliderRow
        label="Density"
        symbol="ρ"
        value={material.density}
        display={material.density.toFixed(3)}
        min="0.001" max="0.1" step="0.001"
        onChange={(e) => setMaterial({ ...material, density: parseFloat(e.target.value) })}
        hint={showLengthControl ? 'Mass per unit area — affects inertia' : 'Mass per unit area — affects inertia'}
      />


      {showLengthControl && (
        <div style={{
          marginTop: '4px',
          paddingTop: '14px',
          borderTop: '1px dashed var(--color-lab-border-light)',
        }}>
          <SliderRow
            label={
              (activeTool === 'rod' || selectedConstraintType === 'rod') ? "Rod Length" :
              (activeTool === 'spring' || selectedConstraintType === 'spring') ? "Spring Length" :
              "Rope Length"
            }
            symbol="L"
            value={
              (activeTool === 'rod' || selectedConstraintType === 'rod') ? (material.rodLength ?? 120) :
              (activeTool === 'spring' || selectedConstraintType === 'spring') ? (material.springLength ?? 120) :
              (material.ropeLength ?? 120)
            }
            display={`${Math.round(
              (activeTool === 'rod' || selectedConstraintType === 'rod') ? (material.rodLength ?? 120) :
              (activeTool === 'spring' || selectedConstraintType === 'spring') ? (material.springLength ?? 120) :
              (material.ropeLength ?? 120)
            )} px`}
            min="20" max={maxLinkLength} step="5"
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              if (activeTool === 'rod' || selectedConstraintType === 'rod') setMaterial({ ...material, rodLength: val })
              else if (activeTool === 'spring' || selectedConstraintType === 'spring') setMaterial({ ...material, springLength: val })
              else setMaterial({ ...material, ropeLength: val })
            }}
            hint="Natural length of the selected or new constraint"
          />
        </div>
      )}


      <div style={{
        marginTop: '2px',
        padding: '8px 10px',
        background: 'var(--color-lab-surface-alt)',
        borderRadius: '8px',
        border: '1px solid var(--color-lab-border-light)',
      }}>
        <div style={{ fontSize: '10px', color: 'var(--color-lab-text-muted)', lineHeight: 1.7 }}>
          <span style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif', color: 'var(--color-lab-accent)' }}>e</span> restitution ·{' '}
          <span style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif', color: 'var(--color-lab-accent)' }}>μ</span> friction ·{' '}
          <span style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif', color: 'var(--color-lab-accent)' }}>ρ</span> density
          {showLengthControl && (
            <> · <span style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif', color: 'var(--color-lab-accent)' }}>L</span> length</>
          )}
        </div>
      </div>
    </div>
  )
}
