
const STORAGE_KEY   = 'votacion_2026_voto';
const STORAGE_VOTOS = 'votacion_2026_conteo';

const CANDIDATOS = {
  1: 'César Acuña',
  2: 'Keiko Fujimori',
  3: 'Pedro Castillo'
};

let candidatoSeleccionado = null;

// ---------- Inicialización ----------
document.addEventListener('DOMContentLoaded', () => {
  cargarConteo();
  actualizarResultados();
  verificarVotoPrevio();
});

// ---------- Obtener / guardar conteo ----------
function obtenerConteo() {
  const data = localStorage.getItem(STORAGE_VOTOS);
  return data ? JSON.parse(data) : { 1: 0, 2: 0, 3: 0 };
}

function guardarConteo(conteo) {
  localStorage.setItem(STORAGE_VOTOS, JSON.stringify(conteo));
}

function cargarConteo() {
  // Si no hay datos guardados, inicializar con 0
  if (!localStorage.getItem(STORAGE_VOTOS)) {
    guardarConteo({ 1: 0, 2: 0, 3: 0 });
  }
}

// ---------- Verificar si ya votó ----------
function verificarVotoPrevio() {
  const yaVoto = localStorage.getItem(STORAGE_KEY);

  if (yaVoto) {
    mostrarAlerta('alerta-ya-voto', true);
    inhabilitarBotones();
  }
}

// ---------- Seleccionar candidato ----------
function seleccionarCandidato(id) {
  // Si ya votó, no hacer nada
  if (localStorage.getItem(STORAGE_KEY)) return;

  candidatoSeleccionado = id;

  // Actualizar visualización de tarjetas
  document.querySelectorAll('.tarjeta-candidato').forEach(tarjeta => {
    const tid = parseInt(tarjeta.dataset.candidato);
    const badge = tarjeta.querySelector('.seleccionado-badge');
    const btn   = tarjeta.querySelector('.btn-votar');

    if (tid === id) {
      tarjeta.classList.add('seleccionada');
      badge.classList.remove('hidden');
      btn.style.background = '#d4a017';
    } else {
      tarjeta.classList.remove('seleccionada');
      badge.classList.add('hidden');
      btn.style.background = '';
    }
  });

  // Mostrar modal de confirmación
  abrirModal(id);
}

// ---------- Modal ----------
function abrirModal(id) {
  document.getElementById('modal-candidato-nombre').textContent = CANDIDATOS[id];
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function cerrarModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';

  // Deseleccionar tarjetas
  document.querySelectorAll('.tarjeta-candidato').forEach(t => {
    t.classList.remove('seleccionada');
    t.querySelector('.seleccionado-badge').classList.add('hidden');
    t.querySelector('.btn-votar').style.background = '';
  });

  candidatoSeleccionado = null;
}

// ---------- Ejecutar voto (desde modal) ----------
function ejecutarVoto() {
  if (!candidatoSeleccionado) return;

  // Cerrar modal
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';

  // Registrar voto en localStorage
  const conteo = obtenerConteo();
  conteo[candidatoSeleccionado]++;
  guardarConteo(conteo);
  localStorage.setItem(STORAGE_KEY, candidatoSeleccionado);

  // Actualizar UI
  actualizarResultados(candidatoSeleccionado);
  mostrarAlerta('alerta-exito', true);
  inhabilitarBotones();

  // Marcar la tarjeta del candidato elegido como seleccionada permanentemente
  document.querySelectorAll('.tarjeta-candidato').forEach(tarjeta => {
    const tid = parseInt(tarjeta.dataset.candidato);
    if (tid === candidatoSeleccionado) {
      tarjeta.classList.add('seleccionada');
      tarjeta.querySelector('.seleccionado-badge').classList.remove('hidden');
    }
  });

  // Hacer scroll a resultados
  setTimeout(() => {
    document.getElementById('resultados').scrollIntoView({ behavior: 'smooth' });
  }, 800);
}

// ---------- Cancelar voto (área confirmar) ----------
function cancelarVoto() {
  document.getElementById('area-confirmar').classList.add('hidden');
  document.querySelectorAll('.tarjeta-candidato').forEach(t => {
    t.classList.remove('seleccionada');
    t.querySelector('.seleccionado-badge').classList.add('hidden');
    t.querySelector('.btn-votar').style.background = '';
  });
  candidatoSeleccionado = null;
}

// ---------- Confirmar voto (área bajo tarjetas) ----------
function confirmarVoto() {
  ejecutarVoto();
  document.getElementById('area-confirmar').classList.add('hidden');
}

// ---------- Actualizar resultados + ruedas ----------
function actualizarResultados(candidatoVotadoId) {
  const CIRCUNFERENCIA = 282.74; // 2 * π * 45
  const conteo = obtenerConteo();
  const total  = conteo[1] + conteo[2] + conteo[3];

  // Actualizar contador del header
  const contadorEl = document.querySelector('#contador-votos strong');
  if (contadorEl) contadorEl.textContent = total;

  // Actualizar cada candidato
  [1, 2, 3].forEach(id => {
    const votos = conteo[id];
    const pct   = total > 0 ? Math.round((votos / total) * 100) : 0;

    // --- Barra horizontal en sección de resultados ---
    document.getElementById(`votos-${id}`).textContent = votos;
    document.getElementById(`pct-${id}`).textContent   = `${pct}%`;

    const barra = document.getElementById(`barra-${id}`);
    setTimeout(() => { barra.style.width = `${pct}%`; }, 100);

    // --- Rueda SVG en tarjeta de candidato ---
    const ring    = document.getElementById(`ring-${id}`);
    const ringPct = document.getElementById(`ring-pct-${id}`);

    if (ring && ringPct) {
      const offset = CIRCUNFERENCIA - (pct / 100) * CIRCUNFERENCIA;

      // Animar el arco
      setTimeout(() => {
        ring.style.strokeDashoffset = offset;
      }, 120);

      // Actualizar texto
      animarNumero(ringPct, pct, '%');

      // Pulso visual en el candidato que acaba de recibir el voto
      if (id === candidatoVotadoId) {
        const svg = ring.closest('.rueda-svg');
        if (svg) {
          svg.classList.remove('pulso');
          void svg.offsetWidth; // forzar reflow para reiniciar animación
          svg.classList.add('pulso');
          setTimeout(() => svg.classList.remove('pulso'), 550);
        }
      }
    }
  });

  // Mostrar ganador provisional
  if (total > 0) {
    const ganadorId = Object.keys(conteo).reduce((a, b) =>
      conteo[a] > conteo[b] ? a : b
    );
    const hayEmpate = Object.values(conteo).filter(v => v === conteo[ganadorId]).length > 1;

    const ganadorArea   = document.getElementById('ganador-area');
    const ganadorNombre = document.getElementById('ganador-nombre');

    ganadorArea.classList.remove('hidden');
    ganadorNombre.textContent = hayEmpate ? 'Empate técnico' : CANDIDATOS[ganadorId];
  }
}

// ---------- Animación de número contando ----------
function animarNumero(el, valorFinal, sufijo = '') {
  const inicio  = parseInt(el.textContent) || 0;
  const dur     = 600; // ms
  const pasos   = 30;
  const diff    = valorFinal - inicio;
  if (diff === 0) { el.textContent = valorFinal + sufijo; return; }

  let paso = 0;
  const timer = setInterval(() => {
    paso++;
    const progreso = paso / pasos;
    // Easing ease-out
    const eased = 1 - Math.pow(1 - progreso, 3);
    const actual = Math.round(inicio + diff * eased);
    el.textContent = actual + sufijo;
    if (paso >= pasos) {
      clearInterval(timer);
      el.textContent = valorFinal + sufijo;
    }
  }, dur / pasos);
}

// ---------- Inhabilitar botones tras votar ----------
function inhabilitarBotones() {
  document.querySelectorAll('.tarjeta-candidato').forEach(tarjeta => {
    const votoRegistrado = localStorage.getItem(STORAGE_KEY);
    const tid = parseInt(tarjeta.dataset.candidato);

    if (parseInt(votoRegistrado) !== tid) {
      tarjeta.classList.add('inhabilitada');
    }

    const btn = tarjeta.querySelector('.btn-votar');
    btn.disabled = true;
    btn.textContent = '✓ Voto emitido';
  });
}

// ---------- Mostrar/ocultar alertas ----------
function mostrarAlerta(id, mostrar) {
  const el = document.getElementById(id);
  if (mostrar) {
    el.classList.remove('hidden');
    // Auto-ocultar alerta de éxito tras 5 s
    if (id === 'alerta-exito') {
      setTimeout(() => el.classList.add('hidden'), 5000);
    }
  } else {
    el.classList.add('hidden');
  }
}

// ---------- Reiniciar (Admin) ----------
function reiniciarVotos() {
  const clave = prompt('Ingresá la clave de administrador:');
  if (clave === 'admin2026') {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_VOTOS);
    cargarConteo();
    actualizarResultados();

    // Restaurar UI
    document.querySelectorAll('.tarjeta-candidato').forEach(t => {
      t.classList.remove('inhabilitada', 'seleccionada');
      t.querySelector('.seleccionado-badge').classList.add('hidden');
      const btn = t.querySelector('.btn-votar');
      btn.disabled = false;
      btn.innerHTML = '<span class="btn-icono">🚫</span> Votar por este candidato';
      btn.style.background = '';
    });

    mostrarAlerta('alerta-ya-voto', false);
    mostrarAlerta('alerta-exito', false);
    document.getElementById('ganador-area').classList.add('hidden');
    document.querySelector('#contador-votos strong').textContent = '0';

    // Reiniciar ruedas SVG
    [1, 2, 3].forEach(id => {
      const ring = document.getElementById(`ring-${id}`);
      const pctEl = document.getElementById(`ring-pct-${id}`);
      if (ring)  ring.style.strokeDashoffset = '282.74';
      if (pctEl) pctEl.textContent = '0%';
    });

    alert('✓ Conteo reiniciado correctamente.');
  } else if (clave !== null) {
    alert('Clave incorrecta.');
  }
}

// ---------- Cerrar modal con Escape ----------
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    cerrarModal();
  }
});

// ---------- Cerrar modal al hacer clic fuera ----------
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) {
    cerrarModal();
  }
});

