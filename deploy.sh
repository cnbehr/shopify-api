#!/bin/bash
# Deploy shopify-intelligence-api as a Cloud Run Service
#
# Builds the Next.js Docker image and deploys as an always-on service.
# The API Dockerfile uses its own context (services/api/) since it's a
# standalone Next.js app with no external dependency on other services.

set -e

PROJECT_ID="${PROJECT_ID:-shopifydb}"
REGION="${REGION:-us-central1}"
IMAGE="gcr.io/${PROJECT_ID}/shopify-intelligence-web"

# Parse optional --build-only or --skip-build flags
BUILD=true
DEPLOY=true
for arg in "$@"; do
    case $arg in
        --build-only) DEPLOY=false ;;
        --skip-build) BUILD=false ;;
    esac
done

echo "=== Web Service Deployment ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ "$BUILD" = true ]; then
    echo "Building Docker image from ${SCRIPT_DIR}..."
    docker build --platform linux/amd64 -t ${IMAGE} "${SCRIPT_DIR}"

    echo "Pushing to GCR..."
    docker push ${IMAGE}
    echo ""
fi

if [ "$DEPLOY" = false ]; then
    echo "Build complete (--build-only). Skipping deployment."
    exit 0
fi

echo "--- Deploying: shopify-intelligence-web (Cloud Run Service) ---"

gcloud run deploy shopify-intelligence-web \
    --image=${IMAGE} \
    --region=${REGION} \
    --platform=managed \
    --allow-unauthenticated \
    --port=3000 \
    --memory=1Gi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=3

echo ""

# Get and print the service URL
SERVICE_URL=$(gcloud run services describe shopify-intelligence-web --region=${REGION} --format='value(status.url)')
echo "=== Web Service Deployed ==="
echo ""
echo "Service URL: ${SERVICE_URL}"
echo ""
echo "Monitor:"
echo "  gcloud run services describe shopify-intelligence-web --region=${REGION}"
echo "  gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=shopify-intelligence-web' --limit=100 --format='table(timestamp,textPayload)'"
