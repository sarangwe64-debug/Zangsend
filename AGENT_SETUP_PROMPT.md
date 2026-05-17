# ZangSend Master Deployment & Setup Guide

Hello AI Agent! This document contains everything you need to know to set up the ZangSend SaaS platform from scratch for the user. Your primary goal is to guide the user step-by-step, explicitly telling them *where* to get each key, and then executing the technical setup (SQL, Edge Functions, GitHub Actions) automatically once they provide the keys.

---

## Phase 1: Gathering Keys & Credentials

Please ask the user to provide the following credentials. Give them these exact instructions and links so they know where to find them:

### 1. Supabase Credentials (Database & Auth)
Supabase handles user authentication, PostgreSQL database, and Edge Functions.
- **Where to get them:** Go to [Supabase Dashboard](https://supabase.com/dashboard/projects) > Select Project > **Project Settings** (gear icon) > **API**.
- **Keys needed:**
  1. **`VITE_SUPABASE_URL`**: Found under "Project URL".
  2. **`VITE_SUPABASE_ANON_KEY`**: Found under "Project API Keys" (anon/public).
  3. **`SUPABASE_SERVICE_ROLE_KEY`**: Found under "Project API Keys" (service_role/secret). *Warn the user to never share this publicly.*

### 2. Supabase CLI Credentials (For deploying Edge Functions)
To deploy backend Edge Functions, the agent needs CLI access.
- **Where to get them:**
  1. **`SUPABASE_ACCESS_TOKEN`**: Go to [Supabase Access Tokens](https://supabase.com/dashboard/account/tokens) -> Click "Generate new token".
  2. **`SUPABASE_PROJECT_ID`**: Found in the URL of your project dashboard: `https://supabase.com/dashboard/project/<PROJECT_ID>`.

### 3. Apify Credentials (For LinkedIn Email Scraping)
Apify is used to autofill missing contact details from LinkedIn URLs.
- **Where to get it:** Go to [Apify Console](https://console.apify.com/) > Settings > **Integrations** > API token.
- **Key needed:** The user can paste this directly into the ZangSend **Settings** page UI once the app is running.

### 4. Gmail App Passwords (For sending emails)
ZangSend uses native SMTP to send emails. Users cannot use their regular Gmail password.
- **Where to get it:** Go to [Google Account Security](https://myaccount.google.com/security) > 2-Step Verification > App Passwords (at the bottom).
- **Key needed:** Generate an "App Password". The user will paste this into the ZangSend **Settings** page UI under "Senders".

---

## Phase 2: Local Environment Setup

Once the user provides the Supabase keys:
1. Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the local Vite server.

---

## Phase 3: Supabase Architecture Setup

You (the AI Agent) must execute the following to prepare the backend:

### 1. Database Schema
Execute SQL to create the following tables. Ensure Row Level Security (RLS) is enabled and policies are created for `auth.uid() = user_id`.
- `lists` (id, user_id, name, created_at)
- `templates` (id, user_id, name, subject, body, attachment_ids, created_at)
- `contacts` (id, user_id, list_id, first_name, last_name, company_name, title, email, linkedin_url, status, template_id, attachment_id, scheduled_send_at, sent_at, data JSONB)
- `senders` (id, user_id, email, app_password, provider, created_at, display_name)
- `attachments` (id, user_id, filename, storage_path, created_at)

### 2. Storage Buckets
Create a new Supabase Storage Bucket named **`attachments`** and set it to **Public**.

### 3. Edge Functions
Deploy the backend Deno functions using the Supabase CLI:
```bash
# Login via CLI using the SUPABASE_ACCESS_TOKEN
npx supabase login

# Deploy functions (ensure correct project-ref)
npx supabase functions deploy find-email --project-ref <PROJECT_ID> --no-verify-jwt
npx supabase functions deploy send-email --project-ref <PROJECT_ID>
npx supabase functions deploy create-draft --project-ref <PROJECT_ID>
npx supabase functions deploy process-queue --project-ref <PROJECT_ID> --no-verify-jwt
npx supabase functions deploy telegram-bot --project-ref <PROJECT_ID> --no-verify-jwt
```

---

## Phase 4: GitHub Actions Setup (The Background Worker)

ZangSend requires a background cron job to process scheduled emails. This is handled by `.github/workflows/process-queue.yml`.

1. Ask the user to go to their GitHub repository: **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.
2. Have them add the following secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_PROJECT_ID`
   - `SUPABASE_ACCESS_TOKEN`
3. Once added, the `Process Email Queue` workflow will automatically run every 5 minutes on Node 22, processing any emails marked as `scheduled`.

---

## Phase 5: Netlify Deployment (Frontend Hosting)

To deploy the React Vite frontend to the web:

1. Go to [Netlify](https://app.netlify.com/) and click **Add new site** > **Import an existing project** > **GitHub**.
2. Select the ZangSend repository.
3. **Build settings:**
   - Base directory: `/`
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Environment Variables:**
   Click "Add environment variables" and enter:
   - `VITE_SUPABASE_URL` = (Your Supabase URL)
   - `VITE_SUPABASE_ANON_KEY` = (Your Supabase Anon Key)
5. Click **Deploy Site**.
6. Note: Because React uses client-side routing, ensure there is a `public/_redirects` file containing `/* /index.html 200` to prevent 404 errors on page refreshes.

---

## Final Verification Checklist
- [ ] Can the user log in/sign up?
- [ ] Can they add an App Password sender in Settings?
- [ ] Can they add their Apify key in Settings?
- [ ] When manually adding a contact with a LinkedIn URL, does clicking "Autofill" successfully trigger Apify in the background?
- [ ] Do scheduled emails automatically process via GitHub Actions?
