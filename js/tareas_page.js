// js/tareas_page.js
document.addEventListener('DOMContentLoaded', () => {
  let tareasCache = [];
  let materiasCache = [];
  let activeTimeFilter = 'todas';
  let selectedPrio = 'Media';
  let selectedMin = 45;
  let tareaActualDetalle = null;

  // Inicializar fecha por defecto en el input date (hoy)
  const inputFecha = document.getElementById('nt-fecha');
  if (inputFecha) {
    const hoy = new Date().toISOString().split('T')[0];
    inputFecha.value = hoy;
  }

  // 1. Cargar materias y sincronizar los selectores
  async function cargarMaterias() {
    const { data } = await window._supabase
      .from('materias')
      .select('*')
      .eq('es_categoria_general', false)
      .order('nombre', { ascending: true });

    if (data) {
      materiasCache = data;
      actualizarSelectoresMaterias();
    }
  }

  function actualizarSelectoresMaterias() {
    const filterSelect = document.getElementById('subject-filter');
    const formSelect = document.getElementById('nt-materia');
    if (!filterSelect || !formSelect) return;

    const nombresUnicos = [...new Set([
      'Teoría de Señales',
      'Redes II',
      'Base de Datos 2',
      'Práctica Investigativa',
      'Fundamentos de Linux',
      'Arquitectura de Software',
      'Inglés',
      'Cálculo',
      ...materiasCache.map(m => m.nombre)
    ])];

    const valorFiltroActual = filterSelect.value;
    filterSelect.innerHTML = `<option value="todas">Todas las materias</option>` +
      nombresUnicos.map(nom => `<option value="${nom}">${nom}</option>`).join('');
    filterSelect.value = valorFiltroActual || 'todas';

    const valorFormActual = formSelect.value;
    formSelect.innerHTML = nombresUnicos.map(nom => `<option value="${nom}">${nom}</option>`).join('');
    if (valorFormActual && nombresUnicos.includes(valorFormActual)) {
      formSelect.value = valorFormActual;
    }
  }

  // Busca el ID de la materia o la crea en Supabase si no existe
  async function obtenerOCrearMateriaId(nombreMateria, usuarioId) {
    let encontrada = materiasCache.find(
      m => m.nombre.trim().toLowerCase() === nombreMateria.trim().toLowerCase()
    );
    if (encontrada) return encontrada.id;

    const { data: existente } = await window._supabase
      .from('materias')
      .select('*')
      .ilike('nombre', nombreMateria.trim())
      .limit(1)
      .maybeSingle();

    if (existente) {
      materiasCache.push(existente);
      return existente.id;
    }

    const { data: nueva, error } = await window._supabase
      .from('materias')
      .insert([{
        usuario_id: usuarioId,
        nombre: nombreMateria.trim(),
        es_categoria_general: false
      }])
      .select()
      .single();

    if (!error && nueva) {
      materiasCache.push(nueva);
      actualizarSelectoresMaterias();
      return nueva.id;
    }
    return null;
  }

  // 2. Cargar tareas desde Supabase con sus materias y pasos
  async function cargarTareas() {
    await cargarMaterias();
    const { data } = await window._supabase
      .from('tareas')
      .select('*, materias(nombre), pasos_tarea(*)')
      .eq('archivada', false)
      .order('id', { ascending: true });

    if (data) {
      tareasCache = data;
      renderizarKanban();
    }
  }

  function formatearDuracion(min) {
    if (min >= 60) {
      const h = Math.floor(min / 60);
      const m = min % 60;
      return m > 0 ? `${h} h ${m} min` : `${h} h`;
    }
    return `${min} min`;
  }

  // Convierte YYYY-MM-DD y HH:MM en etiqueta amigable (ej. "Hoy · 6:00 PM" o "18 Oct · 6:00 PM")
  function construirEtiquetaFechaHora(fechaISO, hora24) {
    if (!fechaISO) return 'Sin fecha';
    const [anio, mes, dia] = fechaISO.split('-').map(Number);
    const fechaObj = new Date(anio, mes - 1, dia);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const diffDias = Math.round((fechaObj - hoy) / (1000 * 60 * 60 * 24));
    let prefijoFecha = '';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    if (diffDias === 0) prefijoFecha = 'Hoy';
    else if (diffDias === 1) prefijoFecha = 'Mañana';
    else if (diffDias === -1) prefijoFecha = 'Ayer';
    else prefijoFecha = `${dia} ${meses[mes - 1]}`;

    if (!hora24) return prefijoFecha;
    const [hh, mm] = hora24.split(':').map(Number);
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const hh12 = hh % 12 || 12;
    const minStr = mm.toString().padStart(2, '0');
    return `${prefijoFecha} · ${hh12}:${minStr} ${ampm}`;
  }

  // 3. Renderizar Tablero Kanban
  function renderizarKanban() {
    const cols = {
      'Pendiente': document.getElementById('col-pendiente'),
      'En curso': document.getElementById('col-encurso'),
      'Revisar': document.getElementById('col-revisar'),
      'Hecho': document.getElementById('col-hecho')
    };
    Object.values(cols).forEach(c => { if (c) c.innerHTML = ''; });

    const subjFilter = document.getElementById('subject-filter').value.trim().toLowerCase();
    const query = document.getElementById('task-search').value.toLowerCase().trim();

    const filtradas = tareasCache.filter(t => {
      const materiaNombre = (t.materias?.nombre || 'General').trim().toLowerCase();
      const cumpleMateria = subjFilter === 'todas' || materiaNombre === subjFilter;
      const cumpleBusqueda = t.titulo.toLowerCase().includes(query) || materiaNombre.includes(query);
      const etiqueta = (t.etiqueta_fecha_ui || '').toLowerCase();

      const cumpleTiempo = activeTimeFilter === 'todas' ||
        (activeTimeFilter === 'hoy' && etiqueta.includes('hoy')) ||
        (activeTimeFilter === 'semana' && !etiqueta.includes('ayer')) ||
        (activeTimeFilter === 'proximas' && (etiqueta.includes('mañana') || etiqueta.includes('viernes') || etiqueta.includes('oct')));

      return cumpleMateria && cumpleBusqueda && cumpleTiempo;
    });

    const counts = { 'Pendiente': 0, 'En curso': 0, 'Revisar': 0, 'Hecho': 0 };

    filtradas.forEach(t => {
      counts[t.estado] = (counts[t.estado] || 0) + 1;
      const prioClass = t.prioridad === 'Alta' ? 'high' : (t.prioridad === 'Media' ? 'medium' : 'low');
      const materia = t.materias?.nombre || 'General';
      const card = document.createElement('article');
      card.dataset.id = t.id;

      if (t.estado === 'En curso' && t.en_enfoque) {
        card.className = 'task-card active-focus-card';
        card.innerHTML = `
          <span class="focus-pill">En enfoque</span>
          <h5>${t.titulo}</h5>
          <p class="task-subject">${materia}</p>
          <div class="task-meta"><span>${t.etiqueta_fecha_ui || 'Hoy'}</span><span>${formatearDuracion(t.tiempo_estimado_min)}</span></div>
          <span class="priority-badge ${prioClass}">${t.prioridad}</span>
          <div class="progress-block">
            <div class="progress-labels"><span>Avance</span><strong class="teal">${t.avance_porcentaje}%</strong></div>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${t.avance_porcentaje}%"></div></div>
          </div>
          <button class="btn-continue" data-id="${t.id}">Continuar</button>
        `;
      } else {
        card.className = 'task-card';
        card.innerHTML = `
          ${t.estado === 'Hecho' ? '<span class="done-pill">✓ Hecho</span>' : ''}
          <h5>${t.titulo}</h5>
          <p class="task-subject">${materia}</p>
          <div class="task-meta"><span>${t.etiqueta_fecha_ui || 'Esta semana'}</span><span>${formatearDuracion(t.tiempo_estimado_min)}</span></div>
          <span class="priority-badge ${prioClass}">${t.prioridad}</span>
        `;
      }

      // Al hacer clic en cualquier tarjeta, abrir el modal de detalles y control de enfoque
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-continue')) {
          e.stopPropagation();
          abrirModalPDCA(t);
          return;
        }
        abrirModalDetalleTarea(t);
      });

      cols[t.estado]?.appendChild(card);
    });

    document.getElementById('count-pendiente').textContent = counts['Pendiente'];
    document.getElementById('count-encurso').textContent = counts['En curso'];
    document.getElementById('count-revisar').textContent = counts['Revisar'];
    document.getElementById('count-hecho').textContent = counts['Hecho'];

    const total = filtradas.length;
    const enCurso = counts['En curso'];
    const proximas = counts['Pendiente'];
    document.getElementById('kanban-summary-text').textContent = `${total} tareas · ${enCurso} en curso · ${proximas} pendientes`;
  }

  // 4. Abrir Modal de Detalles de Tarea y Controlar el Enfoque (WIP)
  function abrirModalDetalleTarea(tarea) {
    tareaActualDetalle = tarea;
    const materia = tarea.materias?.nombre || 'General';
    const prioClass = tarea.prioridad === 'Alta' ? 'high' : (tarea.prioridad === 'Media' ? 'medium' : 'low');

    document.getElementById('det-estado-badge').textContent = tarea.en_enfoque ? '🎯 En enfoque actual' : tarea.estado;
    document.getElementById('det-titulo').textContent = tarea.titulo;
    document.getElementById('det-materia').textContent = materia;
    document.getElementById('det-fecha').textContent = tarea.etiqueta_fecha_ui || 'Esta semana';
    document.getElementById('det-tiempo').textContent = formatearDuracion(tarea.tiempo_estimado_min);

    const prioEl = document.getElementById('det-prioridad');
    prioEl.textContent = tarea.prioridad;
    prioEl.className = `priority-badge ${prioClass}`;

    // Configurar banner de enfoque
    const focusBox = document.getElementById('det-focus-box');
    const btnFocus = document.getElementById('btn-toggle-focus');
    if (tarea.en_enfoque && tarea.estado === 'En curso') {
      focusBox.classList.add('is-focused');
      document.getElementById('det-focus-title').textContent = 'Esta es tu tarea en enfoque actual';
      document.getElementById('det-focus-desc').textContent = 'Puedes pausar el enfoque si necesitas cambiar de prioridad.';
      btnFocus.textContent = '⏸ Quitar de enfoque';
    } else {
      focusBox.classList.remove('is-focused');
      document.getElementById('det-focus-title').textContent = '¿Vas a trabajar en esta tarea ahora?';
      document.getElementById('det-focus-desc').textContent = 'Al enfocarla pasará a "En curso" y reemplazará el enfoque anterior.';
      btnFocus.textContent = '🎯 Enfocar esta tarea';
    }

    // Configurar slider de avance
    const slider = document.getElementById('det-avance-slider');
    const labelAvance = document.getElementById('det-avance-label');
    slider.value = tarea.avance_porcentaje || 0;
    labelAvance.textContent = `${slider.value}%`;

    // Mostrar pasos de la tarea si tiene
    const pasosList = document.getElementById('det-pasos-list');
    pasosList.innerHTML = '';
    const pasos = (tarea.pasos_tarea || []).sort((a, b) => a.orden - b.orden);
    if (pasos.length === 0) {
      pasosList.innerHTML = `<p class="subtitle" style="font-size:12.5px;">Esta tarea no tiene pasos divididos.</p>`;
    } else {
      pasos.forEach(p => {
        const div = document.createElement('label');
        div.className = 'step-row';
        div.style.cursor = 'pointer';
        div.innerHTML = `
          <input type="checkbox" class="det-step-check" data-step-id="${p.id}" ${p.completada ? 'checked' : ''}>
          <span style="flex:1; ${p.completada ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">${p.titulo}</span>
          <span class="step-min">${p.tiempo_estimado_min} min</span>
        `;
        div.querySelector('.det-step-check').addEventListener('change', async (e) => {
          const checked = e.target.checked;
          await window._supabase.from('pasos_tarea').update({ completada: checked }).eq('id', p.id);
          p.completada = checked;
          const totalPasos = pasos.length;
          const completados = pasos.filter(x => x.completada).length;
          const nuevoPct = Math.round((completados / totalPasos) * 100);
          slider.value = nuevoPct;
          labelAvance.textContent = `${nuevoPct}%`;
          await window._supabase.from('tareas').update({ avance_porcentaje: nuevoPct }).eq('id', tarea.id);
          cargarTareas();
        });
        pasosList.appendChild(div);
      });
    }

    // Marcar chip de estado actual
    document.querySelectorAll('#det-estado-chips .chip').forEach(c => {
      c.classList.toggle('active', c.dataset.estado === tarea.estado);
    });

    document.getElementById('modal-detalle-tarea').classList.add('open');
  }

  // Slider de avance en tiempo real
  document.getElementById('det-avance-slider')?.addEventListener('input', (e) => {
    document.getElementById('det-avance-label').textContent = `${e.target.value}%`;
  });

  // Botón para Enfocar / Quitar enfoque de la tarea seleccionada (Respeta WIP = 1)
  document.getElementById('btn-toggle-focus')?.addEventListener('click', async () => {
    if (!tareaActualDetalle) return;

    const estaEnfocada = tareaActualDetalle.en_enfoque && tareaActualDetalle.estado === 'En curso';

    if (estaEnfocada) {
      // Quitar enfoque y devolver a Pendiente
      await window._supabase
        .from('tareas')
        .update({ en_enfoque: false, estado: 'Pendiente' })
        .eq('id', tareaActualDetalle.id);
    } else {
      // 1. Quitar enfoque a cualquier otra tarea que estuviera en curso
      await window._supabase
        .from('tareas')
        .update({ en_enfoque: false, estado: 'Pendiente' })
        .eq('en_enfoque', true);

      // 2. Poner la tarea elegida por el usuario en enfoque y en la columna "En curso"
      const nuevoAvance = tareaActualDetalle.avance_porcentaje > 0 ? tareaActualDetalle.avance_porcentaje : 15;
      await window._supabase
        .from('tareas')
        .update({
          en_enfoque: true,
          es_tarea_principal_inicio: true,
          estado: 'En curso',
          avance_porcentaje: nuevoAvance
        })
        .eq('id', tareaActualDetalle.id);
    }

    document.getElementById('modal-detalle-tarea').classList.remove('open');
    await cargarTareas();
  });

  // Guardar cambios de estado o porcentaje desde el modal de detalle
  document.getElementById('btn-guardar-detalle')?.addEventListener('click', async () => {
    if (!tareaActualDetalle) return;
    const chipActivo = document.querySelector('#det-estado-chips .chip.active');
    const nuevoEstado = chipActivo ? chipActivo.dataset.estado : tareaActualDetalle.estado;
    const nuevoAvance = parseInt(document.getElementById('det-avance-slider').value, 10);

    if (nuevoEstado === 'En curso') {
      await window._supabase.from('tareas').update({ en_enfoque: false, estado: 'Pendiente' }).eq('en_enfoque', true);
      await window._supabase.from('tareas').update({
        estado: 'En curso',
        en_enfoque: true,
        avance_porcentaje: nuevoAvance
      }).eq('id', tareaActualDetalle.id);
    } else {
      const pctFinal = nuevoEstado === 'Hecho' ? 100 : nuevoAvance;
      await window._supabase.from('tareas').update({
        estado: nuevoEstado,
        en_enfoque: false,
        avance_porcentaje: pctFinal
      }).eq('id', tareaActualDetalle.id);
    }

    document.getElementById('modal-detalle-tarea').classList.remove('open');
    await cargarTareas();

    if (nuevoEstado === 'Hecho') {
      abrirModalPDCA(tareaActualDetalle);
    }
  });

  // Eliminar tarea desde el modal de detalle
  document.getElementById('btn-eliminar-tarea')?.addEventListener('click', async () => {
    if (!tareaActualDetalle) return;
    if (confirm(`¿Eliminar la tarea "${tareaActualDetalle.titulo}"?`)) {
      await window._supabase.from('tareas').delete().eq('id', tareaActualDetalle.id);
      document.getElementById('modal-detalle-tarea').classList.remove('open');
      await cargarTareas();
    }
  });

  function abrirModalPDCA(tarea) {
    document.getElementById('pdca-task-title').textContent = tarea.titulo;
    document.getElementById('pdca-task-subj').textContent = tarea.materias?.nombre || 'General';
    document.getElementById('modal-revision-pdca').classList.add('open');
  }

  // 5. Filtros de tiempo, materia y búsqueda
  document.querySelectorAll('#view-mis-tareas .filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#view-mis-tareas .filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTimeFilter = tab.dataset.filter;
      renderizarKanban();
    });
  });

  document.getElementById('subject-filter').addEventListener('change', renderizarKanban);
  document.getElementById('task-search').addEventListener('input', renderizarKanban);

  // 6. Drawer 03. Nueva Tarea (Pasos eliminables + Materia + Calendario)
  document.getElementById('btn-nueva-tarea').addEventListener('click', () => {
    document.getElementById('drawer-nueva-tarea').classList.add('open');
  });

  // Delegación de eventos para que CUALQUIER botón de basurita (incluso los iniciales) elimine el paso
  document.getElementById('nt-steps-list').addEventListener('click', (e) => {
    const btnTrash = e.target.closest('.del-step');
    if (btnTrash) {
      btnTrash.closest('.step-row').remove();
    }
  });

  // Mostrar / ocultar pasos con el switch
  document.getElementById('nt-toggle-pasos').addEventListener('change', (e) => {
    document.getElementById('nt-steps-container').style.display = e.target.checked ? 'block' : 'none';
  });

  // Agregar nuevo paso
  document.getElementById('btn-add-step').addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'step-row';
    row.innerHTML = `
      <span>::</span>
      <input type="checkbox" class="step-check">
      <input type="text" class="step-title-input" placeholder="Escribe el paso...">
      <input type="number" class="step-min-input" value="15" min="5" max="180"><span>min</span>
      <button type="button" class="del-step" title="Eliminar paso">🗑</button>
    `;
    document.getElementById('nt-steps-list').appendChild(row);
  });

  // Selección de Prioridad y Tiempo estimado
  document.querySelectorAll('#nt-prioridad-group button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#nt-prioridad-group button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPrio = btn.dataset.prio;
    });
  });

  document.querySelectorAll('#nt-tiempo-group button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#nt-tiempo-group button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMin = parseInt(btn.dataset.min, 10);
    });
  });

  // Guardar Nueva Tarea con su Materia real y sus Pasos en Supabase
  document.getElementById('form-nueva-tarea').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('nt-titulo').value.trim();
    const nombreMateria = document.getElementById('nt-materia').value;
    const fechaISO = document.getElementById('nt-fecha').value;
    const hora24 = document.getElementById('nt-hora').value;
    const dividirPasos = document.getElementById('nt-toggle-pasos').checked;

    const { data: u } = await window._supabase.from('usuarios').select('id').limit(1).single();
    if (!u) return;

    // 1. Obtener o crear el ID real de la materia seleccionada
    const materiaId = await obtenerOCrearMateriaId(nombreMateria, u.id);
    const etiquetaUI = construirEtiquetaFechaHora(fechaISO, hora24);
    const fechaTimestamp = fechaISO && hora24 ? `${fechaISO}T${hora24}:00-05:00` : null;

    // 2. Insertar la tarea vinculada a su materia_id
    const { data: nuevaTarea, error } = await window._supabase
      .from('tareas')
      .insert([{
        usuario_id: u.id,
        materia_id: materiaId,
        titulo,
        fecha_limite: fechaTimestamp,
        hora_limite_ui: hora24,
        etiqueta_fecha_ui: etiquetaUI,
        prioridad: selectedPrio,
        estado: 'Pendiente',
        dividir_en_pasos: dividirPasos,
        tiempo_estimado_min: selectedMin
      }])
      .select()
      .single();

    // 3. Si tiene pasos activos, guardarlos en pasos_tarea
    if (!error && nuevaTarea && dividirPasos) {
      const filasPasos = document.querySelectorAll('#nt-steps-list .step-row');
      const pasosInsertar = [];
      filasPasos.forEach((fila, idx) => {
        const txt = fila.querySelector('.step-title-input')?.value.trim();
        const min = parseInt(fila.querySelector('.step-min-input')?.value || '15', 10);
        const chk = fila.querySelector('.step-check')?.checked || false;
        if (txt) {
          pasosInsertar.push({
            tarea_id: nuevaTarea.id,
            orden: idx + 1,
            titulo: txt,
            tiempo_estimado_min: min,
            completada: chk
          });
        }
      });
      if (pasosInsertar.length > 0) {
        await window._supabase.from('pasos_tarea').insert(pasosInsertar);
      }
    }

    document.getElementById('drawer-nueva-tarea').classList.remove('open');
    document.getElementById('nt-titulo').value = '';
    await cargarTareas();
  });

  document.getElementById('btn-guardar-pdca').addEventListener('click', () => {
    document.getElementById('modal-revision-pdca').classList.remove('open');
    alert('Revisión PDCA registrada correctamente en Supabase.');
  });

  cargarTareas();
});