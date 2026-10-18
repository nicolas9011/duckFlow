document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-archivar-5s').addEventListener('click', () => {
    const checks = document.querySelectorAll('#lista-terminadas-5s input:checked');
    checks.forEach(c => c.closest('.sem-item').remove());
    document.getElementById('count-seleccionadas-5s').textContent = '0 seleccionadas';
  });

  document.querySelectorAll('.move-next-week').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.textContent = '✓ Reprogramada';
      btn.disabled = true;
    });
  });

  document.getElementById('btn-finalizar-5s').addEventListener('click', () => {
    alert('¡Tu semana quedó organizada! Regresando a Mis tareas.');
    window.mostrarVista('mis-tareas');
  });
});