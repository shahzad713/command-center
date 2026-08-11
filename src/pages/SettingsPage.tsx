import { CheckCircle2, Code2, Database, ShieldCheck } from 'lucide-react'
import { PageIntro } from '../components/PageIntro'
import { useData } from '../context/DataContext'
import { firebaseEnabled } from '../services/firebase'

export function SettingsPage() {
  const { storageMode } = useData()

  return (
    <div className="page-stack">
      <PageIntro title="Setup and deployment" description="The application works immediately in browser storage mode and switches automatically to Firebase when environment variables are added." />

      <section className="dashboard-grid equal">
        <article className="panel setup-card">
          <div className="setup-icon cyan"><Database size={22} /></div>
          <span className="panel-kicker">CURRENT DATA MODE</span>
          <h3>{storageMode}</h3>
          <p>{firebaseEnabled ? 'Realtime Firestore synchronization is active. Each tenant sees only their own data.' : 'Data is saved in this browser using localStorage. It starts empty — add your own accounts and updates.'}</p>
        </article>

        <article className="panel setup-card">
          <div className="setup-icon purple"><ShieldCheck size={22} /></div>
          <span className="panel-kicker">ADMIN SECURITY</span>
          <h3>Firebase Authentication ready</h3>
          <p>Enable Email/Password authentication in Firebase and restrict Firestore rules to signed-in users before production deployment.</p>
          <span className="plain-pill"><CheckCircle2 size={14} />No passwords stored in this app</span>
        </article>
      </section>

      <section className="panel setup-steps">
        <div className="panel-head"><div><span className="panel-kicker">FIREBASE CONNECTION</span><h3>Five-minute configuration</h3></div><Code2 size={20} /></div>
        <ol>
          <li><strong>Create a Firebase project</strong><span>Open Firebase Console, add a Web App and create a Cloud Firestore database.</span></li>
          <li><strong>Copy the environment file</strong><span>Duplicate <code>.env.example</code> as <code>.env</code>.</span></li>
          <li><strong>Add Firebase web keys</strong><span>Paste the six public Firebase configuration values into the environment variables.</span></li>
          <li><strong>Enable Email/Password login</strong><span>Firebase Console → Authentication → Sign-in method → Email/Password.</span></li>
          <li><strong>Deploy rules and website</strong><span>Use the included Firestore rules, then deploy to Firebase Hosting, Vercel or Netlify.</span></li>
        </ol>
      </section>

      <section className="panel env-panel">
        <div className="panel-head"><div><span className="panel-kicker">ENVIRONMENT VARIABLES</span><h3>Required configuration</h3></div></div>
        <pre>{`VITE_FIREBASE_API_KEY=\nVITE_FIREBASE_AUTH_DOMAIN=\nVITE_FIREBASE_PROJECT_ID=\nVITE_FIREBASE_STORAGE_BUCKET=\nVITE_FIREBASE_MESSAGING_SENDER_ID=\nVITE_FIREBASE_APP_ID=`}</pre>
      </section>
    </div>
  )
}
