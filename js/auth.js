// js/auth.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('auth-form');
  const btnToggleMode = document.getElementById('btn-toggle-mode');
  const btnForgot = document.getElementById('btn-forgot-password');
  const toggleText = document.getElementById('toggle-text');
  const registerFields = document.getElementById('register-fields');
  const btnSubmit = document.getElementById('btn-submit');
  const errorMsg = document.getElementById('auth-error');
  const forgotPasswordContainer = document.getElementById('forgot-password-container');

  const inputNombre = document.getElementById('nombre');
  const inputApellido = document.getElementById('apellido');
  const inputEmail = document.getElementById('email');
  const inputPassword = document.getElementById('password');
  const passwordGroup = inputPassword.closest('.input-group');

  // Mensaje de éxito (se crea solo, no hace falta tocar el HTML)
  let successMsg = document.getElementById('auth-success');
  if (!successMsg) {
    successMsg = document.createElement('div');
    successMsg.id = 'auth-success';
    successMsg.style.cssText = 'color:#0f766e;font-size:13px;margin-bottom:12px;';
    errorMsg.insertAdjacentElement('afterend', successMsg);
  }

  // 'login' | 'register' | 'recover'
  let mode = 'login';

  function textoBoton() {
    if (mode === 'register') return 'Crear cuenta';
    if (mode === 'recover') return 'Enviar enlace';
    return 'Iniciar sesión';
  }

  function setMode(newMode) {
    mode = newMode;
    errorMsg.textContent = '';
    successMsg.textContent = '';

    const isLogin = mode === 'login';
    const isRegister = mode === 'register';
    const isRecover = mode === 'recover';

    registerFields.style.display = isRegister ? 'block' : 'none';
    if (passwordGroup) passwordGroup.style.display = isRecover ? 'none' : 'block';
    forgotPasswordContainer.style.display = isLogin ? 'block' : 'none';

    // Un campo oculto con "required" bloquearía el envío del formulario
    inputPassword.required = !isRecover;
    inputNombre.required = isRegister;
    inputApellido.required = isRegister;

    btnSubmit.textContent = textoBoton();

    if (isLogin) {
      toggleText.textContent = '¿No tienes cuenta?';
      btnToggleMode.textContent = 'Regístrate';
    } else if (isRegister) {
      toggleText.textContent = '¿Ya tienes cuenta?';
      btnToggleMode.textContent = 'Inicia sesión';
    } else {
      toggleText.textContent = '¿Recordaste tu contraseña?';
      btnToggleMode.textContent = 'Inicia sesión';
    }
  }

  // Cambiar entre Login y Registro (y volver desde Recuperar)
  btnToggleMode.addEventListener('click', () => {
    setMode(mode === 'login' ? 'register' : 'login');
  });

  // Ir al modo "Olvidé mi contraseña"
  if (btnForgot) {
    btnForgot.addEventListener('click', () => setMode('recover'));
  }

  function traducirError(err) {
    const msg = (err && err.message) || '';
    if (/rate limit/i.test(msg) || err?.status === 429) {
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    }
    if (/invalid login credentials/i.test(msg)) {
      return 'Correo o contraseña incorrectos.';
    }
    return msg || 'Ocurrió un error. Inténtalo de nuevo.';
  }

  // Manejar el envío del formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';
    successMsg.textContent = '';
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Cargando...';

    const email = inputEmail.value.trim();
    const password = inputPassword.value;
    let redirigiendo = false;

    try {
      if (mode === 'login') {
        // --- INICIAR SESIÓN ---
        const { data, error } = await window._supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        localStorage.setItem('duckflow_user', JSON.stringify(data.user));
        redirigiendo = true;
        window.location.href = 'index.html';

      } else if (mode === 'register') {
        // --- REGISTRARSE ---
        const nombre = inputNombre.value;
        const apellido = inputApellido.value;
        const iniciales = nombre.charAt(0).toUpperCase() + apellido.charAt(0).toUpperCase();

        const { data: authData, error: authError } = await window._supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        const { error: dbError } = await window._supabase
          .from('usuarios')
          .insert([{
            id: authData.user.id,
            nombre,
            apellido,
            iniciales,
            email
          }]);
        if (dbError) throw dbError;

        localStorage.setItem('duckflow_user', JSON.stringify(authData.user));
        redirigiendo = true;
        window.location.href = 'index.html';

      } else {
        // --- RECUPERAR CONTRASEÑA ---
        if (!email) throw new Error('Escribe tu correo electrónico.');

        // Página a la que llegará el usuario desde el enlace del correo
        const redirectTo = new URL('reset-password.html', window.location.href).href;

        const { error } = await window._supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;

        // Mensaje genérico: no revela si el correo existe o no
        successMsg.textContent = 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada y la carpeta de spam.';
      }
    } catch (err) {
      errorMsg.textContent = traducirError(err);
    } finally {
      if (!redirigiendo) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = textoBoton();
      }
    }
  });
});