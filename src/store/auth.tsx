import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, getToken, setToken } from '../services/api'
import type { Usuario } from '../types/trazabilidad'

interface AuthContextValor {
  usuario: Usuario | null
  cargando: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValor | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      setCargando(false)
      return
    }
    api
      .miUsuario()
      .then(setUsuario)
      .catch(() => {
        setToken(null)
        setUsuario(null)
      })
      .finally(() => setCargando(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password)
    setToken(res.token)
    setUsuario(res.usuario)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUsuario(null)
  }, [])

  const valor = useMemo(
    () => ({ usuario, cargando, login, logout }),
    [usuario, cargando, login, logout],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValor {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
