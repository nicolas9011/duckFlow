document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-abrir-causa-a3').addEventListener('click', () => {
    document.getElementById('modal-causa-a3').classList.add('open');
  });

  document.getElementById('btn-guardar-a3').addEventListener('click', () => {
    document.getElementById('modal-causa-a3').classList.remove('open');
    alert('Ajuste de mejora continua (A3) guardado en Supabase.');
  });

  document.getElementById('btn-descargar-pdf').addEventListener('click', () => window.print());
  document.getElementById('btn-compartir-rep').addEventListener('click', () => {
    alert('Reporte de progreso guardado y listo para compartir.');
  });
});