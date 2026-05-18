import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('virtual-lab-user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => {
    return localStorage.getItem('virtual-lab-token') || null;
  });

  const login = async (username, password) => {
    const res = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('virtual-lab-user', JSON.stringify(data.user));
    localStorage.setItem('virtual-lab-token', data.token);
  };

  const signup = async (username, email, password) => {
    const res = await fetch('http://localhost:5001/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('virtual-lab-user', JSON.stringify(data.user));
    localStorage.setItem('virtual-lab-token', data.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('virtual-lab-user');
    localStorage.removeItem('virtual-lab-token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
