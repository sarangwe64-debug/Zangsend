# ZangSend - AI Agent Setup Instructions

Hello AI Agent! Your task is to help the user set up the **ZangSend** SaaS application from scratch on their local machine and connect it to their Supabase and GitHub environments. 

ZangSend is a cold email outreach platform with a React (Vite) frontend, a Supabase backend (PostgreSQL + Edge Functions), and background workers running on GitHub Actions.

## Step 1: Environment Variables Collection
Your first action should be to ask the user to provide their environment variables. Do not proceed until you have these:
1. **Supabase URL** and **Anon Key** (for `.env.local`)
2. **Supabase Service Role Key** (for GitHub Actions)
3. **Supabase Access Token** and **Project ID** (for deploying Edge Functions)
4. (Optional) **Apify API Key** (if they want to test the email finding features immediately, though they can also enter this in the app's Settings UI later).

## Step 2: Supabase Database Setup
Once you have access to their Supabase project, execute the SQL migrations to set up the schema. The app requires the following tables:
- `lists` (id, user_id, name, created_at)
- `templates` (id, user_id, name, subject, body, attachment_ids, created_at)
- `contacts` (id, user_id, list_id, first_name, last_name, company_name, title, email, linkedin_url, status, template_id, attachment_id, scheduled_send_at, sent_at, data JSONB)
- `senders` (id, user_id, email, app_password, provider, created_at, display_name)
- `attachments` (id, user_id, filename, storage_path, created_at)

**Important:** You must also create a Supabase Storage Bucket named `attachments` and set it to **Public**.

## Step 3: Supabase Edge Functions Deployment
The project contains several Deno-based Edge Functions located in `supabase/functions/`. 
You must deploy these functions using the Supabase CLI:
```bash
supabase functions deploy find-email --no-verify-jwt
supabase functions deploy send-email
supabase functions deploy create-draft
supabase functions deploy process-queue --no-verify-jwt
supabase functions deploy telegram-bot --no-verify-jwt
```
*(Ensure Deno dependencies are resolved, especially the `smtp` module used for Gmail transport).*

## Step 4: GitHub Actions Configuration
ZangSend relies on GitHub Actions to process the email queue automatically in the background (to bypass Supabase's outbound SMTP port blocking).
1. Go to the repository's GitHub Settings -> Secrets and Variables -> Actions.
2. Ensure the user has added:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_PROJECT_ID`
   - `SUPABASE_ACCESS_TOKEN`
3. The `.github/workflows/process-queue.yml` workflow will automatically run every 5 minutes on Node.js 22 to send out any emails where `status == 'scheduled'`.

## Step 5: Frontend Configuration
1. Create a `.env.local` file in the root directory.
2. Add:
   ```
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```
3. Run `npm install` and `npm run dev` to start the frontend.

## Step 6: Verification
Ask the user to open `http://localhost:5173`. 
1. Ask them to go to the **Settings** page and add a Gmail Sender (App Password required).
2. Tell them to paste their Apify token in the Settings page.
3. Guide them to create a List, add a contact manually, and click "Autofill". It should asynchronously fetch the LinkedIn profile details using Apify.
4. Schedule the email and verify that the GitHub Action successfully picks it up within 5 minutes.

Your goal is to be proactive and execute any terminal commands (like `npm install`, `supabase db push`, etc.) directly for the user once they provide the keys!
