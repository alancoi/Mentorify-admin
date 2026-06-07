import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './AdminDashboard.css';

const PLAN_CONFIG = {
  basico: { limite: 20, color: '#6B7280', label: 'Básico' },
  medio: { limite: 50, color: '#F59E0B', label: 'Medio' },
  pro: { limite: 100, color: '#8B5CF6', label: 'Pro' }
};

export default function AdminDashboard({ user, onLogout }) {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCoaches: 0, totalAlumnos: 0, totalIngresos: 0 });
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [coachAlumnos, setCoachAlumnos] = useState([]);
  const [showAlumnosModal, setShowAlumnosModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editCoach, setEditCoach] = useState(null);
  const [newPlan, setNewPlan] = useState('basico');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '' });

  useEffect(() => {
    loadCoaches();
  }, []);

  async function loadCoaches() {
    try {
      setLoading(true);
      const { data: coachesData, error } = await supabase.from('coaches').select('*');
      if (error) throw error;

      let totalAlumnos = 0;
      let totalIngresos = 0;

      const coachesWithStats = await Promise.all(
        coachesData.map(async (coach) => {
          const { data: alumnos } = await supabase.from('alumnos').select('*').eq('coach_id', coach.id);
          const alumnoCount = alumnos?.length || 0;
          const ingresos = alumnos?.reduce((sum, a) => sum + (a.plan_precio || 0), 0) || 0;
          const plan = coach.plan || 'basico';
          const planLimite = PLAN_CONFIG[plan]?.limite || 20;

          totalAlumnos += alumnoCount;
          totalIngresos += ingresos;

          return {
            ...coach,
            alumnoCount,
            ingresos,
            planLimite,
            porcentajeUso: Math.round((alumnoCount / planLimite) * 100)
          };
        })
      );

      setCoaches(coachesWithStats);
      setStats({
        totalCoaches: coachesData.length,
        totalAlumnos,
        totalIngresos,
      });
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCoachAlumnos(coachId) {
    try {
      const { data } = await supabase.from('alumnos').select('*').eq('coach_id', coachId);
      setCoachAlumnos(data || []);
    } catch (err) {
      console.error('Error:', err);
    }
  }

  async function updatePlan(coachId, plan) {
    try {
      const planLimite = PLAN_CONFIG[plan]?.limite || 20;
      const { error } = await supabase
        .from('coaches')
        .update({ plan, plan_limite: planLimite })
        .eq('id', coachId);

      if (error) throw error;
      alert('✅ Plan actualizado');
      setShowPlanModal(false);
      loadCoaches();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function deleteCoach(coachId) {
    if (!window.confirm('¿Eliminar este coach?')) return;
    try {
      await supabase.from('alumnos').delete().eq('coach_id', coachId);
      await supabase.from('coaches').delete().eq('id', coachId);
      loadCoaches();
      alert('✅ Coach eliminado');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function createCoach(e) {
    e.preventDefault();
    try {
      if (!formData.nombre || !formData.email || !formData.password) {
        alert('❌ Completá todos los campos');
        return;
      }

      const response = await fetch('/api/create-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre,
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear coach');
      }

      alert(`✅ Coach creado!\n\nEmail: ${formData.email}\nContraseña: ${formData.password}\n\nComparte estas credenciales con el coach.`);
      setFormData({ nombre: '', email: '', password: '' });
      setShowCreateModal(false);
      loadCoaches();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  }

  const filtered = coaches.filter(c =>
    c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="admin-loading">Cargando coaches...</div>;

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h1>🛡️ Panel Admin Mentorify</h1>
          <p className="user-email">Conectado: {user.email}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => setShowCreateModal(true)} className="btn-add-coach">+ Agregar Coach</button>
          <button onClick={onLogout} className="btn-logout">Salir</button>
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-number">{stats.totalCoaches}</div>
          <div className="stat-label">Coaches</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalAlumnos}</div>
          <div className="stat-label">Alumnos</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">${stats.totalIngresos.toFixed(2)}</div>
          <div className="stat-label">Ingresos</div>
        </div>
      </div>

      <div className="admin-search">
        <input
          type="text"
          placeholder="Buscar coach..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Alumnos</th>
              <th>Ingresos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((coach) => {
              const planConfig = PLAN_CONFIG[coach.plan] || PLAN_CONFIG.basico;
              return (
                <tr key={coach.id}>
                  <td>{coach.nombre}</td>
                  <td>{coach.email}</td>
                  <td>
                    <span className="plan-badge" style={{ backgroundColor: planConfig.color }}>
                      {planConfig.label} ({coach.alumnoCount}/{coach.planLimite})
                    </span>
                  </td>
                  <td className="text-center">
                    <div className="alumnos-progress">
                      <span>{coach.alumnoCount}/{coach.planLimite}</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${Math.min(coach.porcentajeUso, 100)}%`,
                            backgroundColor: coach.porcentajeUso > 90 ? '#d32f2f' : planConfig.color
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="text-right">${coach.ingresos?.toFixed(2)}</td>
                  <td className="actions">
                    <button
                      onClick={() => {
                        setSelectedCoach(coach);
                        loadCoachAlumnos(coach.id);
                        setShowAlumnosModal(true);
                      }}
                      className="btn-small btn-info"
                    >
                      👥 Ver
                    </button>
                    <button
                      onClick={() => {
                        setEditCoach(coach);
                        setNewPlan(coach.plan);
                        setShowPlanModal(true);
                      }}
                      className="btn-small btn-warning"
                    >
                      📋 Plan
                    </button>
                    <button
                      onClick={() => deleteCoach(coach.id)}
                      className="btn-small btn-danger"
                    >
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAlumnosModal && selectedCoach && (
        <div className="modal-overlay" onClick={() => setShowAlumnosModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👥 Alumnos de {selectedCoach.nombre}</h2>
              <button onClick={() => setShowAlumnosModal(false)} className="btn-close">✕</button>
            </div>
            <div className="alumnos-list">
              {coachAlumnos.length === 0 ? (
                <p className="empty-state">No hay alumnos</p>
              ) : (
                coachAlumnos.map((alumno) => (
                  <div key={alumno.id} className="alumno-card">
                    <div className="alumno-info">
                      <strong>{alumno.nombre}</strong>
                      <small>{alumno.email}</small>
                      <small className="plan-badge" style={{ backgroundColor: '#6C4DFF', marginTop: '0.3rem' }}>
                        {alumno.plan_tipo} - ${alumno.plan_precio}
                      </small>
                    </div>
                    <div className="alumno-dates">
                      <small>Inicio: {new Date(alumno.fecha_inicio).toLocaleDateString('es-AR')}</small>
                      <small>Vence: {new Date(alumno.fecha_renovacion).toLocaleDateString('es-AR')}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setShowAlumnosModal(false)} className="btn-primary">Cerrar</button>
          </div>
        </div>
      )}

      {showPlanModal && editCoach && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Cambiar Plan - {editCoach.nombre}</h2>
              <button onClick={() => setShowPlanModal(false)} className="btn-close">✕</button>
            </div>
            <div className="plan-options">
              {Object.entries(PLAN_CONFIG).map(([key, config]) => (
                <div
                  key={key}
                  className={`plan-option ${newPlan === key ? 'selected' : ''}`}
                  onClick={() => setNewPlan(key)}
                >
                  <div className="plan-color" style={{ backgroundColor: config.color }} />
                  <div className="plan-info">
                    <strong>{config.label}</strong>
                    <p>Hasta {config.limite} alumnos</p>
                  </div>
                  {newPlan === key && <span className="plan-check">✓</span>}
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowPlanModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={() => updatePlan(editCoach.id, newPlan)} className="btn-primary">Actualizar</button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Agregar Coach</h2>
              <button onClick={() => setShowCreateModal(false)} className="btn-close">✕</button>
            </div>
            <form onSubmit={createCoach} style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="coach@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="text"
                  placeholder="Ej: Compra123456"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Crear Coach</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
