import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './AdminDashboard.css';

const PLAN_CONFIG = {
  basico: { limite: 20, color: '#6B7280', label: 'Básico' },
  medio: { limite: 50, color: '#F59E0B', label: 'Medio' },
  pro: { limite: 100, color: '#8B5CF6', label: 'Pro' }
};

function getDiasRestantes(fechaCreacion) {
  if (!fechaCreacion) return null;
  const inicio = new Date(fechaCreacion);
  const vencimiento = new Date(inicio);
  vencimiento.setDate(vencimiento.getDate() + 30);
  const hoy = new Date();
  const diff = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
  return { vencimiento, diasRestantes: diff };
}

function VencimientoCell({ fechaCreacion }) {
  const result = getDiasRestantes(fechaCreacion);
  if (!result) return <span style={{ color: '#999' }}>—</span>;

  const { vencimiento, diasRestantes } = result;
  const fechaStr = vencimiento.toLocaleDateString('es-AR');

  if (diasRestantes < 0) {
    return (
      <div className="vencimiento-cell vencido">
        <span className="vencimiento-fecha">{fechaStr}</span>
        <span className="vencimiento-badge rojo">Vencido hace {Math.abs(diasRestantes)}d</span>
      </div>
    );
  }
  if (diasRestantes <= 3) {
    return (
      <div className="vencimiento-cell por-vencer">
        <span className="vencimiento-fecha">{fechaStr}</span>
        <span className="vencimiento-badge naranja">⚠️ Vence en {diasRestantes}d</span>
      </div>
    );
  }
  return (
    <div className="vencimiento-cell">
      <span className="vencimiento-fecha">{fechaStr}</span>
      <span className="vencimiento-badge verde">{diasRestantes}d restantes</span>
    </div>
  );
}

export default function AdminDashboard({ user, onLogout }) {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCoaches: 0, totalAlumnos: 0, ingresosEsteMes: 0, ingresosMesPasado: 0, nuevosEsteMes: 0, bajas: 0 });
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [coachAlumnos, setCoachAlumnos] = useState([]);
  const [showAlumnosModal, setShowAlumnosModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ nombre: '', email: '' });
  const [editCoach, setEditCoach] = useState(null);
  const [newPlan, setNewPlan] = useState('basico');
  const [newValor, setNewValor] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '', plan: 'basico', valor_plan: '' });

  useEffect(() => { loadCoaches(); }, []);

  async function loadCoaches() {
    try {
      setLoading(true);
      const { data: coachesData, error } = await supabase.from('coaches').select('*');
      if (error) throw error;
      if (!coachesData || coachesData.length === 0) {
        setCoaches([]);
        setStats({ totalCoaches: 0, totalAlumnos: 0, ingresosEsteMes: 0, ingresosMesPasado: 0, nuevosEsteMes: 0, bajas: 0 });
        setLoading(false);
        return;
      }

      let totalAlumnos = 0;

      const coachesWithStats = await Promise.all(
        coachesData.map(async (coach) => {
          const { data: alumnos } = await supabase.from('alumnos').select('*').eq('coach_id', coach.id);
          const alumnoCount = alumnos?.length || 0;
          const plan = coach.plan || 'basico';
          const planLimite = PLAN_CONFIG[plan]?.limite || 20;
          totalAlumnos += alumnoCount;
          return {
            ...coach,
            alumnoCount,
            planLimite,
            porcentajeUso: Math.round((alumnoCount / planLimite) * 100)
          };
        })
      );

      setCoaches(coachesWithStats);
      
      const hoy = new Date();
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const inicioMesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const finMesPasado = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59);

      const ingresosEsteMes = coachesData
        .filter(c => c.fecha_creacion && new Date(c.fecha_creacion) >= inicioMes)
        .reduce((sum, c) => sum + (parseFloat(c.valor_plan) || 0), 0);

      const ingresosMesPasado = coachesData
        .filter(c => {
          const f = c.fecha_creacion ? new Date(c.fecha_creacion) : null;
          return f && f >= inicioMesPasado && f <= finMesPasado;
        })
        .reduce((sum, c) => sum + (parseFloat(c.valor_plan) || 0), 0);

      const nuevosEsteMes = coachesData.filter(c =>
        c.fecha_creacion && new Date(c.fecha_creacion) >= inicioMes
      ).length;

      const bajas = coachesData.filter(c => {
        if (!c.fecha_creacion) return false;
        const venc = new Date(c.fecha_creacion);
        venc.setDate(venc.getDate() + 30);
        return venc < hoy;
      }).length;

      setStats({ totalCoaches: coachesData.length, totalAlumnos, ingresosEsteMes, ingresosMesPasado, nuevosEsteMes, bajas });
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateCoach(coachId, nombre, email, fecha_creacion, valor_plan) {
    try {
      const { error } = await supabase
        .from('coaches')
        .update({ nombre, email, fecha_creacion, valor_plan: parseFloat(valor_plan) || 0 })
        .eq('id', coachId);
      if (error) throw error;
      alert('✅ Coach actualizado');
      setShowEditModal(false);
      loadCoaches();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function loadCoachAlumnos(coachId) {
    const { data } = await supabase.from('alumnos').select('*').eq('coach_id', coachId);
    setCoachAlumnos(data || []);
  }

  async function updatePlan(coachId, plan, valor) {
    try {
      const planLimite = PLAN_CONFIG[plan]?.limite || 20;
      const { error } = await supabase
        .from('coaches')
        .update({ plan, plan_limite: planLimite, valor_plan: parseFloat(valor) || 0 })
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
          password: formData.password,
          plan: formData.plan,
          valor_plan: parseFloat(formData.valor_plan) || 0
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al crear coach');
      alert(`✅ Coach creado!\n\nEmail: ${formData.email}\nContraseña: ${formData.password}\nPlan: ${formData.plan}`);
      setFormData({ nombre: '', email: '', password: '', plan: 'basico', valor_plan: '' });
      setShowCreateModal(false);
      setTimeout(() => loadCoaches(), 1000);
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  }

  // Coaches que vencen en ≤3 días para el stat card
  const porVencer = coaches.filter(c => {
    const r = getDiasRestantes(c.fecha_creacion);
    return r && r.diasRestantes >= 0 && r.diasRestantes <= 3;
  }).length;

  const vencidos = coaches.filter(c => {
    const r = getDiasRestantes(c.fecha_creacion);
    return r && r.diasRestantes < 0;
  }).length;

  const filtered = coaches.filter(c =>
    c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ordenar: vencidos y por vencer primero
  const sorted = [...filtered].sort((a, b) => {
    const ra = getDiasRestantes(a.fecha_creacion);
    const rb = getDiasRestantes(b.fecha_creacion);
    const da = ra?.diasRestantes ?? 999;
    const db = rb?.diasRestantes ?? 999;
    return da - db;
  });

  if (loading) return <div className="admin-loading">Cargando coaches...</div>;

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="header-brand">
          <div className="header-title-row">
            <img src="https://i.postimg.cc/JG918Zps/2__5_.png" alt="Mentorify" className="header-logo" />
            <h1>Panel Admin Mentorify</h1>
          </div>
          <p className="user-email">Conectado: {user.email}</p>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowCreateModal(true)} className="btn-add-coach">
            <span className="btn-icon">+</span>
            Agregar Coach
          </button>
          <button onClick={onLogout} className="btn-logout">Salir</button>
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-number">{stats.totalCoaches}</div>
          <div className="stat-label">Coaches</div>
        </div>
        <div className={`stat-card ${porVencer > 0 ? 'stat-warning' : ''}`}>
          <div className="stat-number" style={{ color: porVencer > 0 ? '#e65100' : '#6C4DFF' }}>{porVencer}</div>
          <div className="stat-label">⚠️ Por vencer (≤3 días)</div>
        </div>
        <div className={`stat-card ${vencidos > 0 ? 'stat-danger' : ''}`}>
          <div className="stat-number" style={{ color: vencidos > 0 ? '#c62828' : '#6C4DFF' }}>{vencidos}</div>
          <div className="stat-label">🔴 Vencidos</div>
        </div>
      </div>

      <div className="ingresos-panel">
        <div className="ingresos-card">
          <div className="ingresos-label">💰 Ingresos mes pasado</div>
          <div className="ingresos-value">${stats.ingresosMesPasado.toLocaleString('es-AR')}</div>
        </div>
        <div className="ingresos-card highlight">
          <div className="ingresos-label">💰 Ingresos este mes</div>
          <div className="ingresos-value">${stats.ingresosEsteMes.toLocaleString('es-AR')}</div>
        </div>
        <div className="ingresos-card">
          <div className="ingresos-label">🆕 Nuevos este mes</div>
          <div className="ingresos-value">{stats.nuevosEsteMes}</div>
        </div>
        <div className={`ingresos-card ${stats.bajas > 0 ? 'danger' : ''}`}>
          <div className="ingresos-label">📉 Bajas (vencidos)</div>
          <div className="ingresos-value" style={{ color: stats.bajas > 0 ? '#c62828' : '#6C4DFF' }}>{stats.bajas}</div>
        </div>
      </div>

      <div className="admin-search">
        <input
          type="text"
          placeholder="🔍 Buscar coach por nombre o email..."
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
              <th>Valor</th>
              <th>Inicio</th>
              <th>Vencimiento</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((coach) => {
              const planConfig = PLAN_CONFIG[coach.plan] || PLAN_CONFIG.basico;
              const result = getDiasRestantes(coach.fecha_creacion);
              const rowClass = result
                ? result.diasRestantes < 0
                  ? 'row-vencido'
                  : result.diasRestantes <= 3
                  ? 'row-por-vencer'
                  : ''
                : '';

              return (
                <tr key={coach.id} className={rowClass}>
                  <td className="td-nombre">{coach.nombre}</td>
                  <td className="td-email">{coach.email}</td>
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
                  <td className="td-valor">
                    {coach.valor_plan ? `$${Number(coach.valor_plan).toLocaleString('es-AR')}` : <span style={{color:'#bbb'}}>—</span>}
                  </td>
                  <td className="td-fecha">
                    {coach.fecha_creacion
                      ? new Date(coach.fecha_creacion).toLocaleDateString('es-AR')
                      : <span style={{color:'#bbb'}}>—</span>}
                  </td>
                  <td>
                    <VencimientoCell fechaCreacion={coach.fecha_creacion} />
                  </td>
                  <td className="actions">
                    <button
                      onClick={() => {
                        setSelectedCoach(coach);
                        setEditData({ 
                  nombre: coach.nombre, 
                  email: coach.email,
                  fecha_creacion: coach.fecha_creacion ? coach.fecha_creacion.split('T')[0] : '',
                  valor_plan: coach.valor_plan || ''
                });
                        setShowEditModal(true);
                      }}
                      className="btn-small btn-edit"
                    >✏️ Editar</button>
                    <button
                      onClick={() => {
                        setEditCoach(coach);
                        setNewPlan(coach.plan || 'basico');
                        setNewValor(coach.valor_plan || '');
                        setShowPlanModal(true);
                      }}
                      className="btn-small btn-warning"
                    >📋 Plan</button>
                    <button onClick={() => deleteCoach(coach.id)} className="btn-small btn-danger">
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Editar Coach */}
      {showEditModal && selectedCoach && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Editar Coach</h2>
              <button onClick={() => setShowEditModal(false)} className="btn-close">✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label>Nombre</label>
                <input type="text" value={editData.nombre}
                  onChange={(e) => setEditData({...editData, nombre: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={editData.email}
                  onChange={(e) => setEditData({...editData, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label>💰 Valor del plan ($)</label>
                <input type="number" placeholder="Ej: 5000" value={editData.valor_plan}
                  onChange={(e) => setEditData({...editData, valor_plan: e.target.value})} />
              </div>
              <div className="form-group">
                <label>📅 Fecha de inicio</label>
                <input type="date" value={editData.fecha_creacion}
                  onChange={(e) => setEditData({...editData, fecha_creacion: e.target.value})} />
              </div>
              {editData.fecha_creacion && (
                <div className="vencimiento-preview">
                  <span>📆 Vencimiento calculado: </span>
                  <strong>
                    {(() => {
                      const d = new Date(editData.fecha_creacion);
                      d.setDate(d.getDate() + 30);
                      return d.toLocaleDateString('es-AR');
                    })()}
                  </strong>
                  <span style={{color:'#999', fontSize:'11px'}}> (inicio + 30 días)</span>
                </div>
              )}
              <p style={{ fontSize: '12px', color: '#999', marginTop: '0.75rem' }}>
                * Para cambiar el plan o el valor, usá el botón "Plan"
              </p>
            </div>
            <div className="modal-actions" style={{ padding: '0 1.5rem 1.5rem' }}>
              <button onClick={() => setShowEditModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={() => updateCoach(selectedCoach.id, editData.nombre, editData.email, editData.fecha_creacion, editData.valor_plan)} className="btn-primary" style={{ width: 'auto' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ver alumnos */}
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

      {/* Modal: Cambiar Plan + Valor */}
      {showPlanModal && editCoach && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Plan de {editCoach.nombre}</h2>
              <button onClick={() => setShowPlanModal(false)} className="btn-close">✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
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
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>💰 Valor del plan ($)</label>
                <input
                  type="number"
                  placeholder="Ej: 5000"
                  value={newValor}
                  onChange={(e) => setNewValor(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div className="modal-actions" style={{ padding: '0 1.5rem 1.5rem' }}>
              <button onClick={() => setShowPlanModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={() => updatePlan(editCoach.id, newPlan, newValor)} className="btn-primary" style={{ width: 'auto' }}>Actualizar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear Coach */}
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
                <input type="text" placeholder="Ej: Juan Pérez" value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="coach@email.com" value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input type="text" placeholder="Ej: Compra123456" value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Plan</label>
                <select value={formData.plan} onChange={(e) => setFormData({...formData, plan: e.target.value})}
                  style={{ width: '100%', padding: '0.8rem', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
                  <option value="basico">Básico (20 alumnos)</option>
                  <option value="medio">Medio (50 alumnos)</option>
                  <option value="pro">Pro (100 alumnos)</option>
                </select>
              </div>
              <div className="form-group">
                <label>💰 Valor del plan ($)</label>
                <input type="number" placeholder="Ej: 5000" value={formData.valor_plan}
                  onChange={(e) => setFormData({...formData, valor_plan: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Crear Coach</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
