/**
 * lib/iMessage.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

const BLOOIO_API = 'https://backend.blooio.com/v1/api'

function getHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${process.env.BLOOIO_API_KEY}`,
    'Content-Type': 'application/json'
  }
}

export async function markAsRead(externalId: string): Promise<void> {
  try {
    await fetch(`${BLOOIO_API}/read/${encodeURIComponent(externalId)}`, {
      method: 'POST',
      headers: getHeaders()
    })
  } catch {}
}

export async function startTyping(externalId: string): Promise<void> {
  try {
    await fetch(`${BLOOIO_API}/typing/${encodeURIComponent(externalId)}`, {
      method: 'POST',
      headers: getHeaders()
    })
  } catch {}
}

export async function stopTyping(externalId: string): Promise<void> {
  try {
    await fetch(`${BLOOIO_API}/typing/${encodeURIComponent(externalId)}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
  } catch {}
}

/**
 * sendiMessage
 * sends an imessage via blooio with retry logic.
 */
export async function sendiMessage(
  to: string,
  text: string,
  messageId: string
): Promise<unknown> {
  const delays = [1000, 2000, 4000]

  for (let attempt = 0; attempt < 3; attempt++) {
    const headers = getHeaders()
    headers['Idempotency-Key'] = `msg-${messageId}-${attempt + 1}`

    const res = await fetch(`${BLOOIO_API}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to, text })
    })

    if (res.ok) {
      return res.json()
    }

    if (res.status === 503) {
      throw new Error('Blooio API not configured properly')
    }

    if (res.status >= 400 && res.status < 500) {
      throw new Error(`Blooio error: ${res.status}`)
    }

    if (attempt < 2) {
      await new Promise(r => setTimeout(r, delays[attempt]))
    }
  }

  throw new Error('Failed to send message after 3 retries')
}
