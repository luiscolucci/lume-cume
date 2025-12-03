import { useState, useEffect } from 'react';
import Sidebar from '../../../components/Sidebar';
import { db, storage } from '../../../services/firebaseConnection';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Trash2, Plus, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-toastify';

export default function Products() {
  const [products, setProducts] = useState([]);
  
  // Inputs do Formulário
  const [nome, setNome] = useState('');
  const [precoCusto, setPrecoCusto] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [estoque, setEstoque] = useState('');
  const [imageFile, setImageFile] = useState(null);
  
  const [loading, setLoading] = useState(false);

  // Buscar Produtos
  useEffect(() => {
    async function loadProducts() {
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        let lista = [];
        querySnapshot.forEach((doc) => {
          lista.push({
            id: doc.id,
            ...doc.data()
          })
        });
        setProducts(lista);
      } catch (error) {
        console.log("Erro ao buscar:", error);
      }
    }
    loadProducts();
  }, []);

  // Cadastrar Produto com Foto
  async function handleAdd(e) {
    e.preventDefault();
    setLoading(true);

    try {
      let urlFoto = '';

      if (imageFile) {
        const uploadRef = ref(storage, `images/${imageFile.name}_${Date.now()}`);
        const snapshot = await uploadBytes(uploadRef, imageFile);
        urlFoto = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, "products"), {
        name: nome,
        cost_price: parseFloat(precoCusto),
        price: parseFloat(precoVenda), 
        stock: parseInt(estoque),
        image_url: urlFoto,
        created_at: new Date()
      });
      
      toast.success("Produto cadastrado com sucesso!");
      setNome(''); setPrecoCusto(''); setPrecoVenda(''); setEstoque(''); setImageFile(null);
      
      window.location.reload(); 
      
    } catch (error) {
      console.log(error);
      toast.error("Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if(!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      setProducts(products.filter(item => item.id !== id));
      toast.success("Item removido");
    } catch (error) {
      toast.error("Erro ao deletar");
    }
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      
      {/* CORREÇÃO 1: Layout Responsivo (w-full, p-4 no celular, ml-64 só no PC) */}
      <div className="w-full p-4 md:p-8 md:ml-64">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Cadastro de Produtos</h1>

        {/* Formulário */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-lume-primary">
            <Plus size={20}/> Novo Item
          </h2>
          
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            
            {/* Linha 1: Nome e Foto */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Produto</label>
                <input 
                  type="text" 
                  value={nome} 
                  onChange={(e)=>setNome(e.target.value)} 
                  className="w-full border rounded p-2 focus:border-lume-primary outline-none" 
                  placeholder="Ex: Coca Cola 2L"
                  required
                />
              </div>
              
              <div className="w-full md:w-1/3">
                <label className="block text-sm font-bold text-gray-700 mb-1">Foto</label>
                <label className="flex items-center justify-center gap-2 w-full border border-dashed border-gray-400 p-2 rounded cursor-pointer hover:bg-gray-50 text-gray-600">
                  <Upload size={18}/> 
                  <span className="text-sm truncate">{imageFile ? imageFile.name : "Escolher"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files[0])} />
                </label>
              </div>
            </div>

            {/* Linha 2: Preços e Estoque (Quebra linha no celular) */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">Custo (R$)</label>
                <input 
                  type="number" step="0.01" 
                  value={precoCusto} 
                  onChange={(e)=>setPrecoCusto(e.target.value)} 
                  className="w-full border rounded p-2 focus:border-lume-primary outline-none" 
                  required
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">Venda (R$)</label>
                <input 
                  type="number" step="0.01" 
                  value={precoVenda} 
                  onChange={(e)=>setPrecoVenda(e.target.value)} 
                  className="w-full border rounded p-2 focus:border-lume-primary outline-none" 
                  required
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">Qtd Estoque</label>
                <input 
                  type="number" 
                  value={estoque} 
                  onChange={(e)=>setEstoque(e.target.value)} 
                  className="w-full border rounded p-2 focus:border-lume-primary outline-none" 
                  required
                />
              </div>
            </div>

            <button 
              disabled={loading} 
              className="bg-lume-primary text-white py-3 rounded hover:bg-slate-800 font-bold mt-2 shadow-lg transition-all w-full md:w-auto"
            >
              {loading ? 'Salvando...' : 'CADASTRAR PRODUTO'}
            </button>
          </form>
        </div>

        {/* Listagem */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          
          {/* CORREÇÃO 2: Rolagem Horizontal (Scroll) para celular */}
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-gray-200 text-gray-700 text-sm uppercase">
                <tr>
                  <th className="p-4">Img</th>
                  <th className="p-4">Nome</th>
                  <th className="p-4">Custo</th>
                  <th className="p-4">Venda</th>
                  <th className="p-4">Estoque</th>
                  <th className="p-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      {item.image_url ? (
                        <img src={item.image_url} alt="Foto" className="w-10 h-10 object-cover rounded shadow-sm"/>
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                          <ImageIcon size={20}/>
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-medium">{item.name}</td>
                    <td className="p-4 text-gray-500">R$ {Number(item.cost_price || 0).toFixed(2)}</td>
                    <td className="p-4 font-bold text-green-700">R$ {Number(item.price).toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${item.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-800'}`}>
                        {item.stock} un
                      </span>
                    </td>
                    <td className="p-4">
                      <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-full transition-colors">
                        <Trash2 size={18}/>
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
