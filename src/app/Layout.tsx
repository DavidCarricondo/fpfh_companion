import { NavLink, Outlet } from 'react-router'
import { ToastHost } from '../components/ToastHost'

const link = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium ${
    isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'
  }`

export function Layout() {
  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center gap-2 border-b border-slate-800 px-4 py-2">
        <span className="mr-auto font-semibold tracking-wide">Five Parsecs Companion</span>
        <nav className="flex gap-1">
          <NavLink to="/" end className={link}>
            Inicio
          </NavLink>
          <NavLink to="/tables" className={link}>
            Tablas
          </NavLink>
          <NavLink to="/glossary" className={link}>
            Glosario
          </NavLink>
        </nav>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <Outlet />
      </main>
      <ToastHost />
    </div>
  )
}
