import { useContext, useState } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { LogOut, LayoutDashboard, ShoppingBag, DollarSign, FileText, Users, Menu, X } from 'lucide-react';
import logoImg from '../../assets/lume-cume.png'; 

export default function Sidebar() {
  const { logOut, user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false); // Estado para abrir/fechar no mobile

  return (
    <>
      {/* Botão Hambúrguer (Só aparece no Mobile) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-lume-primary text-white p-2 rounded shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Fundo Escuro (Overlay) quando menu aberto no mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* A Barra Lateral */}
      {/* Classes mudaram: 
          - md:translate-x-0 (No PC, sempre visível)
          - translate-x-0 ou -translate-x-full (No Mobile, desliza)
      */}
      <div className={`
        h-screen w-64 bg-lume-primary text-white flex flex-col fixed left-0 top-0 z-50 shadow-2xl transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}>
        
        <div className="p-6 flex flex-col items-center border-b border-gray-700/50 mt-8 md:mt-0">
          <img src={logoImg} alt="Lume Cume" className="h-12 w-auto mb-2" />
          <p className="text-xs text-gray-300">Bem-vindo, {user?.nome || 'Admin'}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto font-medium">
          <Link to="/admin" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-all">
            <LayoutDashboard size={20} /> Dashboard
          </Link>
          
          <Link to="/admin/products" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-all">
            <FileText size={20} /> Produtos
          </Link>
          
          <Link to="/admin/pdv" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-all">
            <ShoppingBag size={20} /> Frente de Caixa
          </Link>

          <Link to="/admin/finance" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-all">
             <DollarSign size={20} /> Financeiro
          </Link>

          <Link to="/admin/reports" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-all">
            <FileText size={20} /> Relatórios
          </Link>

          <Link to="/admin/users" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-all">
             <Users size={20} /> Equipe
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-700/50">
          <button onClick={logOut} className="flex items-center justify-center gap-2 text-red-300 hover:text-red-200 w-full p-3 rounded-lg font-bold">
            <LogOut size={20} /> Sair
          </button>
        </div>
      </div>
    </>
  );
}
