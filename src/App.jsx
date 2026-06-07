import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import AdminLoginPage from './AdminLoginPage';
import AdminDashboard from './AdminDashboard';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription?.unsubscribe();
  }, []);

  async function checkAuth() {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="app">
      {!user ? (
        <AdminLoginPage onLoginSuccess={setUser} />
      ) : (
        <AdminDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
