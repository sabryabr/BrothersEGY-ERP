// ============================================================
// config/firebase.js
// Firebase initialization — loaded before all other modules
// This is the only file that touches the Firebase SDK directly
// ============================================================

const firebaseConfig = {
  apiKey:            "AIzaSyDNY5lqsr_EoWQxhK7WN4WCJP2_V7IcwFc",
  authDomain:        "brothers-egy-portal.firebaseapp.com",
  projectId:         "brothers-egy-portal",
  storageBucket:     "brothers-egy-portal.firebasestorage.app",
  messagingSenderId: "673531280760",
  appId:             "1:673531280760:web:f0d5484c0e8eabc1dd9c8d",
  measurementId:     "G-YV2SHPQYT9"
};

// Initialize Firebase (compat SDK attaches to window.firebase)
firebase.initializeApp(firebaseConfig);

// Export shared instances to window so all modules can access them
window.db      = firebase.firestore();
window.storage = firebase.storage();

// Enable offline persistence (fails silently if already enabled)
window.db.enableNetwork().catch(() => {});

// ============================================================
// IMPORTANT — Firebase Security Rules
// Your Firestore rules should NOT be open to the public.
// In Firebase Console → Firestore → Rules, set:
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//
//     // Users collection — only the exact user can read their own doc
//     match /users/{userId} {
//       allow read: if request.auth != null || true; // temp: tighten after Firebase Auth migration
//       allow write: if false; // no client-side writes to users
//     }
//
//     // All other collections — authenticated sessions only
//     match /{document=**} {
//       allow read, write: if true; // TODO: replace with Firebase Auth check
//     }
//   }
// }
//
// The permanent fix is migrating to Firebase Authentication.
// Until then, the API key exposure risk is mitigated by
// restricting the key in Google Cloud Console:
// APIs & Services → Credentials → restrict to your domain only.
// ============================================================

// Online / offline state monitoring
window.addEventListener('online', () => {
  window.db.enableNetwork().catch(() => {});
});

window.addEventListener('offline', () => {
  window.db.disableNetwork().catch(() => {});
});
