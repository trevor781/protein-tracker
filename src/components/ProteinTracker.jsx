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
      const today = new Date().toISOString().split('T')[0]

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

      // Load today's entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('food_entries')
        .select('*')
        .eq('daily_log_id', log.id)
        .order('created_at', { ascending: false })

      if (entriesError) throw entriesError
      setEntries(entriesData || [])
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
      setSuggestion(null) // Clear suggestion after adding food
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
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
  }

  return (
    <div className="tracker-container">
      {/* Header */}
      <div className="tracker-header">
        <h1>💪 Protein Tracker</h1>
        <div className="user-info">
          <div className="user-email">
            {user.email}
          </div>
          <button onClick={handleSignOut} style={{
            padding: '6px 12px',
            fontSize: '14px',
            backgroundColor: '#f44336',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Progress Section */}
      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '18px', fontWeight: '600' }}>
            Today's Progress
          </span>
          <span style={{ fontSize: '18px', fontWeight: '600' }}>
            {totalProtein.toFixed(1)}g / {goalProtein}g
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '30px',
          backgroundColor: '#ddd',
          borderRadius: '15px',
          overflow: 'hidden',
          marginBottom: '10px'
        }}>
          <div style={{
            width: `${progressPercentage}%`,
            height: '100%',
            backgroundColor: progressPercentage >= 100 ? '#4CAF50' : '#2196F3',
            transition: 'width 0.3s ease'
          }}></div>
        </div>

        <div style={{ fontSize: '14px', color: '#666' }}>
          {remaining > 0 ? (
            <>You need <strong>{remaining.toFixed(1)}g more</strong> protein today</>
          ) : (
            <span style={{ color: '#4CAF50', fontWeight: '600' }}>✅ Goal reached!</span>
          )}
        </div>
      </div>

      {/* Add Food Form */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Add Food</h2>

        <form onSubmit={handleAddFood}>
          <div className="food-form-grid">
            <input
              type="text"
              placeholder="Food name (e.g., Chicken breast)"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              required
              style={{
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />

            <input
              type="number"
              step="0.1"
              placeholder="Protein (g)"
              value={proteinGrams}
              onChange={(e) => setProteinGrams(e.target.value)}
              required
              style={{
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />

            <select
              value={mealTime}
              onChange={(e) => setMealTime(e.target.value)}
              style={{
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
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
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: submitting ? '#999' : '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Adding...' : 'Add Food'}
          </button>
        </form>
      </div>

      {/* AI Suggestion Section */}
      <div style={{
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>🤖 Need a meal idea?</h3>
          <button
            onClick={handleGetSuggestion}
            disabled={loadingSuggestion}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: loadingSuggestion ? '#999' : '#ffc107',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: loadingSuggestion ? 'not-allowed' : 'pointer'
            }}
          >
            {loadingSuggestion ? 'Thinking...' : 'Get Suggestion'}
          </button>
        </div>

        {suggestion && (
          <div style={{
            marginTop: '15px',
            padding: '15px',
            backgroundColor: '#fff',
            borderRadius: '4px',
            whiteSpace: 'pre-wrap'
          }}>
            {suggestion}
          </div>
        )}
      </div>

      {/* Today's Entries */}
      <div>
        <h2 style={{ marginBottom: '15px' }}>Today's Entries ({entries.length})</h2>

        {entries.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#999',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px'
          }}>
            No entries yet. Add your first meal above!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {entries.map(entry => (
              <div
                key={entry.id}
                className="entry-card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '8px'
                }}
              >
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '5px' }}>
                    {entry.food_name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    <span style={{ textTransform: 'capitalize' }}>{entry.meal_time}</span>
                    {' • '}
                    {new Date(entry.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                <div className="entry-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontSize: '18px', fontWeight: '600', color: '#4CAF50' }}>
                    {entry.protein_grams}g
                  </span>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '14px',
                      backgroundColor: '#f44336',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
