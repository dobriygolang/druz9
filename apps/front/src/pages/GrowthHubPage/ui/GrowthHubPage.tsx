import { Outlet } from 'react-router-dom'

export function GrowthHubPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}
