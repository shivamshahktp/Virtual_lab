import { io } from 'socket.io-client'

const BACKEND_URL = 'http://localhost:5001'

// Single shared socket instance (so we don't create duplicates)
const socket = io(BACKEND_URL, {
  autoConnect: false, // Don't connect until we explicitly call socket.connect()
})

export default socket
