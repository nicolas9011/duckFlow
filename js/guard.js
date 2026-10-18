document.addEventListener('DOMContentLoaded', async () => {
  const rawUser = localStorage.getItem('duckflow_user');
  if (!rawUser) {
    window.location.href = 'login.html';
    return;
  }

  const authUser = JSON.parse(rawUser);
  const { data: perfil } = await window._supabase
    .from('usuarios')
    .select('*')
    .eq('email', authUser.email)
    .maybeSingle();

  const nombre = perfil?.nombre || authUser.email.split('@')[0];
  const iniciales = perfil?.iniciales || nombre.substring(0, 2).toUpperCase();

  document.getElementById('header-greeting').textContent = `Hola, ${nombre}`;
  document.getElementById('sidebar-name').textContent = nombre;
  document.getElementById('sidebar-avatar').textContent = iniciales;
  document.getElementById('header-avatar').textContent = iniciales;

  document.getElementById('btn-logout').addEventListener('click', async () => {
    if (confirm('¿Deseas cerrar sesión?')) {
      await window._supabase.auth.signOut();
      localStorage.removeItem('duckflow_user');
      window.location.href = 'login.html';
    }
  });
});