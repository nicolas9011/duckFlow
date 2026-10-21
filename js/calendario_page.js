document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('calendar-grid-container');
  if (!container) return;

  const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MS_DIA = 1000 * 60 * 60 * 24;

  let activeCalFilter = 'mes'; // 'hoy' | 'semana' | 'mes'
  let todasLasTareasCache = [];

  // ---------- Helpers de fecha ----------
  function hoyLocal() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }
  function parseFecha(str) {
    const [a, m, d] = str.split('T')[0].split('-').map(Number);
    return new Date(a, m - 1, d);
  }
  function mismoDia(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function sumarDias(d, n) {
    const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    r.setDate(r.getDate() + n);
    return r;
  }
  function inicioSemana(d) { // lunes
    return sumarDias(d, -((d.getDay() + 6) % 7));
  }
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Fecha de referencia: el día/semana/mes que se está viendo
  let fechaRef = hoyLocal();

  // ---------- Carga de datos ----------
  async function cargarCalendarioCompleto() {
    const { data: { session } } = await window._supabase.auth.getSession();
    if (!session || !session.user) {
      todasLasTareasCache = [];
      aplicarFiltrosYRenderizar();
      return;
    }

    const { data: tareas, error } = await window._supabase
      .from('tareas')
      .select('*, materias(nombre)')
      .eq('usuario_id', session.user.id)
      .eq('archivada', false)
      .not('fecha_limite', 'is', null)
      .order('fecha_limite', { ascending: true });

    if (error) {
      console.error('Error al cargar datos del calendario:', error);
      return;
    }

    todasLasTareasCache = tareas || [];
    aplicarFiltrosYRenderizar();
  }

  // ---------- Lógica principal ----------
  function aplicarFiltrosYRenderizar() {
    const hoy = hoyLocal();
    const lunes = inicioSemana(fechaRef);
    const domingo = sumarDias(lunes, 6);

    const visibles = [];
    let urgentesCount = 0;
    let proximasCount = 0;

    todasLasTareasCache.forEach(t => {
      if (!t.fecha_limite) return;

      const f = parseFecha(t.fecha_limite);
      const diffDias = Math.round((f - hoy) / MS_DIA);

      let cumple;
      if (activeCalFilter === 'hoy') {
        cumple = mismoDia(f, fechaRef);
      } else if (activeCalFilter === 'semana') {
        cumple = f >= lunes && f <= domingo;
      } else {
        cumple = f.getFullYear() === fechaRef.getFullYear() && f.getMonth() === fechaRef.getMonth();
      }
      if (!cumple) return;

      if (t.estado !== 'Hecho') {
        if (diffDias >= 0 && diffDias <= 7) proximasCount++;
        if (t.prioridad === 'Alta' || diffDias === 0) urgentesCount++;
      }

      const nombreMateria = t.materias?.nombre || 'General';
      const horaUi = t.hora_limite_ui ? formatearHora12(t.hora_limite_ui) : '';

      visibles.push({
        fecha: f,
        title: t.titulo,
        sub: horaUi ? `${nombreMateria} · ${horaUi}` : nombreMateria,
        hora: horaUi,
        warn: t.prioridad === 'Alta'
      });
    });

    actualizarTitulo();

    if (activeCalFilter === 'hoy') renderizarDia(visibles);
    else if (activeCalFilter === 'semana') renderizarSemana(visibles, lunes);
    else renderizarMes(visibles);

    renderizarProximamente(todasLasTareasCache);
    actualizarContadorResumen(visibles.length, proximasCount, urgentesCount);
  }

  function formatearHora12(hora24) {
    if (!hora24) return '';
    const [hh, mm] = hora24.split(':').map(Number);
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const hh12 = hh % 12 || 12;
    return `${hh12}:${mm.toString().padStart(2, '0')} ${ampm}`;
  }

  // ---------- Título según la vista ----------
  function actualizarTitulo() {
    const el = document.getElementById('cal-month-title');
    if (!el) return;

    if (activeCalFilter === 'mes') {
      el.textContent = `${MESES_LARGO[fechaRef.getMonth()]} ${fechaRef.getFullYear()}`;
    } else if (activeCalFilter === 'semana') {
      const l = inicioSemana(fechaRef);
      const d = sumarDias(l, 6);
      el.textContent = l.getMonth() === d.getMonth()
        ? `${l.getDate()} – ${d.getDate()} ${MESES_CORTO[d.getMonth()]} ${d.getFullYear()}`
        : `${l.getDate()} ${MESES_CORTO[l.getMonth()]} – ${d.getDate()} ${MESES_CORTO[d.getMonth()]} ${d.getFullYear()}`;
    } else {
      el.textContent = `${DIAS_LARGO[fechaRef.getDay()]} ${fechaRef.getDate()} ${MESES_CORTO[fechaRef.getMonth()]} ${fechaRef.getFullYear()}`;
    }
  }

  // ---------- Vistas ----------
  const HTML_DIAS_SEMANA = `<div class="cal-weekdays"><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div></div>`;

  function htmlEventos(evs) {
    return evs.map(e => `<div class="cal-ev ${e.warn ? 'warn' : ''}">${escapeHtml(e.title)}<small>${escapeHtml(e.sub)}</small></div>`).join('');
  }

  // Vista MES
  function renderizarMes(visibles) {
    const anio = fechaRef.getFullYear();
    const mes = fechaRef.getMonth();
    const hoy = hoyLocal();

    const offset = (new Date(anio, mes, 1).getDay() + 6) % 7;
    const diasMes = new Date(anio, mes + 1, 0).getDate();
    const diasMesPrev = new Date(anio, mes, 0).getDate();

    let html = HTML_DIAS_SEMANA + `<div class="cal-days-grid">`;

    for (let i = 0; i < offset; i++) {
      html += `<div class="cal-cell muted">${diasMesPrev - offset + 1 + i}</div>`;
    }

    for (let d = 1; d <= diasMes; d++) {
      const dia = new Date(anio, mes, d);
      const evs = visibles.filter(v => mismoDia(v.fecha, dia));
      html += `<div class="cal-cell">
        <span class="cal-day-badge ${mismoDia(dia, hoy) ? 'today' : ''}">${d}</span>
        ${htmlEventos(evs)}
      </div>`;
    }

    const resto = (7 - ((offset + diasMes) % 7)) % 7;
    for (let d = 1; d <= resto; d++) {
      html += `<div class="cal-cell muted">${d}</div>`;
    }

    container.innerHTML = html + `</div>`;
  }

  // Vista SEMANA (lunes a domingo)
  function renderizarSemana(visibles, lunes) {
    const hoy = hoyLocal();
    let html = HTML_DIAS_SEMANA + `<div class="cal-days-grid">`;

    for (let i = 0; i < 7; i++) {
      const dia = sumarDias(lunes, i);
      const evs = visibles.filter(v => mismoDia(v.fecha, dia));
      html += `<div class="cal-cell">
        <span class="cal-day-badge ${mismoDia(dia, hoy) ? 'today' : ''}">${dia.getDate()}</span>
        ${htmlEventos(evs)}
      </div>`;
    }

    container.innerHTML = html + `</div>`;
  }

  // Vista HOY (lista del día)
  function renderizarDia(visibles) {
    if (visibles.length === 0) {
      container.innerHTML = `<div style="padding:28px 20px;text-align:center;">
        <p class="subtitle">No tienes actividades para este día.</p>
      </div>`;
      return;
    }

    container.innerHTML = `<div style="padding:16px;display:flex;flex-direction:column;gap:10px;">
      ${visibles.map(v => `
        <div class="upcoming-card ${v.warn ? 'urgent' : ''}">
          <div class="up-top">
            <span class="up-day ${v.warn ? 'orange' : 'teal'}">${v.warn ? 'Urgente' : 'Pendiente'}</span>
            <span>${escapeHtml(v.hora)}</span>
          </div>
          <h5>${escapeHtml(v.title)}</h5>
          <p class="up-rem">${escapeHtml(v.sub)}</p>
        </div>`).join('')}
    </div>`;
  }

  // ---------- Panel "Próximamente" ----------
  function renderizarProximamente(tareas) {
    const panel = document.querySelector('.cal-upcoming-panel');
    if (!panel) return;

    const pendientes = tareas.filter(t => t.estado !== 'Hecho').slice(0, 4);
    const hoy = hoyLocal();

    let html = `
      <h4>Próximamente</h4>
      <p class="subtitle" style="margin-bottom:14px;">Lo más cercano de tu semana</p>
    `;

    if (pendientes.length === 0) {
      html += `<p class="subtitle" style="font-size:12px;">No tienes tareas próximas pendientes.</p>`;
    } else {
      pendientes.forEach(t => {
        const esUrgente = t.prioridad === 'Alta';
        let etiquetaDia = 'Pronto';

        if (t.fecha_limite) {
          const f = parseFecha(t.fecha_limite);
          const diff = Math.round((f - hoy) / MS_DIA);

          if (diff === 0) etiquetaDia = 'Hoy';
          else if (diff === 1) etiquetaDia = 'Mañana';
          else if (diff === -1) etiquetaDia = 'Ayer';
          else if (diff > 1 && diff < 7) etiquetaDia = DIAS_LARGO[f.getDay()];
          else etiquetaDia = `${f.getDate()} ${MESES_CORTO[f.getMonth()]}`;
        }

        const hora = t.hora_limite_ui ? formatearHora12(t.hora_limite_ui) : '';

        html += `
          <div class="upcoming-card ${esUrgente ? 'urgent' : ''}">
            <div class="up-top">
              <span class="up-day ${esUrgente ? 'orange' : 'teal'}">${etiquetaDia}</span>
              <span>${hora}</span>
            </div>
            <h5>${escapeHtml(t.titulo)}</h5>
            ${esUrgente ? '<p class="up-rem">🔔 Alta prioridad</p>' : ''}
          </div>
        `;
      });
    }

    panel.innerHTML = html;
  }

  function actualizarContadorResumen(total, proximas, urgentes) {
    const p = document.getElementById('cal-summary-text');
    if (!p) return;

    const periodo = activeCalFilter === 'hoy'
      ? (mismoDia(fechaRef, hoyLocal()) ? 'para hoy' : 'para este día')
      : (activeCalFilter === 'semana' ? 'en esta semana' : `en ${MESES_LARGO[fechaRef.getMonth()].toLowerCase()}`);

    p.textContent = `${total} actividades ${periodo} · ${proximas} próximas · ${urgentes} urgente${urgentes === 1 ? '' : 's'}`;
  }

  // ---------- Navegación < > Hoy ----------
  function navegar(delta) {
    if (activeCalFilter === 'hoy') {
      fechaRef = sumarDias(fechaRef, delta);
    } else if (activeCalFilter === 'semana') {
      fechaRef = sumarDias(fechaRef, delta * 7);
    } else {
      fechaRef = new Date(fechaRef.getFullYear(), fechaRef.getMonth() + delta, 1);
    }
    aplicarFiltrosYRenderizar();
  }

  document.getElementById('cal-prev-month')?.addEventListener('click', () => navegar(-1));
  document.getElementById('cal-next-month')?.addEventListener('click', () => navegar(1));
  document.getElementById('cal-today-btn')?.addEventListener('click', () => {
    fechaRef = hoyLocal();
    aplicarFiltrosYRenderizar();
  });

  // ---------- Pestañas Hoy / Esta semana / Mes ----------
  const timeTabs = document.querySelectorAll('#cal-time-tabs .filter-tab');

  timeTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      // Evita que otro script global de ".filter-tab" (p. ej. el de Tareas) interfiera
      e.stopPropagation();

      timeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      activeCalFilter = tab.dataset.periodo || 'mes';
      fechaRef = hoyLocal();
      aplicarFiltrosYRenderizar();
    });
  });

  // ---------- Botón nueva actividad ----------
  document.getElementById('btn-nueva-actividad-cal')?.addEventListener('click', () => {
    document.getElementById('drawer-nueva-tarea')?.classList.add('open');
  });

  cargarCalendarioCompleto();
});