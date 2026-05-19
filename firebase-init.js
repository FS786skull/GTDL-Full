import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDmUB1oMvB0-TrOt3PdHD7EMVGKbJX645s",
  authDomain: "gtdl-90514.firebaseapp.com",
  projectId: "gtdl-90514",
  storageBucket: "gtdl-90514.firebasestorage.app",
  messagingSenderId: "525386846372",
  appId: "1:525386846372:web:79ef9476d7fbca50d51631",
  measurementId: "G-YG5HGCFFLG"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
};
