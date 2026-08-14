# PrintGo Production Launch Playbook

Your entire codebase is now committed locally and hardened for enterprise scale. 
To launch the platform, follow these exact steps:

## Step 1: Connect to GitHub
1. Create a repository on [GitHub](https://github.com/new).
2. Open a terminal in this folder (`c:\Projects\PrintGo`) and run:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Deploy Backend (Render)
1. Go to [Render.com](https://render.com) and connect your GitHub account.
2. Click **New > Web Service**.
3. Select your `PrintGo` repository.
4. Render will automatically detect the `render.yaml` file. It will set up:
   - Your Node.js backend.
   - A fully managed PostgreSQL database.
   - All internal connections automatically.
5. In the Render Dashboard for your new Web Service, go to **Environment** and add:
   - `CASHFREE_APP_ID` (from your Cashfree dashboard)
   - `CASHFREE_SECRET_KEY`
   - AWS Keys (if using S3 for document storage)

## Step 3: Deploy Frontends (Vercel)
1. Go to [Vercel.com](https://vercel.com) and connect your GitHub account.
2. Click **Add New > Project**.
3. Import your `PrintGo` repository. In the "Root Directory" option, select `frontend`.
4. Add the Environment Variable `VITE_API_URL` and paste your Render backend URL (e.g., `https://printgo-backend.onrender.com`).
5. Click **Deploy**.
6. Repeat steps 2-5, but select the `superadmin` root directory to deploy your dashboard.

## Step 4: Kiosk Provisioning
1. Once deployed, log into your new Superadmin Vercel URL (credentials: `admin` / `[check your render dashboard logs for the generated password]`).
2. Create a Franchisee, and generate a Kiosk Machine Key.
3. On a physical Windows PC connected to a printer:
   - Clone your github repository (or copy the `printer-agent` folder).
   - Edit `.env` in the agent folder: paste your `BACKEND_URL`, `MACHINE_KEY`, and `PRINTER_NAME`.
   - Right click `setup_kiosk.bat` and **Run as Administrator**.
4. The kiosk will lock itself down, boot into Chrome Kiosk mode, and run forever. 

### Future Updates
When you need to fix a bug or add a feature, you just push the code to the GitHub `main` branch. 
Render and Vercel will automatically redeploy the cloud apps.
Your physical kiosks will automatically fetch the new agent code every night at 3:00 AM via the OTA updater.

**Good luck with PrintGo! 🚀**
