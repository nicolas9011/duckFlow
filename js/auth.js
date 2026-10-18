// js/auth.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('auth-form');
  const btnToggleMode = document.getElementById('btn-toggle-mode');
  const toggleText = document.getElementById('toggle-text');
  const registerFields = document.getElementById('register-fields');
  const btnSubmit = document.getElementById('btn-submit');
  const errorMsg = document.getElementById('auth-error');

  let isLoginMode = true;

  // Cambiar entre Login y Registro
  btnToggleMode.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    errorMsg.textContent = '';
    
    if (isLoginMode) {
      registerFields.style.display = 'none';
      btnSubmit.textContent = 'Iniciar sesión';
      toggleText.textContent = '¿No tienes cuenta?';
      btnToggleMode.textContent = 'Regístrate';
      document.getElementById('nombre').removeAttribute('required');
      document.getElementById('apellido').removeAttribute('required');
    } else {
      registerFields.style.display = 'block';
      btnSubmit.textContent = 'Crear cuenta';
      toggleText.textContent = '¿Ya tienes cuenta?';
      btnToggleMode.textContent = 'Inicia sesión';
      document.getElementById('nombre').setAttribute('required', 'true');
      document.getElementById('apellido').setAttribute('required', 'true');
    }
  });

  // Manejar el envío del formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Cargando...';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      if (isLoginMode) {
        // --- INICIAR SESIÓN ---
        const { data, error } = await window._supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
        
        // Guardar la sesión y redirigir
        localStorage.setItem('duckflow_user', JSON.stringify(data.user));
        window.location.href = 'index.html';

      } else {
        // --- REGISTRARSE ---
        const nombre = document.getElementById('nombre').value;
        const apellido = document.getElementById('apellido').value;
        const iniciales = nombre.charAt(0).toUpperCase() + apellido.charAt(0).toUpperCase();

        // 1. Crear el usuario en Supabase Auth
        const { data: authData, error: authError } = await window._supabase.auth.signUp({
          email,
          password
        });

        if (authError) throw authError;

        // 2. Insertar en nuestra tabla pública 'usuarios'
        const { error: dbError } = await window._supabase
          .from('usuarios')
          .insert([
            { 
              id: authData.user.id, // Sincroniza el ID de Auth con tu tabla
              nombre: nombre, 
              apellido: apellido, 
              iniciales: iniciales, 
              email: email 
            }
          ]);

        if (dbError) throw dbError;

        localStorage.setItem('duckflow_user', JSON.stringify(authData.user));
        window.location.href = 'index.html';
      }
    } catch (err) {
      errorMsg.textContent = err.message || 'Ocurrió un error. Inténtalo de nuevo.';
      btnSubmit.disabled = false;
      btnSubmit.textContent = isLoginMode ? 'Iniciar sesión' : 'Crear cuenta';
    }
  });
});