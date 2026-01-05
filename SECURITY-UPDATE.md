# Security Update - Environment Variables

## What Changed

Your app now uses a **secure backend API** to handle Claude AI requests. Your API key is no longer exposed to the browser!

## Required: Update Vercel Environment Variables

You need to update your environment variables in Vercel:

### Step 1: Go to Vercel Settings
1. Go to https://vercel.com/dashboard
2. Click on your **protein-tracker** project
3. Go to **Settings** → **Environment Variables**

### Step 2: Remove Old Variable
- **Delete**: `VITE_CLAUDE_API_KEY` (this was exposed to browsers - not secure!)

### Step 3: Add New Variable
- **Add**: `CLAUDE_API_KEY` (without VITE_ prefix)
- **Value**: Your Claude API key (same value as before, the `sk-ant-api03-...` key)
- **Environment**: Select **All** (Production, Preview, Development)

### Step 4: Keep These Variables (No Changes Needed)
- ✅ `VITE_SUPABASE_URL` - Keep as is
- ✅ `VITE_SUPABASE_ANON_KEY` - Keep as is

(Supabase keys are safe to expose - they're protected by Row Level Security)

### Step 5: Redeploy
After updating environment variables:
1. Go to **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**

---

## Security Improvements

✅ **API Key Protected**: Claude API key only exists on the server, never sent to browsers

✅ **Rate Limiting**: Users limited to 5 AI suggestions per hour to prevent abuse

✅ **Input Validation**: Server validates all requests before calling Claude API

✅ **Error Handling**: Internal errors don't expose sensitive information

---

## How It Works Now

**Before (Insecure):**
```
Browser → Claude API directly (with exposed API key)
```

**After (Secure):**
```
Browser → Your Vercel Function → Claude API (key stays on server)
```

Anyone inspecting your website can no longer see or steal your API key!
