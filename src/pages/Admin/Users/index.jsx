import { useState, useEffect } from "react";
import Sidebar from "../../../components/Sidebar";
import { db } from "../../../services/firebaseConnection";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions"; // <--- NOVO: Para chamar o backend
import { UserPlus, Trash2, Shield, KeyRound, Lock, Unlock } from "lucide-react"; // <--- NOVO: Ícones
import { toast } from "react-toastify";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("vendedor");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadUsers() {
      const querySnapshot = await getDocs(collection(db, "users"));
      let lista = [];
      querySnapshot.forEach((doc) => {
        lista.push({ uid: doc.id, ...doc.data() });
      });
      setUsers(lista);
    }
    loadUsers();
  }, []);

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const secondaryApp = initializeApp(firebaseConfig, "Secondary");
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password,
      );
      const userUid = userCredential.user.uid;

      // Define isBlocked como false por padrão ao criar
      await setDoc(doc(db, "users", userUid), {
        nome: nome,
        email: email,
        role: role,
        isBlocked: false, // <--- NOVO: Padrão inicial
      });

      await signOut(secondaryAuth);
      toast.success("Usuário cadastrado com sucesso!");

      setNome("");
      setEmail("");
      setPassword("");
      window.location.reload();
    } catch (error) {
      console.log(error);
      if (error.code === "auth/email-already-in-use") {
        toast.error("Email já existe!");
      } else {
        toast.error("Erro ao criar usuário.");
      }
    } finally {
      setLoading(false);
    }
  }

  // --- NOVA FUNÇÃO: Bloquear/Desbloquear ---
  async function handleToggleBlock(user) {
    const newStatus = !user.isBlocked;
    const actionText = newStatus ? "BLOQUEAR" : "DESBLOQUEAR";

    if (
      !window.confirm(
        `Tem certeza que deseja ${actionText} o acesso de ${user.nome}?`,
      )
    )
      return;

    try {
      const functions = getFunctions();
      const toggleUserStatus = httpsCallable(functions, "toggleUserStatus");

      // Chama a função no Backend
      await toggleUserStatus({ uid: user.uid, shouldBlock: newStatus });

      // Atualiza o estado local para refletir a mudança sem recarregar a página
      setUsers(
        users.map((u) =>
          u.uid === user.uid ? { ...u, isBlocked: newStatus } : u,
        ),
      );

      toast.success(
        `Usuário ${newStatus ? "bloqueado" : "desbloqueado"} com sucesso!`,
      );
    } catch (error) {
      console.error(error);
      toast.error("Erro ao alterar status. Verifique o backend.");
    }
  }

  async function handleResetPassword(userEmail) {
    if (!window.confirm(`Enviar e-mail de redefinição para ${userEmail}?`))
      return;

    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, userEmail);
      toast.success("E-mail enviado!");
    } catch (error) {
      console.log(error);
      toast.error("Erro ao enviar e-mail.");
    }
  }

  async function handleDelete(uid) {
    if (!window.confirm("Tem certeza? O usuário perderá o acesso.")) return;
    try {
      await deleteDoc(doc(db, "users", uid));
      setUsers(users.filter((u) => u.uid !== uid));
      toast.success("Permissão removida");
    } catch (error) {
      toast.error("Erro ao deletar");
    }
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />

      <div className="w-full p-4 md:p-8 md:ml-64">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Shield className="text-lume-primary" /> Controle de Acesso
        </h1>

        {/* Formulário */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8 border-l-4 border-lume-primary">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <UserPlus size={20} /> Novo Usuário
          </h2>
          <form
            onSubmit={handleRegister}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <input
              type="text"
              placeholder="Nome Completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="border p-2 rounded w-full outline-none focus:border-lume-primary"
              required
            />
            <input
              type="email"
              placeholder="Email de Acesso"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border p-2 rounded w-full outline-none focus:border-lume-primary"
              required
            />
            <input
              type="password"
              placeholder="Senha Provisória"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border p-2 rounded w-full outline-none focus:border-lume-primary"
              required
            />

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="border p-2 rounded bg-white w-full outline-none focus:border-lume-primary"
            >
              <option value="vendedor">Vendedor (Apenas PDV)</option>
              <option value="admin">Administrador (Acesso Total)</option>
            </select>

            <button
              disabled={loading}
              className="col-span-1 md:col-span-2 bg-lume-primary text-white p-3 rounded font-bold hover:bg-slate-800 shadow-md transition-transform active:scale-95"
            >
              {loading ? "Criando..." : "CRIAR ACESSO"}
            </button>
          </form>
        </div>

        {/* Lista de Usuários */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-gray-100 uppercase text-xs font-bold text-gray-600">
                <tr>
                  <th className="p-4">Nome</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Permissão</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr
                    key={u.uid}
                    className={`hover:bg-gray-50 ${u.isBlocked ? "bg-red-50" : ""}`}
                  >
                    <td className="p-4">
                      {u.nome}
                      {u.isBlocked && (
                        <span className="text-xs text-red-500 font-bold ml-2">
                          (Bloqueado)
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-500 text-sm">{u.email}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      {/* --- BOTÃO DE BLOQUEIO --- */}
                      <button
                        onClick={() => handleToggleBlock(u)}
                        className={`${u.isBlocked ? "bg-green-100 text-green-700 hover:text-green-900" : "bg-orange-100 text-orange-600 hover:text-orange-800"} p-2 rounded transition-colors`}
                        title={
                          u.isBlocked
                            ? "Desbloquear Acesso"
                            : "Bloquear Acesso Temporariamente"
                        }
                      >
                        {u.isBlocked ? (
                          <Unlock size={18} />
                        ) : (
                          <Lock size={18} />
                        )}
                      </button>

                      <button
                        onClick={() => handleResetPassword(u.email)}
                        className="text-yellow-600 hover:text-yellow-800 bg-yellow-100 p-2 rounded transition-colors"
                        title="Redefinir Senha"
                      >
                        <KeyRound size={18} />
                      </button>

                      <button
                        onClick={() => handleDelete(u.uid)}
                        className="text-red-600 hover:text-red-800 bg-red-100 p-2 rounded transition-colors"
                        title="Excluir Definitivamente"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
