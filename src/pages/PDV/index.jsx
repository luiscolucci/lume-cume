import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { db, auth } from "../../services/firebaseConnection";
import Sidebar from "../../components/Sidebar";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import {
  Search,
  ShoppingCart,
  Trash2,
  LogOut,
  CreditCard,
  Banknote,
  QrCode,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "react-toastify";
import logoImg from "../../assets/lume-cume.png"; // Ou seu logo Lume Cume

export default function PDV({ showSidebar = false }) {
  const { user } = useContext(AuthContext);

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);

  const [paymentMethod, setPaymentMethod] = useState("Dinheiro");
  const [parcelas, setParcelas] = useState(1);
  const [loadingFinish, setLoadingFinish] = useState(false);

  // States Troco
  const [valorRecebido, setValorRecebido] = useState("");
  const [converterTrocoEmLucro, setConverterTrocoEmLucro] = useState(false);

  async function handleLogout() {
    try {
      await signOut(auth);
      localStorage.clear();
      window.location.href = "/";
    } catch (error) {
      window.location.href = "/";
    }
  }

  useEffect(() => {
    async function loadProducts() {
      // Busca Padrão Lume Cume (Simples)
      // Se quiser Multi-tenancy, troque por: query(collection(db, "products"), where("companyId", "==", user.companyId))
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        let lista = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          lista.push({
            id: doc.id,
            name: data.name,
            stock: Number(data.stock) || 0,
            price: Number(data.price) || 0,
            cost_price: Number(data.cost_price) || 0,
            image_url: data.image_url,
          });
        });
        setProducts(lista);
      } catch (error) {
        console.log("Erro ao carregar produtos:", error);
      }
    }
    loadProducts();
  }, [user]);

  function getQtdInCart(productId) {
    const item = cart.find((i) => i.id === productId);
    return item ? item.qtd : 0;
  }

  function addToCart(product) {
    const qtdNoCarrinho = getQtdInCart(product.id);
    const estoqueDisponivel = product.stock - qtdNoCarrinho;

    if (estoqueDisponivel <= 0) {
      toast.warning("Estoque indisponível!");
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

  // Cálculos
  const totalOriginal = cart.reduce(
    (acc, item) => acc + item.price * item.qtd,
    0
  );
  const valorPagoNum = valorRecebido ? Number(valorRecebido) : 0;
  const troco = valorPagoNum > totalOriginal ? valorPagoNum - totalOriginal : 0;
  const totalFinalDaVenda =
    paymentMethod === "Dinheiro" && converterTrocoEmLucro && troco > 0
      ? valorPagoNum
      : totalOriginal;

  async function handleFinishSale() {
    if (cart.length === 0) return;

    if (paymentMethod === "Dinheiro") {
      if (valorPagoNum < totalOriginal) {
        toast.warning(`Faltam R$ ${(totalOriginal - valorPagoNum).toFixed(2)}`);
        return;
      }
      if (troco > 0 && !converterTrocoEmLucro) {
        const confirmTroco = window.confirm(
          `Troco: R$ ${troco.toFixed(2)}.\nConfirma entrega?`
        );
        if (!confirmTroco) return;
      }
    }

    setLoadingFinish(true);

    try {
      await addDoc(collection(db, "sales"), {
        created_at: new Date(),
        total: totalFinalDaVenda,
        payment_method: paymentMethod,
        installments: parcelas,
        vendedor_uid: user.uid,
        vendedor_nome: user.nome || "Vendedor",
        obs:
          converterTrocoEmLucro && troco > 0
            ? `Troco de R$ ${troco.toFixed(2)} retido como lucro`
            : "",
        itens: cart.map((item) => ({
          id: item.id,
          name: item.name,
          qtd: item.qtd,
          price_unit: item.price,
          cost_unit: item.cost_price || 0,
        })),
      });

      for (const item of cart) {
        const productRef = doc(db, "products", item.id);
        const newStock = Number(item.stock) - Number(item.qtd);
        await updateDoc(productRef, {
          stock: newStock >= 0 ? newStock : 0,
        });
      }

      toast.success(`Venda Finalizada!`);
      setCart([]);
      setPaymentMethod("Dinheiro");
      setParcelas(1);
      setValorRecebido("");
      setConverterTrocoEmLucro(false);

      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.log(error);
      toast.error("Erro ao finalizar");
    } finally {
      setLoadingFinish(false);
    }
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex bg-gray-100 h-screen w-screen overflow-hidden">
      {showSidebar && <Sidebar />}

      <div
        className={`flex-1 flex flex-col md:flex-row h-full w-full ${
          showSidebar ? "md:ml-64" : ""
        }`}
      >
        {/* LADO ESQUERDO: Produtos */}
        <div className="w-full md:flex-1 flex flex-col h-[40vh] md:h-full border-b-4 border-lume-primary md:border-b-0 relative z-10 bg-gray-50">
          <div className="bg-lume-primary text-white p-3 flex justify-between items-center shadow-md shrink-0">
            <div className="flex items-center gap-2">
              <img src={logoImg} alt="Logo" className="h-8 w-auto" />
              <div>
                <h1 className="text-lg font-bold leading-none">PDV</h1>
                <p className="text-[10px] opacity-80">
                  Op: {user?.nome?.split(" ")[0]}
                </p>
              </div>
            </div>
            {!showSidebar && (
              <button
                onClick={handleLogout}
                className="text-red-300 hover:text-white"
              >
                <LogOut size={20} />
              </button>
            )}
          </div>

          <div className="p-2 bg-white border-b shrink-0">
            <div className="relative">
              <Search
                className="absolute left-3 top-2.5 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-9 pr-4 py-2 text-sm border rounded bg-gray-100 focus:outline-none focus:border-lume-primary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 content-start">
            {filteredProducts.map((product) => {
              const qtdNoCarrinho = getQtdInCart(product.id);
              const disponivel = product.stock - qtdNoCarrinho;
              const esgotado = disponivel <= 0;

              return (
                <div
                  key={product.id}
                  onClick={() => !esgotado && addToCart(product)}
                  className={`
                    bg-white rounded border flex flex-col justify-between overflow-hidden shadow-sm
                    ${
                      esgotado
                        ? "opacity-50 grayscale"
                        : "active:scale-95 active:border-lume-primary"
                    }
                  `}
                >
                  <div className="h-16 md:h-32 w-full bg-gray-200 flex items-center justify-center relative">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="text-gray-400" size={20} />
                    )}
                    <span
                      className={`absolute bottom-0 right-0 text-[9px] font-bold px-1 rounded-tl ${
                        esgotado
                          ? "bg-red-500 text-white"
                          : "bg-white text-gray-700"
                      }`}
                    >
                      {esgotado ? "0" : disponivel}
                    </span>
                  </div>

                  <div className="p-1 md:p-2">
                    <h3 className="font-bold text-gray-700 text-[10px] md:text-sm leading-tight line-clamp-2 h-6 md:h-10">
                      {product.name}
                    </h3>
                    <p className="text-lume-primary font-bold text-xs md:text-xl mt-1 text-right">
                      R$ {Number(product.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LADO DIREITO: Carrinho */}
        <div className="w-full md:w-96 bg-white flex flex-col flex-1 md:h-full border-l border-gray-200 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.1)]">
          <div className="p-2 bg-lume-secondary text-white flex items-center gap-2 shrink-0">
            <ShoppingCart size={18} />
            <h2 className="font-bold text-sm">Cesta</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50 min-h-0">
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 mt-4 text-xs">
                <p>Cesta vazia</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center bg-white p-2 rounded border-l-4 border-lume-primary shadow-sm"
                >
                  <div className="flex-1 mr-2 overflow-hidden">
                    <p className="font-bold text-xs truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-500">
                      {item.qtd}x R$ {Number(item.price).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">
                      R$ {(item.qtd * item.price).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-white border-t space-y-2 shrink-0">
            {/* BOTÕES DE PAGAMENTO PEQUENOS COM ÍCONES */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setPaymentMethod("Dinheiro");
                  setParcelas(1);
                }}
                className={`flex items-center justify-center gap-2 py-2 px-1 rounded text-xs font-bold border transition-all ${
                  paymentMethod === "Dinheiro"
                    ? "bg-green-100 border-green-500 text-green-700"
                    : "hover:bg-gray-50 text-gray-600 border-gray-200"
                }`}
              >
                <Banknote size={16} /> Dinheiro
              </button>

              <button
                onClick={() => {
                  setPaymentMethod("Pix");
                  setValorRecebido("");
                }}
                className={`flex items-center justify-center gap-2 py-2 px-1 rounded text-xs font-bold border transition-all ${
                  paymentMethod === "Pix"
                    ? "bg-green-100 border-green-500 text-green-700"
                    : "hover:bg-gray-50 text-gray-600 border-gray-200"
                }`}
              >
                <QrCode size={16} /> Pix
              </button>

              <button
                onClick={() => {
                  setPaymentMethod("Credito");
                  setValorRecebido("");
                }}
                className={`flex items-center justify-center gap-2 py-2 px-1 rounded text-xs font-bold border transition-all ${
                  paymentMethod === "Credito"
                    ? "bg-blue-100 border-blue-500 text-blue-700"
                    : "hover:bg-gray-50 text-gray-600 border-gray-200"
                }`}
              >
                <CreditCard size={16} /> Crédito
              </button>

              <button
                onClick={() => {
                  setPaymentMethod("Debito");
                  setParcelas(1);
                  setValorRecebido("");
                }}
                className={`flex items-center justify-center gap-2 py-2 px-1 rounded text-xs font-bold border transition-all ${
                  paymentMethod === "Debito"
                    ? "bg-blue-100 border-blue-500 text-blue-700"
                    : "hover:bg-gray-50 text-gray-600 border-gray-200"
                }`}
              >
                <CreditCard size={16} /> Débito
              </button>
            </div>

            {/* Dinheiro / Troco */}
            {paymentMethod === "Dinheiro" && (
              <div className="bg-green-50 p-2 rounded border border-green-200 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-600">
                    Recebido:
                  </label>
                  <input
                    type="number"
                    value={valorRecebido}
                    onChange={(e) => setValorRecebido(e.target.value)}
                    placeholder="0.00"
                    className="w-24 border p-1 rounded text-sm font-bold text-right focus:outline-none focus:border-green-500"
                  />
                </div>
                {valorPagoNum >= totalOriginal && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={converterTrocoEmLucro}
                        onChange={(e) =>
                          setConverterTrocoEmLucro(e.target.checked)
                        }
                        className="h-3 w-3"
                      />
                      <span className="text-[10px] text-gray-600">
                        Troco é Lucro?
                      </span>
                    </div>
                    <span
                      className={`font-bold text-sm ${
                        converterTrocoEmLucro
                          ? "text-gray-400 line-through"
                          : "text-orange-600"
                      }`}
                    >
                      Troco: R$ {troco.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Parcelas */}
            {(paymentMethod === "Credito" || paymentMethod === "Pix") && (
              <div className="flex items-center gap-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                <label className="text-xs font-bold text-gray-600">
                  Parcelas:
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={parcelas}
                  onChange={(e) => setParcelas(Number(e.target.value))}
                  className="w-12 border p-1 rounded text-center text-sm"
                />
                <span className="text-[10px] text-gray-500">
                  {parcelas > 1
                    ? `(${parcelas}x R$ ${(totalOriginal / parcelas).toFixed(
                        2
                      )})`
                    : "À vista"}
                </span>
              </div>
            )}

            <div className="flex justify-between items-end pt-1 border-t">
              <span className="text-gray-600 font-bold text-xs">TOTAL</span>
              <span className="text-2xl font-bold text-lume-primary">
                R$ {totalOriginal.toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleFinishSale}
              disabled={cart.length === 0 || loadingFinish}
              className={`w-full py-3 rounded font-bold text-white shadow text-sm ${
                cart.length === 0
                  ? "bg-gray-400"
                  : "bg-green-600 hover:bg-green-700 active:scale-95"
              }`}
            >
              {loadingFinish ? "..." : "FINALIZAR VENDA"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
