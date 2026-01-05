// Secure AI service - calls our backend API instead of exposing API keys
export async function getAISuggestion(remainingProtein, todayEntries) {
  try {
    const response = await fetch('/api/suggestion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        remainingProtein,
        todayEntries: todayEntries.map(e => ({
          food_name: e.food_name,
          protein_grams: e.protein_grams
        }))
      })
    })

    if (!response.ok) {
      const error = await response.json()

      if (response.status === 429) {
        throw new Error(`Too many requests. Please try again in ${error.retryAfter} seconds.`)
      }

      throw new Error(error.error || 'Failed to get suggestion')
    }

    const data = await response.json()
    return data.suggestion

  } catch (error) {
    console.error('AI suggestion error:', error)
    throw new Error(error.message || 'Failed to get AI suggestion')
  }
}
