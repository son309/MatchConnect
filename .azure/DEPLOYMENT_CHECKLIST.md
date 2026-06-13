# Deploy checklist & deployment status

## Pre-Deployment Setup

### Prerequisites
- [ ] Azure subscription created and subscription ID obtained
- [ ] Azure CLI installed (`az --version`)
- [ ] Docker installed locally (`docker --version`)
- [ ] MongoDB Atlas account created with connection string ready
- [ ] All environment variables prepared

### Environment Variables Ready
- [ ] Backend `.env.production` created with:
  - MONGODB_URI
  - CLIENT_URL
  - JWT_SECRET
  - CLOUDINARY credentials
  - RESEND_API_KEY
  - ARCJET_KEY
- [ ] Frontend `.env.production` created with:
  - VITE_API_URL
  - VITE_SOCKET_URL

## Deployment Steps

### Step 1: Local Testing
- [ ] Build backend image: `docker build -t dating-backend:latest backend/`
- [ ] Test backend locally: `docker run -p 3000:3000 dating-backend:latest`
- [ ] Build frontend image: `docker build -t dating-frontend:latest frontend/`
- [ ] Test frontend locally: `docker run -p 3000:3000 dating-frontend:latest`

### Step 2: Azure CLI Setup
- [ ] Run `az login`
- [ ] Set subscription: `az account set --subscription "SUBSCRIPTION_ID"`
- [ ] Create resource group: `az group create --name dating-web-rg --location eastus`

### Step 3: Container Registry
- [ ] Create ACR: `az acr create --resource-group dating-web-rg --name datingwebacr --sku Basic`
- [ ] Login to ACR: `az acr login --name datingwebacr`
- [ ] Get ACR URL: `az acr show --name datingwebacr --query loginServer --output tsv`
- [ ] Push backend image to ACR
- [ ] Push frontend image to ACR

### Step 4: Container Apps Environment
- [ ] Create Container Apps Environment: `az containerapp env create --resource-group dating-web-rg --name dating-env --location eastus`
- [ ] Create Log Analytics Workspace: `az monitor log-analytics workspace create --resource-group dating-web-rg --workspace-name dating-logs`

### Step 5: Deploy Backend
- [ ] Create backend Container App with all environment variables
- [ ] Verify backend is running: check logs and test API endpoint
- [ ] Get backend URL for frontend configuration

### Step 6: Deploy Frontend
- [ ] Update frontend environment with backend URL
- [ ] Create frontend Container App
- [ ] Verify frontend is accessible in browser
- [ ] Test WebSocket connection to backend

### Step 7: Post-Deployment Verification
- [ ] Test frontend URL in browser
- [ ] Check login functionality
- [ ] Test real-time features (messaging, calls)
- [ ] Monitor application logs for errors
- [ ] Check Azure Monitor metrics

## Monitoring & Maintenance

### Regular Checks
- [ ] Monitor application logs daily
- [ ] Check resource utilization
- [ ] Monitor error rates
- [ ] Review database connection health

### Backup & Updates
- [ ] Setup MongoDB backups
- [ ] Plan dependency updates
- [ ] Setup auto-scaling policies
- [ ] Configure alerts for failures

## Common Issues & Fixes

### Issue: "Image not found in registry"
**Fix**: 
```bash
docker push datingwebacr.azurecr.io/dating-backend:latest
az acr repository list --name datingwebacr
```

### Issue: "Container failed to start"
**Fix**: 
```bash
az containerapp logs show --name backend-api --resource-group dating-web-rg
# Check environment variables are set correctly
az containerapp show --name backend-api --resource-group dating-web-rg
```

### Issue: "WebSocket connection fails"
**Fix**: 
- Verify CLIENT_URL in backend matches frontend URL
- Check firewall isn't blocking WebSocket connections
- Ensure both services are in same Container Apps Environment

### Issue: "Database connection timeout"
**Fix**: 
- Verify MongoDB connection string is correct
- Check IP whitelist in MongoDB Atlas includes Azure IP range
- Test connection string locally first

## Deployment URLs

After successful deployment:
- **Frontend**: https://frontend-app.eastus.azurecontainerapps.io
- **Backend API**: https://backend-api.eastus.azurecontainerapps.io
- **API Base**: https://backend-api.eastus.azurecontainerapps.io/api

## Cost Tracking

Monthly cost estimate:
- Container Apps (2 instances): ~$15-30
- Container Registry: ~$5
- Data transfer: ~$1-10
- Total: ~$25-45/month

---

**Last Updated**: 2024
**Status**: Ready for deployment
