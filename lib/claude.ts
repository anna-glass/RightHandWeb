import Anthropic from '@anthropic-ai/sdk'
import { executeToolCall, ToolContext } from '@/lib/handlers'

export const MODEL = 'claude-sonnet-4-5-20250929'
export const MAX_TOKENS = 2048

// User-facing messages (for future localization)
export const FALLBACK_RESPONSE = "weird error... try again?"
export const RATE_LIMIT_MESSAGE = "idk how you did it, but you reached the message limit. chill out and try again later"

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

export function extractText(content: Anthropic.ContentBlock[]): string {
  const textBlock = content.find((b): b is Anthropic.TextBlock => b.type === "text")
  return textBlock?.text.trim() || ''
}

export function getToolCalls(content: Anthropic.ContentBlock[]): Anthropic.ToolUseBlock[] {
  return content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
}

export async function getClaudeResponse(
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  tools: Anthropic.Tool[],
  ctx: ToolContext,
  maxIterations: number = 10
): Promise<string> {
  let iterations = 0

  while (iterations < maxIterations) {
    iterations++

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools,
      messages
    })

    messages.push({ role: "assistant", content: response.content })

    if (response.stop_reason === "tool_use") {
      const toolCalls = getToolCalls(response.content)

      const toolResults = await Promise.all(
        toolCalls.map(async (toolUse) => {
          try {
            const result = await executeToolCall(toolUse.name, toolUse.input, ctx)
            return {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify(result)
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify({ error: errorMessage }),
              is_error: true
            }
          }
        })
      )

      messages.push({ role: "user", content: toolResults })
    } else if (response.stop_reason === "end_turn") {
      return extractText(response.content) || FALLBACK_RESPONSE
    } else {
      break
    }
  }

  const lastAssistantMessage = messages[messages.length - 1]
  if (lastAssistantMessage?.role === 'assistant' && Array.isArray(lastAssistantMessage.content)) {
    return extractText(lastAssistantMessage.content as Anthropic.ContentBlock[]) || FALLBACK_RESPONSE
  }
  return FALLBACK_RESPONSE
}
