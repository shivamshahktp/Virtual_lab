export default function About() {
  return (
    <div className="flex flex-col items-center pt-20 bg-white min-h-[calc(100vh-73px)] px-4">
      <div className="w-full max-w-4xl">
        <h2 className="text-[28px] font-bold text-[#0f172a] mb-6">About Virtual-Lab</h2>
        
        <div className="bg-[#f8fafc] border border-gray-100 rounded-xl p-8 mb-8">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Project Overview</h3>
          <p className="text-[15px] text-gray-600 mb-4 leading-relaxed">
            VIRTUAL-LAB is a collaborative 2D physics sandbox designed to bridge the gap between theoretical equations and physical reality. 
            It provides a "Digital Twin" environment where multiple users can build machines, test structural integrity, and observe real-time forces together.
          </p>
          <p className="text-[15px] text-gray-600 leading-relaxed">
            Built as part of an engineering capstone, it utilizes Matter.js for high-fidelity physics simulation and Socket.io for low-latency state synchronization across clients.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-100 rounded-xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Mentor</h3>
            <ul className="text-[15px] text-gray-600 space-y-1">
              <li>PRAJIT R</li>
            </ul>
          </div>
          <div className="border border-gray-100 rounded-xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Team</h3>
            <p className="text-[15px] text-gray-600">
              Developed by engineering students passionate about physics and interactive learning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
