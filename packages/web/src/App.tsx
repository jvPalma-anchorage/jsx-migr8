import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/layout'
import { Dashboard } from '@/pages/dashboard'
import { Inspect } from '@/pages/inspect'
import { DryRun } from '@/pages/dry-run'
import { Migrate } from '@/pages/migrate'
import { Backup } from '@/pages/backup'
import { Rules } from '@/pages/rules'
import { RuleEditor } from '@/pages/rule-editor'
import { Settings } from '@/pages/settings'
import { wsService } from '@/services/websocket'
import { useStore } from '@/store'
import { ThemeProvider } from '@/components/theme-provider'

function App() {
  const setIsConnected = useStore(state => state.setIsConnected)

  useEffect(() => {
    // Initialize WebSocket connection
    wsService.connect()

    // Listen for connection state changes
    wsService.on('connected', (connected: boolean) => {
      setIsConnected(connected)
    })

    // Cleanup on unmount
    return () => {
      wsService.disconnect()
    }
  }, [setIsConnected])

  return (
    <ThemeProvider defaultTheme="system" storageKey="jsx-migr8-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="inspect" element={<Inspect />} />
            <Route path="dry-run" element={<DryRun />} />
            <Route path="migrate" element={<Migrate />} />
            <Route path="backup" element={<Backup />} />
            <Route path="rules" element={<Rules />} />
            <Route path="rule-editor" element={<RuleEditor />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App