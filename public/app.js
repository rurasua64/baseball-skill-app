// app.js - Versión limpia sin errores
(function() {
    'use strict';
    
    console.log('App v2 - Cargada correctamente');
    
    // Esperar a que el DOM esté listo
    function iniciar() {
        console.log('Iniciando aplicación...');
        cargarPartidos();
        
        // Botón refrescar
        const btnRefrescar = document.getElementById('refrescarBtn');
        if (btnRefrescar) {
            btnRefrescar.addEventListener('click', function() {
                cargarPartidos();
            });
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
    
    async function cargarPartidos() {
        console.log('Cargando partidos...');
        
        const listaContainer = document.getElementById('listaContainer');
        const fechaElement = document.getElementById('fechaPartidos');
        
        if (listaContainer) {
            listaContainer.innerHTML = '<div class="loading">🔄 Cargando partidos...</div>';
        }
        
        try {
            const response = await fetch('/api/games');
            const data = await response.json();
            
            console.log('Datos recibidos:', data);
            
            if (data && data.partidos && data.partidos.length > 0) {
                if (fechaElement) {
                    fechaElement.textContent = formatearFecha(data.fecha);
                }
                mostrarPartidos(data.partidos);
            } else {
                if (listaContainer) {
                    listaContainer.innerHTML = '<div class="no-games">📭 No hay partidos cargados. Actualiza games.json</div>';
                }
                if (fechaElement) {
                    fechaElement.textContent = 'No disponible';
                }
            }
        } catch (error) {
            console.error('Error:', error);
            if (listaContainer) {
                listaContainer.innerHTML = '<div class="error">❌ Error al cargar partidos</div>';
            }
            if (fechaElement) {
                fechaElement.textContent = 'Error';
            }
        }
    }
    
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
        if (!listaContainer) return;
        
        let html = '<div class="partidos-grid">';
        
        partidos.forEach((partido, index) => {
            const equipoANombre = partido.equipoA.split(' ').pop() || partido.equipoA;
            const equipoBNombre = partido.equipoB.split(' ').pop() || partido.equipoB;
            
            html += `
                <div class="partido-card">
                    <div class="partido-equipos">
                        🏆 <strong>${escapeHtml(partido.equipoA)}</strong> vs <strong>${escapeHtml(partido.equipoB)}</strong>
                    </div>
                    <div class="partido-abridores">
                        🧢 ${escapeHtml(partido.abridorA)} (${partido.manoA}) vs ${escapeHtml(partido.abridorB)} (${partido.manoB})
                    </div>
                    <div class="partido-stats">
                        📊 ${equipoANombre} vs ${partido.manoB}: ${partido.wrcEquipoA_vs_SPB} wRC+ | 
                        ${equipoBNombre} vs ${partido.manoA}: ${partido.wrcEquipoB_vs_SPA} wRC+
                    </div>
                    <div class="partido-calidad">
                        ⭐ ${equipoANombre}: ${getCalidadTexto(partido.calidadA)} | 
                        ⭐ ${equipoBNombre}: ${getCalidadTexto(partido.calidadB)}
                    </div>
                    <button class="btn-analizar" data-partido='${escapeHtml(JSON.stringify(partido))}'>
                        🔍 Analizar este partido
                    </button>
                </div>
            `;
        });
        
        html += '</div>';
        listaContainer.innerHTML = html;
        
        // Agregar event listeners a los botones
        document.querySelectorAll('.btn-analizar').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const partido = JSON.parse(this.dataset.partido);
                analizarPartido(partido);
            });
        });
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
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
        console.log('Analizando partido:', partido);
        
        const resultadoDiv = document.getElementById('resultadoAnalisis');
        if (!resultadoDiv) return;
        
        resultadoDiv.classList.remove('hidden');
        resultadoDiv.innerHTML = '<div class="loading">🔍 Analizando con algoritmo FanGraphs...</div>';
        
        resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamA: partido.equipoA,
                    teamB: partido.equipoB,
                    wrcPlusTeamA: partido.wrcEquipoA_vs_SPB,
                    wrcPlusTeamB: partido.wrcEquipoB_vs_SPA,
                    pitcherAType: partido.calidadA,
                    pitcherBType: partido.calidadB,
                    teamAPays: partido.momioA
                })
            });
            
            const resultado = await response.json();
            mostrarResultado(resultado);
        } catch (error) {
            console.error('Error:', error);
            resultadoDiv.innerHTML = '<div class="error">❌ Error al analizar el partido</div>';
        }
    }
    
    function mostrarResultado(data) {
        const resultadoDiv = document.getElementById('resultadoAnalisis');
        if (!resultadoDiv) return;
        
        const isGatillo = data.gatillo.activado;
        const ivn = data.calculos.ivn;
        
        resultadoDiv.innerHTML = `
            <div class="resultado-card ${isGatillo ? 'gatillo-activo' : 'gatillo-inactivo'}">
                <h3>${isGatillo ? '🔥' : '⏸️'} ${escapeHtml(data.equipoA)} vs ${escapeHtml(data.equipoB)}</h3>
                <div class="resultado-ivn">
                    <strong>📐 Índice de Ventaja Neta (IVN) = ${ivn}</strong>
                    <br><small>(${data.calculos.difOfensivo} dif. ofensivo + ${data.calculos.ajusteSP} ajuste SP)</small>
                </div>
                <div><strong>📊 Clasificación:</strong> ${data.clasificacion}</div>
                <div><strong>🎯 Acción:</strong> ${data.accion}</div>
                <div class="resultado-gatillo ${isGatillo ? 'verde' : 'rojo'}">
                    ${data.recomendacion}
                </div>
                <button class="btn-cerrar" onclick="this.closest('.result').classList.add('hidden')">
                    ✖️ Cerrar análisis
                </button>
            </div>
        `;
    }
    
})();