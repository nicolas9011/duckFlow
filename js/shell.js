window.mostrarVista = function(viewName) {
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.add('active');

  const navLink = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (navLink) navLink.classList.add('active');
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.mostrarVista(link.dataset.view);
    });
  });

  document.getElementById('btn-ir-cierre-semanal')?.addEventListener('click', () => window.mostrarVista('semana'));
  document.getElementById('btn-open-semana')?.addEventListener('click', () => window.mostrarVista('semana'));

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.close).classList.remove('open');
    });
  });

  document.querySelectorAll('.chips-group').forEach(group => {
    group.addEventListener('click', (e) => {
      if (e.target.classList.contains('chip')) {
        group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
      }
    });
  });
});