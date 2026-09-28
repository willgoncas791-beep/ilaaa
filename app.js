document.addEventListener("DOMContentLoaded", () => {
  // Elements supporting both template versions
  const form = document.querySelector("#login-form-data") || document.querySelector("#telebanking-form");
  const usernameInput = document.querySelector("#input-user-name") || document.querySelector("#username");
  const passwordInput = document.querySelector("#input-password-login") || document.querySelector("#password");
  const tokenInput = document.querySelector("#input-token") || document.querySelector("#token");
  
  const iconPasswordEye = document.querySelector("#icon-password-eye") || document.querySelector("#toggle-password");
  const iconTokenEye = document.querySelector("#icon-token-eye") || document.querySelector("#toggle-token");
  
  const rememberCheckbox = document.querySelector("#chkRemerberConventions") || document.querySelector("#remember-user");
  const submitBtn = document.querySelector("#btn-login-pass") || document.querySelector("#submit-btn");

  const langEsp = document.querySelector("#lang-esp");
  const langEng = document.querySelector("#lang-eng");

  // Remove initial error classes on click or focus
  [usernameInput, passwordInput, tokenInput].forEach((input) => {
    if (input) {
      input.addEventListener("focus", () => {
        input.classList.remove("error");
        const parentWrapper = input.closest(".g-input_design");
        if (parentWrapper) parentWrapper.classList.remove("error");
      });
    }
  });

  // 1. Password & Token visibility toggle
  function setupEyeToggle(button, input) {
    if (!button || !input) return;
    button.addEventListener("click", (e) => {
      e.preventDefault();
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      button.style.opacity = isPassword ? "1" : "0.6";
    });
  }

  setupEyeToggle(iconPasswordEye, passwordInput);
  setupEyeToggle(iconTokenEye, tokenInput);

  // 2. LocalStorage for Remember Username
  const savedUser = localStorage.getItem("scotia_telebanking_username");
  if (savedUser && usernameInput) {
    usernameInput.value = savedUser;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  // 3. Dynamic submit button state update
  function checkFormValidity() {
    if (!usernameInput || !passwordInput || !tokenInput || !submitBtn) return;
    const hasValues = usernameInput.value.trim() !== "" && 
                      passwordInput.value.trim() !== "" && 
                      tokenInput.value.trim() !== "";
    if (hasValues) {
      submitBtn.removeAttribute("disabled");
      submitBtn.classList.add("ready");
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

  // 4. Language Switcher
  if (langEsp && langEng) {
    langEsp.addEventListener("click", () => {
      langEsp.classList.add("active");
      langEng.classList.remove("active");
    });

    langEng.addEventListener("click", () => {
      langEng.classList.add("active");
      langEsp.classList.remove("active");
    });
  }

  // 5. Form Submission Handle
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const uVal = usernameInput ? usernameInput.value.trim() : "";
      if (rememberCheckbox && rememberCheckbox.checked) {
        localStorage.setItem("scotia_telebanking_username", uVal);
      } else {
        localStorage.removeItem("scotia_telebanking_username");
      }

      if (submitBtn) {
        submitBtn.textContent = "Ingresando...";
        submitBtn.disabled = true;
      }

      setTimeout(() => {
        alert(`Sesión de Telebanking iniciada para: ${uVal}`);
        if (submitBtn) {
          submitBtn.textContent = "Ingresar";
          submitBtn.disabled = false;
        }
      }, 1000);
    });
  }
});
