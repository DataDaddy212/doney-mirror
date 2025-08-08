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
        { error: 'Parent task is required and must be a string' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const prompt = `You are Doney Bee, a planning assistant. The user gives a top-level goal.
Produce a practical, ready-to-execute plan with concrete steps, time estimates, dependencies, materials, and suggested assignees.
DO NOT tell the user to "research" or "make a plan." YOU do the planning and output actionable steps.
Use specific verbs and measurable outcomes. Avoid generic steps like "get started" or "set up tools."
Scope for normal humans with limited time. Aim for 6–12 steps unless truly needed.
For each step:
- title: a short, concrete action (e.g., "Measure garden area and sunlight")
- description: concise details including how to do it and any tips
- est_hours: realistic hours for a single session (integer)
- dependencies: titles of prior steps required (if any)
- suggested_role: who is best to do it (e.g., "You", "Partner", "Either adult")
- due_by_days: optional target in days from today (integer)
Also return a 'materials' array if relevant (gardening: soil, compost, lumber...) with qty/notes if possible.
Return ONLY strict JSON in the exact shape shown.

Parent task: ${parent}

Return JSON in this exact format:
{
  "parent": "${parent}",
  "summary": "One paragraph summary of what this task involves and the overall approach",
  "materials": [
    {
      "name": "Material name",
      "qty": "Quantity if known",
      "notes": "Additional notes if needed"
    }
  ],
  "steps": [
    {
      "title": "Concrete action step",
      "description": "Detailed description of how to do this step",
      "est_hours": 2,
      "dependencies": ["Previous step title if needed"],
      "suggested_role": "You",
      "due_by_days": 7
    }
  ]
}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenAI API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to generate plan', details: errorData },
        { status: 502 }
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: 'No content received from OpenAI' },
        { status: 502 }
      )
    }

    // Try to parse the JSON response
    let planResponse: PlanResponse
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      
      planResponse = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content)
      return NextResponse.json(
        { 
          error: 'Failed to parse plan structure', 
          raw: content,
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        },
        { status: 502 }
      )
    }

    // Validate the parsed response
    if (!planResponse.parent || !planResponse.summary || !Array.isArray(planResponse.steps)) {
      console.error('Invalid plan structure:', planResponse)
      return NextResponse.json(
        { 
          error: 'Invalid plan structure received', 
          raw: content,
          parsed: planResponse
        },
        { status: 502 }
      )
    }

    // Ensure materials is always an array
    if (!Array.isArray(planResponse.materials)) {
      planResponse.materials = []
    }

    // Validate each step
    for (const step of planResponse.steps) {
      if (!step.title || !step.description || typeof step.est_hours !== 'number' || !step.suggested_role) {
        console.error('Invalid step structure:', step)
        return NextResponse.json(
          { 
            error: 'Invalid step structure in plan', 
            raw: content,
            invalidStep: step
          },
          { status: 502 }
        )
      }
    }

    return NextResponse.json(planResponse)

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
