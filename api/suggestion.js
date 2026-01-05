import Anthropic from '@anthropic-ai/sdk'

// Rate limiting: Store recent requests by IP
const requestLog = new Map()
const RATE_LIMIT = 5 // Max requests per user
const RATE_WINDOW = 60 * 60 * 1000 // 1 hour

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get user IP for rate limiting
  const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress

  // Check rate limit
  const now = Date.now()
  const userRequests = requestLog.get(userIP) || []
  const recentRequests = userRequests.filter(time => now - time < RATE_WINDOW)

  if (recentRequests.length >= RATE_LIMIT) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((recentRequests[0] + RATE_WINDOW - now) / 1000)
    })
  }

  // Update rate limit log
  recentRequests.push(now)
  requestLog.set(userIP, recentRequests)

  try {
    const { remainingProtein, todayEntries } = req.body

    // Validate input
    if (typeof remainingProtein !== 'number' || remainingProtein < 0) {
      return res.status(400).json({ error: 'Invalid remainingProtein value' })
    }

    if (!Array.isArray(todayEntries)) {
      return res.status(400).json({ error: 'Invalid todayEntries value' })
    }

    // Initialize Anthropic client with server-side API key
    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY // Server-side only, not exposed to browser
    })

    // Build context about what they've eaten today
    const entriesContext = todayEntries.length > 0
      ? `Today you've eaten:\n${todayEntries.map(e => `- ${e.food_name} (${e.protein_grams}g protein)`).join('\n')}\n\n`
      : ''

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are a helpful nutrition assistant. A 40-year-old person weighing 140-145 pounds needs ${remainingProtein.toFixed(1)}g more protein today to reach their daily goal.

${entriesContext}Suggest ONE specific, simple meal or snack they can eat right now to help reach their protein goal. Include:
1. The food/meal name
2. Approximate protein content
3. Why it's a good choice

Keep it concise (2-3 sentences max) and practical. Focus on common, easy-to-find foods.`
      }]
    })

    const suggestion = message.content[0].text

    return res.status(200).json({ suggestion })

  } catch (error) {
    console.error('AI suggestion error:', error)

    // Don't expose internal error details to client
    return res.status(500).json({
      error: 'Failed to generate suggestion. Please try again.'
    })
  }
}
