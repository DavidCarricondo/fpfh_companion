import type { RouteObject } from 'react-router'
import { CreationPage, LogPage, TurnPage } from '../features/campaign/CampaignPages'
import { HomePage } from '../features/campaign/HomePage'
import { GlossaryPage } from '../features/glossary/GlossaryPage'
import { TablesPage } from '../features/tables/TablesPage'
import { Layout } from './Layout'
import { NotFoundPage } from './NotFoundPage'

// Hash routing: funciona en cualquier hosting estático y en el build de archivo único (spec §3).
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/c/:id/create', element: <CreationPage /> },
      { path: '/c/:id/turn', element: <TurnPage /> },
      { path: '/c/:id/log', element: <LogPage /> },
      { path: '/tables', element: <TablesPage /> },
      { path: '/glossary', element: <GlossaryPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
