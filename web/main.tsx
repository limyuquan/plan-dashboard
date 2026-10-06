import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/tokens.css'
import './styles/base.css'
import './styles/sidebar.css'
import './styles/panes.css'
import './styles/toasts.css'
import './styles/settings.css'

createRoot(document.getElementById('root')!).render(<App />)
