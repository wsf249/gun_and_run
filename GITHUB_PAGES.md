# Share the prototype on GitHub Pages

Project sites are hosted at:

`https://<your-username>.github.io/<repository-name>/`

The important code fix is Vite’s **`base` URL**: assets must not assume the site lives at `/` only. This repo uses **`base: './'`** in production builds so scripts and chunks load correctly under the `/repo-name/` path.

---

## One-time setup on GitHub (website)

1. **Push this repo** (including `.github/workflows/github-pages.yml`, updated `vite.config.ts`, and `public/.nojekyll`) to GitHub.

2. Open the repo on GitHub → **Settings** → **Pages** (left sidebar).

3. Under **Build and deployment** → **Source**, choose **GitHub Actions** (not “Deploy from a branch” unless you prefer that older flow).

4. Confirm your default branch is **`main`**.  
   If you use **`master`** instead, edit `.github/workflows/github-pages.yml` and change `branches: [main]` to `branches: [master]`, then push.

5. Go to **Actions** → select **Deploy GitHub Pages** → run it once if it did not start automatically (**Run workflow** on `workflow_dispatch`, or push a commit to `main`).

6. When the workflow finishes green, **Settings** → **Pages** should show **Your site is live at** …  
   Open: `https://<username>.github.io/<repo>/`  
   (Trailing slash is fine; the game should load.)

---

## If something fails

- **404 on blank page**: Hard-refresh (cache) or check the **Actions** log for the deploy job; confirm the live URL includes **`/<repo>/`** and matches your repository name.
- **Workflow never appears**: Ensure the file path is exactly `.github/workflows/github-pages.yml` on the default branch.
- **First-time Pages with Actions**: GitHub may ask you to approve **workflow permissions** once (repo **Settings** → **Actions** → **General** → read/write for workflows if prompted).

### Deploy job: `Failed to create deployment (status: 404)` / `HttpError: Not Found`

The **build** job can succeed while **deploy** fails with a 404 from `actions/deploy-pages`. Common causes:

1. **Private repository on a free personal account**  
   GitHub Pages for **private** repos generally needs **GitHub Pro** (or Team/Enterprise). On **Free**, make the repository **public** (repo **Settings** → **General** → **Danger Zone** → **Change repository visibility**), then re-run the workflow.

2. **Pages source not set to GitHub Actions**  
   **Settings** → **Pages** → **Build and deployment** → **Source** → **GitHub Actions** (not “Deploy from a branch”).

3. **Workflow token permissions**  
   **Settings** → **Actions** → **General** → **Workflow permissions** → try **Read and write permissions** → **Save**, then **Re-run all jobs** on the failed workflow.

4. **Organization policy**  
   If the repo is under an **org**, an owner may need to allow GitHub Pages / Actions for that org.

---

## Local check before pushing

From the repo root:

```bash
npm run build
npm run preview
```

Open the URL Vite prints (usually `http://localhost:4173/`). With `base: './'`, the production build should behave like GitHub Pages for asset paths.

---

## Optional: no GitHub Actions

You can run `npm run build` locally, then use any static host by uploading the **`dist/`** folder. For **branch-based** GitHub Pages (“Deploy from branch” → **`gh-pages`** / **`docs`**), you still need a correct `base` (this repo’s production **`./`** works for project pages).
