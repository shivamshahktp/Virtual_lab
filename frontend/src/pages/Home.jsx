import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Layers, Cpu, Activity, FolderOpen, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:5001/api';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    if (!user) {
      navigate('/signin');
      return;
    }
    
    setIsCreating(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/rooms`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user ? localStorage.getItem('virtual-lab-token') : ''}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/room/${data.roomId}`);
      } else {
        setError(data.error || 'Failed to create room');
      }
    } catch {
      setError('Cannot reach server. Is the backend running on port 5001?');
    } finally {
      setIsCreating(false);
    }
  };

  const deliverables = [
    {
      title: 'Interactive Physics Canvas',
      desc: 'A web-based workspace allowing users to drag, drop, and configure physical bodies, shapes, and materials.',
      icon: <Layers className="w-6 h-6 text-blue-500" />
    },
    {
      title: 'Multi-User Room Engine',
      desc: 'A backend system managing synchronized states across users to ensure a seamless, shared physical experience in real-time.',
      icon: <UsersIcon />
    },
    {
      title: 'Physics Accuracy & Constraint System',
      desc: 'Integration of a 2D physics engine (Matter.js) with a functional UI toolset for creating mechanical connections like ropes, springs, pivots, and motorized components.',
      icon: <Cpu className="w-6 h-6 text-blue-500" />
    },
    {
      title: 'Real-Time Analytics Dashboard',
      desc: 'An integrated panel that generates live line charts and vector arrows to visualize velocity, kinetic energy, and forces acting on specific components.',
      icon: <Activity className="w-6 h-6 text-blue-500" />
    },
    {
      title: 'Experiment Library',
      desc: 'A gallery view where users can browse, save, share, and load pre-configured physics scenarios or "lab templates" for classroom assignments.',
      icon: <FolderOpen className="w-6 h-6 text-blue-500" />
    },
    {
      title: 'Agent Middleware',
      desc: 'A high-frequency synchronization layer that broadcasts physics engine deltas to minimize network lag and resolve state conflicts between collaborators.',
      icon: <Zap className="w-6 h-6 text-blue-500" />
    }
  ];

  const techStack = [
    { name: 'Frontend', tech: 'React.js, Matter.js, Tailwind CSS' },
    { name: 'Backend', tech: 'Node.js, Express.js' },
    { name: 'Database', tech: 'MongoDB' },
    { name: 'Real-time', tech: 'WebSockets (Socket.io)' },
    { name: 'Visualization', tech: 'Recharts' },
  ];

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-73px)] bg-slate-50 font-sans pb-20">
      
      {/* Hero Section */}
      <section className="w-full max-w-6xl px-6 pt-24 pb-16 mx-auto flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1">
          <div className="inline-block px-3 py-1 mb-6 text-xs font-semibold tracking-wider text-blue-600 uppercase bg-blue-100 rounded-full">
            Digital Twin Environment
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 font-mono tracking-tight">
            VIRTUAL-LAB
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-8">
            Teaching complex physics and engineering concepts online is often limited to static videos and non-interactive text, failing to build intuition for dynamic physical systems. VIRTUAL-LAB addresses this by providing a collaborative 2D physics sandbox designed for university-level learning. The platform allows multiple users to build machines, test structural integrity, and observe real-time forces in a shared, high-fidelity workspace, effectively bridging the gap between theoretical equations and physical reality through hands-on experimentation.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-all text-[15px] flex items-center justify-center min-w-[160px]"
            >
              {isCreating ? 'Creating...' : 'Launch Workspace'}
            </button>
            <button
              onClick={() => navigate('/browse')}
              className="px-8 py-3.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-[15px] shadow-sm"
            >
              Browse Library
            </button>
          </div>
          {error && <div className="mt-4 text-red-500 font-medium text-sm">{error}</div>}
        </div>
        
        {/* Abstract graphic */}
        <div className="flex-1 hidden md:flex justify-center relative">
          <div className="w-[400px] h-[400px] relative">
            <div className="absolute inset-0 bg-blue-100 rounded-full opacity-50 blur-3xl mix-blend-multiply"></div>
            <div className="absolute top-10 right-10 w-64 h-64 bg-slate-200 rounded-xl shadow-2xl border border-white transform rotate-3 flex flex-col overflow-hidden">
               <div className="h-6 bg-slate-300 w-full flex items-center px-2 gap-1">
                 <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                 <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                 <div className="w-2 h-2 rounded-full bg-slate-400"></div>
               </div>
               <div className="flex-1 bg-white relative">
                 {/* Decorative physics elements */}
                 <div className="absolute top-8 left-8 w-12 h-12 rounded-full bg-blue-500 shadow-md"></div>
                 <div className="absolute bottom-8 right-12 w-20 h-10 bg-slate-700 shadow-md transform -rotate-12"></div>
                 <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                   <line x1="72" y1="56" x2="160" y2="160" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
                   <circle cx="160" cy="160" r="4" fill="#3b82f6" />
                 </svg>
               </div>
            </div>
            <div className="absolute bottom-10 left-0 w-48 h-32 bg-white rounded-xl shadow-xl border border-slate-100 flex p-3 flex-col justify-between transform -rotate-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Live Metrics</div>
              <div className="w-full h-10 flex items-end gap-1">
                <div className="w-1/5 bg-blue-200 h-1/2 rounded-t-sm"></div>
                <div className="w-1/5 bg-blue-300 h-3/4 rounded-t-sm"></div>
                <div className="w-1/5 bg-blue-400 h-full rounded-t-sm"></div>
                <div className="w-1/5 bg-blue-500 h-2/3 rounded-t-sm"></div>
                <div className="w-1/5 bg-blue-600 h-5/6 rounded-t-sm"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deliverables Section */}
      <section className="w-full max-w-6xl px-6 py-16 mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-10 text-center font-mono uppercase tracking-wide">Deliverables</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deliverables.map((item, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-5">
                {item.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-3">{item.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="w-full max-w-6xl px-6 py-16 mx-auto">
        <div className="bg-slate-900 rounded-3xl p-8 md:p-12 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-8 text-center font-mono uppercase tracking-wide">Tech Stack & Frameworks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {techStack.map((tech, idx) => (
              <div key={idx} className="flex flex-col p-4 bg-slate-800 rounded-xl border border-slate-700">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{tech.name}</span>
                <span className="text-sm font-medium text-slate-200">{tech.tech}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

function UsersIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
