# Deploy so others can test (e.g. reviewer in another city)

Your app uses **SQLite**. The easiest way to get a **stable, always-on link** is to deploy to **Railway** (free tier, keeps SQLite and runs 24/7).

---

## 1. Push your code to GitHub

If you haven’t already:

```bash
git init
git add .
git commit -m "Initial commit"
```

Create a new repo on [github.com](https://github.com/new), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

## 2. Deploy on Railway

1. Go to [railway.app](https://railway.app) and sign in (e.g. with GitHub).
2. **New Project** → **Deploy from GitHub repo** → choose this repo.
3. After the first deploy attempt, open the service → **Variables** and add:
   - `DATABASE_URL` = `file:/data/prod.db`
4. Open **Settings** → **Volumes** → **Add volume**, mount path: `/data`.
5. **Settings** → **Deploy**:
   - **Build command:** `npm run build`
   - **Start command:** `npm run start:prod`
6. Redeploy (e.g. **Deploy** → **Redeploy**).

Railway will give you a URL like `https://your-app.up.railway.app`. Share that link; it will work whenever the app is running (free tier may sleep after inactivity; the next visit wakes it).

---

## 3. (Optional) Custom domain

In Railway: **Settings** → **Networking** → **Custom domain** and add a domain you own (e.g. `inventory.yourdomain.com`). Point the domain’s DNS to the value Railway shows.

---

## If you prefer Vercel

Vercel doesn’t support SQLite for persistent data. You’d need to use a hosted database (e.g. [Neon](https://neon.tech) Postgres) and change the app to use Postgres in production. That’s more setup; for “someone tests on a regular basis,” Railway + SQLite above is the fastest path.
