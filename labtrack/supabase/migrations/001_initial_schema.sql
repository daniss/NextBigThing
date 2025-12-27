-- Supabase Database Schema for LabTrack
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'cancelled')),
  subscription_id TEXT,
  uploads_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lab Reports table (one per uploaded PDF)
CREATE TABLE IF NOT EXISTS public.lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  lab_name TEXT,
  report_date DATE,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  raw_ocr_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Biomarker Results table (many per lab report)
CREATE TABLE IF NOT EXISTS public.biomarker_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_report_id UUID NOT NULL REFERENCES public.lab_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Biomarker identification
  biomarker_name TEXT NOT NULL,
  biomarker_name_normalized TEXT,
  loinc_code TEXT,
  category TEXT,
  
  -- Value
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  unit_normalized TEXT,
  
  -- Reference range
  reference_min NUMERIC,
  reference_max NUMERIC,
  reference_range_text TEXT,
  
  -- Status
  status TEXT CHECK (status IN ('normal', 'low', 'high', 'critical')),
  is_verified BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  test_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lab_reports_user_id ON public.lab_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_created_at ON public.lab_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_biomarker_results_user_id ON public.biomarker_results(user_id);
CREATE INDEX IF NOT EXISTS idx_biomarker_results_lab_report_id ON public.biomarker_results(lab_report_id);
CREATE INDEX IF NOT EXISTS idx_biomarker_results_test_date ON public.biomarker_results(test_date DESC);
CREATE INDEX IF NOT EXISTS idx_biomarker_results_biomarker_name ON public.biomarker_results(biomarker_name_normalized);
CREATE INDEX IF NOT EXISTS idx_biomarker_results_category ON public.biomarker_results(category);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biomarker_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for lab_reports
CREATE POLICY "Users can view own lab reports" ON public.lab_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lab reports" ON public.lab_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lab reports" ON public.lab_reports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lab reports" ON public.lab_reports
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for biomarker_results
CREATE POLICY "Users can view own biomarker results" ON public.biomarker_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own biomarker results" ON public.biomarker_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own biomarker results" ON public.biomarker_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own biomarker results" ON public.biomarker_results
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_reports_updated_at
  BEFORE UPDATE ON public.lab_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_biomarker_results_updated_at
  BEFORE UPDATE ON public.biomarker_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for lab reports
-- Note: Run this in Supabase Dashboard > Storage > Create Bucket
-- Bucket name: lab-reports
-- Public: false
