import { useState, useEffect } from 'react'
import { LineChart, Line, YAxis, XAxis, ResponsiveContainer, ReferenceLine } from 'recharts'

function MetricRow({ label, symbol, value, color = 'var(--color-lab-accent)' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-lab-text-muted)', fontWeight: 500 }}>{label}</span>
        {symbol && (
          <span style={{ fontSize: '10px', fontStyle: 'italic', fontFamily: 'Georgia, serif', color: 'var(--color-lab-text-subtle)' }}>
            ({symbol})
          </span>
        )}
      </div>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '12px',
        fontWeight: 500,
        color,
        background: 'var(--color-lab-surface-alt)',
        padding: '1px 8px',
        borderRadius: '5px',
        border: '1px solid var(--color-lab-border-light)',
        minWidth: '48px',
        textAlign: 'right',
      }}>{value}</span>
    </div>
  )
}

export default function AnalyticsPanel() {
  const [metrics, setMetrics] = useState({ bodies: 0, fps: 0, telemetry: null })
  const [history, setHistory] = useState([])

  useEffect(() => {
    const handleMetrics = (e) => {
      setMetrics(e.detail)

      if (e.detail.telemetry) {
        setHistory(prev => {
          const newEnergy = parseFloat(e.detail.telemetry.energy)
          const nextHistory = [...prev, { t: prev.length, energy: newEnergy }]
          if (nextHistory.length > 80) return nextHistory.slice(nextHistory.length - 80)
          return nextHistory
        })
      } else {
        setHistory(prev => prev.length > 0 ? [] : prev)
      }
    }

    window.addEventListener('physics-metrics', handleMetrics)
    return () => window.removeEventListener('physics-metrics', handleMetrics)
  }, [])

  const fpsColor = metrics.fps >= 55 ? 'var(--color-lab-success)'
    : metrics.fps >= 30 ? 'var(--color-lab-warning)'
    : 'var(--color-lab-danger)'

  return (
    <div
      className="w-full h-full p-4"
      id="analytics-panel"
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        paddingBottom: '10px',
        borderBottom: '1px solid var(--color-lab-border-light)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div style={{
            width: '26px', height: '26px', borderRadius: '6px',
            background: 'var(--color-lab-accent-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <polyline points="1,11 4,7 7,9 10,4 13,2" stroke="#1e6fe8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-lab-text)' }}>Live Analytics</div>
            <div style={{ fontSize: '10px', color: 'var(--color-lab-text-muted)' }}>Engine telemetry</div>
          </div>
        </div>
        {/* Live dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="animate-pulse-dot" style={{
            display: 'inline-block', width: '6px', height: '6px',
            borderRadius: '50%', background: 'var(--color-lab-success)',
          }} />
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--color-lab-success)', letterSpacing: '0.06em' }}>LIVE</span>
        </div>
      </div>

      {/* Core metrics */}
      <MetricRow label="Frame Rate" symbol="fps" value={metrics.fps} color={fpsColor} />
      <MetricRow label="Bodies" symbol="n" value={metrics.bodies} />

      {/* Separator */}
      <div style={{ height: '1px', background: 'var(--color-lab-border-light)', margin: '8px 0' }} />

      {/* Telemetry section */}
      {metrics.telemetry ? (
        <div className="animate-fade-in">
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-lab-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
            Selected Body
          </div>

          <MetricRow label="Speed" symbol="|v|" value={`${metrics.telemetry.speed} m/s`} color="var(--color-lab-accent)" />
          <MetricRow label="Kinetic Energy" symbol="½mv²" value={`${metrics.telemetry.energy} J`} color="var(--color-lab-danger)" />

          {/* KE chart */}
          {history.length > 2 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '10px', color: 'var(--color-lab-text-muted)', marginBottom: '6px', fontWeight: 500 }}>
                KE over time
              </div>
              <div style={{
                height: '64px',
                background: 'var(--color-lab-surface-alt)',
                borderRadius: '8px',
                border: '1px solid var(--color-lab-border-light)',
                padding: '6px 4px 4px',
                overflow: 'hidden',
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 2, right: 4, bottom: 2, left: 4 }}>
                    <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                    <Line
                      type="monotone"
                      dataKey="energy"
                      stroke="#dc2626"
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          padding: '12px',
          background: 'var(--color-lab-surface-alt)',
          borderRadius: '8px',
          border: '1px dashed var(--color-lab-border)',
          textAlign: 'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 6px' }}>
            <circle cx="12" cy="12" r="9" stroke="var(--color-lab-text-subtle)" strokeWidth="1.5"/>
            <path d="M12 8v4M12 16h.01" stroke="var(--color-lab-text-subtle)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p style={{ fontSize: '11px', color: 'var(--color-lab-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Click a body to<br/>view telemetry
          </p>
        </div>
      )}
    </div>
  )
}
