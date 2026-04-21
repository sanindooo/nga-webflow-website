# Deployment Guide

## Commands to Publish a New Version

```bash
# 1. Make your code changes in src/

# 2. Build
pnpm run build

# 3. Create a changeset (interactive prompt)
pnpm changeset
# Select: patch (bug fix), minor (new feature), or major (breaking change)
# Write a brief description

# 4. Version the package
# WARNING: This should create git tags automatically, but sometimes it doesn't!
pnpm changeset version

# 5. CRITICAL: Verify the tag was created
git tag -l | sort -V | tail -3
# You should see the new version (e.g., v1.0.30)

# 6. If tag is missing, create it manually:
# git tag v1.0.XX  (replace XX with the version number from package.json)

# 7. Commit and push
git add .
git commit -m "chore: release v1.X.X"
git push origin master

# 8. CRITICAL: Push all tags to GitHub
git push --tags
# Verify this succeeds! Check for authentication errors.

# 9. Verify tags are on GitHub
# Visit: https://github.com/Granite-Marketing/pier-point-webflow/tags
# You should see your new version listed

# Done! Your code is live on CDN within 2-3 minutes
```

## Webflow URLs

**For Development (auto-updates):**

```html
<script src="https://cdn.jsdelivr.net/gh/Granite-Marketing/pier-point-webflow@master/dist/index.js"></script>
```

**For Production (version-locked):**

```html
<script src="https://cdn.jsdelivr.net/gh/Granite-Marketing/pier-point-webflow@v1.0.29/dist/index.js"></script>
```

Update the version number when you release.

## Troubleshooting

### Tags Not Showing on GitHub

**Problem:** After running `git push --tags`, tags still don't appear on GitHub.

**Solution:**

```bash
# 1. Check which tags exist locally but not on GitHub
git ls-remote --tags origin | awk -F'/' '{print $3}' | sort -V > /tmp/remote_tags.txt
git tag -l | sort -V > /tmp/local_tags.txt
comm -13 /tmp/remote_tags.txt /tmp/local_tags.txt

# 2. If you see missing tags, push them again
git push origin --tags

# 3. If you get authentication errors, you may need to:
#    - Set up SSH keys for GitHub, OR
#    - Use a Personal Access Token instead of password
```

**Verify:** Check https://github.com/Granite-Marketing/pier-point-webflow/tags to confirm tags are there.

### Tag Wasn't Created by Changeset

**Problem:** `pnpm changeset version` updated package.json but didn't create the git tag.

**Solution:**

```bash
# Check current version in package.json
cat package.json | grep '"version"'

# Create the tag manually (use the version from package.json)
git tag v1.0.XX

# Push it
git push origin v1.0.XX
```

### CDN Issues

**CDN returns 404:** Wait 2-3 minutes after pushing tags, jsDelivr needs time to index.

**CDN not updating:** Wait 5 minutes or purge cache at https://www.jsdelivr.com/tools/purge

**Wrong version loading:** Make sure you're using the correct version number in your script tag.
