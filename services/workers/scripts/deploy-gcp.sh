#!/usr/bin/env bash
# Deploy CueProfit workers to Cloud Run Jobs + optional Cloud Scheduler (daily sync).
#
# Usage (from repo root):
#   export GCP_PROJECT_ID=cueprofit-prod
#   export GCP_REGION=europe-west1
#   export WORKERS_CLOUD_RUN_JOB=cueprofit-workers
#   # Optional — schedule daily sync via API (recommended):
#   export PYTHON_API_URL=https://your-api.run.app
#   export PYTHON_API_INTERNAL_TOKEN=...
#   ./services/workers/scripts/deploy-gcp.sh
#
# Requires: gcloud, docker, authenticated gcloud user with deploy permissions.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PROJECT="${GCP_PROJECT_ID:?set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-europe-west1}"
JOB="${WORKERS_CLOUD_RUN_JOB:-cueprofit-workers}"
IMAGE="gcr.io/${PROJECT}/${JOB}"
SCHEDULER_NAME="${WORKERS_SCHEDULER_NAME:-cueprofit-daily-sync}"
SCHEDULE="${WORKERS_CRON_SCHEDULE:-0 5 * * *}"

echo "==> Building ${IMAGE} (linux/amd64)"
docker build --platform linux/amd64 -f "${ROOT}/services/workers/Dockerfile" -t "${IMAGE}" "${ROOT}"
docker push "${IMAGE}"

echo "==> Deploying Cloud Run Job ${JOB}"
if gcloud run jobs describe "${JOB}" --project "${PROJECT}" --region "${REGION}" >/dev/null 2>&1; then
  gcloud run jobs update "${JOB}" \
    --project "${PROJECT}" \
    --region "${REGION}" \
    --image "${IMAGE}" \
    --task-timeout 3600 \
    --max-retries 1
else
  gcloud run jobs create "${JOB}" \
    --project "${PROJECT}" \
    --region "${REGION}" \
    --image "${IMAGE}" \
    --task-timeout 3600 \
    --max-retries 1 \
    --set-env-vars "APP_ENV=production"
fi

echo ""
echo "Set these env vars on the Cloud Run Job (Console or gcloud run jobs update --set-env-vars):"
echo "  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, KMS_KEY_NAME,"
echo "  GOOGLE_ADS_OAUTH_CLIENT_ID, GOOGLE_ADS_OAUTH_CLIENT_SECRET,"
echo "  GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_LOGIN_CUSTOMER_ID (optional MCC)"
echo ""
echo "Grant the API service account roles/run.developer on this job so it can trigger runs."
echo ""
echo "Manual test:"
echo "  gcloud run jobs execute ${JOB} --project ${PROJECT} --region ${REGION} \\"
echo "    --args=sync_all_workspaces --args=--mode --args=daily"

if [[ -n "${PYTHON_API_URL:-}" && -n "${PYTHON_API_INTERNAL_TOKEN:-}" ]]; then
  echo ""
  echo "==> Creating Cloud Scheduler job ${SCHEDULER_NAME} → POST ${PYTHON_API_URL}/internal/sync/all"
  if gcloud scheduler jobs describe "${SCHEDULER_NAME}" --project "${PROJECT}" --location "${REGION}" >/dev/null 2>&1; then
    gcloud scheduler jobs update http "${SCHEDULER_NAME}" \
      --project "${PROJECT}" \
      --location "${REGION}" \
      --schedule "${SCHEDULE}" \
      --uri "${PYTHON_API_URL%/}/internal/sync/all" \
      --http-method POST \
      --headers "Authorization=Bearer ${PYTHON_API_INTERNAL_TOKEN},Content-Type=application/json" \
      --message-body '{"mode":"daily"}' \
      --attempt-deadline 180s
  else
    gcloud scheduler jobs create http "${SCHEDULER_NAME}" \
      --project "${PROJECT}" \
      --location "${REGION}" \
      --schedule "${SCHEDULE}" \
      --uri "${PYTHON_API_URL%/}/internal/sync/all" \
      --http-method POST \
      --headers "Authorization=Bearer ${PYTHON_API_INTERNAL_TOKEN},Content-Type=application/json" \
      --message-body '{"mode":"daily"}' \
      --attempt-deadline 180s
  fi
  echo "Scheduler created — daily sync at cron: ${SCHEDULE} (UTC)"
else
  echo ""
  echo "Skip scheduler: set PYTHON_API_URL + PYTHON_API_INTERNAL_TOKEN to create Cloud Scheduler."
fi

echo ""
echo "Done."
