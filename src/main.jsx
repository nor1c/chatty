import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import SingleTabBlocked from './components/SingleTabBlocked'
import { claimSingleTab } from './lib/singleTab'
import './index.css'

const root = createRoot(document.getElementById('root'))
const tabClaim = await claimSingleTab()

root.render(<StrictMode>{tabClaim.acquired ? <App /> : <SingleTabBlocked />}</StrictMode>)
