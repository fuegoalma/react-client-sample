import { setupListeners } from '@reduxjs/toolkit/query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'

import { App } from '@/app/App'
import { store } from '@/app/store'
import { config } from '@/config'

import './styles/main.scss'

// Refetch when the tab regains focus or the network comes back.
setupListeners(store.dispatch)

document.title = config.appName

const container = document.getElementById('root')
if (container === null) {
  throw new Error('Root container #root is missing from index.html')
}

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
