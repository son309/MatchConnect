@echo off
REM Dating Web App - Automated Azure Deployment Script (Windows)
REM Usage: deploy.bat

echo.
echo ========================================
echo Dating Web App - Azure Deployment
echo ========================================
echo.

REM Configuration
set RESOURCE_GROUP=dating-web-rg
set LOCATION=eastus
set ACR_NAME=datingwebacr
set CONTAINER_ENV=dating-env

REM Check prerequisites
echo Checking prerequisites...
az --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Azure CLI not installed
    echo Download from: https://aka.ms/azure-cli
    exit /b 1
)

docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker not installed
    echo Download from: https://docker.com
    exit /b 1
)

echo OK - All prerequisites installed
echo.

REM Step 1: Login to Azure
echo [Step 1] Logging in to Azure...
call az login

REM Step 2: Create Resource Group
echo [Step 2] Creating Resource Group...
call az group create --name %RESOURCE_GROUP% --location %LOCATION%

REM Step 3: Create ACR
echo [Step 3] Creating Container Registry...
call az acr create --resource-group %RESOURCE_GROUP% --name %ACR_NAME% --sku Basic

REM Step 4: Login to ACR
echo [Step 4] Logging in to ACR...
call az acr login --name %ACR_NAME%
for /f "delims=" %%i in ('az acr show --name %ACR_NAME% --query loginServer -o tsv') do set ACR_URL=%%i
echo ACR URL: %ACR_URL%

REM Step 5: Build and Push Backend
echo [Step 5] Building and pushing backend image...
call docker build -t %ACR_URL%/dating-backend:latest backend/
call docker push %ACR_URL%/dating-backend:latest

REM Step 6: Build and Push Frontend
echo [Step 6] Building and pushing frontend image...
call docker build -t %ACR_URL%/dating-frontend:latest frontend/
call docker push %ACR_URL%/dating-frontend:latest

REM Step 7: Create Container Apps Environment
echo [Step 7] Creating Container Apps Environment...
call az containerapp env create --name %CONTAINER_ENV% --resource-group %RESOURCE_GROUP% --location %LOCATION%

REM Step 8: Deploy Backend
echo [Step 8] Deploying backend...
call az containerapp create ^
    --name backend-api ^
    --resource-group %RESOURCE_GROUP% ^
    --environment %CONTAINER_ENV% ^
    --image %ACR_URL%/dating-backend:latest ^
    --target-port 3000 ^
    --ingress external ^
    --registry-login-server %ACR_URL%

REM Step 9: Deploy Frontend
echo [Step 9] Deploying frontend...
call az containerapp create ^
    --name frontend-app ^
    --resource-group %RESOURCE_GROUP% ^
    --environment %CONTAINER_ENV% ^
    --image %ACR_URL%/dating-frontend:latest ^
    --target-port 3000 ^
    --ingress external ^
    --registry-login-server %ACR_URL%

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Run these commands to get your URLs:
echo   az containerapp ingress show --name backend-api --resource-group %RESOURCE_GROUP% --query fqdn -o tsv
echo   az containerapp ingress show --name frontend-app --resource-group %RESOURCE_GROUP% --query fqdn -o tsv
echo.
