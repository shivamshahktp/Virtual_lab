import { useState, useEffect } from 'react'
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts'

export default function AnalyticsPanel() {
  const [metrics, setMetrics] = useState({ bodies: 0, fps: 0, telemetry: null })
  const [history, setHistory] = useState([])

  useEffect(() => {
    // Listen to custom event fired by the physics engine every few frames
    const handleMetrics = (e) => {
      setMetrics(e.detail)
      
      // Update chart history if we have telemetry
      if (e.detail.telemetry) {
        setHistory(prev => {
          // Parse the string back to a float for the chart
          const newEnergy = parseFloat(e.detail.telemetry.energy)
          // Add the new data point
          const nextHistory = [...prev, { time: Date.now(), energy: newEnergy }]
          // Keep only the last 60 frames (approx 1 second) so the chart scrolls
          if (nextHistory.length > 60) return nextHistory.slice(nextHistory.length - 60)
          return nextHistory
        })
      } else {
        // Reset chart if they deselect the body
        setHistory(prev => prev.length > 0 ? [] : prev)
      }
    }

    window.addEventListener('physics-metrics', handleMetrics)
    
    return () => window.removeEventListener('physics-metrics', handleMetrics)
  }, [])

  return (
    <div className="absolute bottom-4 right-4 bg-lab-surface border border-lab-border rounded-xl shadow-2xl p-5 w-72 z-10 text-sm">
      <h3 className="text-lab-text font-semibold mb-3 border-b border-lab-border pb-2 flex justify-between items-center">
        <span>📊 Live Analytics</span>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lab-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-lab-success"></span>
        </span>
      </h3>
      
      <div className="flex justify-between mb-2">
        <span className="text-lab-text-muted">FPS</span>
        <span className="text-lab-success font-mono bg-lab-bg px-2 rounded">{metrics.fps}</span>
      </div>
      
      <div className="flex justify-between">
        <span className="text-lab-text-muted">Active Bodies</span>
        <span className="text-lab-accent-light font-mono bg-lab-bg px-2 rounded">{metrics.bodies}</span>
      </div>

      {/* Physics Telemetry for Selected Body */}
      {metrics.telemetry && (
        <div className="mt-4 pt-4 border-t border-lab-border">
          <h4 className="text-xs font-semibold text-lab-text-muted mb-3 uppercase tracking-wider">Telemetry</h4>
          <div className="flex justify-between mb-2">
            <span className="text-lab-text-muted">Speed</span>
            <span className="text-lab-accent-light font-mono bg-lab-bg px-2 rounded">{metrics.telemetry.speed}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-lab-text-muted">Energy (KE)</span>
            <span className="text-lab-danger font-mono bg-lab-bg px-2 rounded">{metrics.telemetry.energy}</span>
          </div>
          
          {/* Live Chart using Recharts */}
          <div className="h-20 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Line 
                  type="monotone" 
                  dataKey="energy" 
                  stroke="#ef4444" 
                  strokeWidth={2} 
                  dot={false} 
                  isAnimationActive={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
