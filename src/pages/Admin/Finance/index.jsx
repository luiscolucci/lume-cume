import { useState, useEffect, useContext } from 'react';
import Sidebar from '../../../components/Sidebar';
import { db } from '../../../services/firebaseConnection';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { AuthContext } from '../../../contexts/AuthContext';
import { DollarSign, TrendingUp, TrendingDown, Plus, Trash2, Bus, Coffee, Car } from 'lucide-react';
import { toast } from 'react-toastify';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Finance() {
  const { user } = useContext(AuthContext);

  const [expensesList, setExpensesList] = useState([]); 
  const [chartData, setChartData] = useState([]);
  
  const [revenue, setRevenue] = useState(0);
  const [cogs, setCogs] = useState(0); 
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [profit, setProfit] = useState(0);

  const [desc, setDesc] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('Alimentacao');
  const [dataDespesa, setDataDespesa] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const salesSnap = await getDocs(collection(db, "sales"));
      let totalVenda = 0;
      let totalCustoMercadoria = 0;
      let dailyMap = {}; 

      salesSnap.forEach(doc => {
        const data = doc.data();
        const valVenda = Number(data.total) || 0;
        
        if(data.itens){
          data.itens.forEach(item => {
            const custoItem = Number(item.cost_unit || 0); 
            const qtdItem = Number(item.qtd || 1);
            totalCustoMercadoria += (custoItem * qtdItem);
          });
        }

        totalVenda += valVenda;

        let dataVenda;
        if (data.created_at?.toDate) {
          dataVenda = data.created_at.toDate();
        } else if (data.created_at) {
          dataVenda = new Date(data.created_at);
        } else {
          dataVenda = new Date();
        }

        if(!isNaN(dataVenda.getTime())){
           const dateKey = dataVenda.toLocaleDateString('pt-BR').slice(0,5); 
           if(!dailyMap[dateKey]) dailyMap[dateKey] = 0;
           dailyMap[dateKey] += valVenda;
        }
      });

      const expensesSnap = await getDocs(collection(db, "expenses"));
      let totalDespesasCalc = 0;
      let listaDespesas = [];

      expensesSnap.forEach(doc => {
        const d = doc.data();
        const valDespesa = Number(d.value) || 0;
        totalDespesasCalc += valDespesa;
        listaDespesas.push({ id: doc.id, ...d });
      });

      setRevenue(totalVenda);
      setCogs(totalCustoMercadoria);
      setExpensesTotal(totalDespesasCalc);
      setProfit(totalVenda - (totalCustoMercadoria + totalDespesasCalc));
      
      setExpensesList(listaDespesas.sort((a,b) => new Date(b.date) - new Date(a.date)));

      const chart = Object.keys(dailyMap).map(key => ({
        name: key,
        Vendas: dailyMap[key]
      })).sort((a,b) => {
        return parseInt(a.name.split('/')[0]) - parseInt(b.name.split('/')[0]);
      });
      
      setChartData(chart);

    } catch (error) {
      console.error("Erro ao carregar financeiro:", error);
      toast.error("Erro ao calcular dados financeiros");
    }
  }

  async function handleAddExpense(e) {
    e.preventDefault();
    if(!valor || !desc) return;
    setLoading(true);

    try {
      await addDoc(collection(db, "expenses"), {
        description: desc,
        value: Number(valor),
        category: categoria,
        date: dataDespesa,
        created_at: new Date(),
        user_nome: user.nome || user.email
      });
      
      toast.success("Despesa lançada!");
      setDesc(''); setValor('');
      
      await loadData();

    } catch (error) {
      console.log(error);
      toast.error("Erro ao salvar despesa");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteExpense(id) {
    if(window.confirm("Deseja realmente excluir esta despesa?")){
      try {
        await deleteDoc(doc(db, "expenses", id));
        toast.success("Despesa removida");
        await loadData();
      } catch (error) {
        toast.error("Erro ao excluir");
      }
    }
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      
      {/* Ajuste Responsivo da Margem e Padding */}
      <div className="w-full p-4 md:p-8 md:ml-64">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <DollarSign className="text-lume-primary"/> Gestão Financeira
        </h1>

        {/* 1. KPIS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm font-bold">Faturamento Total</p>
            <p className="text-2xl font-bold text-blue-700">R$ {revenue.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded shadow border-l-4 border-orange-500">
            <p className="text-gray-500 text-sm font-bold">Custo Produtos (CMV)</p>
            <p className="text-2xl font-bold text-orange-700">R$ {cogs.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded shadow border-l-4 border-red-500">
            <p className="text-gray-500 text-sm font-bold">Despesas (Transp/Alim)</p>
            <p className="text-2xl font-bold text-red-700">R$ {expensesTotal.toFixed(2)}</p>
          </div>
          <div className={`bg-white p-4 rounded shadow border-l-4 ${profit >= 0 ? 'border-green-500' : 'border-red-700'}`}>
            <p className="text-gray-500 text-sm font-bold">Lucro Líquido</p>
            <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              R$ {profit.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 2. GRÁFICO */}
          <div className="bg-white p-6 rounded shadow">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><TrendingUp size={20}/> Faturamento por Dia</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                  <Bar dataKey="Vendas" fill="#0F172A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {chartData.length === 0 && (
                <p className="text-center text-gray-400 text-sm mt-[-100px]">Sem dados de vendas para o gráfico.</p>
              )}
            </div>
          </div>

          {/* 3. DESPESAS */}
          <div className="bg-white p-6 rounded shadow">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><TrendingDown size={20} className="text-red-500"/> Lançar Despesa</h3>
            
            <form onSubmit={handleAddExpense} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input type="text" placeholder="Descrição (Ex: Almoço)" value={desc} onChange={e=>setDesc(e.target.value)} 
                  className="flex-1 border p-2 rounded outline-none focus:border-red-300" required />
                <input type="number" placeholder="R$ Valor" value={valor} onChange={e=>setValor(e.target.value)} 
                  className="w-32 border p-2 rounded outline-none focus:border-red-300" required />
              </div>
              
              <div className="flex gap-2">
                <select value={categoria} onChange={e=>setCategoria(e.target.value)} className="border p-2 rounded flex-1 bg-white">
                  <option value="Alimentacao">Alimentação</option>
                  <option value="Transporte">Transporte (Ônibus/Metrô)</option>
                  <option value="Combustivel">Combustível</option>
                  <option value="Estacionamento">Estacionamento</option>
                  <option value="Outros">Outros</option>
                </select>
                <input type="date" value={dataDespesa} onChange={e=>setDataDespesa(e.target.value)} 
                  className="border p-2 rounded" required />
              </div>

              <button disabled={loading} className="bg-red-500 text-white font-bold p-2 rounded hover:bg-red-600 flex justify-center items-center gap-2 transition-transform active:scale-95">
                <Plus size={18}/> {loading ? 'Salvando...' : 'Adicionar Despesa'}
              </button>
            </form>

            {/* Lista Recente (Com rolagem horizontal para mobile) */}
            <div className="mt-6 max-h-64 overflow-y-auto pr-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[400px]">
                  <thead className="text-gray-500 text-xs uppercase border-b">
                    <tr>
                      <th className="pb-2">Cat</th>
                      <th className="pb-2">Desc</th>
                      <th className="pb-2">Data</th>
                      <th className="pb-2 text-right">Valor</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesList.map(item => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50 group">
                        <td className="py-3">
                          {item.category === 'Alimentacao' && <Coffee size={18} className="text-brown-500" title="Alimentação"/>}
                          {item.category === 'Transporte' && <Bus size={18} className="text-blue-500" title="Transporte"/>}
                          {(item.category === 'Combustivel' || item.category === 'Estacionamento') && <Car size={18} className="text-gray-500" title="Veículo"/>}
                          {item.category === 'Outros' && <DollarSign size={18} className="text-gray-400"/>}
                        </td>
                        <td className="py-3 font-medium text-gray-700">{item.description}</td>
                        <td className="py-3 text-gray-500 text-xs">
                          {new Date(item.date + "T12:00:00").toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 font-bold text-red-600 text-right whitespace-nowrap">- R$ {item.value.toFixed(2)}</td>
                        <td className="py-3 text-right">
                          <button onClick={()=>handleDeleteExpense(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {expensesList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-gray-400">Nenhuma despesa lançada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
