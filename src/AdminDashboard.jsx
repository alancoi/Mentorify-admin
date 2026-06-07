import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './AdminDashboard.css';

export default function AdminDashboard({ user, onLogout }) {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '' });

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

  async function createCoach(e) {
    e.preventDefault();
    try {
      if (!formData.nombre || !formData.email || !formData.password) {
        alert('❌ Completá todos los campos');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });

      if (error) throw error;

      await supabase.from('coaches').insert([{
        user_id: data.user.id,
        nombre: formData.nombre,
        email: formData.email,
        plan: 'basico',
        plan_limite: 20
      }]);

      alert(`✅ Coach creado!\n\nEmail: ${formData.email}\nContraseña: ${formData.password}`);
      setFormData({ nombre: '', email: '', password: '' });
      setShowModal(false);
      loadCoaches();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  if (loading) return <div className="admin-loading">Cargando...</div>;

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>🛡️ Panel Admin Mentorify</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => setShowModal(true)} className="btn-add">+ Agregar Coach</button>
          <button onClick={onLogout} className="btn-logout">Salir</button>
        </div>
      </div>

      <div className="admin-content">
        <h2>Coaches Registrados: {coaches.length}</h2>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Plan</th>
            </tr>
          </thead>
          <tbody>
            {coaches.map((coach) => (
              <tr key={coach.id}>
                <td>{coach.nombre}</td>
                <td>{coach.email}</td>
                <td>{coach.plan || 'basico'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>➕ Agregar Coach</h2>
            <form onSubmit={createCoach}>
              <input
                type="text"
                placeholder="Nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancelar</button>
                <button type="submit" className="btn-submit">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
