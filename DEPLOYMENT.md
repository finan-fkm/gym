# Gym Management System - Render Deployment Guide

This guide provides step-by-step instructions on deploying the full stack (React + Vite Frontend and Express + PostgreSQL Backend) to **Render** (https://render.com).

There are two ways to deploy this application:
- **Method A: Blueprint Deployment (Recommended & Fastest)**: Uses the pre-configured `render.yaml` file to provision the database, backend, and frontend automatically.
- **Method B: Manual Dashboard Deployment**: Step-by-step setup using the Render Web GUI.

---

## Prerequisites
1. Create a free account on [Render](https://render.com).
2. Push your project code to a **GitHub** or **GitLab** repository.
   - *Note: Ensure both frontend files and the `server` folder are pushed to the same repository.*

---

## Method A: Blueprint Deployment (Recommended)
Render Blueprints let you deploy your database, backend API, and frontend site simultaneously using the local `render.yaml` configuration.

1. Log into your **Render Dashboard**.
2. Click **New +** in the top navigation bar and select **Blueprint**.
3. Select or connect your GitHub repository containing the project.
4. Render will read the `render.yaml` file and show the list of services it will create:
   - **gym-db** (PostgreSQL database instance)
   - **gym-backend** (Express API web service)
   - **gym-frontend** (Static website frontend)
5. Review the plan details and click **Apply**.
6. Render will automatically:
   - Provision the database.
   - Start the backend, execute the table schemas, and run `npm run seed` to insert the initial client database values.
   - Build the React static frontend, automatically injecting the generated backend API URL (`VITE_API_URL`) into your frontend bundle.

Once the deployments show a green **Live** status, click the frontend URL to access your gym portal!

---

## Method B: Manual Dashboard Deployment
If you prefer setting up each service manually through the Render Dashboard, follow these steps:

### Step 1: Create a PostgreSQL Database
1. In the Render Dashboard, click **New +** and select **PostgreSQL**.
2. Configure:
   - **Name**: `gym-db`
   - **Database Name**: `gym_db`
   - **User**: (Leave default or set your username)
   - **Region**: Select a region (e.g., `Oregon (US West)`). *Crucial: Keep all services in the same region to minimize latency.*
   - **Plan**: `Free`
3. Click **Create Database**.
4. Once created, copy the **Internal Database URL** (e.g. `postgres://user:pass@host/db`).

---

### Step 2: Deploy the Express Backend Service
1. Click **New +** and select **Web Service**.
2. Connect your GitHub repository.
3. Configure:
   - **Name**: `gym-backend`
   - **Language**: `Node`
   - **Region**: (Must match the Database Region)
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run seed && npm start`
   - **Plan**: `Free`
4. Expand the **Advanced** section and add these **Environment Variables**:
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: (Paste the **Internal Database URL** copied in Step 1)
5. Click **Create Web Service**.
6. Once deployed, copy your backend's public service URL (e.g., `https://gym-backend.onrender.com`).

---

### Step 3: Deploy the React Frontend Service
1. Click **New +** and select **Static Site**.
2. Connect your GitHub repository.
3. Configure:
   - **Name**: `gym-frontend`
   - **Region**: (Matches others)
   - **Root Directory**: Leave blank (runs at the project root)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Expand the **Advanced** section and add this **Environment Variable**:
   - `VITE_API_URL`: (Paste your backend's public service URL copied in Step 2, e.g. `https://gym-backend.onrender.com`)
5. Click **Create Static Site**.

---

## Post-Deployment Verification
To verify the application is running correctly:

1. **Verify Database Seeding**:
   - In Render, click on your `gym-backend` Web Service.
   - Go to **Logs**.
   - You should see logs like:
     ```
     DB Mode: PostgreSQL database detected.
     PostgreSQL tables initialized successfully.
     Seeding database...
     No admin found. Creating default admin account...
     Default admin account created: admin / password
     No clients found. Seeding 2 default client profiles...
     Seeded client: Therese Spring (@thespring)
     Seeded client: John Doe (@johndoe)
     Client profiles seeded successfully.
     Server is running on port 5000
     ```

2. **Verify Frontend Connection**:
   - Open your `gym-frontend` static site URL in the browser.
   - Check the network tab or console. You should see a successful GET request to `https://gym-backend.onrender.com/api/clients` loading the seeded profiles.
   - Try logging in:
     - **Admin**: `admin` / `password`
     - **Client**: `@thespring` / `password` or `@johndoe` / `password`

---

## Important Render Free-Tier Considerations
- **Cold Starts**: Render's free Web Services spin down after 15 minutes of inactivity. When a new request arrives, it may take 50+ seconds for the backend to wake up. This is normal on the free tier.
- **Database Expiration**: Render's free PostgreSQL databases expire after 90 days. If you plan to run this for long-term production, upgrade the database instance to the basic starter tier ($7/month).
