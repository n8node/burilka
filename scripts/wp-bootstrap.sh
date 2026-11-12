#!/bin/sh
set -eu

: "${WP_ADMIN_EMAIL:?WP_ADMIN_EMAIL is required}"
: "${WP_ADMIN_USER:?WP_ADMIN_USER is required}"
: "${WP_ADMIN_PASSWORD:?WP_ADMIN_PASSWORD must be provided through protected environment input}"
: "${WP_TITLE:?WP_TITLE is required}"

attempt=0
until php -r '$m = mysqli_init(); $ok = mysqli_real_connect($m, getenv("WORDPRESS_DB_HOST") ?: "mysql", getenv("WORDPRESS_DB_USER"), getenv("WORDPRESS_DB_PASSWORD"), getenv("WORDPRESS_DB_NAME"), 3306); if (!$ok) { fwrite(STDERR, mysqli_connect_error() . "\n"); exit(1); } $result = mysqli_query($m, "SELECT 1"); if (!$result) { fwrite(STDERR, mysqli_error($m) . "\n"); exit(1); } exit(0);'; do
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