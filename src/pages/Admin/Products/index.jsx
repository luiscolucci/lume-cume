import { useState, useEffect } from "react";
import Sidebar from "../../../components/Sidebar";
import { db, storage } from "../../../services/firebaseConnection";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore"; // <--- Adicionado updateDoc
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Trash2,
  Plus,
  Upload,
  Image as ImageIcon,
  Pencil,
  X,
} from "lucide-react"; // <--- Adicionado Pencil e X
import { toast } from "react-toastify";

export default function Products() {
  const [products, setProducts] = useState([]);

  // Inputs do Formulário
  const [nome, setNome] = useState("");
  const [precoCusto, setPrecoCusto] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [estoque, setEstoque] = useState("");
  const [imageFile, setImageFile] = useState(null);

  // Estado para controlar Edição
  const [idProduct, setIdProduct] = useState(null); // <--- NULL = Criando, ID = Editando

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
            ...doc.data(),
          });
        });
        setProducts(lista);
      } catch (error) {
        console.log("Erro ao buscar:", error);
      }
    }
    loadProducts();
  }, []);

  // Função Principal: Cadastrar OU Editar
  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);

    try {
      let urlFoto = null;

      // Se o usuário selecionou uma nova imagem (tanto no cadastro quanto na edição)
      if (imageFile) {
        const uploadRef = ref(
          storage,
          `images/${imageFile.name}_${Date.now()}`,
        );
        const snapshot = await uploadBytes(uploadRef, imageFile);
        urlFoto = await getDownloadURL(snapshot.ref);
      }

      // --- MODO EDIÇÃO ---
      if (idProduct) {
        const docRef = doc(db, "products", idProduct);

        // Monta o objeto de atualização
        let data = {
          name: nome,
          cost_price: parseFloat(precoCusto),
          price: parseFloat(precoVenda),
          stock: parseInt(estoque),
          // Só atualiza a data se quiser manter registro de "última alteração"
          // created_at: não mudamos na edição
        };

        // Só atualiza a foto SE o usuário tiver enviado uma nova
        if (urlFoto) {
          data.image_url = urlFoto;
        }

        await updateDoc(docRef, data);
        toast.info("Produto atualizado com sucesso!");

        // Atualiza a lista localmente para não precisar recarregar a página
        setProducts(
          products.map((item) => {
            if (item.id === idProduct) {
              return { ...item, ...data, image_url: urlFoto || item.image_url }; // Mantém a foto antiga se não tiver nova
            }
            return item;
          }),
        );
      }
      // --- MODO CADASTRO ---
      else {
        const docRef = await addDoc(collection(db, "products"), {
          name: nome,
          cost_price: parseFloat(precoCusto),
          price: parseFloat(precoVenda),
          stock: parseInt(estoque),
          image_url: urlFoto || "",
          created_at: new Date(),
        });

        toast.success("Produto cadastrado com sucesso!");

        // Adiciona na lista visualmente
        setProducts([
          ...products,
          {
            id: docRef.id,
            name: nome,
            cost_price: parseFloat(precoCusto),
            price: parseFloat(precoVenda),
            stock: parseInt(estoque),
            image_url: urlFoto || "",
          },
        ]);
      }

      // Limpa tudo
      setNome("");
      setPrecoCusto("");
      setPrecoVenda("");
      setEstoque("");
      setImageFile(null);
      setIdProduct(null); // Volta para modo criação
    } catch (error) {
      console.log(error);
      toast.error("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  // Função para preencher o formulário (Entrar no modo edição)
  function handleEdit(item) {
    setNome(item.name);
    setPrecoCusto(item.cost_price);
    setPrecoVenda(item.price);
    setEstoque(item.stock);
    setIdProduct(item.id); // Seta o ID para o sistema saber que é edição

    window.scrollTo({ top: 0, behavior: "smooth" }); // Sobe a tela para o form
  }

  // Função para cancelar a edição
  function handleCancelEdit() {
    setIdProduct(null);
    setNome("");
    setPrecoCusto("");
    setPrecoVenda("");
    setEstoque("");
    setImageFile(null);
  }

  async function handleDelete(id) {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      setProducts(products.filter((item) => item.id !== id));
      toast.success("Item removido");
    } catch (error) {
      toast.error("Erro ao deletar");
    }
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />

      <div className="w-full p-4 md:p-8 md:ml-64">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Cadastro de Produtos
        </h1>

        {/* Formulário */}
        <div
          className={`p-6 rounded-lg shadow-md mb-8 border-l-4 transition-colors ${idProduct ? "bg-blue-50 border-blue-500" : "bg-white border-lume-primary"}`}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-700">
              {idProduct ? (
                <>
                  <Pencil size={20} className="text-blue-600" /> Editando
                  Produto
                </>
              ) : (
                <>
                  <Plus size={20} className="text-lume-primary" /> Novo Item
                </>
              )}
            </h2>

            {/* Botão Cancelar Edição (Só aparece se estiver editando) */}
            {idProduct && (
              <button
                onClick={handleCancelEdit}
                className="text-red-500 flex items-center gap-1 text-sm font-bold hover:bg-red-100 px-3 py-1 rounded"
              >
                <X size={16} /> CANCELAR EDIÇÃO
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Nome do Produto
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border rounded p-2 focus:border-lume-primary outline-none"
                  placeholder="Ex: Coca Cola 2L"
                  required
                />
              </div>

              <div className="w-full md:w-1/3">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  {idProduct ? "Trocar Foto (Opcional)" : "Foto"}
                </label>
                <label className="flex items-center justify-center gap-2 w-full border border-dashed border-gray-400 p-2 rounded cursor-pointer hover:bg-gray-50 text-gray-600 bg-white">
                  <Upload size={18} />
                  <span className="text-sm truncate">
                    {imageFile ? imageFile.name : "Escolher Arquivo..."}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setImageFile(e.target.files[0])}
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Custo (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={precoCusto}
                  onChange={(e) => setPrecoCusto(e.target.value)}
                  className="w-full border rounded p-2 focus:border-lume-primary outline-none"
                  required
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Venda (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={precoVenda}
                  onChange={(e) => setPrecoVenda(e.target.value)}
                  className="w-full border rounded p-2 focus:border-lume-primary outline-none"
                  required
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Qtd Estoque
                </label>
                <input
                  type="number"
                  value={estoque}
                  onChange={(e) => setEstoque(e.target.value)}
                  className="w-full border rounded p-2 focus:border-lume-primary outline-none"
                  required
                />
              </div>
            </div>

            <button
              disabled={loading}
              className={`py-3 rounded text-white font-bold mt-2 shadow-lg transition-all w-full md:w-auto ${idProduct ? "bg-blue-600 hover:bg-blue-700" : "bg-lume-primary hover:bg-slate-800"}`}
            >
              {loading
                ? "Salvando..."
                : idProduct
                  ? "SALVAR ALTERAÇÕES"
                  : "CADASTRAR PRODUTO"}
            </button>
          </form>
        </div>

        {/* Listagem */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-gray-200 text-gray-700 text-sm uppercase">
                <tr>
                  <th className="p-4">Img</th>
                  <th className="p-4">Nome</th>
                  <th className="p-4">Custo</th>
                  <th className="p-4">Venda</th>
                  <th className="p-4">Estoque</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt="Foto"
                          className="w-10 h-10 object-cover rounded shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-medium">{item.name}</td>
                    <td className="p-4 text-gray-500">
                      R$ {Number(item.cost_price || 0).toFixed(2)}
                    </td>
                    <td className="p-4 font-bold text-green-700">
                      R$ {Number(item.price).toFixed(2)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${item.stock < 5 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-800"}`}
                      >
                        {item.stock} un
                      </span>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      {/* Botão de Editar */}
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-500 hover:text-blue-700 bg-blue-50 p-2 rounded-full transition-colors"
                        title="Editar Produto"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-full transition-colors"
                        title="Excluir Produto"
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
