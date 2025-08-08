'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [workspaceName, setWorkspaceName] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // TODO: Add Supabase workspace creation/fetching logic
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workspaceName, password }),
      })

      if (response.ok) {
        const { workspaceId } = await response.json()
        // Store workspace info in localStorage or state management
        localStorage.setItem('workspaceId', workspaceId)
        localStorage.setItem('workspaceName', workspaceName)
        router.push('/dashboard')
      } else {
        // Handle error
        console.error('Failed to create/fetch workspace')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <span className="text-5xl">🐝</span>
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
              Doney
            </h1>
          </div>
          <p className="text-zinc-600 dark:text-zinc-300 text-lg">
            Break down your goals into manageable steps
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="workspaceName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Workspace Name
              </label>
              <input
                type="text"
                id="workspaceName"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="input-base w-full"
                placeholder="Enter your workspace name"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base w-full"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Loading...' : 'Enter Workspace'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
