document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('calendar-grid-container');
  const eventos = {
    1: [{ title: 'Avance proyecto', sub: 'Proyecto · 4:00 PM', warn: false }],
    5: [{ title: 'Práctica investigativa', sub: 'Práctica · 3:00 PM', warn: false }],
    7: [{ title: 'Taller de Señales', sub: '6:00 PM', warn: true, today: true }],
    8: [{ title: 'Quiz Inglés', sub: '10:00 AM', warn: true }],
    9: [{ title: 'Parcial Redes II', sub: '8:00 AM', warn: true }],
    12: [{ title: 'Entrega Base de Datos', sub: '11:59 PM', warn: true }],
    14: [{ title: 'Laboratorio Linux', sub: '2:00 PM', warn: false }],
    16: [{ title: 'Avance proyecto', sub: 'Proyecto · 5:00 PM', warn: false }],
    21: [{ title: 'Quiz Inglés', sub: '9:00 AM', warn: false }],
    23: [{ title: 'Taller de Señales', sub: '6:00 PM', warn: true }],
    27: [{ title: 'Entrega Base de Datos', sub: '11:59 PM', warn: false }],
    29: [{ title: 'Informe de laboratorio', sub: 'Redes II', warn: false }]
  };

  let html = `<div class="cal-weekdays"><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div></div><div class="cal-days-grid">`;
  [28, 29, 30].forEach(d => { html += `<div class="cal-cell muted">${d}</div>`; });

  for (let d = 1; d <= 31; d++) {
    const evs = eventos[d] || [];
    const isToday = d === 7;
    html += `<div class="cal-cell">
      <span class="cal-day-badge ${isToday ? 'today' : ''}">${d}</span>
      ${evs.map(e => `<div class="cal-ev ${e.warn ? 'warn' : ''}">${e.title}<small>${e.sub}</small></div>`).join('')}
    </div>`;
  }
  html += `<div class="cal-cell muted">1</div></div>`;
  container.innerHTML = html;

  document.getElementById('btn-nueva-actividad-cal').addEventListener('click', () => {
    document.getElementById('drawer-nueva-tarea').classList.add('open');
  });
});