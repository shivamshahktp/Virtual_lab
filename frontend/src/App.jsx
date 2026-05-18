import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import About from './pages/About';
import MyExperiments from './pages/MyExperiments';
import LabRoom from './pages/LabRoom';
import Lobby from './components/Lobby'; // Keeping the old Lobby for Browse fallback

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRoomRoute = location.pathname.startsWith('/room/');

  return (
    <>
      {!isRoomRoute && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/about" element={<About />} />
        <Route path="/my-experiments" element={<MyExperiments />} />
        <Route path="/browse" element={<Lobby onJoinRoom={(id) => navigate(`/room/${id}`)} />} />
        <Route path="/room/:roomId" element={<LabRoom />} />
      </Routes>
    </>
  );
}

export default App;
