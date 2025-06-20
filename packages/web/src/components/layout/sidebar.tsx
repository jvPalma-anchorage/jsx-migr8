import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  FileSearch, 
  Play, 
  GitBranch, 
  Archive,
  Home,
  Settings,
  FileCode2
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Inspect', href: '/inspect', icon: FileSearch },
  { name: 'Dry Run', href: '/dry-run', icon: Play },
  { name: 'Migrate', href: '/migrate', icon: GitBranch },
  { name: 'Backup', href: '/backup', icon: Archive },
  { name: 'Rules', href: '/rules', icon: FileCode2 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation()

  return (
    <div className="pb-12 w-full md:w-64">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            jsx-migr8
          </h2>
          <div className="space-y-1">
            {navigation.map((item) => (
              <Button
                key={item.name}
                variant={location.pathname === item.href ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  location.pathname === item.href && 'bg-secondary'
                )}
                asChild
                onClick={onNavigate}
              >
                <Link to={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}