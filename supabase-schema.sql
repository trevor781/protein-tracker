-- Protein Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security
ALTER DATABASE postgres SET timezone TO 'UTC';

-- Daily Logs Table
-- Tracks daily protein intake summary
CREATE TABLE daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  goal_protein DECIMAL(5,1) DEFAULT 120.0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, date)
);

-- Food Entries Table
-- Individual meals/foods logged each day
CREATE TABLE food_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  daily_log_id UUID REFERENCES daily_logs(id) ON DELETE CASCADE NOT NULL,
  food_name TEXT NOT NULL,
  protein_grams DECIMAL(5,1) NOT NULL,
  meal_time TEXT CHECK (meal_time IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, date DESC);
CREATE INDEX idx_food_entries_user ON food_entries(user_id);
CREATE INDEX idx_food_entries_daily_log ON food_entries(daily_log_id);

-- Create a function to calculate total protein for a daily log
CREATE OR REPLACE FUNCTION calculate_daily_protein(log_id UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(protein_grams), 0)
  FROM food_entries
  WHERE daily_log_id = log_id;
$$ LANGUAGE SQL;

-- Create a view for daily summaries
CREATE VIEW daily_summaries AS
SELECT
  dl.id,
  dl.user_id,
  dl.date,
  dl.goal_protein,
  COALESCE(SUM(fe.protein_grams), 0) as total_protein,
  COALESCE(SUM(fe.protein_grams), 0) / dl.goal_protein * 100 as progress_percentage,
  COUNT(fe.id) as entry_count,
  dl.created_at,
  dl.updated_at
FROM daily_logs dl
LEFT JOIN food_entries fe ON dl.id = fe.daily_log_id
GROUP BY dl.id, dl.user_id, dl.date, dl.goal_protein, dl.created_at, dl.updated_at;

-- Row Level Security Policies
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;

-- Daily Logs Policies
CREATE POLICY "Users can view their own daily logs"
  ON daily_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily logs"
  ON daily_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily logs"
  ON daily_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily logs"
  ON daily_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Food Entries Policies
CREATE POLICY "Users can view their own food entries"
  ON food_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own food entries"
  ON food_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own food entries"
  ON food_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own food entries"
  ON food_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on daily_logs
CREATE TRIGGER update_daily_logs_updated_at
  BEFORE UPDATE ON daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
