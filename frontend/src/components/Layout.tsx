import { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const navItems = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/ac', label: '远程空调', icon: '❄️' },
    { path: '/finder', label: '实时寻车', icon: '📍' },
  ]

  return (
    <div className="min-h-screen text-white">
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ev-primary to-ev-secondary flex items-center justify-center text-xl">
              ⚡
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-ev-primary to-ev-accent bg-clip-text text-transparent">
                智联车控
              </h1>
              <p className="text-xs text-slate-400">EV Connect</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === item.path
                    ? 'bg-ev-primary/20 text-ev-primary'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span className="mr-1.5">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 pb-28 md:pb-8">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-slate-900/95 backdrop-blur-lg border-t border-slate-700/50 z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center px-4 py-2 rounded-lg transition-all ${
                location.pathname === item.path
                  ? 'text-ev-primary'
                  : 'text-slate-400'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-0.5">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
