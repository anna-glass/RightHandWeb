import { WebSearchInput, ToolResult } from '@/lib/tools'

export async function handleWebSearch(input: WebSearchInput): Promise<ToolResult> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: input.query }]
    })
  })

  if (!res.ok) {
    return { success: false, error: `Search failed: ${res.status}` }
  }

  const data = await res.json()
  return {
    success: true,
    answer: data.choices?.[0]?.message?.content || 'No results found',
    citations: data.citations || []
  }
}
