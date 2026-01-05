import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_CLAUDE_API_KEY,
  dangerouslyAllowBrowser: true // Only for demo - in production, call API from backend
})

export async function getAISuggestion(remainingProtein, todayEntries) {
  try {
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

    return message.content[0].text
  } catch (error) {
    console.error('AI suggestion error:', error)
    throw new Error('Failed to get AI suggestion: ' + error.message)
  }
}
