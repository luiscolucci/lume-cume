import { useState, useEffect } from 'react';
import Sidebar from '../../../components/Sidebar';
import { db } from '../../../services/firebaseConnection';
import { collection, getDocs } from 'firebase/firestore';
import { FileText, Table, Search, DollarSign, TrendingUp, Package, Filter } from 'lucide-react';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [sales, setSales] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('');

  const [loading, setLoading] = useState(false);
  const [totalSold, setTotalSold] = useState(0);
  const [totalItens, setTotalItens] = useState(0);

  useEffect(() => {
    async function loadUsers() {
      const querySnapshot = await getDocs(collection(db, "users"));
      let listaUsers = [];
      querySnapshot.forEach(doc => {
        listaUsers.push({
          uid: doc.id,
          nome: doc.data().nome || doc.data().email
        })
      });
      setUsers(listaUsers);
    }
    loadUsers();
  }, []);

  async function handleFilter() {
    if (!startDate || !endDate) {
      toast.warning("Selecione as datas!");
      return;
    }

    setLoading(true);
    setSales([]);

    try {
      const start = new Date(startDate + "T00:00:00");
      const end = new Date(endDate + "T23:59:59");

      const salesRef = collection(db, "sales");
      const querySnapshot = await getDocs(salesRef);

      let listaVendas = [];
      let somaTotal = 0;
      let somaItens = 0;

      querySnapshot.forEach((doc) => {
        const rawData = doc.data();
        let dataVenda;

        if (rawData.created_at?.toDate) {
          dataVenda = rawData.created_at.toDate();
        } else {
          dataVenda = new Date(rawData.created_at);
        }

        if (dataVenda >= start && dataVenda <= end) {
          
          if(selectedSeller !== '' && rawData.vendedor_uid !== selectedSeller){
            return;
          }

          const itensString = rawData.itens 
            ? rawData.itens.map(i => `${i.qtd}x ${i.name}`).join(', ')
            : 'N/A';

          let pagamentoFormatado = rawData.payment_method || 'ND';
          if(rawData.installments && rawData.installments > 1){
            pagamentoFormatado += ` (${rawData.installments}x)`;
          }

          listaVendas.push({
            id: doc.id,
            ...rawData,
            dataFormatada: dataVenda.toLocaleString('pt-BR'),
            total: Number(rawData.total) || 0,
            itensDescricao: itensString,
            pagamentoDisplay: pagamentoFormatado
          });

          somaTotal += Number(rawData.total) || 0;
          if(rawData.itens){
            somaItens += rawData.itens.reduce((acc, item) => acc + (item.qtd || 0), 0);
          }
        }
      });

      listaVendas.sort((a, b) => {
        const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
        const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at);
        return dateB - dateA;
      });

      setSales(listaVendas);
      setTotalSold(somaTotal);
      setTotalItens(somaItens);

      if (listaVendas.length === 0) toast.info("Nenhuma venda encontrada.");
      else toast.success(`${listaVendas.length} vendas carregadas!`);

    } catch (error) {
      console.log(error);
      toast.error("Erro ao filtrar");
    } finally {
      setLoading(false);
    }
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatório de Vendas", 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Período: ${new Date(startDate+"T00:00:00").toLocaleDateString('pt-BR')} a ${new Date(endDate+"T00:00:00").toLocaleDateString('pt-BR')}`, 14, 22);
    
    if(selectedSeller){
      const vendedorNome = users.find(u => u.uid === selectedSeller)?.nome || 'Específico';
      doc.text(`Vendedor: ${vendedorNome}`, 14, 27);
    }

    doc.text(`Faturamento: R$ ${totalSold.toFixed(2)}`, 14, 32);

    const tableData = sales.map(venda => [
      venda.dataFormatada,
      venda.vendedor_nome,
      venda.itensDescricao,
      venda.pagamentoDisplay,
      `R$ ${venda.total.toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [['Data', 'Vendedor', 'Itens', 'Pagto', 'Total']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8 },
      columnStyles: { 2: { cellWidth: 50 } }
    });

    doc.save(`relatorio_${startDate}.pdf`);
  }

  function exportExcel() {
    const excelData = sales.map(venda => ({
      Data: venda.dataFormatada,
      Vendedor: venda.vendedor_nome,
      Itens: venda.itensDescricao,
      Pagamento: venda.pagamentoDisplay,
      Total: venda.total
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas");
    const wscols = [{wch:20}, {wch:20}, {wch:50}, {wch:20}, {wch:15}];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `relatorio_${startDate}.xlsx`);
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      
      {/* Ajuste Responsivo da Margem e Padding */}
      <div className="w-full p-4 md:p-8 md:ml-64">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <FileText className="text-lume-primary" /> Relatórios Avançados
        </h1>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8 flex flex-wrap items-end gap-4 border-l-4 border-lume-primary">
          <div className="w-full md:w-auto">
            <label className="block text-sm font-bold text-gray-700 mb-1">Início</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full border p-2 rounded focus:border-lume-primary outline-none text-gray-700"/>
          </div>
          <div className="w-full md:w-auto">
            <label className="block text-sm font-bold text-gray-700 mb-1">Fim</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full border p-2 rounded focus:border-lume-primary outline-none text-gray-700"/>
          </div>
          
          <div className="w-full md:min-w-[200px] md:w-auto">
             <label className="block text-sm font-bold text-gray-700 mb-1">Filtrar por Vendedor</label>
             <div className="relative">
               <select 
                value={selectedSeller} 
                onChange={(e) => setSelectedSeller(e.target.value)}
                className="w-full border p-2 rounded appearance-none focus:border-lume-primary outline-none bg-white"
               >
                 <option value="">Todos os Vendedores</option>
                 {users.map(u => (
                   <option key={u.uid} value={u.uid}>{u.nome}</option>
                 ))}
               </select>
               <Filter size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none"/>
             </div>
          </div>

          <button onClick={handleFilter} disabled={loading}
            className="w-full md:w-auto bg-lume-primary text-white px-6 py-2 rounded hover:bg-slate-800 flex items-center justify-center gap-2 h-[42px] font-bold shadow-sm"
          >
            <Search size={18} /> {loading ? '...' : 'Filtrar'}
          </button>
        </div>

        {sales.length > 0 && (
          <div className="animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded shadow border-l-4 border-green-500 flex justify-between">
                <div><p className="text-sm font-bold text-gray-500">Total Período</p><p className="text-2xl font-bold text-green-700">R$ {totalSold.toFixed(2)}</p></div>
                <DollarSign className="text-green-200" size={32} />
              </div>
              <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500 flex justify-between">
                <div><p className="text-sm font-bold text-gray-500">Vendas</p><p className="text-2xl font-bold text-blue-700">{sales.length}</p></div>
                <TrendingUp className="text-blue-200" size={32} />
              </div>
              <div className="bg-white p-4 rounded shadow border-l-4 border-orange-500 flex justify-between">
                <div><p className="text-sm font-bold text-gray-500">Itens</p><p className="text-2xl font-bold text-orange-700">{totalItens}</p></div>
                <Package className="text-orange-200" size={32} />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <button onClick={exportPDF} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center justify-center gap-2 shadow font-bold">
                <FileText size={18}/> Baixar PDF
              </button>
              <button onClick={exportExcel} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center justify-center gap-2 shadow font-bold">
                <Table size={18}/> Baixar Excel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Scroll Horizontal */}
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-bold">
                <tr>
                  <th className="p-4">Data</th>
                  <th className="p-4">Vendedor</th>
                  <th className="p-4">Itens</th>
                  <th className="p-4">Pagamento</th>
                  <th className="p-4">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.map(sale => (
                  <tr key={sale.id} className="hover:bg-blue-50 transition-colors">
                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">{sale.dataFormatada}</td>
                    <td className="p-4 text-sm font-medium">{sale.vendedor_nome}</td>
                    <td className="p-4 text-sm text-gray-500 max-w-xs truncate" title={sale.itensDescricao}>
                      {sale.itensDescricao}
                    </td>
                    <td className="p-4 text-sm">
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-700 border border-gray-200">
                        {sale.pagamentoDisplay}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-bold text-green-700">R$ {sale.total.toFixed(2)}</td>
                  </tr>
                ))}
                {sales.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-gray-400">
                      <p>Selecione os filtros acima para ver os dados.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
