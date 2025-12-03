import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export default function Private({ children, roleRequired }) {
  const { signed, loadingAuth, user } = useContext(AuthContext);

  if (loadingAuth) {
    return <div>Carregando...</div>;
  }

  if (!signed) {
    return <Navigate to="/" />;
  }

  if (roleRequired && user.role !== roleRequired) {
    if (user.role === 'vendedor') {
      return <Navigate to="/pdv" />;
    }
    return <Navigate to="/admin" />;
  }

  return children;
}
