# MatchConnect

MatchConnect is a dating social web application that combines profile discovery, mutual matching, realtime chat, voice/video calling, reporting, blocking, profile verification, and basic admin moderation.

## Main Features

- User registration, login, logout, password reset
- Dating profile with bio, age, gender, city, intentions, interests, avatar, and multiple dating photos
- Discover profiles with swipe-like like/pass interaction
- Liked You flow: users who liked you appear separately
- Mutual match flow: chat and calls are available only after both users match
- Realtime direct messaging with image/audio media support
- Voice and video calls using Socket.IO signaling and WebRTC
- Unmatch, block, spam, and report user actions
- Admin dashboard for reports, user moderation, account suspension, and profile verification
- Profile verification request and admin approval flow

## Tech Stack

### Frontend

- React
- Vite
- React Router
- Tailwind CSS / daisyUI
- Axios
- Socket.IO client
- WebRTC APIs

### Backend

- Node.js
- Express.js
- MongoDB / Mongoose
- Socket.IO
- JWT authentication with cookies
- Cloudinary for media upload
- Resend/email service for emails
- Arcjet middleware
- Cloudflare TURN credentials for call connectivity

## Project Structure

```text
MatchConnect/
  backend/
    src/
      controllers/
      routes/
      models/
      services/
      middleware/
      lib/
  frontend/
    src/
      components/
      context/
      pages/
      layouts/
```

## Requirements

Install these before running the project:

- Node.js
- npm
- MongoDB Atlas database
- Cloudinary account

## Environment Variables

Create `backend/.env` and configure the required values.

Example:

```env
PORT=3000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=no-reply@example.com
EMAIL_FROM_NAME=MatchConnect

CLIENT_URL=http://localhost:5173

ARCJET_KEY=your_arcjet_key
ARCJET_ENV=development

CLOUDFLARE_TURN_TOKEN_ID=your_turn_token_id
CLOUDFLARE_TURN_API_TOKEN=your_turn_api_token

ADMIN_EMAILS=admin@example.com
```

Notes:

- Do not commit `.env` to GitHub.
- `ADMIN_EMAILS` is a comma-separated list of emails allowed to create or log in as admin.
- If multiple admins are needed:

```env
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

## Install Dependencies

Open a terminal at the project root:

```powershell
cd C:\Users\Admin\Desktop\Project_new\MatchConnect
```

Install backend dependencies:

```powershell
npm install --prefix backend
```

Install frontend dependencies:

```powershell
npm install --prefix frontend
```

## Run Locally

Start the backend:

```powershell
npm run dev --prefix backend
```

Backend runs at:

```text
http://localhost:3000
```

Open a second terminal and start the frontend:

```powershell
npm run dev --prefix frontend
```

Frontend runs at:

```text
http://localhost:5173
```

Open the app in your browser:

```text
http://localhost:5173
```

## Admin Account

To create or use an admin account:

1. Add the admin email to `backend/.env`:

```env
ADMIN_EMAILS=admin@example.com
```

2. Restart the backend.
3. Register or log in using that email.
4. On the login/register page, choose `Admin`.
5. After login, open:

```text
http://localhost:5173/chat/admin
```

Admin can:

- View reports
- Update report status
- Suspend or restore users
- Verify or reject dating profiles

## Build Frontend

```powershell
npm run build --prefix frontend
```

The production build is generated in:

```text
frontend/dist
```

## Production Deployment Notes

The project can be deployed in two common ways:

1. Deploy backend and frontend separately.
2. Build frontend and let the Express backend serve `frontend/dist` in production.

For Render deployment, make sure production environment variables are configured in the Render dashboard.

Recommended production values:

```env
NODE_ENV=production
CLIENT_URL=https://your-production-domain.com
```

Do not set a fixed `PORT` on Render unless required. Render usually injects its own port.

## Useful Commands

Check git status:

```powershell
git status
```

Build frontend:

```powershell
npm run build --prefix frontend
```

Run backend:

```powershell
npm run dev --prefix backend
```

Run frontend:

```powershell
npm run dev --prefix frontend
```