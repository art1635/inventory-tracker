# Deploy so others can test (e.g. reviewer in another city)

The app uses **PostgreSQL** (Neon) so it works on Railway without volumes.

---

## 1. Create a free database on Neon

1. Go to [neon.tech](https://neon.tech) and sign up (free).
2. **New project** → name it (e.g. `inventory-tracker`) → **Create project**.
3. On the project dashboard, copy the **connection string**. It looks like:
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
   (Use the one that includes the password.)

---

## 2. Run migrations against Neon (one-time)

On your machine (with the repo cloned):

```bash
# Set the Neon connection string (paste your real URL)
set DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

npx prisma migrate deploy
```

This creates all tables in your Neon database.

---

## 3. Deploy on Railway

1. Go to [railway.app](https://railway.app) and sign in (e.g. with GitHub).
2. **New Project** → **Deploy from GitHub repo** → choose this repo.
3. Open the service → **Variables** → **Add variable**:
   - **Name:** `DATABASE_URL`
   - **Value:** paste the **same Neon connection string** from step 1
4. **Settings**:
   - **Build command:** `npm run build`
   - **Start command:** `npm run start:prod`
5. Redeploy (e.g. **Deployments** → **Redeploy**).

Railway will give you a URL like `https://your-app.up.railway.app`. Share that link; the app will load data from Neon.

---

## 4. Local development

Use the same Neon database (easiest), or a local Postgres:

- **Option A:** In the project root, create `.env` with:
  ```
  DATABASE_URL=postgresql://...your Neon connection string...
  ```
  Then `npm run dev` will use Neon.

- **Option B:** Install Postgres locally and set `DATABASE_URL` to your local DB.

---

## 5. (Optional) Custom domain

In Railway: **Settings** → **Networking** → **Custom domain** and add your domain. Point DNS to the value Railway shows.
