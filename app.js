document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const form = document.querySelector("#telebanking-form");
  const usernameInput = document.querySelector("#username");
  const passwordInput = document.querySelector("#password");
  const tokenInput = document.querySelector("#token");
  const togglePasswordBtn = document.querySelector("#toggle-password");
  const toggleTokenBtn = document.querySelector("#toggle-token");
  const rememberCheckbox = document.querySelector("#remember-user");
  const submitBtn = document.querySelector("#submit-btn");

  const langEsp = document.querySelector("#lang-esp");
  const langEng = document.querySelector("#lang-eng");

  const sliderPrev = document.querySelector("#slider-prev");
  const sliderNext = document.querySelector("#slider-next");

  // SVG Icons for Eye toggles
  const eyeOpenSVG = `
    <svg class="eye-icon eye-on" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#ec1c24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  `;

  const eyeClosedSVG = `
    <svg class="eye-icon eye-off" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#757575" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  `;

  // 1. Password & Token visibility toggle
  function setupEyeToggle(button, input) {
    if (!button || !input) return;
    button.addEventListener("click", () => {
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      button.innerHTML = isPassword ? eyeOpenSVG : eyeClosedSVG;
      button.setAttribute("aria-label", isPassword ? "Ocultar dato" : "Mostrar dato");
    });
  }

  setupEyeToggle(togglePasswordBtn, passwordInput);
  setupEyeToggle(toggleTokenBtn, tokenInput);

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
      submitBtn.classList.add("ready");
    } else {
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

  // 5. Slider Controls Interaction
  if (sliderPrev && sliderNext) {
    sliderPrev.addEventListener("click", () => {
      const badge = document.querySelector(".badge-core");
      if (badge) {
        badge.style.transform = "scale(0.9)";
        setTimeout(() => badge.style.transform = "scale(1)", 200);
      }
    });

    sliderNext.addEventListener("click", () => {
      const badge = document.querySelector(".badge-core");
      if (badge) {
        badge.style.transform = "scale(1.1)";
        setTimeout(() => badge.style.transform = "scale(1)", 200);
      }
    });
  }

  // 6. Form Submission Handle
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const uVal = usernameInput.value.trim();
      if (rememberCheckbox && rememberCheckbox.checked) {
        localStorage.setItem("scotia_telebanking_username", uVal);
      } else {
        localStorage.removeItem("scotia_telebanking_username");
      }

      submitBtn.textContent = "Ingresando...";
      submitBtn.disabled = true;

      setTimeout(() => {
        alert(`Sesión de Telebanking iniciada para: ${uVal}`);
        submitBtn.textContent = "Ingresar";
        submitBtn.disabled = false;
      }, 1000);
    });
  }
});
