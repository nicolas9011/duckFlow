// js/reset-password.js
document.addEventListener('DOMContentLoaded', async () => {
  const LOGIN_URL = 'login.html'; // <- cámbialo si tu página de login se llama distinto

  const form = document.getElementById('reset-form');
  const inputNueva = document.getElementById('new-password');
  const inputConfirmar = document.getElementById('confirm-password');
  const btn = document.getElementById('btn-reset');
  const errorMsg = document.getElementById('reset-error');
  const successMsg = document.getElementById('reset-success');

  let listo = false;

  function habilitarFormulario() {
    if (listo) return;
    listo = true;
    inputNueva.disabled = false;
    inputConfirmar.disabled = false;
    btn.disabled = false;
    btn.textContent = 'Guardar contraseña';
    errorMsg.textContent = '';
    inputNueva.focus();
  }

  function mostrarEnlaceInvalido() {
    if (listo) return;
    btn.textContent = 'Enlace no válido';
    errorMsg.textContent = 'El enlace expiró o ya fue usado. Vuelve a iniciar sesión y solicita uno nuevo desde "¿Olvidaste tu contraseña?".';
  }

  // Si el enlace venía con error (expirado, usado, etc.) Supabase lo manda en el hash
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (hashParams.get('error')) {
    mostrarEnlaceInvalido();
    return;
  }

  // Supabase procesa el enlace y dispara este evento cuando es válido
  window._supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') habilitarFormulario();
  });

  // Por si el evento ya ocurrió antes de registrar el listener
  const { data: { session } } = await window._supabase.auth.getSession();
  if (session) habilitarFormulario();

  // Si en unos segundos no hay sesión de recuperación, el enlace no sirve
  setTimeout(mostrarEnlaceInvalido, 4000);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';
    successMsg.textContent = '';

    const nueva = inputNueva.value;
    const confirmar = inputConfirmar.value;

    if (nueva.length < 6) {
      errorMsg.textContent = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }
    if (nueva !== confirmar) {
      errorMsg.textContent = 'Las contraseñas no coinciden.';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      const { error } = await window._supabase.auth.updateUser({ password: nueva });
      if (error) throw error;

      successMsg.textContent = '¡Listo! Tu contraseña fue actualizada. Te llevamos al inicio de sesión...';
      btn.textContent = 'Contraseña actualizada';

      // Cerrar la sesión temporal de recuperación y mandar al login
      await window._supabase.auth.signOut();
      localStorage.removeItem('duckflow_user');
      setTimeout(() => { window.location.href = LOGIN_URL; }, 2000);

    } catch (err) {
      let msg = err.message || 'No se pudo actualizar la contraseña.';
      if (/same password|different from the old/i.test(msg)) {
        msg = 'La nueva contraseña debe ser distinta a la anterior.';
      }
      errorMsg.textContent = msg;
      btn.disabled = false;
      btn.textContent = 'Guardar contraseña';
    }
  });
});