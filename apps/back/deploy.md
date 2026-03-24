# Deploy

## Goal

Production runs on `mac-mini` with secrets stored outside the repository and injected during deploy.

## Host layout

Recommended directories on the host:

```bash
/opt/platform/back
/opt/platform/back/secrets
/opt/platform/back/configs
```

Secret files:

```bash
/opt/platform/back/secrets/database_url
/opt/platform/back/secrets/postgres_password
/opt/platform/back/secrets/minio_root_user
/opt/platform/back/secrets/minio_root_password
/opt/platform/back/secrets/s3_access_key
/opt/platform/back/secrets/s3_secret_key
/opt/platform/back/secrets/telegram_bot_token
```

## Docker Compose

`docker-compose.prod.yaml` expects Docker secrets from local files. The backend reads them through `*_FILE`.

Before the first start on the host:

```bash
mkdir -p /opt/platform/back/secrets
chmod 700 /opt/platform/back/secrets
printf '%s' 'postgres://platform:***@postgres:5432/platform?sslmode=disable' > /opt/platform/back/secrets/database_url
printf '%s' '***' > /opt/platform/back/secrets/postgres_password
printf '%s' 'platform-minio' > /opt/platform/back/secrets/minio_root_user
printf '%s' '***' > /opt/platform/back/secrets/minio_root_password
printf '%s' 'platform-minio' > /opt/platform/back/secrets/s3_access_key
printf '%s' '***' > /opt/platform/back/secrets/s3_secret_key
printf '%s' '***' > /opt/platform/back/secrets/telegram_bot_token
chmod 600 /opt/platform/back/secrets/*
```

Start:

```bash
cd /opt/platform/back
docker compose -f docker-compose.prod.yaml up -d
```

## GitHub Actions

Use GitHub Secrets to deliver secret values to the host, not as runtime storage.

Recommended repository secrets:

```bash
SSH_HOST
SSH_USER
SSH_PRIVATE_KEY
DATABASE_URL
POSTGRES_PASSWORD
MINIO_ROOT_USER
MINIO_ROOT_PASSWORD
S3_ACCESS_KEY
S3_SECRET_KEY
TELEGRAM_BOT_TOKEN
```

Minimal deploy flow:

1. Build the image in GitHub Actions.
2. Copy project files or pull the repository on `mac-mini`.
3. Write GitHub Secrets into `/opt/platform/back/secrets/*`.
4. Run `docker compose -f docker-compose.prod.yaml up -d --build`.

Example step:

```yaml
- name: Write secrets on host and deploy
  run: |
    ssh -i ~/.ssh/deploy_key "$SSH_USER@$SSH_HOST" '
      set -e
      mkdir -p /opt/platform/back/secrets
      chmod 700 /opt/platform/back/secrets
      cat > /opt/platform/back/secrets/database_url <<EOF
${{ secrets.DATABASE_URL }}
EOF
      cat > /opt/platform/back/secrets/postgres_password <<EOF
${{ secrets.POSTGRES_PASSWORD }}
EOF
      cat > /opt/platform/back/secrets/minio_root_user <<EOF
${{ secrets.MINIO_ROOT_USER }}
EOF
      cat > /opt/platform/back/secrets/minio_root_password <<EOF
${{ secrets.MINIO_ROOT_PASSWORD }}
EOF
      cat > /opt/platform/back/secrets/s3_access_key <<EOF
${{ secrets.S3_ACCESS_KEY }}
EOF
      cat > /opt/platform/back/secrets/s3_secret_key <<EOF
${{ secrets.S3_SECRET_KEY }}
EOF
      cat > /opt/platform/back/secrets/telegram_bot_token <<EOF
${{ secrets.TELEGRAM_BOT_TOKEN }}
EOF
      chmod 600 /opt/platform/back/secrets/*
      cd /opt/platform/back
      docker compose -f docker-compose.prod.yaml up -d --build
    '
```

## Notes

- GitHub Secrets are only for CI/CD delivery.
- The running app does not read secrets from GitHub directly.
- For production, expose the app through a reverse proxy and keep Postgres closed from the public network.
