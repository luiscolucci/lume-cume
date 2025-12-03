import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { db } from '../../services/firebaseConnection';
import Sidebar from '../../components/Sidebar';
import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { Search, ShoppingCart, Trash2, LogOut, CreditCard, Banknote, QrCode, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import logoImg from '../../assets/lume-cume.png'; 

export default function PDV({ showSidebar = false }) {
  const { user, logOut } = useContext(AuthContext);
  
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro'); 
  const [parcelas, setParcelas] = useState(1);
  const [loadingFinish, setLoadingFinish] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      const querySnapshot = await getDocs(collection(db, "products"));
      let lista = [];
      querySnapshot.forEach((doc) => {
        lista.push({
          id: doc.id,
          ...doc.data()
        })
      });
      setProducts(lista);
    }
    loadProducts();
  }, []);

  function getQtdInCart(productId) {
    const item = cart.find(i => i.id === productId);
    return item ? item.qtd : 0;
  }

  function addToCart(product) {
    const qtdNoCarrinho = getQtdInCart(product.id);
    const estoqueDisponivel = product.stock - qtdNoCarrinho;

    if(estoqueDisponivel <= 0){
      toast.warning("Sem estoque disponível!");
      return;
    }

    const itemIndex = cart.findIndex((item) => item.id === product.id);

    if (itemIndex >= 0) {
      const newCart = [...cart];
      newCart[itemIndex].qtd += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { ...product, qtd: 1 }]);
    }
  }

  function removeFromCart(id) {
    setCart(cart.filter((item) => item.id !== id));
  }

  const total = cart.reduce((acc, item) => acc + (item.price * item.qtd), 0);

  async function handleFinishSale() {
    if(cart.length === 0) return;
    setLoadingFinish(true);

    try {
      await addDoc(collection(db, "sales"), {
        created_at: new Date(),
        total: total,
        payment_method: paymentMethod,
        installments: parcelas,
        vendedor_uid: user.uid,
        vendedor_nome: user.nome || "Vendedor",
        itens: cart.map(item => ({
          id: item.id,
          name: item.name,
          qtd: item.qtd,
          price_unit: item.price,
          cost_unit: item.cost_price || 0 // Salva o custo para o Financeiro
        }))
      });

      for(const item of cart){
        const productRef = doc(db, "products", item.id);
        const newStock = item.stock - item.qtd;
        await updateDoc(productRef, {
          stock: newStock
        });
      }

      toast.success(`Venda Finalizada!`);
      setCart([]);
      setPaymentMethod('Dinheiro');
      setParcelas(1);
      
      setTimeout(() => window.location.reload(), 1500);

    } catch (error) {
      console.log(error);
      toast.error("Erro ao finalizar venda");
    } finally {
      setLoadingFinish(false);
    }
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex bg-gray-100 min-h-screen">
      {/* Sidebar condicional (Admin) */}
      {showSidebar && <Sidebar />}

      {/* Conteúdo Principal (Ajuste de margem responsiva) */}
      <div className={`flex-1 flex flex-col md:flex-row h-screen overflow-hidden ${showSidebar ? 'md:ml-64' : ''}`}>
        
        {/* LADO ESQUERDO: Lista de Produtos */}
        <div className="flex-1 flex flex-col h-full">
          
          {/* Header do PDV */}
          <div className="bg-lume-primary text-white p-4 flex justify-between items-center shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="Lume Cume" className="h-10 w-auto" />
              <div>
                <h1 className="text-xl font-bold leading-none">Lume Cume PDV</h1>
                <p className="text-xs opacity-80 mt-1">Op: {user?.email}</p>
              </div>
            </div>
            {!showSidebar && (
              <button onClick={logOut} className="text-red-300 hover:text-white transition-colors">
                <LogOut size={24}/>
              </button>
            )}
          </div>

          {/* Barra de Busca */}
          <div className="p-4 bg-white border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20}/>
              <input 
                type="text" 
                placeholder="Buscar produto..." 
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-50 focus:outline-none focus:border-lume-primary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Grid de Produtos */}
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 content-start pb-20 md:pb-4">
            {filteredProducts.map((product) => {
              const qtdNoCarrinho = getQtdInCart(product.id);
              const disponivel = product.stock - qtdNoCarrinho;
              const esgotado = disponivel <= 0;

              return (
                <div 
                  key={product.id} 
                  onClick={() => !esgotado && addToCart(product)}
                  className={`
                    bg-white rounded-lg shadow transition-all border-2 border-transparent flex flex-col justify-between overflow-hidden
                    ${esgotado 
                      ? 'opacity-60 grayscale cursor-not-allowed bg-gray-100' 
                      : 'cursor-pointer hover:shadow-xl hover:border-lume-accent transform hover:-translate-y-1 active:scale-95'}
                  `}
                >
                  {/* IMAGEM: Ajustada para Mobile (h-24) e Desktop (md:h-32) */}
                  <div className="h-24 md:h-32 w-full bg-gray-200 flex items-center justify-center overflow-hidden relative">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover"/>
                    ) : (
                      <ImageIcon className="text-gray-400" size={30}/>
                    )}
                    
                    {/* Badge de Estoque */}
                    <span className={`absolute bottom-1 right-1 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm ${esgotado ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-700'}`}>
                       {esgotado ? 'ESGOTADO' : `Qtd: ${disponivel}`}
                    </span>
                  </div>

                  <div className="p-2 md:p-3 flex flex-col flex-1 justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800 text-xs md:text-sm leading-tight line-clamp-2 min-h-[2.5em]">
                        {product.name}
                      </h3>
                    </div>
                    
                    <p className="text-lume-primary font-bold text-base md:text-xl mt-1 text-right">
                      R$ {Number(product.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LADO DIREITO: Carrinho */}
        <div className="w-full md:w-96 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.1)] flex flex-col h-[50vh] md:h-full border-t md:border-l border-gray-200 z-20">
          <div className="p-4 bg-lume-secondary text-white flex items-center gap-2 shrink-0">
            <ShoppingCart />
            <h2 className="font-bold text-lg">Cesta</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 mt-10">
                <p>Carrinho vazio</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded shadow-sm border-l-4 border-lume-primary">
                  <div className="flex-1 mr-2">
                    <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.qtd}x R$ {Number(item.price).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-sm whitespace-nowrap">R$ {(item.qtd * item.price).toFixed(2)}</p>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-white border-t space-y-3 shrink-0">
            
            {/* Botões de Pagamento */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">PAGAMENTO</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setPaymentMethod('Dinheiro'); setParcelas(1); }} className={`p-2 rounded text-xs md:text-sm flex items-center justify-center gap-2 border transition-all ${paymentMethod === 'Dinheiro' ? 'bg-green-100 border-green-500 text-green-700 font-bold ring-1 ring-green-500' : 'hover:bg-gray-50 text-gray-600'}`}><Banknote size={16}/> Dinheiro</button>
                <button onClick={() => setPaymentMethod('Pix')} className={`p-2 rounded text-xs md:text-sm flex items-center justify-center gap-2 border transition-all ${paymentMethod === 'Pix' ? 'bg-green-100 border-green-500 text-green-700 font-bold ring-1 ring-green-500' : 'hover:bg-gray-50 text-gray-600'}`}><QrCode size={16}/> Pix</button>
                <button onClick={() => setPaymentMethod('Credito')} className={`p-2 rounded text-xs md:text-sm flex items-center justify-center gap-2 border transition-all ${paymentMethod === 'Credito' ? 'bg-blue-100 border-blue-500 text-blue-700 font-bold ring-1 ring-blue-500' : 'hover:bg-gray-50 text-gray-600'}`}><CreditCard size={16}/> Crédito</button>
                <button onClick={() => { setPaymentMethod('Debito'); setParcelas(1); }} className={`p-2 rounded text-xs md:text-sm flex items-center justify-center gap-2 border transition-all ${paymentMethod === 'Debito' ? 'bg-blue-100 border-blue-500 text-blue-700 font-bold ring-1 ring-blue-500' : 'hover:bg-gray-50 text-gray-600'}`}><CreditCard size={16}/> Débito</button>
              </div>
            </div>

            {/* Parcelamento */}
            {(paymentMethod === 'Credito' || paymentMethod === 'Pix') && (
              <div className="bg-yellow-50 p-2 rounded border border-yellow-200 animate-fade-in">
                <label className="block text-xs font-bold text-gray-600 mb-1">Parcelas</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" max="24" value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} className="w-full border p-2 rounded text-center font-bold text-gray-700 focus:outline-none focus:border-lume-primary"/>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{parcelas > 1 ? `x R$ ${(total / parcelas).toFixed(2)}` : 'À vista'}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-end pt-2 border-t">
              <span className="text-gray-600 font-bold">TOTAL</span>
              <span className="text-3xl font-bold text-lume-primary">R$ {total.toFixed(2)}</span>
            </div>
            
            <button onClick={handleFinishSale} disabled={cart.length === 0 || loadingFinish} className={`w-full py-3 rounded-lg font-bold text-white shadow-lg ${cart.length === 0 ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
              {loadingFinish ? '...' : 'FINALIZAR VENDA'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
