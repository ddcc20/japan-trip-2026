# 🗾 Japan '26 — Group Trip Planner

A real-time shared trip planner for your Japan trip. All group members can view and edit the same data from their phones.

## 🚀 Deployment Guide (Step-by-Step)

### Prerequisites
You'll need free accounts on:
- **GitHub** → [github.com](https://github.com)
- **Firebase** → [firebase.google.com](https://firebase.google.com) (use any Google account)
- **Vercel** → [vercel.com](https://vercel.com) (sign up with your GitHub account)

---

### Step 1: Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Create a project"**
3. Name it `japan-trip-2026` → Click Continue
4. Disable Google Analytics (not needed) → Click **Create Project**
5. Once created, click the **⚙️ gear icon → Project Settings**
6. Scroll down to "Your apps" and click the **web icon `</>`**
7. Name it `trip-planner`, do NOT check "Firebase Hosting" → Click **Register App**
8. You'll see a `firebaseConfig` object — **copy the values** (you'll need them in Step 3)

Then set up the database:

9. In the left sidebar, click **Build → Realtime Database**
10. Click **Create Database**
11. Choose any location → Click **Next**
12. Select **"Start in test mode"** → Click **Enable**
13. Copy the database URL (looks like `https://japan-trip-2026-default-rtdb.firebaseio.com`)

---

### Step 2: Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Name it `japan-trip-2026`
3. Keep it **Public** (needed for free Vercel deployment)
4. Do NOT add a README (we already have one)
5. Click **Create repository**
6. You'll see instructions — we'll use these in Step 4

---

### Step 3: Add Your Firebase Config

Open the file `src/firebase.js` and replace the placeholder values with your actual Firebase config:

```js
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "japan-trip-2026.firebaseapp.com",
  databaseURL: "https://japan-trip-2026-default-rtdb.firebaseio.com",
  projectId: "japan-trip-2026",
  storageBucket: "japan-trip-2026.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

---

### Step 4: Upload Code to GitHub

**Option A: Using GitHub's web interface (easiest)**

1. Go to your new repo on GitHub
2. Click **"uploading an existing file"** link
3. Drag and drop ALL the project files into the browser
4. Make sure the folder structure matches what's described below
5. Click **Commit changes**

**Option B: Using the command line**

```bash
cd japan-trip
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/japan-trip-2026.git
git push -u origin main
```

---

### Step 5: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New..." → Project**
3. Find `japan-trip-2026` and click **Import**
4. Framework should auto-detect as **Vite**
5. Click **Deploy**
6. Wait 1-2 minutes... ✅ Done!
7. You'll get a URL like `japan-trip-2026.vercel.app`

---

### Step 6: Share with Your Group! 🎉

Send the Vercel URL to your group. Everyone can:
- Open it on their phone browser
- Add it to their home screen (tap Share → Add to Home Screen on iOS)
- Edit data in real-time — changes sync instantly for everyone

---

## 📁 Project Structure

```
japan-trip/
├── index.html          ← Main HTML file
├── package.json        ← Dependencies
├── vite.config.js      ← Build config
├── .gitignore          ← Files to ignore
├── README.md           ← This file
└── src/
    ├── main.jsx        ← React entry point
    ├── firebase.js     ← Firebase config (edit this!)
    └── App.jsx         ← The entire app
```

## ⚠️ Important Notes

- **Test mode**: The Firebase database is in test mode, which means anyone with the URL can read/write data. This is fine for a small group trip. If you want to restrict access later, update the Firebase Realtime Database rules.
- **Free tiers**: Firebase, Vercel, and GitHub all have generous free tiers. This app will cost you $0.
- **Add to Home Screen**: For the best mobile experience, have everyone add the site to their phone's home screen. It'll look and feel like a native app.
