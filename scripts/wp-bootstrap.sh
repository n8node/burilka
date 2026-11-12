#!/bin/sh
set -eu

: "${WP_ADMIN_EMAIL:?WP_ADMIN_EMAIL is required}"
: "${WP_ADMIN_USER:?WP_ADMIN_USER is required}"
: "${WP_ADMIN_PASSWORD:?WP_ADMIN_PASSWORD must be provided through protected environment input}"
: "${WP_TITLE:?WP_TITLE is required}"

attempt=0
until wp db check --path=/var/www/html --allow-root >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "WordPress database did not become ready" >&2
    exit 1
  fi
  sleep 2
done

if wp core is-installed --path=/var/www/html --allow-root >/dev/null 2>&1; then
  echo "WordPress is already installed; leaving existing content and credentials unchanged."
  exit 0
fi

wp core install \
  --path=/var/www/html \
  --url="${APP_SCHEME:-https}://${APP_DOMAIN:-burilka.com}" \
  --title="$WP_TITLE" \
  --admin_user="$WP_ADMIN_USER" \
  --admin_email="$WP_ADMIN_EMAIL" \
  --admin_password="$WP_ADMIN_PASSWORD" \
  --locale="${WP_LOCALE:-ru_RU}" \
  --skip-email \
  --allow-root

wp option update timezone_string "Europe/Moscow" --path=/var/www/html --allow-root
wp rewrite structure '/%postname%/' --hard --path=/var/www/html --allow-root
wp rewrite flush --hard --path=/var/www/html --allow-root
echo "WordPress initial installation completed."