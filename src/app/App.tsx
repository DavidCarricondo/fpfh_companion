import { createHashRouter, RouterProvider } from 'react-router'
import { Layout } from './Layout'
import { HomePage } from './HomePage'
import { TablesPage } from './TablesPage'
import { NotFoundPage } from './NotFoundPage'

// Hash routing: funciona en cualquier hosting estático y en el build de archivo único (spec §3).
const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/tables', element: <TablesPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
