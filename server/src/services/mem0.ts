// Mem0 personalization, lazily initialised and fully fault-tolerant: if the
// SDK or API call fails, every function degrades to a safe default instead of
// throwing, so the /api/user routes never 500 on personalization errors.

let clientPromise: Promise<any> | null = null

async function getClient(): Promise<any> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const mod: any = await import('mem0ai')
      const MemoryClient = mod.default || mod.MemoryClient
      return new MemoryClient({ apiKey: process.env.MEM0_API_KEY })
    })()
  }
  return clientPromise
}

const TOPIC_KEYWORDS = ['world', 'politics', 'business', 'technology', 'health', 'sport', 'science', 'entertainment', 'travel']

export async function saveUserInterest(userId: string, article: {
  topic?: string
  sentiment?: string
  keywords?: string[]
}): Promise<void> {
  try {
    const mem0 = await getClient()
    const keywords = (article.keywords || []).join(', ')
    await mem0.add([{
      role: 'user',
      content: `User read a ${article.sentiment || 'neutral'} article about ${article.topic || 'general news'}. Keywords: ${keywords}`
    }], { user_id: userId })
  } catch (err: any) {
    console.error('[mem0.saveUserInterest]', err?.message)
  }
}

export async function getUserPreferences(userId: string): Promise<any[]> {
  try {
    const mem0 = await getClient()
    return await mem0.getAll({ user_id: userId })
  } catch (err: any) {
    console.error('[mem0.getUserPreferences]', err?.message)
    return []
  }
}

export async function getPersonalizedTopics(userId: string): Promise<string[]> {
  try {
    const mem0 = await getClient()
    const memories: any[] = await mem0.search('What topics does this user prefer?', { user_id: userId })
    const topics = new Set<string>()
    ;(memories || []).forEach((m: any) => {
      const text = (m.memory || '').toLowerCase()
      TOPIC_KEYWORDS.forEach((t) => {
        if (text.includes(t)) topics.add(t)
      })
    })
    return Array.from(topics)
  } catch (err: any) {
    console.error('[mem0.getPersonalizedTopics]', err?.message)
    return []
  }
}
