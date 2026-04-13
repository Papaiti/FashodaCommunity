import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();
export const storage = getStorage(app);

// Set the maximum operation retry time to 5 minutes (300000 milliseconds)
storage.maxOperationRetryTime = 300000;
// Set the maximum upload retry time to 10 minutes (600000 milliseconds)
storage.maxUploadRetryTime = 600000;

console.log('Firebase Storage initialized with bucket:', firebaseConfig.storageBucket);

export { ref, uploadBytes, getDownloadURL, deleteObject };

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, '_connection_test_', 'init'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}

testConnection();

export function handleFirestoreError(error: any) {
  console.error('Firestore Error:', error);
}
