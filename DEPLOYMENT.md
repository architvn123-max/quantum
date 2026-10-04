# 🚀 Deployment Guide: Quantum Student Performance Analyzer

This guide details how to deploy the **Quantum Student Performance Analyzer** across various platforms.

---

## 📋 Pre-configured Deployment Files Included
Your project already includes production-ready deployment configurations:
- `Procfile` – Specifies the WSGI startup command (`web: gunicorn app:app`)
- `requirements.txt` – Includes `gunicorn` along with `qiskit`, `flask`, `matplotlib`
- `render.yaml` – Automated blueprint for **Render.com**
- `Dockerfile` – Production containerization for **Docker, Railway, Fly.io, Koyeb, Hugging Face**
- `.dockerignore` & `.gitignore` – Clean artifact exclusion

---

## 🌟 Option 1: Render.com (Recommended - Free Cloud Hosting)

Render provides free hosting for Python web services with HTTPS.

### Steps:
1. **Push your code to GitHub**:
   - If you have Git installed:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git branch -M main
     git remote add origin https://github.com/<your-username>/<your-repo-name>.git
     git push -u origin main
     ```
   - Alternatively, create a repository on [github.com](https://github.com), click **Add file > Upload files**, and upload the project files.

2. **Deploy on Render**:
   1. Visit [dashboard.render.com](https://dashboard.render.com/) and sign in with GitHub.
   2. Click **New +** and select **Web Service**.
   3. Choose your repository.
   4. Configure:
      - **Runtime**: `Python 3`
      - **Build Command**: `pip install -r requirements.txt`
      - **Start Command**: `gunicorn app:app --workers 2 --threads 4 --timeout 120`
      - **Instance Type**: `Free`
   5. Click **Create Web Service**.
   6. Once the build finishes, your site is live with a permanent URL like `https://quantum-student-performer.onrender.com`!

---

## 🐳 Option 2: Docker / Railway / Fly.io / Koyeb

Deploy anywhere using the included `Dockerfile`:

### Local or VPS Docker Run:
```bash
docker build -t quantum-performer .
docker run -p 5000:5000 quantum-performer
```

### Railway.app:
1. Go to [railway.app](https://railway.app/).
2. Click **New Project** > **Deploy from GitHub repo**.
3. Railway automatically detects the `Dockerfile` or `Procfile` and deploys.
4. In project settings, generate a domain (e.g., `*.up.railway.app`).

### Koyeb:
1. Go to [koyeb.com](https://www.koyeb.com/).
2. Select **GitHub** or **Docker**.
3. Koyeb builds and deploys your container with free tier resources.

---

## 🤗 Option 3: Hugging Face Spaces (Free Cloud Hosting with Docker)

Hugging Face Spaces offers free 16 GB RAM CPU instances, perfect for quantum computing demos.

1. Go to [huggingface.co/spaces](https://huggingface.co/spaces) and click **Create new Space**.
2. Select **Docker** as the Space SDK (Blank).
3. Clone or upload your files into the Space repository.
4. Hugging Face builds the Docker container automatically and serves your web app publicly.

---

## 🐍 Option 4: PythonAnywhere (No Git Required)

1. Register a free account at [pythonanywhere.com](https://www.pythonanywhere.com/).
2. Go to the **Files** tab and upload your project zip or files.
3. Open a **Bash Console** and install dependencies:
   ```bash
   pip install --user -r requirements.txt
   ```
4. Go to the **Web** tab:
   - Click **Add a new web app** (Flask, Python 3.11).
   - In the WSGI configuration file, point `application` to your `app.py`:
     ```python
     import sys
     path = '/home/<username>/student_performer'
     if path not in sys.path:
         sys.path.append(path)
     from app import app as application
     ```
5. Click **Reload** to go live.

---

## ⚡ Option 5: Instant Public URL (Cloudflare Tunnel)

To immediately share your locally running app with anyone across the globe without creating an account:
1. Run the local app:
   ```bash
   python app.py
   ```
2. In a separate terminal, expose port 5000 using Cloudflare Tunnel:
   ```bash
   npx cloudflared tunnel --url http://localhost:5000
   ```
3. Cloudflare gives you an instant `https://<random>.trycloudflare.com` link!
