import { NextRequest, NextResponse } from 'next/server'

interface Task {
  id: string
  text: string
  completed: boolean
  parentGoal?: string
}

export async function POST(request: NextRequest) {
  try {
    const { goal } = await request.json()

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal is required' },
        { status: 400 }
      )
    }

    // TODO: Integrate with GPT API to generate subtasks
    // For now, return mock tasks based on the goal
    const mockTasks: Task[] = [
      {
        id: `task-${Date.now()}-1`,
        text: `Research and gather information about ${goal}`,
        completed: false,
        parentGoal: goal,
      },
      {
        id: `task-${Date.now()}-2`,
        text: `Create a plan or outline for ${goal}`,
        completed: false,
        parentGoal: goal,
      },
      {
        id: `task-${Date.now()}-3`,
        text: `Set up the necessary tools or environment for ${goal}`,
        completed: false,
        parentGoal: goal,
      },
      {
        id: `task-${Date.now()}-4`,
        text: `Start working on the first step of ${goal}`,
        completed: false,
        parentGoal: goal,
      },
    ]

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    return NextResponse.json({ tasks: mockTasks })
  } catch (error) {
    console.error('Error generating tasks:', error)
    return NextResponse.json(
      { error: 'Failed to generate tasks' },
      { status: 500 }
    )
  }
}


