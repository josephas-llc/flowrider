# Vultr Deployment Guide

## Quick Deploy - Landing Page

### Prerequisites
- Vultr account with a VPS (Ubuntu 22.04+ recommended)
- Domain flowrider.dev pointed to Vultr IP
- SSH access to server

### Step 1: Provision Vultr Instance

1. Log into Vultr
2. Deploy new instance:
   - Type: Cloud Compute (Regular)
   - Location: Choose nearest
   - OS: Ubuntu 24.04
   - Plan: $6/mo (1 CPU, 1GB RAM) sufficient for landing page
   - Hostname: flowrider-web

3. Note the IP address

### Step 2: Point DNS

In your domain registrar (e.g., Cloudflare, Namecheap):

```
A    flowrider.dev      →  [VULTR_IP]
A    www.flowrider.dev  →  [VULTR_IP]
```

### Step 3: Deploy Landing Page

```bash
# From your local machine
cd /path/to/flowrider
./.vultr/deploy-landing.sh [VULTR_IP]
```

Or manually:

```bash
# SSH into server
ssh root@[VULTR_IP]

# Install nginx
apt update && apt install -y nginx certbot python3-certbot-nginx

# Create directory
mkdir -p /var/www/flowrider

# Copy files (from local)
scp -r landing/* root@[VULTR_IP]:/var/www/flowrider/

# Configure nginx (on server)
nano /etc/nginx/sites-available/flowrider
# Paste the config from deploy-landing.sh

# Enable site
ln -sf /etc/nginx/sites-available/flowrider /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### Step 4: Enable SSL

After DNS propagates (check with `dig flowrider.dev`):

```bash
ssh root@[VULTR_IP]
certbot --nginx -d flowrider.dev -d www.flowrider.dev
```

### Step 5: Verify

- Visit https://flowrider.dev
- Check SSL: https://www.ssllabs.com/ssltest/analyze.html?d=flowrider.dev

---

## Release Distribution - DMG Hosting

### Option A: GitHub Releases (Recommended)

The .dmg files are hosted on GitHub Releases:
- https://github.com/josephas-llc/flowrider/releases

Landing page links directly to GitHub releases.

### Option B: Self-Hosted on Vultr

If you want to host the .dmg files on Vultr:

```bash
# Create downloads directory
ssh root@[VULTR_IP] "mkdir -p /var/www/flowrider/downloads"

# Upload DMG files
scp release/Flowrider-*.dmg root@[VULTR_IP]:/var/www/flowrider/downloads/

# Add nginx config for downloads
# Add to /etc/nginx/sites-available/flowrider:
#
# location /downloads/ {
#     alias /var/www/flowrider/downloads/;
#     autoindex on;
# }
```

Then link from landing page:
- https://flowrider.dev/downloads/Flowrider-0.2.0-arm64.dmg (Apple Silicon)
- https://flowrider.dev/downloads/Flowrider-0.2.0.dmg (Intel)

---

## Automated Weekly Audit

See `.vultr/weekly-audit.yml` for automated audit setup.

### Cron-based (Simple)

On your Vultr server:

```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Add to crontab
crontab -e

# Add line (runs every Sunday at 2am):
0 2 * * 0 cd /path/to/flowrider && claude --yes "/audit $(($(date +\%W) \% 9 + 1))" > /var/log/flowrider-audit.log 2>&1
```

---

## Monitoring

### Basic Health Check

```bash
# Add to crontab
*/5 * * * * curl -sf https://flowrider.dev > /dev/null || echo "Flowrider down" | mail -s "Alert" your@email.com
```

### Uptime Robot (Free)

1. Sign up at uptimerobot.com
2. Add HTTP(s) monitor for https://flowrider.dev
3. Set alert contacts

---

## Costs

| Resource | Cost/Month |
|----------|-----------|
| Vultr VPS (1GB) | $6 |
| Domain (annual/12) | ~$1 |
| SSL (Let's Encrypt) | Free |
| **Total** | ~$7/month |

---

## Security Checklist

- [ ] SSH key authentication only (disable password)
- [ ] UFW firewall enabled (ports 22, 80, 443)
- [ ] Fail2ban installed
- [ ] Regular apt updates
- [ ] SSL enabled with auto-renewal

```bash
# Quick security setup
apt install -y ufw fail2ban
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable

# Disable password auth
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
```
