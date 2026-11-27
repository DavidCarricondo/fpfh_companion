import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <Link to="/" className="text-sky-400 underline">
        Volver al inicio
      </Link>
    </section>
  )
}
