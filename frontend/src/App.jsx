import React, { useState } from 'react';
import PhysicsCanvas from './components/PhysicsCanvas';
import AnalyticsPanel from './components/AnalyticsPanel';

function App() {
  const [spawnRequest, setSpawnRequest] = useState(null);
  const [chartData, setChartData] = useState([]);
  
  // NEW: Track what the user's mouse is currently doing
  const [interactionMode, setInteractionMode] = useState('grab'); 

  const handleSpawn = (shapeType) => {
    setSpawnRequest({ type: shapeType, id: Math.random().toString(36).substring(2, 9), timestamp: Date.now() });
  };

  return (
    <div className="flex h-screen w-screen font-mono text-gray-200">
      <div className="w-64 bg-slate-900 border-r border-slate-700 p-4 flex flex-col gap-4 z-10 shadow-xl">
        <h1 className="text-2xl font-bold tracking-widest text-white border-b border-slate-700 pb-2">
          VIRTUAL-LAB
        </h1>
        
        {/* NEW: Interaction Mode Controls */}
        <div className="flex flex-col gap-2 mt-4">
          <h2 className="text-xs text-gray-400 mb-1">TOOLS</h2>
          <button 
            onClick={() => setInteractionMode('grab')} 
            className={`px-4 py-2 rounded text-left transition duration-200 ${interactionMode === 'grab' ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'} border border-slate-600`}
          >
            ✋ Grab Tool
          </button>
          <button 
            onClick={() => setInteractionMode('spring')} 
            className={`px-4 py-2 rounded text-left transition duration-200 ${interactionMode === 'spring' ? 'bg-emerald-600' : 'bg-slate-800 hover:bg-slate-700'} border border-slate-600`}
          >
            🔗 Connect (Spring)
          </button>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <h2 className="text-xs text-gray-400 mb-1">SPAWN ENTITIES</h2>
          <button onClick={() => handleSpawn('box')} className="bg-slate-800 hover:bg-slate-700 border border-slate-600 px-4 py-2 rounded text-left transition">
            + Add Box
          </button>
          <button onClick={() => handleSpawn('circle')} className="bg-slate-800 hover:bg-slate-700 border border-slate-600 px-4 py-2 rounded text-left transition">
            + Add Circle
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-950 p-6 flex flex-col gap-4 overflow-hidden">
        <div className="h-12 bg-slate-900 rounded border border-slate-800 flex items-center px-4 justify-between shrink-0">
           <span className="text-sm">Room: <span className="font-bold text-blue-400 ml-2">Physics-101</span></span>
           <span className="text-xs text-gray-500">Current Tool: <span className="text-white">{interactionMode.toUpperCase()}</span></span>
        </div>

        <div className="flex-[2] rounded-lg border border-slate-800 relative min-h-[300px]">
           {/* Pass the mode down to the canvas */}
           <PhysicsCanvas spawnRequest={spawnRequest} setChartData={setChartData} mode={interactionMode} />
        </div>

        <div className="shrink-0 h-64">
            <AnalyticsPanel data={chartData} />
        </div>
      </div>
    </div>
  );
}

export default App;