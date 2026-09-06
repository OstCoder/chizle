# Supabase setup

1. Create a Supabase project.
2. Run `schema.sql` in the Supabase SQL Editor.
3. Add these values in Freebuff Settings -> Environment:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Enable Email provider in Supabase Authentication -> Providers.
5. Set the Site URL and redirect URL to the deployed app URL, plus `/auth/callback`.

The app uses the publishable anon key with Supabase Row Level Security. A service-role key is not required by the app and should not be exposed to the browser.
