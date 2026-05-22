import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { user, token } = useAuth()
  const [socket, setSocket] = useState(null)
  // Hold the live ref so cleanup can disconnect even after state updates.
  const ref = useRef(null)

  useEffect(() => {
    if (!user || !token) {
      // Logged out → tear down any open connection.
      if (ref.current) {
        ref.current.disconnect()
        ref.current = null
        setSocket(null)
      }
      return
    }

    const s = io(baseURL, {
      auth: { token },
      // Long-poll first then upgrade — survives sketchy WS proxies in dev.
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 800,
      reconnectionDelayMax: 5000,
    })

    s.on('connect_error', (err) => {
      // Don't crash on a 1-off network blip — socket.io will retry.
      console.warn('[socket] connect_error:', err.message)
    })

    ref.current = s
    setSocket(s)

    return () => {
      s.disconnect()
      ref.current = null
      setSocket(null)
    }
  }, [user?.id, token])

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
