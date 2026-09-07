import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDgODZCrv-O2NMUGQspBV2LpdzhG27PS6o',
  authDomain: 'friendship-507413.firebaseapp.com',
  projectId: 'friendship-507413',
  storageBucket: 'friendship-507413.firebasestorage.app',
  messagingSenderId: '474367110848',
  appId: '1:474367110848:web:954d5df60da60decae0725',
  measurementId: 'G-QW26D4WLCC',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export function getFirebaseAuth() {
  return getAuth(app);
}
