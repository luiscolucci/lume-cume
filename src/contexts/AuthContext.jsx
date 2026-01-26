import { useState, useEffect, createContext } from 'react';
import { auth, db } from '../services/firebaseConnection';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const AuthContext = createContext({});

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const uid = currentUser.uid;
        try {
          const docRef = doc(db, "users", uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setUser({
              uid: uid,
              email: currentUser.email,
              role: data.role,
              nome: data.nome
            });
          } else {
            setUser(null);
          }
        } catch (error) {
          console.log(error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  async function signIn(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logOut() {
    await signOut(auth);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ signed: !!user, user, loadingAuth, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}
