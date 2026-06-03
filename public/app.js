// app.js - Versión con Modo Ganador y Modo Totales
(function() {
    'use strict';
    
    let modoActual = 'ganador'; // 'ganador' o 'totales'
    
    console.log('App v4 - Modo Ganador y Totales');
    
    function iniciar() {
        console.log('Iniciando aplicación...');
        configurarModos();
        cargarPartidos();
        
        const btnRefrescar = document.getElementById('refrescarBtn');
        if (btnRefrescar) {
            btnRefrescar.addEventListener('click', () => cargarPartidos());
        }
    }
    
    function configurarModos() {
        const btnGanador = document.querySelector('[data-modo="ganador"]');
        const btnTotales = document.querySelector('[data-modo="totales"]');
        
        if (btnGanador) {
            btnGanador.addEventListener('click', () => {
                modoActual = 'ganador';
                btnGanador.classList.add('active');
                btnTotales.classList.remove('active');
                limpiarResultado();
                cargarPartidos();
            });
        }
        
        if (btnTotales) {
            btnTotales.addEventListener('click', () => {
                modoActual = 'totales';
                btnTotales.classList.add('active');
                btnGanador.classList.remove('active');
                limpiarResultado();
                cargarPartidos();
            });
        }
    }
    
    function limpiarResultado() {
        const resultadoDiv = document.getElementById('resultadoAnalisis');
        if (resultadoDiv) {
            resultadoDiv.classList.add('hidden');
            resultadoDiv.innerHTML = '';
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
    
    async function cargarPartidos() {
        const listaContainer = document.getElementById('listaContainer');
        const fechaElement = document.getElementById('fechaPartidos');
        
        if (listaContainer) {
            listaContainer.innerHTML = '<div class="loading">🔄 Cargando partidos...</div>';
        }
        
        try {
            const response = await fetch('/api/games');
            const data = await response.json();
            
            if (data && data.partidos && data.partidos.length > 0) {
                if (fechaElement) {
                    fechaElement.textContent = formatearFecha(data.fecha);
                }
                mostrarPartidos(data.partidos);
            } else {
                if (listaContainer) {
                    listaContainer.innerHTML = '<div class="no-games">📭 No hay partidos cargados</div>';
                }
                if (fechaElement) fechaElement.textContent = 'No disponible';
            }
        } catch (error) {
            console.error('Error:', error);
            if (listaContainer) {
                listaContainer.innerHTML = '<div class="error">❌ Error al cargar partidos</div>';
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
            
            // Mostrar diferentes métricas según el modo
            let metricasHtml = '';
            if (modoActual === 'ganador') {
                metricasHtml = `
                    <div class="partido-stats">
                        📊 ${equipoANombre} vs ${partido.manoB}: ${partido.wrcEquipoA_vs_SPB} wRC+ | 
                        ${equipoBNombre} vs ${partido.manoA}: ${partido.wrcEquipoB_vs_SPA} wRC+
                    </div>
                    <div class="partido-calidad">
                        ⭐ ${equipoANombre}: ${getCalidadTexto(partido.calidadA)} | 
                        ⭐ ${equipoBNombre}: ${getCalidadTexto(partido.calidadB)}
                    </div>
                `;
            } else {
                metricasHtml = `
                    <div class="partido-stats">
                        📊 wRC+ | ${equipoANombre}: ${partido.wrcEquipoA_vs_SPB} | ${equipoBNombre}: ${partido.wrcEquipoB_vs_SPA}
                    </div>
                    <div class="partido-stats">
                        🎯 xFIP | ${partido.abridorA}: ${partido.xFIPA || 'N/A'} | ${partido.abridorB}: ${partido.xFIPB || 'N/A'}
                    </div>
                `;
            }
            
            html += `
                <div class="partido-card">
                    <div class="partido-header">
                        <span class="${partido.manoA !== partido.manoB ? 'caso-a' : 'caso-b'}">
                            ${partido.manoA !== partido.manoB ? '🎯 Caso A: Diferente mano' : '📊 Caso B: Misma mano'}
                        </span>
                    </div>
                    <div class="partido-equipos">
                        🏆 <strong>${escapeHtml(partido.equipoA)}</strong> vs <strong>${escapeHtml(partido.equipoB)}</strong>
                    </div>
                    <div class="partido-abridores">
                        🧢 ${escapeHtml(partido.abridorA)} (${partido.manoA}) vs ${escapeHtml(partido.abridorB)} (${partido.manoB})
                    </div>
                    ${metricasHtml}
                    <button class="btn-analizar" data-partido='${escapeHtml(JSON.stringify(partido))}'>
                        ${modoActual === 'ganador' ? '🔍 Analizar Ganador F5' : '📈 Analizar Totales F5'}
                    </button>
                </div>
            `;
        });
        
        html += '</div>';
        listaContainer.innerHTML = html;
        
        document.querySelectorAll('.btn-analizar').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const partido = JSON.parse(this.dataset.partido);
                if (modoActual === 'ganador') {
                    analizarGanador(partido);
                } else {
                    analizarTotales(partido);
                }
            });
        });
    }
    
    async function analizarGanador(partido) {
        const resultadoDiv = document.getElementById('resultadoAnalisis');
        if (!resultadoDiv) return;
        
        resultadoDiv.classList.remove('hidden');
        resultadoDiv.innerHTML = '<div class="loading">🔍 Analizando Modo Ganador F5...</div>';
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
                    teamAPays: partido.momioA || '+100'
                })
            });
            
            const resultado = await response.json();
            mostrarResultadoGanador(resultado);
        } catch (error) {
            resultadoDiv.innerHTML = '<div class="error">❌ Error al analizar</div>';
        }
    }
    
    async function analizarTotales(partido) {
        const resultadoDiv = document.getElementById('resultadoAnalisis');
        if (!resultadoDiv) return;
        
        resultadoDiv.classList.remove('hidden');
        resultadoDiv.innerHTML = '<div class="loading">📊 Analizando Modo Totales F5...</div>';
        resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        try {
            const response = await fetch('/api/analyze-totals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamA: partido.equipoA,
                    teamB: partido.equipoB,
                    wrcPlusTeamA: partido.wrcEquipoA_vs_SPB,
                    wrcPlusTeamB: partido.wrcEquipoB_vs_SPA,
                    xFIPA: partido.xFIPA || '4.00',
                    xFIPB: partido.xFIPB || '4.00',
                    pitcherAType: partido.calidadA,
                    pitcherBType: partido.calidadB
                })
            });
            
            const resultado = await response.json();
            mostrarResultadoTotales(resultado);
        } catch (error) {
            resultadoDiv.innerHTML = '<div class="error">❌ Error al analizar</div>';
        }
    }
    
    function mostrarResultadoGanador(data) {
        const resultadoDiv = document.getElementById('resultadoAnalisis');
        if (!resultadoDiv) return;
        
        const isGatillo = data.gatillo.activado;
        
        resultadoDiv.innerHTML = `
            <div class="resultado-card ${isGatillo ? 'gatillo-activo' : 'gatillo-inactivo'}">
                <h3>🏆 ${isGatillo ? '🔥' : '⏸️'} ${escapeHtml(data.equipoA)} vs ${escapeHtml(data.equipoB)}</h3>
                <div class="resultado-ivn">
                    <strong>📐 IVN = ${data.calculos.ivn}</strong>
                    <br><small>(${data.calculos.difOfensivo} dif. ofensivo + ${data.calculos.ajusteSP} ajuste SP)</small>
                </div>
                <div><strong>📊 Clasificación:</strong> ${data.clasificacion}</div>
                <div><strong>🎯 Acción:</strong> ${data.accion}</div>
                <div class="resultado-gatillo ${isGatillo ? 'verde' : 'rojo'}">
                    ${data.recomendacion}
                </div>
                <button class="btn-cerrar" onclick="this.closest('.result').classList.add('hidden')">✖️ Cerrar</button>
            </div>
        `;
    }
    
    function mostrarResultadoTotales(data) {
        const resultadoDiv = document.getElementById('resultadoAnalisis');
        if (!resultadoDiv) return;
        
        const isGatillo = data.gatillo.activado;
        const hasSubGatillo = data.subGatillo && data.subGatillo.activado;
        
        let badgeHtml = '';
        if (data.gatillo.nivel === 'under') {
            badgeHtml = '<span class="badge-under">📉 UNDER</span>';
        } else if (data.gatillo.nivel === 'over') {
            badgeHtml = '<span class="badge-over">📈 OVER</span>';
        } else if (hasSubGatillo) {
            badgeHtml = '<span class="badge-sub">🎯 SUB-GATILLO</span>';
        }
        
        resultadoDiv.innerHTML = `
            <div class="resultado-card ${isGatillo || hasSubGatillo ? 'gatillo-activo' : 'gatillo-inactivo'}">
                <h3>📊 ${badgeHtml} ${escapeHtml(data.equipoA)} vs ${escapeHtml(data.equipoB)}</h3>
                
                <div class="metricas-totales">
                    <div class="metrica">
                        <div class="metrica-label">FOC (wRC+ sumados)</div>
                        <div class="metrica-valor">${data.calculos.FOC}</div>
                    </div>
                    <div class="metrica">
                        <div class="metrica-label">RPC (xFIP sumados)</div>
                        <div class="metrica-valor">${data.calculos.RPC}</div>
                    </div>
                </div>
                
                <div class="resultado-ivn">
                    <strong>📐 Índice de Entorno F5</strong>
                    <br><small>FOC = ${data.calculos.FOC} | RPC = ${data.calculos.RPC}</small>
                </div>
                
                <div><strong>📊 Clasificación:</strong> ${data.clasificacion}</div>
                <div><strong>🎯 Acción:</strong> ${data.accion}</div>
                ${data.tipoApuesta ? `<div><strong>💰 Apuesta sugerida:</strong> ${data.tipoApuesta}</div>` : ''}
                
                <div class="resultado-gatillo ${isGatillo || hasSubGatillo ? 'verde' : 'rojo'}">
                    ${data.recomendacion}
                </div>
                
                ${hasSubGatillo ? `
                    <div style="margin-top: 12px; padding: 12px; background: #fff3e0; border-radius: 10px;">
                        <strong>🎯 SUB-GATILLO ACTIVADO</strong><br>
                        ${data.subGatillo.apuesta}<br>
                        <small>${data.subGatillo.equipo} tiene ${data.subGatillo.wRCPlus} wRC+ vs xFIP ${data.subGatillo.xFIPRival}</small>
                    </div>
                ` : ''}
                
                <button class="btn-cerrar" onclick="this.closest('.result').classList.add('hidden')">✖️ Cerrar</button>
            </div>
        `;
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
    
})();