# Git Workflow

This is the standard ACUP workflow for getting changes into `main` safely.

## 1. Start from updated `main`

```powershell
git switch main
git pull --ff-only origin main
git switch -c feature/your-change
```

Rules:
- Do not commit directly on `main`.
- Always branch from an updated `main`.

## 2. Make changes and validate locally

```powershell
npm run lint
npm run build
```

If both pass, stage and commit:

```powershell
git add -A
git commit -m "feat: short clear message"
```

## 3. Rebase onto latest `main`

Before pushing, make sure your branch sits on top of the newest remote `main`:

```powershell
git fetch origin
git rebase origin/main
```

If there are conflicts:

```powershell
git status
```

Fix the files, then continue:

```powershell
git add <fixed-files>
git rebase --continue
```

If you need to cancel the rebase:

```powershell
git rebase --abort
```

Run validation again after the rebase:

```powershell
npm run lint
npm run build
```

## 4. Push the branch

```powershell
git push -u origin feature/your-change
```

## 5. Open a pull request

With GitHub CLI:

```powershell
gh pr create --base main --head feature/your-change --title "feat: short clear message" --body "## Summary`n- change summary`n`n## Validation`n- npm run lint`n- npm run build"
```

Or open the PR on GitHub web.

## 6. Merge with rebase

Preferred merge style:

```powershell
gh pr merge <pr-number> --rebase
```

This keeps `main` history linear and cleaner.

## 7. Sync local `main`

After the PR is merged:

```powershell
git switch main
git pull --ff-only origin main
```

## 8. Delete the finished feature branch

```powershell
git branch -d feature/your-change
git push origin --delete feature/your-change
```

## Keeping `bene` synced to `main`

If `bene` is your personal long-lived branch and you want it to mirror current `main`:

```powershell
git switch bene
git rebase main
git push --force-with-lease origin bene
git switch main
```

Notes:
- Use `--force-with-lease` only on your own branch like `bene`.
- Never use force-push on `main`.

## Quick Copy-Paste Version

### New work

```powershell
git switch main
git pull --ff-only origin main
git switch -c feature/your-change
```

### Before PR

```powershell
npm run lint
npm run build
git add -A
git commit -m "feat: short clear message"
git fetch origin
git rebase origin/main
npm run lint
npm run build
git push -u origin feature/your-change
```

### Open PR

```powershell
gh pr create --base main --head feature/your-change --title "feat: short clear message" --body "## Summary`n- change summary`n`n## Validation`n- npm run lint`n- npm run build"
```

### Merge PR

```powershell
gh pr merge <pr-number> --rebase
```

### Sync `main`

```powershell
git switch main
git pull --ff-only origin main
```

### Delete branch

```powershell
git branch -d feature/your-change
git push origin --delete feature/your-change
```

### Sync `bene`

```powershell
git switch bene
git rebase main
git push --force-with-lease origin bene
git switch main
```
