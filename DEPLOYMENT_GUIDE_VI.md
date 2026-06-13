# HƯỚNG DẪN DEPLOY DỰ ÁN LÊN PRODUCTION

## 📋 TÓM TẮT DỰ ÁN
- **Backend**: Express.js + Socket.io (Node.js)
- **Frontend**: React + Vite
- **Database**: MongoDB
- **Dùng cho**: Real-time dating/messaging app

---

## 🎯 CÁC OPTION DEPLOY

### **Option 1: Azure Container Apps (RECOMMENDED)** ⭐
- ✅ Dễ setup, giá tốt cho startup
- ✅ Tự động scale
- ✅ Hỗ trợ WebSocket (cho real-time)
- ✅ Integrated monitoring & logging
- **Chi phí**: ~$30-50/tháng (tùy traffic)

### **Option 2: Azure App Service**
- ✅ Đơn giản nhất
- ✅ Có free tier
- ❌ Khó scale cho WebSocket
- **Chi phí**: ~$15-30/tháng

### **Option 3: Vercel + Render/Railway**
- Frontend trên Vercel (free)
- Backend trên Render/Railway (~$7-15/tháng)
- ❌ WebSocket có giới hạn
- **Chi phí**: Rẻ nhưng có hạn chế

---

## 🚀 HƯỚNG DẪN DEPLOY LÊN AZURE CONTAINER APPS

### **BƯỚC 1: Chuẩn BỊ**

#### 1.1 Tạo Azure Account (nếu chưa có)
```bash
# Truy cập https://azure.microsoft.com/free/
# Đăng ký tài khoản, nhận $200 credit miễn phí
```

#### 1.2 Lấy Subscription ID
```bash
# Sau khi đăng nhập Azure Portal
# Tìm Subscription ID trong Home > Subscriptions
# Lưu lại ID này: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

#### 1.3 Chuẩn bị Environment Variables
Tạo file `.env.production` trong backend:
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dating
CLIENT_URL=https://frontend-app.eastus.azurecontainerapps.io
JWT_SECRET=your_jwt_secret_key_here
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
RESEND_API_KEY=your_resend_key
ARCJET_KEY=your_arcjet_key
```

Cho frontend, tạo `.env.production`:
```env
VITE_API_URL=https://backend-api.eastus.azurecontainerapps.io/api
VITE_SOCKET_URL=https://backend-api.eastus.azurecontainerapps.io
```

### **BƯỚC 2: Chuẩn Bị Database**

#### 2.1 Option A: Dùng MongoDB Atlas (Recommended)
```bash
# Truy cập https://www.mongodb.com/cloud/atlas
# 1. Tạo free account
# 2. Tạo cluster
# 3. Copy connection string
# 4. Thêm vào .env.production: MONGODB_URI=mongodb+srv://user:pass@cluster...
```

#### 2.2 Option B: Dùng Azure Cosmos DB
```bash
# Trong Azure Portal:
# 1. Tạo Cosmos DB tài khoản (MongoDB API)
# 2. Lấy connection string
# 3. Thêm vào .env.production
```

### **BƯỚC 3: Build Docker Images**

#### 3.1 Tạo Dockerfile cho Backend
Tạo file `backend/Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src
COPY lib ./lib
COPY public ./public

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
```

#### 3.2 Tạo Dockerfile cho Frontend
Tạo file `frontend/Dockerfile`:
```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
```

#### 3.3 Test build locally
```bash
cd backend
docker build -t dating-backend:latest .
docker run -p 3000:3000 dating-backend:latest

cd frontend
docker build -t dating-frontend:latest .
docker run -p 3000:3000 dating-frontend:latest
```

### **BƯỚC 4: Setup Azure CLI**

```bash
# Install Azure CLI (nếu chưa có)
# https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

# Login vào Azure
az login

# Set subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Tạo resource group
az group create --name dating-web-rg --location eastus
```

### **BƯỚC 5: Tạo Azure Container Registry**

```bash
# Tạo ACR (Azure Container Registry)
az acr create --resource-group dating-web-rg \
  --name datingwebacr \
  --sku Basic

# Login vào ACR
az acr login --name datingwebacr

# Lấy login server URL
az acr show --name datingwebacr --query loginServer --output tsv
# Output: datingwebacr.azurecr.io
```

### **BƯỚC 6: Push Images lên ACR**

```bash
# Build và push backend
docker build -t dating-backend:latest backend/
docker tag dating-backend:latest datingwebacr.azurecr.io/dating-backend:latest
docker push datingwebacr.azurecr.io/dating-backend:latest

# Build và push frontend
docker build -t dating-frontend:latest frontend/
docker tag dating-frontend:latest datingwebacr.azurecr.io/dating-frontend:latest
docker push datingwebacr.azurecr.io/dating-frontend:latest

# Verify
az acr repository list --name datingwebacr
```

### **BƯỚC 7: Deploy lên Azure Container Apps**

#### 7.1 Tạo Container Apps Environment
```bash
# Tạo environment
az containerapp env create \
  --resource-group dating-web-rg \
  --name dating-env \
  --location eastus

# Tạo Log Analytics Workspace
az monitor log-analytics workspace create \
  --resource-group dating-web-rg \
  --workspace-name dating-logs
```

#### 7.2 Deploy Backend Container App
```bash
az containerapp create \
  --name backend-api \
  --resource-group dating-web-rg \
  --environment dating-env \
  --image datingwebacr.azurecr.io/dating-backend:latest \
  --target-port 3000 \
  --ingress external \
  --query properties.configuration.ingress.fqdn \
  --env-vars \
    NODE_ENV=production \
    PORT=3000 \
    MONGODB_URI="mongodb+srv://user:pass@cluster..." \
    CLIENT_URL="https://frontend-url" \
    JWT_SECRET="your-secret-key" \
  --registry-login-server datingwebacr.azurecr.io \
  --registry-username <username> \
  --registry-password <password>
```

#### 7.3 Deploy Frontend Container App
Sau khi deploy backend, lấy URL của backend rồi deploy frontend:
```bash
# Lấy backend URL
BACKEND_URL=$(az containerapp show \
  --name backend-api \
  --resource-group dating-web-rg \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "Backend URL: https://$BACKEND_URL"

# Deploy frontend
az containerapp create \
  --name frontend-app \
  --resource-group dating-web-rg \
  --environment dating-env \
  --image datingwebacr.azurecr.io/dating-frontend:latest \
  --target-port 3000 \
  --ingress external \
  --query properties.configuration.ingress.fqdn \
  --env-vars \
    VITE_API_URL="https://$BACKEND_URL/api" \
    VITE_SOCKET_URL="https://$BACKEND_URL" \
  --registry-login-server datingwebacr.azurecr.io \
  --registry-username <username> \
  --registry-password <password>
```

### **BƯỚC 8: Test Ứng Dụng**

```bash
# Lấy URL frontend
az containerapp show \
  --name frontend-app \
  --resource-group dating-web-rg \
  --query properties.configuration.ingress.fqdn -o tsv

# Truy cập URL trong browser để test
```

### **BƯỚC 9: Monitoring & Logs**

```bash
# Xem logs của backend
az containerapp logs show \
  --name backend-api \
  --resource-group dating-web-rg

# Xem logs của frontend
az containerapp logs show \
  --name frontend-app \
  --resource-group dating-web-rg

# Xem metrics
az monitor metrics list-definitions \
  --resource /subscriptions/{subscriptionId}/resourceGroups/dating-web-rg/providers/Microsoft.App/containerApps/backend-api
```

---

## ⚡ QUICK DEPLOY SCRIPT

Hoặc dùng script tự động:

```bash
#!/bin/bash

# Set variables
SUBSCRIPTION_ID="your-subscription-id"
RESOURCE_GROUP="dating-web-rg"
LOCATION="eastus"
ACR_NAME="datingwebacr"
BACKEND_PORT=3000
FRONTEND_PORT=3000

# Login và set subscription
az login
az account set --subscription $SUBSCRIPTION_ID

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create ACR
az acr create --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic

az acr login --name $ACR_NAME

# Build và push images
docker build -t ${ACR_NAME}.azurecr.io/dating-backend:latest backend/
docker push ${ACR_NAME}.azurecr.io/dating-backend:latest

docker build -t ${ACR_NAME}.azurecr.io/dating-frontend:latest frontend/
docker push ${ACR_NAME}.azurecr.io/dating-frontend:latest

# Create Container Apps Environment
az containerapp env create \
  --resource-group $RESOURCE_GROUP \
  --name dating-env \
  --location $LOCATION

# Deploy Backend
az containerapp create \
  --name backend-api \
  --resource-group $RESOURCE_GROUP \
  --environment dating-env \
  --image ${ACR_NAME}.azurecr.io/dating-backend:latest \
  --target-port 3000 \
  --ingress external \
  --registry-login-server ${ACR_NAME}.azurecr.io

# Deploy Frontend
az containerapp create \
  --name frontend-app \
  --resource-group $RESOURCE_GROUP \
  --environment dating-env \
  --image ${ACR_NAME}.azurecr.io/dating-frontend:latest \
  --target-port 3000 \
  --ingress external \
  --registry-login-server ${ACR_NAME}.azurecr.io

echo "✅ Deployment complete!"
echo "Frontend: https://$(az containerapp show --name frontend-app --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)"
```

---

## 💰 TÍNH TOÁN CHI PHÍ (Hàng tháng)

| Service | Chi phí |
|---------|--------|
| Azure Container Apps (2 apps) | $15-30 |
| MongoDB Atlas (free tier) | $0 |
| Storage | $1-5 |
| Data transfer | $0-10 |
| **Tổng cộng** | **~$20-50/tháng** |

---

## 🐛 TROUBLESHOOTING

### Lỗi: "Image not found"
```bash
# Kiểm tra image có tồn tại không
az acr repository list --name datingwebacr

# Re-push image
docker push datingwebacr.azurecr.io/dating-backend:latest
```

### Lỗi: "Connection timeout"
```bash
# Kiểm tra logs
az containerapp logs show --name backend-api --resource-group dating-web-rg

# Kiểm tra environment variables
az containerapp show --name backend-api --resource-group dating-web-rg
```

### WebSocket không hoạt động
- Kiểm tra `CLIENT_URL` có chính xác không
- Kiểm tra firewall rules
- Đảm bảo backend chạy trên port 3000

---

## 📚 TÀI LIỆU THAM KHẢO

- [Azure Container Apps Docs](https://learn.microsoft.com/en-us/azure/container-apps/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [MongoDB Atlas](https://www.mongodb.com/docs/atlas/)
- [Azure CLI Reference](https://learn.microsoft.com/en-us/cli/azure/)

---

## ✅ CHECKLIST TRƯỚC DEPLOY

- [ ] Chuẩn bị MongoDB connection string
- [ ] Tạo Azure account & lấy subscription ID
- [ ] Chuẩn bị tất cả environment variables
- [ ] Test Dockerfiles locally
- [ ] Install Azure CLI
- [ ] Login vào Azure
- [ ] Tạo resource group
- [ ] Deploy!

---

**Bạn cần giúp ở bước nào?** 😊
