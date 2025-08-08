import { NextRequest, NextResponse } from 'next/server'

interface Material {
  name: string
  qty?: string
  notes?: string
}

interface Step {
  title: string
  description: string
  est_hours: number
  dependencies: string[]
  suggested_role: string
  due_by_days?: number
}

interface PlanResponse {
  parent: string
  summary: string
  materials: Material[]
  steps: Step[]
}

export async function GET() {
  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest) {
  try {
    const { parent } = await request.json()

    if (!parent || typeof parent !== 'string') {
      return NextResponse.json(
        { error: 'Parent goal is required and must be a string' },
        { status: 400 }
      )
    }

    // TODO: AI integration - placeholder for future AI features
    return NextResponse.json({
      error: 'AI planning feature coming soon',
      message: 'This feature will be available in a future update'
    }, { status: 501 })

  } catch (error) {
    console.error('Error generating plan:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
