import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MyExperiments() {
  const [savedRooms, setSavedRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyRooms = async () => {
      try {
        const token = localStorage.getItem('virtual-lab-token');
        if (!token) {
          navigate('/signin');
          return;
        }

        const res = await fetch('http://localhost:5001/api/rooms/my-experiments', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setSavedRooms(data);
      } catch (err) {
        console.error('Failed to fetch rooms', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMyRooms();
  }, [navigate]);

  const removeRoom = (roomId, e) => {
    e.stopPropagation();
    // For now, we'll just hide it locally. In a full implementation, you'd add a DELETE endpoint.
    const updated = savedRooms.filter(r => r.roomId !== roomId);
    setSavedRooms(updated);
  };
  return (
    <div className="flex flex-col items-center pt-20 bg-white min-h-[calc(100vh-73px)] px-4">
      <div className="w-full max-w-4xl">
        <h2 className="text-[28px] font-bold text-[#0f172a] mb-2">My Experiments</h2>
        
        <p className="text-[15px] text-gray-500 mb-8 leading-relaxed">
          These are the sandbox rooms you've created and saved. They are private to you.
        </p>

        {isLoading ? (
          <div className="bg-[#f8fafc] border border-gray-100 rounded-xl p-10 flex justify-center items-center">
            <p className="text-[14px] text-gray-500 font-medium">Loading your experiments...</p>
          </div>
        ) : savedRooms.length === 0 ? (
          <div className="bg-[#f8fafc] border border-gray-100 rounded-xl p-10 flex justify-center items-center">
            <p className="text-[14px] text-gray-500 font-medium">
              No saved rooms yet. Use <span className="text-[#3b82f6] font-semibold cursor-pointer" onClick={() => navigate('/')}>Create Room</span>, then choose <span className="text-[#3b82f6] font-semibold cursor-pointer">Save Room</span> in the top bar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedRooms.map(room => (
              <div 
                key={room.roomId}
                onClick={() => navigate(`/room/${room.roomId}`)}
                className="bg-white border border-gray-200 rounded-xl p-6 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Room ID</div>
                  <div className="text-xl font-mono font-bold text-[#1e6fe8] mb-4">{room.roomId}</div>
                  <div className="text-[12px] font-medium text-gray-500">{room.bodyCount || 0} bodies • {new Date(room.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                  <span className="text-[13px] font-semibold text-blue-600">Open Lab →</span>
                  <button 
                    onClick={(e) => removeRoom(room.roomId, e)}
                    className="text-[12px] text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
