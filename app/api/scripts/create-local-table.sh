#!/usr/bin/env bash
# Crea la tabla qr-presence en DynamoDB Local (localhost:8000)
# Uso: bash scripts/create-local-table.sh
set -euo pipefail

ENDPOINT="http://localhost:8000"
TABLE="qr-presence"

echo "Creando tabla '$TABLE' en $ENDPOINT ..."

AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local \
aws dynamodb create-table \
  --table-name "$TABLE" \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    "IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url "$ENDPOINT" \
  --region us-east-1

echo "Listo. Tablas:"
AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local \
aws dynamodb list-tables --endpoint-url "$ENDPOINT" --region us-east-1
