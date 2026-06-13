#!/bin/bash

# Dating Web App - Automated Azure Deployment Script
# Usage: bash deploy.sh

set -e

echo "🚀 Dating Web App - Azure Deployment Script"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUBSCRIPTION_ID="${SUBSCRIPTION_ID:-}"
RESOURCE_GROUP="${RESOURCE_GROUP:-dating-web-rg}"
LOCATION="${LOCATION:-eastus}"
ACR_NAME="${ACR_NAME:-datingwebacr}"
CONTAINER_ENV="${CONTAINER_ENV:-dating-env}"

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI not installed. Install from: https://aka.ms/azure-cli${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not installed. Install from: https://docker.com${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"

# Get subscription ID if not provided
if [ -z "$SUBSCRIPTION_ID" ]; then
    echo -e "${BLUE}📍 Getting subscription ID...${NC}"
    SUBSCRIPTION_ID=$(az account show --query id -o tsv)
fi

echo "Using subscription: $SUBSCRIPTION_ID"

# Step 1: Login
echo -e "\n${BLUE}📝 Step 1: Azure Login${NC}"
az login --use-device-code > /dev/null 2>&1 || az login > /dev/null 2>&1
az account set --subscription "$SUBSCRIPTION_ID"
echo -e "${GREEN}✅ Logged in to Azure${NC}"

# Step 2: Create Resource Group
echo -e "\n${BLUE}📦 Step 2: Creating Resource Group${NC}"
if az group exists --name "$RESOURCE_GROUP" | grep -q true; then
    echo -e "${GREEN}✅ Resource group '$RESOURCE_GROUP' already exists${NC}"
else
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION" > /dev/null
    echo -e "${GREEN}✅ Resource group created${NC}"
fi

# Step 3: Create ACR
echo -e "\n${BLUE}🐳 Step 3: Creating Azure Container Registry${NC}"
if az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ACR '$ACR_NAME' already exists${NC}"
else
    az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Basic > /dev/null
    echo -e "${GREEN}✅ ACR created${NC}"
fi

# Step 4: Login to ACR
echo -e "\n${BLUE}🔐 Step 4: Logging in to ACR${NC}"
az acr login --name "$ACR_NAME" > /dev/null 2>&1
ACR_URL=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
echo -e "${GREEN}✅ Logged in to ACR: $ACR_URL${NC}"

# Step 5: Build and Push Backend Image
echo -e "\n${BLUE}🏗️  Step 5: Building Backend Image${NC}"
docker build -t "${ACR_URL}/dating-backend:latest" backend/ > /dev/null
echo -e "${GREEN}✅ Backend image built${NC}"

echo "Pushing backend image to ACR..."
docker push "${ACR_URL}/dating-backend:latest" > /dev/null
echo -e "${GREEN}✅ Backend image pushed${NC}"

# Step 6: Build and Push Frontend Image
echo -e "\n${BLUE}🏗️  Step 6: Building Frontend Image${NC}"
docker build -t "${ACR_URL}/dating-frontend:latest" frontend/ > /dev/null
echo -e "${GREEN}✅ Frontend image built${NC}"

echo "Pushing frontend image to ACR..."
docker push "${ACR_URL}/dating-frontend:latest" > /dev/null
echo -e "${GREEN}✅ Frontend image pushed${NC}"

# Step 7: Create Container Apps Environment
echo -e "\n${BLUE}⚙️  Step 7: Creating Container Apps Environment${NC}"
if az containerapp env show --name "$CONTAINER_ENV" --resource-group "$RESOURCE_GROUP" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Environment '$CONTAINER_ENV' already exists${NC}"
else
    az containerapp env create \
        --name "$CONTAINER_ENV" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" > /dev/null
    echo -e "${GREEN}✅ Container Apps Environment created${NC}"
fi

# Step 8: Deploy Backend
echo -e "\n${BLUE}🚀 Step 8: Deploying Backend${NC}"
if az containerapp show --name "backend-api" --resource-group "$RESOURCE_GROUP" > /dev/null 2>&1; then
    echo "Updating backend..."
    az containerapp update \
        --name "backend-api" \
        --resource-group "$RESOURCE_GROUP" \
        --image "${ACR_URL}/dating-backend:latest" > /dev/null
else
    echo "Creating backend container app..."
    az containerapp create \
        --name "backend-api" \
        --resource-group "$RESOURCE_GROUP" \
        --environment "$CONTAINER_ENV" \
        --image "${ACR_URL}/dating-backend:latest" \
        --target-port 3000 \
        --ingress external \
        --registry-login-server "$ACR_URL" > /dev/null
fi
echo -e "${GREEN}✅ Backend deployed${NC}"

# Get backend URL
BACKEND_URL=$(az containerapp ingress show --name "backend-api" --resource-group "$RESOURCE_GROUP" --query fqdn -o tsv)
echo "Backend URL: https://$BACKEND_URL"

# Step 9: Deploy Frontend
echo -e "\n${BLUE}🚀 Step 9: Deploying Frontend${NC}"
if az containerapp show --name "frontend-app" --resource-group "$RESOURCE_GROUP" > /dev/null 2>&1; then
    echo "Updating frontend..."
    az containerapp update \
        --name "frontend-app" \
        --resource-group "$RESOURCE_GROUP" \
        --image "${ACR_URL}/dating-frontend:latest" > /dev/null
else
    echo "Creating frontend container app..."
    az containerapp create \
        --name "frontend-app" \
        --resource-group "$RESOURCE_GROUP" \
        --environment "$CONTAINER_ENV" \
        --image "${ACR_URL}/dating-frontend:latest" \
        --target-port 3000 \
        --ingress external \
        --registry-login-server "$ACR_URL" > /dev/null
fi
echo -e "${GREEN}✅ Frontend deployed${NC}"

# Get frontend URL
FRONTEND_URL=$(az containerapp ingress show --name "frontend-app" --resource-group "$RESOURCE_GROUP" --query fqdn -o tsv)
echo "Frontend URL: https://$FRONTEND_URL"

# Step 10: Deployment Summary
echo -e "\n${GREEN}╔════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ DEPLOYMENT SUCCESSFUL!        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════╝${NC}"

echo ""
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  Container Registry: $ACR_URL"
echo ""
echo -e "${BLUE}🌐 Application URLs:${NC}"
echo "  Frontend:  ${YELLOW}https://$FRONTEND_URL${NC}"
echo "  Backend:   ${YELLOW}https://$BACKEND_URL${NC}"
echo "  API:       ${YELLOW}https://$BACKEND_URL/api${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "  1. Update DATABASE_URI and other environment variables in Azure Portal"
echo "  2. Test the frontend URL in your browser"
echo "  3. Check logs: az containerapp logs show --name frontend-app --resource-group $RESOURCE_GROUP"
echo "  4. Monitor: https://portal.azure.com"
echo ""
echo -e "${YELLOW}💡 Useful Commands:${NC}"
echo "  View backend logs: az containerapp logs show --name backend-api --resource-group $RESOURCE_GROUP"
echo "  View frontend logs: az containerapp logs show --name frontend-app --resource-group $RESOURCE_GROUP"
echo "  Restart backend: az containerapp update --name backend-api --resource-group $RESOURCE_GROUP"
echo "  Scale replicas: az containerapp update --name backend-api --resource-group $RESOURCE_GROUP --min-replicas 2"
echo ""
