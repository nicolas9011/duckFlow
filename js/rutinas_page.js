document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('rutinas-container');
  const { data: rutinas } = await window._supabase
    .from('rutinas')
    .select('*, materias(nombre), pasos_rutina(*)')
    .order('id', { ascending: true });

  function renderRutinas(lista) {
    container.innerHTML = '';
    (lista || []).forEach(r => {
      const pasos = (r.pasos_rutina || []).sort((a, b) => a.orden - b.orden);
      const h = Math.floor(r.tiempo_total_min / 60);
      const m = r.tiempo_total_min % 60;
      const durTxt = h > 0 ? (m > 0 ? `${h} h ${m} min` : `${h} h`) : `${m} min`;

      const card = document.createElement('article');
      card.className = 'rutina-card';
      card.innerHTML = `
        <div class="rut-head">
          <div><h4>${r.titulo}</h4><small class="subtitle">${r.materias?.nombre || 'General'}</small></div>
          <span>${r.es_favorita ? '☆' : ''} ⋯</span>
        </div>
        <div class="rut-badges">
          <div><span class="priority-badge medium">${durTxt}</span> <span class="done-pill">${pasos.length} pasos</span></div>
          <span>${r.etiqueta_uso_ui || ''}</span>
        </div>
        <ul class="rut-Steps">
          ${pasos.map(p => `<li><span>• ${p.titulo}</span><small class="subtitle">${p.tiempo_estimado_min} min</small></li>`).join('')}
        </ul>
        <div class="rut-foot">
          <button class="btn-soft-teal btn-usar-rutina" data-title="${r.titulo}" data-min="${r.tiempo_total_min}">Usar rutina</button>
        </div>
      `;
      container.appendChild(card);
    });

    document.querySelectorAll('.btn-usar-rutina').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('nt-titulo').value = btn.dataset.title;
        document.getElementById('drawer-nueva-tarea').classList.add('open');
      });
    });
  }

  renderRutinas(rutinas);
});