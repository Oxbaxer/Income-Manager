import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const registerSchema = z.object({
  householdName: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login, register: registerFn } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  async function onLogin(data: LoginForm) {
    setError('')
    try {
      await login(data.email, data.password)
      navigate('/')
    } catch (e: any) {
      setError(e.message ?? t('common.error'))
    }
  }

  async function onRegister(data: RegisterForm) {
    setError('')
    try {
      await registerFn(data.householdName, data.name, data.email, data.password)
      navigate('/')
    } catch (e: any) {
      setError(e.message ?? t('common.error'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 shadow-glow mb-4">
            <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Income Manager</h1>
          <p className="text-sm text-white/40 mt-1">Gestion budgétaire familiale</p>
        </div>

        {/* Card */}
        <div className="glass p-8">
          {/* Tab switch */}
          <div className="flex rounded-lg bg-surface-2 p-1 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'login' ? 'bg-primary text-white shadow-glow' : 'text-white/50 hover:text-white'}`}
            >
              {t('auth.login')}
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'register' ? 'bg-primary text-white shadow-glow' : 'text-white/50 hover:text-white'}`}
            >
              {t('auth.register')}
            </button>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm">
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <Input
                label={t('auth.email')}
                type="email"
                placeholder="vous@exemple.fr"
                error={loginForm.formState.errors.email?.message}
                {...loginForm.register('email')}
              />
              <Input
                label={t('auth.password')}
                type="password"
                placeholder="••••••••"
                error={loginForm.formState.errors.password?.message}
                {...loginForm.register('password')}
              />
              <Button
                type="submit"
                className="w-full mt-2"
                size="lg"
                loading={loginForm.formState.isSubmitting}
              >
                {t('auth.loginBtn')}
              </Button>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
              <Input
                label={t('auth.householdName')}
                placeholder="Famille Dupont"
                error={registerForm.formState.errors.householdName?.message}
                {...registerForm.register('householdName')}
              />
              <Input
                label={t('auth.name')}
                placeholder="Jean"
                error={registerForm.formState.errors.name?.message}
                {...registerForm.register('name')}
              />
              <Input
                label={t('auth.email')}
                type="email"
                placeholder="vous@exemple.fr"
                error={registerForm.formState.errors.email?.message}
                {...registerForm.register('email')}
              />
              <Input
                label={t('auth.password')}
                type="password"
                placeholder="8 caractères minimum"
                error={registerForm.formState.errors.password?.message}
                {...registerForm.register('password')}
              />
              <Button
                type="submit"
                className="w-full mt-2"
                size="lg"
                loading={registerForm.formState.isSubmitting}
              >
                {t('auth.registerBtn')}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
