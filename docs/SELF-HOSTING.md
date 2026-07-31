# Self-hosting GDF CertView on your own server (Oracle Cloud, etc.)

The app is a standard Next.js app (`output: 'standalone'`) that talks to Supabase.
**All your data — accounts, badges, certificates, delegates, verify pages, and the
PDFs — lives in Supabase, not on the web server.** So you can move the app between
Vercel and your own box (or run both at once) with **zero data loss**, as long as
the server points at the **same Supabase project** and the domain resolves to it.

Target: a 1 GB RAM / 2-core Oracle Free tier instance (Ubuntu). Chromium is never
needed — certificates render with `pdf-lib`.

---

## 1. One-time server setup

SSH in once to bootstrap. After this, deploys are automatic (Section 3).

```bash
# --- packages ---
sudo apt update && sudo apt install -y git nginx
# Node 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# --- clone ---
cd ~ && git clone https://github.com/rajiv-rathod/GDF-Badges.git
cd GDF-Badges
```

### Environment file (secrets)

Create `/etc/gdf-certview.env` (root-owned, not in git). Use the **same values**
as your Vercel project so it hits the same Supabase data:

```bash
sudo tee /etc/gdf-certview.env >/dev/null <<'ENV'
SUPABASE_URL=https://rmkzcgxpvdhkhlmwymiw.supabase.co
SUPABASE_PUBLISHABLE_KEY=<your publishable/anon key>
SUPABASE_SECRET_KEY=<your service/secret key>
APP_URL=https://certview.gdf.social
ENV
sudo chmod 600 /etc/gdf-certview.env
```

> The app resolves either `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SECRET_KEY`
> or the `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` names — either works.

### First build + run

```bash
cd ~/GDF-Badges
npm ci
npm run build:web
# copy static/public into the standalone bundle (deploy script does this for you later)
SB=apps/web/.next/standalone/apps/web
cp -r apps/web/.next/static  "$SB/.next/static"
cp -r apps/web/public        "$SB/public"

# install the service
sudo cp deploy/gdf-certview.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now gdf-certview
systemctl status gdf-certview --no-pager      # should be "active (running)"
curl -sf http://127.0.0.1:3000 >/dev/null && echo "app up"
```

If your Linux user isn't `ubuntu`, edit the `User=` and paths in
`/etc/systemd/system/gdf-certview.service` first.

### nginx + HTTPS

```bash
sudo cp deploy/nginx-certview.conf /etc/nginx/sites-available/certview
sudo ln -sf /etc/nginx/sites-available/certview /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# free Let's Encrypt cert + auto-renew (point certview.gdf.social's DNS A record here first)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d certview.gdf.social
```

Open ports 80/443 in **both** the Oracle Security List/NSG **and** the OS firewall
(`sudo ufw allow 'Nginx Full'` or `sudo iptables`). Oracle images often block by default.

### Cut over the domain

Point `certview.gdf.social` at the Oracle IP. Because the data is in Supabase, every
existing badge and `/verify/...` link keeps working the instant DNS flips. You can
leave Vercel running until you're happy, then remove the domain there.

---

## 2. `sudo` for the deploy user (needed for auto-restart)

The deploy script runs `systemctl restart`. Allow it without a password prompt:

```bash
echo 'ubuntu ALL=(root) NOPASSWD: /bin/systemctl restart gdf-certview' | \
  sudo tee /etc/sudoers.d/gdf-certview
sudo chmod 440 /etc/sudoers.d/gdf-certview
```

---

## 3. Auto-deploy: "merge → your server updates itself"

A GitHub Actions workflow (`.github/workflows/deploy-oracle.yml`) SSHes in and runs
`scripts/server-deploy.sh` on every merge to `main`. It's **opt-in** — enable it once:

1. Generate a deploy key **on your laptop** (or reuse one):
   ```bash
   ssh-keygen -t ed25519 -f gdf_deploy -N ""
   # add the PUBLIC half to the server:
   ssh-copy-id -i gdf_deploy.pub ubuntu@<oracle-ip>   # or paste into ~/.ssh/authorized_keys
   ```
2. In GitHub → **Settings → Secrets and variables → Actions**:
   - **Variables** tab → New variable: `DEPLOY_ENABLED` = `true`
   - **Secrets** tab → add:
     | Secret | Value |
     |---|---|
     | `DEPLOY_HOST` | your Oracle public IP |
     | `DEPLOY_USER` | `ubuntu` |
     | `DEPLOY_SSH_KEY` | contents of the **private** `gdf_deploy` file |
     | `DEPLOY_PATH` | `/home/ubuntu/GDF-Badges` |
     | `DEPLOY_PORT` | `22` (optional) |

That's the whole "control it from here" loop: **I merge a change to `main`, GitHub
rebuilds and restarts the app on your Oracle box automatically — no SSH needed.**
You can also trigger it by hand from the Actions tab (**Run workflow**), or on the
server run `bash ~/GDF-Badges/scripts/server-deploy.sh` directly.

---

## 4. Handy commands

```bash
journalctl -u gdf-certview -f            # live app logs
sudo systemctl restart gdf-certview      # manual restart
bash ~/GDF-Badges/scripts/server-deploy.sh   # manual deploy (pull + build + restart)
```

## Notes & limits
- **SMTP from Oracle:** outbound port 587 must be open in the Oracle Security List
  for credential emails to send (Vercel had it open; verify on the new box).
- **Memory:** the service caps Node heap at 768 MB for the 1 GB tier. If builds OOM
  on the box, run `npm run build:web` with a swapfile enabled.
- **Rollback:** `git reset --hard <old-sha> && bash scripts/server-deploy.sh` — but
  it re-fetches `main`, so pin by checking out a tag/branch instead when rolling back.
