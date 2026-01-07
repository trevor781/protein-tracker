import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getAISuggestion } from '../services/ai'
import './ProteinTracker.css'

export default function ProteinTracker({ user }) {
  const [todayLog, setTodayLog] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [goalProtein, setGoalProtein] = useState(120)

  // Form state
  const [foodName, setFoodName] = useState('')
  const [proteinGrams, setProteinGrams] = useState('')
  const [mealTime, setMealTime] = useState('snack')
  const [submitting, setSubmitting] = useState(false)

  // AI suggestion state
  const [suggestion, setSuggestion] = useState(null)
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)

  const totalProtein = entries.reduce((sum, entry) => sum + parseFloat(entry.protein_grams), 0)
  const progressPercentage = Math.min((totalProtein / goalProtein) * 100, 100)
  const remaining = Math.max(goalProtein - totalProtein, 0)

  useEffect(() => {
    loadTodayData()
  }, [user])

  async function loadTodayData() {
    try {
      setLoading(true)
      // Get today's date in user's local timezone (not UTC)
      const today = new Date().toLocaleDateString('en-CA') // Returns YYYY-MM-DD format

      // Get or create today's log using upsert to handle race conditions
      const { data: log, error: upsertError } = await supabase
        .from('daily_logs')
        .upsert(
          {
            user_id: user.id,
            date: today,
            goal_protein: goalProtein
          },
          {
            onConflict: 'user_id,date',
            ignoreDuplicates: false
          }
        )
        .select()
        .single()

      if (upsertError) throw upsertError

      setTodayLog(log)
      setGoalProtein(log.goal_protein)

      // Load today's entries based on when they were actually created (in user's timezone)
      // This fixes the issue where entries were saved with wrong date due to UTC confusion
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)

      const { data: entriesData, error: entriesError } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false })

      if (entriesError) throw entriesError
      setEntries(entriesData || [])

      // Fix any entries that are linked to wrong daily_log (due to old UTC bug)
      // Update them to point to today's correct log
      if (entriesData && entriesData.length > 0) {
        const entriesToFix = entriesData.filter(e => e.daily_log_id !== log.id)
        if (entriesToFix.length > 0) {
          await supabase
            .from('food_entries')
            .update({ daily_log_id: log.id })
            .in('id', entriesToFix.map(e => e.id))
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Error loading your data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddFood(e) {
    e.preventDefault()
    if (!foodName || !proteinGrams) return

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('food_entries')
        .insert({
          user_id: user.id,
          daily_log_id: todayLog.id,
          food_name: foodName,
          protein_grams: parseFloat(proteinGrams),
          meal_time: mealTime
        })
        .select()
        .single()

      if (error) throw error

      setEntries([data, ...entries])
      setFoodName('')
      setProteinGrams('')
      setSuggestion(null)
    } catch (error) {
      console.error('Error adding food:', error)
      alert('Error adding food: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteEntry(entryId) {
    if (!confirm('Delete this entry?')) return

    try {
      const { error } = await supabase
        .from('food_entries')
        .delete()
        .eq('id', entryId)

      if (error) throw error
      setEntries(entries.filter(e => e.id !== entryId))
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Error deleting entry: ' + error.message)
    }
  }

  async function handleGetSuggestion() {
    setLoadingSuggestion(true)
    try {
      const suggestionText = await getAISuggestion(remaining, entries)
      setSuggestion(suggestionText)
    } catch (error) {
      console.error('Error getting suggestion:', error)
      alert('Error getting suggestion: ' + error.message)
    } finally {
      setLoadingSuggestion(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return <div className="tracker-page">Loading...</div>
  }

  return (
    <div className="tracker-page">
      {/* Header */}
      <header className="tracker-header">
        <h1 className="tracker-title">💪 Protein Tracker</h1>
        <div className="tracker-user-section">
          <div className="tracker-user-email">{user.email}</div>
          <button onClick={handleSignOut} className="tracker-signout-btn">
            Sign Out
          </button>
        </div>
      </header>

      {/* Progress Section */}
      <section className="tracker-progress">
        <div className="tracker-progress-header">
          <span className="tracker-progress-title">Today's Progress</span>
          <span className="tracker-progress-numbers">
            {totalProtein.toFixed(1)}g / {goalProtein}g
          </span>
        </div>

        <div className="tracker-progress-bar-container">
          <div
            className={`tracker-progress-bar-fill ${progressPercentage >= 100 ? 'complete' : ''}`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        <div className={`tracker-progress-text ${remaining <= 0 ? 'complete' : ''}`}>
          {remaining > 0 ? (
            <>You need <strong>{remaining.toFixed(1)}g more</strong> protein today</>
          ) : (
            <span>✅ Goal reached!</span>
          )}
        </div>
      </section>

      {/* Add Food Form */}
      <section className="tracker-add-food">
        <h2 className="tracker-add-food-title">Add Food</h2>

        <form onSubmit={handleAddFood} className="tracker-add-food-form">
          <div className="tracker-add-food-grid">
            <input
              type="text"
              placeholder="Food name (e.g., Chicken breast)"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              required
              className="tracker-input"
            />

            <input
              type="number"
              step="0.1"
              placeholder="Protein (g)"
              value={proteinGrams}
              onChange={(e) => setProteinGrams(e.target.value)}
              required
              className="tracker-input"
            />

            <select
              value={mealTime}
              onChange={(e) => setMealTime(e.target.value)}
              className="tracker-input"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
              <option value="other">Other</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="tracker-submit-btn"
          >
            {submitting ? 'Adding...' : 'Add Food'}
          </button>
        </form>
      </section>

      {/* AI Suggestion Section */}
      <section className="tracker-ai-section">
        <div className="tracker-ai-header">
          <h3 className="tracker-ai-title">🤖 Need a meal idea?</h3>
          <button
            onClick={handleGetSuggestion}
            disabled={loadingSuggestion}
            className="tracker-ai-btn"
          >
            {loadingSuggestion ? 'Thinking...' : 'Get Suggestion'}
          </button>
        </div>

        {suggestion && (
          <div className="tracker-ai-result">{suggestion}</div>
        )}
      </section>

      {/* Today's Entries */}
      <section className="tracker-entries-section">
        <h2 className="tracker-entries-title">Today's Entries ({entries.length})</h2>

        {entries.length === 0 ? (
          <div className="tracker-entries-empty">
            No entries yet. Add your first meal above!
          </div>
        ) : (
          <div className="tracker-entries-list">
            {entries.map(entry => (
              <article key={entry.id} className="tracker-entry-card">
                <div className="tracker-entry-info">
                  <div className="tracker-entry-name">{entry.food_name}</div>
                  <div className="tracker-entry-meta">
                    <span className="tracker-entry-meta-meal">{entry.meal_time}</span>
                    {' • '}
                    {new Date(entry.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                <div className="tracker-entry-actions">
                  <span className="tracker-entry-protein">{entry.protein_grams}g</span>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="tracker-entry-delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
