# Deploying MOSSANNAH to catering.operandis.co.za

This deploys the app as-is, keeping the embedded PGlite database (data lives as files on the
VPS disk, at `/var/www/mossannah/data`). Because PGlite is an embedded single-file database,
**run exactly one instance of the app** — no PM2 cluster mode, no multiple systemd instances.
If you outgrow that later, see the README's "Hosting later" section for the Postgres swap.

## 0. Prerequisites on the VPS

- Node.js 18.18+ (20 or 22 recommended), npm
- nginx already installed and serving other sites
- certbot (`sudo apt install certbot python3-certbot-nginx`) for TLS
- DNS: an A (and AAAA if you use IPv6) record for `catering.operandis.co.za` pointing at the VPS

## 1. Create a dedicated user and directory

```bash
sudo useradd -r -m -d /var/www/mossannah -s /usr/sbin/nologin mossannah
sudo mkdir -p /var/www/mossannah
sudo chown mossannah:mossannah /var/www/mossannah
```

## 2. Get the code onto the VPS

```bash
sudo -u mossannah git clone <this-repo-url> /var/www/mossannah
cd /var/www/mossannah
sudo -u mossannah npm ci
sudo -u mossannah npm run build
```

(Re-deploys later: `git pull`, `npm ci`, `npm run build`, then `sudo systemctl restart mossannah`.)

## 3. Configure environment

```bash
sudo -u mossannah cp .env.example .env
sudo -u mossannah nano .env
```

Set at minimum:

```
PGLITE_DIR=./data/pg
PAYFAST_WEBHOOK_TOKEN=<a long random secret>
```

Generate the token with `openssl rand -hex 32`. Put the same value into your PayFast
notification adapter's `x-webhook-token` header config.

## 4. Seed the database (first run only)

```bash
cd /var/www/mossannah
sudo -u mossannah npm run db:seed
```

## 5. Install the systemd service

```bash
sudo cp deploy/mossannah.service /etc/systemd/system/mossannah.service
sudo systemctl daemon-reload
sudo systemctl enable --now mossannah
sudo systemctl status mossannah
```

The app listens on `127.0.0.1:3001` (not exposed publicly — nginx is the only way in).

## 6. Install the nginx site and get TLS

```bash
sudo cp deploy/catering.operandis.co.za.conf /etc/nginx/sites-available/catering.operandis.co.za
sudo ln -s /etc/nginx/sites-available/catering.operandis.co.za /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d catering.operandis.co.za
```

Certbot rewrites the server block to add the HTTPS listener and redirect; `nginx -t` again
afterwards if you want to double check.

## 7. Verify

```bash
curl -I https://catering.operandis.co.za
journalctl -u mossannah -f
```

Open `https://catering.operandis.co.za` in a browser and confirm the booking page loads, and
`https://catering.operandis.co.za/admin` loads the dashboard.

## Notes / things to decide before going live

- **No auth on `/admin` yet** (per the README). Anyone who can reach the domain can open it.
  At minimum put nginx `auth_basic` in front of the `/admin` location block until real auth
  ships, or restrict it to your office/VPN IP with an `allow`/`deny` block.
- **Backups**: `data/pg` is the entire database. Add it to whatever backup job already covers
  this VPS (e.g. a nightly tar + off-box copy).
- **Logs**: `journalctl -u mossannah` is the only log sink right now — nothing ships to an
  external log service.
