import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './AdminDashboard.css';

export default function AdminDashboard({ user, onLogout }) {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCoaches: 0, totalAlumnos: 0, totalIngresos: 0 });
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [coachAlumnos, setCoachAlumnos] = useState([]);
  const [showAlumnosModal, setShowAlumnosModal] = useState(false);
  const [editingCoach, setEditingCoach] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCoaches();
  }, []);

  async function loadCoaches() {
    try {
      setLoading(true);
      
      // Obtener coaches
      const { data: coachesData, error: coachesError } = await supabase
        .from('coaches')
        .select('*');
      
      if (coachesError) throw coachesError;

      // Para cada coach, contar alumnos e ingresos
      let totalAlumnos = 0;
      let totalIngresos = 0;

      const coachesWithStats = await Promise.all(
        coachesData.map(async (coach) => {
          const { data: alumnos, error: alumnosError } = await supabase
            .from('alumnos')
            .select('*')
            .eq('coach_id', coach.id);

          if (alumnosError) throw alumnosError;

          const alumnoCount = alumnos?.length || 0;
          const ingresos = alumnos?.reduce((sum, a) => sum + (a.plan_precio || 0), 0) || 0;

          totalAlumnos += alumnoCount;
          totalIngresos += ingresos;

          return {
            ...coach,
            alumnoCount,
            ingresos,
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
      console.error('Error loading coaches:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCoachAlumnos(coachId) {
    try {
      const { data, error } = await supabase
        .from('alumnos')
        .select('*')
        .eq('coach_id', coachId);

      if (error) throw error;
      setCoachAlumnos(data);
    } catch (err) {
      console.error('Error loading alumnos:', err);
    }
  }

  async function deleteCoach(coachId) {
    if (!window.confirm('¿Eliminar este coach? Se eliminarán todos sus datos.')) return;

    try {
      // Eliminar alumnos del coach
      await supabase.from('alumnos').delete().eq('coach_id', coachId);

      // Eliminar coach
      const { error } = await supabase.from('coaches').delete().eq('id', coachId);
      if (error) throw error;

      setCoaches(coaches.filter(c => c.id !== coachId));
      alert('✅ Coach eliminado exitosamente');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  const filteredCoaches = coaches.filter(c =>
    c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="admin-loading">Cargando coaches...</div>;
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1>🛡️ Panel Admin Mentorify</h1>
          <p className="user-email">Conectado: {user.email}</p>
        </div>
        <button onClick={onLogout} className="btn-logout">Salir</button>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-number">{stats.totalCoaches}</div>
          <div className="stat-label">Coaches Totales</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalAlumnos}</div>
          <div className="stat-label">Alumnos Totales</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">${stats.totalIngresos.toFixed(2)}</div>
          <div className="stat-label">Ingresos Totales</div>
        </div>
      </div>

      {/* Search */}
      <div className="admin-search">
        <input
          type="text"
          placeholder="Buscar coach por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Coaches Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Alumnos</th>
              <th>Ingresos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCoaches.map((coach) => (
              <tr key={coach.id}>
                <td>{coach.nombre}</td>
                <td>{coach.email}</td>
                <td className="text-center">{coach.alumnoCount}</td>
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
                    👥 Ver alumnos
                  </button>
                  <button
                    onClick={() => deleteCoach(coach.id)}
                    className="btn-small btn-danger"
                  >
                    🗑️ Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Alumnos Modal */}
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
                      <small className="plan-badge">{alumno.plan_tipo} - ${alumno.plan_precio}</small>
                    </div>
                    <div className="alumno-dates">
                      <small>Inicio: {new Date(alumno.fecha_inicio).toLocaleDateString('es-AR')}</small>
                      <small>Vence: {new Date(alumno.fecha_renovacion).toLocaleDateString('es-AR')}</small>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button onClick={() => setShowAlumnosModal(false)} className="btn-primary">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
