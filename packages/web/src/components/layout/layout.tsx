import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useStore } from '@/store'
import { useEffect } from 'react'
import { wsService } from '@/services/websocket'
import { cn } from '@/lib/utils'

export function Layout() {
  const { isConnected, setIsConnected } = useStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Set up connection status listener
    wsService.on('connected', setIsConnected)

    return () => {
      wsService.off('connected', setIsConnected)
    }
  }, [setIsConnected])

  return (
    <div className="flex h-screen">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform border-r bg-background transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-background">
          <div className="flex h-14 items-center gap-4 px-4 lg:h-16 lg:px-6">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle sidebar</span>
            </Button>

            {/* Header content */}
            <div className="flex flex-1 items-center justify-between">
              <h1 className="text-lg font-semibold lg:hidden">jsx-migr8</h1>
              <div className="ml-auto flex items-center space-x-4">
                {/* Connection status */}
                <div className="flex items-center space-x-2">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      isConnected ? 'bg-green-500' : 'bg-red-500'
                    )}
                  />
                  <span className="hidden text-sm text-muted-foreground sm:inline">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>

                {/* Theme toggle */}
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}