import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Browse Experiments', path: '/browse' },
    { name: 'My Experiments', path: '/my-experiments' },
    { name: 'About', path: '/about' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 shadow-sm relative z-50">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" stroke="#1e6fe8" strokeWidth="1.5" strokeDasharray="4 2" />
          <path d="M16 6C10 6 6 16 6 16s4 10 10 10 10-10 10-10-4-10-10-10z" stroke="#1e6fe8" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="2.5" fill="#ef4444" />
        </svg>
        <div>
          <h1 className="font-bold text-[#1e6fe8] text-[15px] tracking-wide m-0 leading-tight">VIRTUAL-LAB</h1>
          <span className="text-[11px] text-gray-400 font-medium">Physics Sandbox</span>
        </div>
      </Link>

      {/* Main Links */}
      <div className="flex items-center gap-8">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.name}
              to={link.path}
              className={`text-[14px] font-semibold transition-colors ${
                isActive ? 'text-[#1e6fe8] border-b-2 border-[#1e6fe8] pb-1' : 'text-gray-600 hover:text-[#1e6fe8]'
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-[14px] font-medium text-gray-600">{user.username}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 border border-red-200 text-red-500 font-semibold text-[13px] rounded-md hover:bg-red-50 transition-colors cursor-pointer"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/signin" className="px-5 py-2 bg-[#3b82f6] text-white font-semibold text-[13px] rounded-md hover:bg-blue-600 transition-colors shadow-sm cursor-pointer block">
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-5 py-2 border border-[#3b82f6] text-[#3b82f6] font-semibold text-[13px] rounded-md hover:bg-blue-50 transition-colors cursor-pointer block"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
