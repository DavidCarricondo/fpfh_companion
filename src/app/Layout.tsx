import { NavLink, Outlet } from 'react-router'

const link = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium ${
    isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'
  }`

export function Layout() {
  return (
    <div className="flex min-h-full flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center gap-2 border-b border-slate-800 px-4 py-2">
        <span className="mr-auto font-semibold tracking-wide">Five Parsecs Companion</span>
        <nav className="flex gap-1">
          <NavLink to="/" end className={link}>
            Inicio
          </NavLink>
          <NavLink to="/tables" className={link}>
            Tablas
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
