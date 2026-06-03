// Variables globales
let fechaActual = '';
let partidosActuales = [];

// Configurar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    cargarPartidos();
});

// Eliminar el selector de fecha manual - ya no es necesario
// Ya no hay event listener para cargarPartidosBtn porque la fecha viene del JSON

async function cargarPartidos() {
    const listaContainer = document.getElementById('listaContainer');
    const fechaElement = document.getElementById('fechaPartidos');
    
    listaContainer.innerHTML = '<div class="loading">🔄 Cargando partidos...</div>';
    
    try {
        const response = await fetch('/api/games');
        const data = await response.json();
        
        if (data.partidos && data.partidos.length > 0) {
            fechaActual = data.fecha;
            partidosActuales = data.partidos;
            
            // Actualizar la fecha mostrada
            if (fechaElement) {
                const fechaFormateada = formatearFecha(fechaActual);
                fechaElement.textContent = fechaFormateada;
            }
            
            mostrarPartidos(data.partidos);
        } else {
            listaContainer.innerHTML = `
                <div class="no-games">
                    📭 No hay partidos cargados<br><br>
                    <small>El archivo <strong>data/games.json</strong> está vacío o no existe.</small>
                </div>
            `;
            if (fechaElement) fechaElement.textContent = 'No disponible';
        }
    } catch (error) {
        console.error('Error:', error);
        listaContainer.innerHTML = '<div class="error">❌ Error al cargar los partidos. Verifica que el servidor esté funcionando.</div>';
        if (fechaElement) fechaElement.textContent = 'Error';
    }
}

// Función para formatear fecha de YYYY-MM-DD a DD/MM/YYYY
function formatearFecha(fechaISO) {
    if (!fechaISO) return 'No disponible';
    const partes = fechaISO.split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fechaISO;
}

function mostrarPartidos(partidos) {
    const listaContainer = document.getElementById('listaContainer');
    
    if (partidos.length === 0) {
        listaContainer.innerHTML = '<div class="no-games">No hay partidos para esta fecha</div>';
        return;
    }
    
    let html = `<div class="partidos-grid">`;
    
    partidos.forEach((partido, index) => {
        // Obtener nombre corto del equipo
        const equipoANombre = partido.equipoA.split(' ').pop() || partido.equipoA;
        const equipoBNombre = partido.equipoB.split(' ').pop() || partido.equipoB;
        
        // Determinar el tipo de caso (Caso A o Caso B)
        let tipoCaso = '';
        if (partido.manoA !== partido.manoB) {
            tipoCaso = '<span class="caso-a">🎯 Caso A: Diferente mano</span>';
        } else {
            tipoCaso = '<span class="caso-b">📊 Caso B: Misma mano - Reverse Split?</span>';
        }
        
        html += `
            <div class="partido-card" data-index="${index}">
                <div class="partido-header">
                    ${tipoCaso}
                </div>
                <div class="partido-equipos">
                    🏆 <strong>${partido.equipoA}</strong> vs <strong>${partido.equipoB}</strong>
                </div>
                <div class="partido-abridores">
                    🧢 ${partido.abridorA} (${partido.manoA}) vs ${partido.abridorB} (${partido.manoB})
                </div>
                <div class="partido-stats">
                    📊 <strong>${equipoANombre}</strong> vs ${partido.manoB}: ${partido.wrcEquipoA_vs_SPB} wRC+ &nbsp;|&nbsp;
                    <strong>${equipoBNombre}</strong> vs ${partido.manoA}: ${partido.wrcEquipoB_vs_SPA} wRC+
                </div>
                <div class="partido-calidad">
                    ⭐ ${partido.equipoA.split(' ').pop()}: ${getCalidadTexto(partido.calidadA)} &nbsp;|&nbsp;
                    ⭐ ${partido.equipoB.split(' ').pop()}: ${getCalidadTexto(partido.calidadB)}
                </div>
                <button class="btn-analizar" data-partido='${JSON.stringify(partido)}'>
                    🔍 Analizar este partido
                </button>
            </div>
        `;
    });
    
    html += `</div>`;
    listaContainer.innerHTML = html;
    
    // Agregar event listeners a los botones
    document.querySelectorAll('.btn-analizar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const partido = JSON.parse(btn.dataset.partido);
            analizarPartido(partido);
        });
    });
}

function getCalidadTexto(calidad) {
    switch(calidad) {
        case 'ace': return 'ACE/Élite 👑';
        case 'bottom': return 'Bottom/Malo ⚠️';
        default: return 'Promedio/Similar 📊';
    }
}

async function analizarPartido(partido) {
    const resultadoDiv = document.getElementById('resultadoAnalisis');
    resultadoDiv.classList.remove('hidden');
    resultadoDiv.innerHTML = '<div class="loading">🔍 Analizando con el algoritmo FanGraphs...</div>';
    
    // Scroll suave al resultado
    resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    const datosAnalisis = {
        teamA: partido.equipoA,
        teamB: partido.equipoB,
        wrcPlusTeamA: partido.wrcEquipoA_vs_SPB,
        wrcPlusTeamB: partido.wrcEquipoB_vs_SPA,
        pitcherAType: partido.calidadA,
        pitcherBType: partido.calidadB,
        teamAPays: partido.momioA
    };
    
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosAnalisis)
        });
        
        if (!response.ok) {
            throw new Error('Error en el servidor');
        }
        
        const resultado = await response.json();
        mostrarResultado(resultado);
    } catch (error) {
        console.error('Error:', error);
        resultadoDiv.innerHTML = '<div class="error">❌ Error al analizar el partido. Intenta nuevamente.</div>';
    }
}

function mostrarResultado(data) {
    const resultadoDiv = document.getElementById('resultadoAnalisis');
    const isGatillo = data.gatillo.activado;
    const ivn = data.calculos.ivn;
    
    let icono = isGatillo ? '🔥' : '⏸️';
    let colorClass = isGatillo ? 'gatillo-activo' : 'gatillo-inactivo';
    
    const html = `
        <div class="resultado-card ${colorClass}">
            <h3>${icono} ${data.equipoA} vs ${data.equipoB}</h3>
            
            <div class="resultado-ivn">
                <strong>📐 Índice de Ventaja Neta (IVN) = ${ivn}</strong><br>
                <small>(${data.calculos.difOfensivo} dif. ofensivo + ${data.calculos.ajusteSP} ajuste SP)</small>
            </div>
            
            <div class="resultado-clasificacion">
                📊 <strong>Clasificación:</strong> ${data.clasificacion}
            </div>
            
            <div class="resultado-accion">
                🎯 <strong>Acción:</strong> ${data.accion}
            </div>
            
            <div class="resultado-gatillo ${isGatillo ? 'verde' : 'rojo'}">
                ${data.recomendacion}
            </div>
            
            ${data.momioAnalizado !== 'No especificado' ? `
                <div style="margin-top: 10px; text-align: center; font-size: 0.85em;">
                    💰 Momio analizado: ${data.momioAnalizado}
                </div>
            ` : ''}
            
            <button class="btn-cerrar" onclick="document.getElementById('resultadoAnalisis').classList.add('hidden')">
                ✖️ Cerrar análisis
            </button>
        </div>
    `;
    
    resultadoDiv.innerHTML = html;
}

// Función para refrescar (opcional)
function refrescarPartidos() {
    cargarPartidos();
}