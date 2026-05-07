import { create } from 'zustand'
import { api } from '@/api/client'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (householdName: string, name: string, email: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (email, password) => {
    set({ loading: true })
    try {
      const data = await api.post<{ user: User; access: string; refresh: string }>(
        '/api/auth/login', { email, password }
      )
      api.saveTokens(data.access, data.refresh)
      set({ user: data.user, loading: false })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  register: async (householdName, name, email, password) => {
    set({ loading: true })
    try {
      const data = await api.post<{ user: User; access: string; refresh: string }>(
        '/api/auth/register', { householdName, name, email, password }
      )
      api.saveTokens(data.access, data.refresh)
      set({ user: data.user, loading: false })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  logout: () => {
    api.clearTokens()
    set({ user: null })
  },

  fetchMe: async () => {
    const { access } = api.getTokens()
    if (!access) { set({ loading: false }); return }
    set({ loading: true })
    try {
      const user = await api.get<User>('/api/auth/me')
      set({ user, loading: false })
    } catch {
      api.clearTokens()
      set({ loading: false })
    }
  },
}))
