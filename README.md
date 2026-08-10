# TikTok Command Center

A private React dashboard for managing eight TikTok accounts, daily content production, uploads, follower growth, monetization status, team ownership and first 10,000-follower goals.

## What is included

- **Command Center dashboard** with follower growth, workflow status, weekly consistency, team output and daily blockers.
- **Eight-account overview** with niche, country, assignee, current followers, goal and monetization status.
- **Content pipeline** for Idea, Script Pending, Editing, Ready to Upload, Scheduled, Uploaded and Delayed states.
- **Admin daily-update page** for manual video records, previous/current views, upload time, editor, uploader, followers before/after and notes.
- **Follower snapshots** that feed the growth charts.
- **Analytics** for account views, follower gain, uploader contribution and upload-time performance.
- **Firebase Firestore realtime sync** and **Firebase Email/Password Authentication**.
- **Browser demo mode** using localStorage when Firebase keys are not configured.
- Responsive desktop, tablet and mobile UI.

## Technology

- React + TypeScript + Vite
- Firebase Authentication + Cloud Firestore
- Recharts
- React Router
- Lucide icons
- date-fns

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. Without a `.env` file, the app automatically opens in demo mode with sample data.

## Connect Firebase

1. Create a Firebase project and add a Web App.
2. Create a Cloud Firestore database.
3. Enable **Authentication → Sign-in method → Email/Password**.
4. Create an admin user under **Authentication → Users**.
5. Copy `.env.example` to `.env` and paste the Firebase Web App values.
6. Deploy `firestore.rules`.
7. Start the app and sign in. Open **Setup** and click **Load starter data into Firebase** once.

```bash
cp .env.example .env
npm run dev
```

Firebase values are public client configuration, not service-account secrets. Access is protected by Authentication and Firestore Security Rules.

## Production build

```bash
npm run build
npm run preview
```

## Firebase deployment

Install the Firebase CLI, authenticate and select your project:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
npm run build
firebase deploy --only firestore:rules,hosting
```

## Data model

### `accounts`
Account identity, niche, owner, assignee, target country, follower total, follower goal, monetization status and upload target.

### `videos`
Video title, account, workflow status, editor, uploader, schedule, upload time slot, views, followers before/after and notes.

### `snapshots`
Dated follower totals used by growth charts.

## Daily routine

1. Open **Admin Updates**.
2. Add the day’s video record and production status.
3. When uploaded, enter current views and followers before/after.
4. Use **Quick Status Control** to move pending work through the pipeline.
5. Add a daily follower snapshot when no video was uploaded.
6. Review the Command Center for delayed work and goal progress.
