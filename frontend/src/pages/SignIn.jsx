import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignIn() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (username.trim() && password.trim()) {
        await login(username.trim(), password.trim());
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center pt-24 bg-slate-50 min-h-[calc(100vh-73px)]">
      <div className="w-full max-w-[440px] px-4">
        <h2 className="text-[28px] font-bold text-[#0f172a] mb-2">Sign In</h2>
        <p className="text-[15px] text-gray-500 mb-8 leading-relaxed">
          Log in to access your saved rooms and continue your experiments.
        </p>

        <div className="border border-gray-100 shadow-sm rounded-xl p-8 bg-white">
          <form className="flex flex-col gap-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-[14px] font-semibold text-gray-700 mb-2">Username</label>
              <input
                type="text"
                placeholder="user1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-4 py-3 text-[15px] focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
            
            <div>
              <label className="block text-[14px] font-semibold text-gray-700 mb-2">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-blue-500 rounded-md px-4 py-3 text-[15px] outline-none shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1d4ed8] text-white font-bold py-3.5 rounded-md mt-2 hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-70"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
