// Configurar fecha por defecto (hoy)
document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaInput').value = hoy;
    cargarPartidos();
});

document.getElementById('cargarPartidosBtn').addEventListener('click', () => {
    cargarPartidos();
});

async function cargarPartidos() {
    const fecha = document.getElementById('fechaInput').value;
    const listaContainer = document.getElementById('listaContainer');
    
    listaContainer.innerHTML = '<div class="loading">🔄 Cargando partidos...</div>';
    
    try {
        const response = await fetch('/api/games');
        const data = await response.json();
        
        if (data.partidos && data.partidos.length > 0) {
            mostrarPartidos(data.partidos, data.fecha);
        } else {
            listaContainer.innerHTML = `
                <div class="no-games">
                    📭 No hay partidos programados para ${fecha}<br><br>
                    <small>Edita el archivo <strong>data/games.json</strong> para agregar los partidos del día.</small>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        listaContainer.innerHTML = '<div class="error">❌ Error al cargar los partidos. Verifica que el servidor esté funcionando.</div>';
    }
}

function mostrarPartidos(partidos, fecha) {
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
        
        html += `
            <div class="partido-card" data-index="${index}">
                <div class="partido-equipos">
                    🏆 <strong>${partido.equipoA}</strong> vs <strong>${partido.equipoB}</strong>
                </div>
                <div class="partido-abridores">
                    🧢 Abridores: ${partido.abridorA} (${partido.manoA}) vs ${partido.abridorB} (${partido.manoB})
                </div>
                <div class="partido-stats">
                    📊 <strong>${equipoANombre}</strong> vs ${partido.manoB}: ${partido.wrcEquipoA_vs_SPB} wRC+ &nbsp;|&nbsp;
                    <strong>${equipoBNombre}</strong> vs ${partido.manoA}: ${partido.wrcEquipoB_vs_SPA} wRC+
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