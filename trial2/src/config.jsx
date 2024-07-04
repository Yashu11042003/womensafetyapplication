import { initializeApp } from "firebase/app";
import {getAuth,GoogleAuthProvider} from "firebase/auth";
const firebaseConfig = {
    apiKey: "AIzaSyDsogXakfwDxS7X_ygn_wvIc73lLvlPj_8",
    authDomain: "auth-b02f0.firebaseapp.com",
    projectId: "auth-b02f0",
    storageBucket: "auth-b02f0.appspot.com",
    messagingSenderId: "260844021283",
    appId: "1:260844021283:web:bf33f6b837440d40c17396"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app)
const provider = new GoogleAuthProvider();
export {auth,provider};