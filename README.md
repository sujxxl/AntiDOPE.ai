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
