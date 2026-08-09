#!/bin/bash
# Vultr Landing Page Deployment Script
# Usage: ./deploy-landing.sh [vultr-ip]
#
# Prerequisites:
# 1. SSH access to Vultr instance
# 2. nginx installed on server
# 3. SSL certificate (via certbot)

set -e

VULTR_IP="${1:-YOUR_VULTR_IP}"
DOMAIN="flowrider.dev"
DEPLOY_DIR="/var/www/flowrider"

echo "=== Flowrider Landing Page Deployment ==="
echo "Target: $VULTR_IP"
echo "Domain: $DOMAIN"
echo ""

# Check if IP was provided
if [ "$VULTR_IP" = "YOUR_VULTR_IP" ]; then
  echo "Usage: ./deploy-landing.sh <vultr-ip>"
  echo ""
  echo "Example: ./deploy-landing.sh 123.45.67.89"
  exit 1
fi

# Create deployment archive
echo "[1/5] Creating deployment archive..."
cd "$(dirname "$0")/.."
tar -czf /tmp/flowrider-landing.tar.gz landing/

# Upload to Vultr
echo "[2/5] Uploading to Vultr..."
scp /tmp/flowrider-landing.tar.gz root@$VULTR_IP:/tmp/

# Deploy on server
echo "[3/5] Deploying on server..."
ssh root@$VULTR_IP << 'REMOTE_SCRIPT'
  # Install nginx if not present
  if ! command -v nginx &> /dev/null; then
    apt-get update && apt-get install -y nginx certbot python3-certbot-nginx
  fi

  # Create deploy directory
  mkdir -p /var/www/flowrider

  # Extract landing page
  cd /tmp
  tar -xzf flowrider-landing.tar.gz
  cp -r landing/* /var/www/flowrider/

  # Set permissions
  chown -R www-data:www-data /var/www/flowrider
  chmod -R 755 /var/www/flowrider

  # Create nginx config
  cat > /etc/nginx/sites-available/flowrider << 'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name flowrider.dev www.flowrider.dev;

    root /var/www/flowrider;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

  # Enable site
  ln -sf /etc/nginx/sites-available/flowrider /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default

  # Test nginx config
  nginx -t

  # Reload nginx
  systemctl reload nginx

  # Cleanup
  rm -rf /tmp/flowrider-landing.tar.gz /tmp/landing

  echo "Nginx deployed successfully!"
REMOTE_SCRIPT

# SSL setup reminder
echo ""
echo "[4/5] Deployment complete!"
echo ""
echo "=== Next Steps ==="
echo ""
echo "1. Point DNS for $DOMAIN to $VULTR_IP:"
echo "   - A record: flowrider.dev → $VULTR_IP"
echo "   - A record: www.flowrider.dev → $VULTR_IP"
echo ""
echo "2. After DNS propagates, enable SSL:"
echo "   ssh root@$VULTR_IP"
echo "   certbot --nginx -d flowrider.dev -d www.flowrider.dev"
echo ""
echo "[5/5] Done!"
echo ""
echo "Visit: http://$VULTR_IP (before DNS)"
echo "Visit: https://flowrider.dev (after DNS + SSL)"
