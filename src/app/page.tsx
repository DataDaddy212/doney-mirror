'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Set up default workspace if none exists
    const workspaceId = localStorage.getItem('workspaceId')
    const workspaceName = localStorage.getItem('workspaceName')
    
    if (!workspaceId) {
      // Create default workspace
      const defaultWorkspaceId = 'default-workspace'
      const defaultWorkspaceName = 'My Workspace'
      
      localStorage.setItem('workspaceId', defaultWorkspaceId)
      localStorage.setItem('workspaceName', defaultWorkspaceName)
    }
    
    // Redirect to dashboard
    router.replace('/dashboard')
  }, [router])

  return null
}
