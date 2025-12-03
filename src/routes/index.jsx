import { Routes, Route } from 'react-router-dom';

import Login from '../pages/Login';
import Dashboard from '../pages/Admin/Dashboard';
import Products from '../pages/Admin/Products';
import PDV from '../pages/PDV';
import Reports from '../pages/Admin/Reports';
import Users from '../pages/Admin/Users';
import Finance from '../pages/Admin/Finance';
import Private from './Private';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={ <Login/> } />

      {/* ROTAS ADMIN */}
      <Route path="/admin" element={ 
        <Private roleRequired="admin">
          <Dashboard/> 
        </Private>
      } />

      <Route path="/admin/products" element={ <Private roleRequired="admin"><Products/></Private> } />
      <Route path="/admin/users" element={ <Private roleRequired="admin"><Users/></Private> } />
      <Route path="/admin/finance" element={ <Private roleRequired="admin"><Finance/></Private> } />
      <Route path="/admin/reports" element={ <Private roleRequired="admin"><Reports/></Private> } />
      
      {/* ADMIN PDV (Com Menu) - ESTA É A ÚNICA ROTA CORRETA PARA O ADMIN */}
      <Route path="/admin/pdv" element={ 
        <Private roleRequired="admin">
          {/* O segredo: showSidebar={true} faz o menu aparecer */}
          <PDV showSidebar={true} />
        </Private>
      } />

      {/* ROTA VENDEDOR (Sem Menu) */}
      <Route path="/pdv" element={ 
        <Private roleRequired="vendedor">
          <PDV showSidebar={false} />
        </Private>
      } />
    </Routes>
  );
}
