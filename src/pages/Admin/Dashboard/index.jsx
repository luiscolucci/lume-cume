import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import Sidebar from '../../../components/Sidebar';
import { Link } from 'react-router-dom';
import { db } from '../../../services/firebaseConnection';
import { collection, getDocs } from 'firebase/firestore';
import { ShoppingCart, FileText, TrendingUp, Package, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  
  const [faturamentoHoje, setFaturamentoHoje] = useState(0);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [itensBaixoEstoque, setItensBaixoEstoque] = useState(0);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // 1. Buscar Produtos (Contagem e Estoque Baixo)
        const productsRef = collection(db, "products");
        const productsSnap = await getDocs(productsRef);
        
        let countLowStock = 0;
        productsSnap.forEach(doc => {
          if (doc.data().stock < 5) countLowStock++;
        });

        setTotalProdutos(productsSnap.size);
        setItensBaixoEstoque(countLowStock);

        // 2. Buscar Vendas de Hoje
        const salesRef = collection(db, "sales");
        const salesSnap = await getDocs(salesRef);
        
        let totalHoje = 0;
        const hoje = new Date();
        const hojeString = hoje.toLocaleDateString('pt-BR'); // Ex: "02/12/2025"

        salesSnap.forEach(doc => {
          const dataVenda = doc.data().created_at?.toDate 
            ? doc.data().created_at.toDate() 
            : new Date(doc.data().created_at);
            
          // Compara se a string da data é igual (Ignora hora)
          if(dataVenda.toLocaleDateString('pt-BR') === hojeString){
             totalHoje += Number(doc.data().total) || 0;
          }
        });

        setFaturamentoHoje(totalHoje);

      } catch (error) {
        console.log("Erro ao carregar dashboard:", error);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      <div className="w-full p-4 md:p-8 md:ml-64">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Olá, {user?.nome || 'Admin'}</h1>
            <p className="text-gray-500">Resumo da sua operação nesta {new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}.</p>
          </div>
          <span className="bg-lume-primary text-white px-4 py-1 rounded-full text-sm font-bold shadow-md">
            Lume Cume v1.0
          </span>
        </div>

        {/* --- ATALHOS --- */}
        <h2 className="text-lg font-bold text-gray-700 mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link to="/admin/pdv" className="group">
            <div className="bg-lume-primary text-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-1">Abrir Frente de Caixa</h3>
                <p className="text-blue-200 text-sm">Iniciar vendas (PDV)</p>
              </div>
              <ShoppingCart size={48} className="opacity-80 group-hover:scale-110 transition-transform"/>
            </div>
          </Link>

          <Link to="/admin/reports" className="group">
            <div className="bg-white border-l-4 border-lume-accent p-6 rounded-xl shadow hover:shadow-lg transition-all flex items-center justify-between cursor-pointer">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">Relatórios & Análises</h3>
                <p className="text-gray-500 text-sm">Exportar Vendas (PDF/Excel)</p>
              </div>
              <FileText size={40} className="text-lume-accent group-hover:text-green-600 transition-colors"/>
            </div>
          </Link>
        </div>

        {/* --- MÉTRICAS REAIS --- */}
        <h2 className="text-lg font-bold text-gray-700 mb-4">Visão Geral</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card Faturamento */}
          <div className="bg-white p-6 rounded-lg shadow-sm flex items-center gap-4 border-b-4 border-blue-500">
            <div className="p-4 bg-blue-100 rounded-full text-blue-600">
              <TrendingUp size={28}/>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-bold">Faturamento Hoje</p>
              <p className="text-2xl font-bold text-gray-800">R$ {faturamentoHoje.toFixed(2)}</p> 
            </div>
          </div>

          {/* Card Total Produtos */}
          <div className="bg-white p-6 rounded-lg shadow-sm flex items-center gap-4 border-b-4 border-orange-500">
            <div className="p-4 bg-orange-100 rounded-full text-orange-600">
              <Package size={28}/>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-bold">Produtos Cadastrados</p>
              <p className="text-2xl font-bold text-gray-800">{totalProdutos}</p>
            </div>
          </div>

          {/* Card Estoque Baixo */}
          <div className="bg-white p-6 rounded-lg shadow-sm flex items-center gap-4 border-b-4 border-red-500">
            <div className="p-4 bg-red-100 rounded-full text-red-600">
              <AlertCircle size={28}/>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-bold">Estoque Crítico</p>
              <p className="text-2xl font-bold text-gray-800">{itensBaixoEstoque} itens</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
