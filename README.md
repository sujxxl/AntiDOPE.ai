AntiDOPE.ai is a "Biological Digital Twin" platform that shifts anti-doping from expensive chemical testing to predictive data physics. By continuously analyzing longitudinal training data (Power, Heart Rate, VO2 Max) from consumer wearables via LSTMs and Isolation Forests, the app builds a personalized baseline of an athlete's natural physiological limits. When an athlete experience an explosive performance or recovery spike that is statistically impossible through natural training alone, the AI flags it as a "Red Zone" anomaly—allowing sports federations to execute highly targeted, cost-effective drug testing exactly when it matters most.


# Run and deploy your app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create env file:
   `cp .env.example .env.local`
   - Set `VITE_API_URL=https://antidope-ai.onrender.com`
   - Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Run the app:
   `npm run dev`

## Supabase + Backend wiring

- Run SQL migration in Supabase: [backend/supabase_schema.sql](backend/supabase_schema.sql)
- Backend analyze endpoint used by frontend upload flow: `POST https://antidope-ai.onrender.com/analyze`
- Backend CORS/env template: [backend/.env.example](backend/.env.example)
- Login now uses Supabase Auth email/password (`supabase.auth.signInWithPassword`)
- Ensure `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Create users in Supabase Auth (Email provider enabled) before signing in
- Athlete edit page updates `public.athletes` in Supabase
- User profile page reads/writes `public.user_profiles` (and mirrors to auth metadata)

## Local backend logic test

- Test script: [backend/test/run_local_logic_test.py](backend/test/run_local_logic_test.py)
- It runs both files in [backend/test/no anomaly.csv](backend/test/no%20anomaly.csv) and [backend/test/yes anomaly.csv](backend/test/yes%20anomaly.csv)
- Run from project root: `python backend/test/run_local_logic_test.py`
