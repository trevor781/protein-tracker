# Protein Tracker - Setup Guide

## Overview
A web app to track daily protein intake and get AI-powered meal suggestions to meet your goals.

**Your daily goal:** 120-130g protein/day

## Prerequisites
- Node.js 18+ installed
- A Supabase account (free tier is fine)
- A Claude API key from Anthropic

---

## Step 1: Set up Supabase

### 1.1 Create a Supabase Project
1. Go to https://supabase.com and sign in (or create an account)
2. Click **"New Project"**
3. Fill in the details:
   - **Name:** `protein-tracker`
   - **Database Password:** Create a strong password (save it somewhere safe!)
   - **Region:** Choose the one closest to you
4. Click **"Create new project"**
5. Wait ~2 minutes for the project to be ready

### 1.2 Get Your API Credentials
1. In your Supabase dashboard, go to **Settings** (gear icon in sidebar)
2. Click **"API"** in the settings menu
3. You'll see two important values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
4. Keep this page open - you'll need these in a moment

### 1.3 Set Up the Database
1. In Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open the `supabase-schema.sql` file in this project
4. Copy the entire contents and paste into the Supabase SQL editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned" - that's good!

### 1.4 Enable Email Authentication
1. Go to **Authentication** > **Providers** in Supabase
2. Make sure **"Email"** is enabled (it should be by default)
3. You can disable other providers if you want

---

## Step 2: Get Your Claude API Key

1. Go to https://console.anthropic.com/
2. Sign in (or create an account)
3. Go to **"API Keys"** in the sidebar
4. Click **"Create Key"**
5. Give it a name like "Protein Tracker"
6. Copy the API key (starts with `sk-ant-...`)
7. **Important:** Save this key somewhere safe - you can't see it again!

---

## Step 3: Configure Environment Variables

1. Open the `.env` file in this project (in your code editor)
2. Replace the placeholder values with your real credentials:

```env
# From Supabase Settings > API
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# From Anthropic Console
VITE_CLAUDE_API_KEY=sk-ant-api03-...
```

3. Save the file

---

## Step 4: Install Dependencies & Run

```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

The app should open at `http://localhost:5173`

---

## Features

### ✅ Currently Implemented
- Project structure and database schema
- Supabase authentication setup
- Claude API integration ready

### 🚧 Coming Next
- Daily protein tracker UI
- Add food entries with protein amounts
- Progress bar toward your daily goal
- "Get AI Suggestion" button for meal ideas
- History view to see past days
- User authentication flow

---

## Project Structure

```
protein-tracker/
├── src/
│   ├── lib/
│   │   └── supabase.js          # Supabase client config
│   ├── components/              # React components (to be built)
│   ├── services/                # API services (to be built)
│   ├── App.jsx                  # Main app component
│   └── main.jsx                 # Entry point
├── supabase-schema.sql          # Database schema (run in Supabase)
├── .env                         # Your secrets (DO NOT COMMIT)
├── .env.example                 # Template for environment variables
└── SETUP.md                     # This file
```

---

## Database Schema

### Tables

**`daily_logs`** - Daily protein tracking summary
- Unique entry per user per day
- Stores protein goal (default: 120g)
- Automatically calculates total from food entries

**`food_entries`** - Individual food items
- Links to a daily log
- Stores food name, protein amount, meal time
- Timestamps for tracking when you ate

### Security
- Row Level Security (RLS) enabled
- Users can only see/edit their own data
- Automatic user ID validation on all operations

---

## Troubleshooting

**"Supabase client is not defined"**
- Make sure you filled in your `.env` file with real values
- Restart the dev server after editing `.env`

**"Invalid API key"**
- Double-check your Claude API key in `.env`
- Make sure there are no extra spaces or quotes

**Database queries failing**
- Verify you ran the entire `supabase-schema.sql` script
- Check Supabase dashboard > "Database" > "Tables" to see if tables exist

---

## Next Steps

Once you've completed this setup:
1. Test that the app loads without errors
2. We'll build the authentication UI
3. Then the daily tracker interface
4. Finally, the AI suggestion feature

Let me know when you're ready to continue!
