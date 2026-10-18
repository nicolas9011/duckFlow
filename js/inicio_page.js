document.addEventListener('DOMContentLoaded', async () => {
  const { data: tareas } = await window._supabase
    .from('tareas')
    .select('*, materias(nombre)')
    .eq('archivada', false);

  if (tareas && tareas.length > 0) {
    const pendientes = tareas.filter(t => t.estado === 'Pendiente').length;
    const principal = tareas.find(t => t.en_enfoque) || tareas[0];
    document.getElementById('inicio-resumen-dia').textContent = `${pendientes} pendientes · 1 entrega cercana · 2 h estimadas para hoy`;
    if (principal) {
      document.getElementById('inicio-tarea-materia').textContent = principal.materias?.nombre || 'Arquitectura de Software';
      document.getElementById('inicio-tarea-desc').textContent = principal.descripcion || principal.titulo;
    }
  }
});