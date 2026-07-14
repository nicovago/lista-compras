import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';

const firebaseConfig={apiKey:'AIzaSyBbvUJsT1AEtLK7zKYQ8GZSXgw4srW61iU',authDomain:'lista-de-compras-6b8c6.firebaseapp.com',projectId:'lista-de-compras-6b8c6',storageBucket:'lista-de-compras-6b8c6.firebasestorage.app',messagingSenderId:'923961365656',appId:'1:923961365656:web:f0dad41f0ed53ed5b32ced'};

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const provider=new GoogleAuthProvider();
provider.setCustomParameters({prompt:'select_account'});

const authGate=document.getElementById('authGate');
const successView=document.getElementById('successView');
const loginBtn=document.getElementById('loginBtn');
const logoutBtn=document.getElementById('logoutBtn');
const authMessage=document.getElementById('authMessage');
const userName=document.getElementById('userName');
const userEmail=document.getElementById('userEmail');

function showError(error){
  console.error('Firebase Auth error:',error);
  const details=[error?.code,error?.message].filter(Boolean).join(' · ');
  authMessage.textContent=details||'No se pudo iniciar sesión.';
}

async function login(){
  authMessage.textContent='Abriendo Google…';
  loginBtn.disabled=true;
  try{
    await signInWithPopup(auth,provider);
  }catch(error){
    if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment','auth/cancelled-popup-request'].includes(error?.code)){
      authMessage.textContent='Redirigiendo a Google…';
      await signInWithRedirect(auth,provider);
      return;
    }
    showError(error);
    loginBtn.disabled=false;
  }
}

loginBtn.addEventListener('click',login);
logoutBtn.addEventListener('click',()=>signOut(auth));

getRedirectResult(auth).catch(showError);

onAuthStateChanged(auth,user=>{
  loginBtn.disabled=false;
  if(user){
    userName.textContent=user.displayName||'Cuenta conectada';
    userEmail.textContent=user.email||user.uid;
    authGate.classList.add('hidden');
    successView.classList.remove('hidden');
  }else{
    successView.classList.add('hidden');
    authGate.classList.remove('hidden');
  }
});

if('serviceWorker'in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=11',{updateViaCache:'none'}).then(registration=>registration.update()));
}
