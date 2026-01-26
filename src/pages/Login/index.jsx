import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Importamos 'signed' (está logado?) e 'user' (dados do usuário)
  const { signIn, signed, user } = useContext(AuthContext); 
  const navigate = useNavigate();

  // O "Porteiro": vigia se o usuário logou. Se sim, redireciona.
  useEffect(() => {
    if (signed && user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'vendedor') {
        navigate('/pdv');
      }
    }
  }, [signed, user, navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    if(email === '' || password === ''){
      alert("Preencha todos os campos!");
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);
      // Não precisa navegar aqui. O useEffect lá em cima vai fazer isso sozinho.
    } catch (error) {
      console.log(error);
      alert("Erro ao logar. Verifique console.");
      setLoading(false);
    }
  }

  return (
    <div className="h-screen w-full flex items-center justify-center bg-lume-primary px-4">
      <div className="bg-white w-full max-w-sm p-8 rounded-lg shadow-lg flex flex-col gap-4">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-lume-primary">Lume Cume</h1>
          <p className="text-gray-500 text-sm">Gerenciamento Comercial</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input 
            type="email"
            placeholder="admin@lume.com"
            className="w-full border border-gray-300 rounded p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password"
            placeholder="********"
            className="w-full border border-gray-300 rounded p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            type="submit"
            className="bg-lume-primary text-white font-bold h-10 rounded hover:bg-slate-800 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Carregando...' : 'Acessar'}
          </button>
        </form>
      </div>
    </div>
  );
}
