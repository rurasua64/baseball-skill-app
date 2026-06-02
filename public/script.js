document.getElementById('analysisForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const teamA = document.getElementById('teamA').value;
    const teamB = document.getElementById('teamB').value;
    const wrcPlusTeamA = parseInt(document.getElementById('wrcPlusTeamA').value);
    const wrcPlusTeamB = parseInt(document.getElementById('wrcPlusTeamB').value);
    const pitcherAType = document.getElementById('pitcherAType').value;
    const pitcherBType = document.getElementById('pitcherBType').value;
    const teamAPays = document.getElementById('teamAPays').value;
    
    // Mostrar loading
    const resultDiv = document.getElementById('result');
    const resultContent = document.getElementById('resultContent');
    resultDiv.classList.remove('hidden');
    resultContent.innerHTML = '<div style="text-align:center">🔍 Analizando...</div>';
    
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teamA,
                teamB,
                wrcPlusTeamA,
                wrcPlusTeamB,
                pitcherAType,
                pitcherBType,
                teamAPays
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayResult(data);
        } else {
            resultContent.innerHTML = `<div style="color:red">❌ Error: ${data.error}</div>`;
        }
    } catch (error) {
        resultContent.innerHTML = `<div style="color:red">❌ Error de conexión: ${error.message}</div>`;
    }
});

function displayResult(data) {
    const resultContent = document.getElementById('resultContent');
    const isGatillo = data.gatillo.activado;
    
    const html = `
        <div class="result-content ${isGatillo ? 'gatillo-activado' : 'gatillo-no'}" style="padding:20px; border-radius:10px">
            <h3>📋 ${data.equipoA} vs ${data.equipoB}</h3>
            
            <div style="margin: 15px 0">
                <strong>🧮 Cálculo del IVN:</strong><br>
                Diferenciual Ofensivo: ${data.calculos.difOfensivo}<br>
                Ajuste por SP: ${data.calculos.ajusteSP}<br>
                <strong style="font-size:1.2em">Índice de Ventaja Neta (IVN): ${data.calculos.ivn}</strong>
            </div>
            
            <div style="margin: 15px 0">
                <strong>📊 Clasificación:</strong> ${data.clasificacion}<br>
                <strong>🎯 Acción recomendada:</strong> ${data.accion}<br>
                <strong>💰 Momio analizado:</strong> ${data.momioAnalizado}
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.05); border-radius:8px">
                <strong style="font-size:1.1em">${data.recomendacion}</strong>
            </div>
            
            ${data.gatillo.activado ? `
                <div style="margin-top: 15px; text-align:center">
                    ✅ <strong>GATILLO DE APUESTA ACTIVADO</strong><br>
                    <small>Revisa el mercado F5 Money Line o F5 Hándicap 0/+0.5</small>
                </div>
            ` : `
                <div style="margin-top: 15px; text-align:center">
                    ⚠️ <strong>No hay gatillo suficiente</strong><br>
                    <small>Espera mejores spots o ajusta la selección</small>
                </div>
            `}
        </div>
    `;
    
    resultContent.innerHTML = html;
}