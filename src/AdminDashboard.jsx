import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './AdminDashboard.css';

export default function AdminDashboard({ user, onLogout }) {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCoaches();
  }, []);

  async function loadCoaches() {
    try {
      const { data, error } = await supabase.from('coaches').select('*');
      if (error) throw error;
      setCoaches(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="admin-loading">Cargando...</div>;

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>🛡️ Panel Admin Mentorify</h1>
        <button onClick={onLogout} className="btn-logout">Salir</button>
      </div>

      <div className="admin-content">
        <h2>Coaches Registrados: {coaches.length}</h2>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {coaches.map((coach) => (
              <tr key={coach.id}>
                <td>{coach.nombre}</td>
                <td>{coach.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
