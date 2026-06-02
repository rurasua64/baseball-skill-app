const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Endpoint para calcular el IVN
app.post('/api/analyze', (req, res) => {
    const {
        teamA,           // nombre equipo A
        teamB,           // nombre equipo B
        wrcPlusTeamA,    // wRC+ del equipo A vs la mano del SP rival
        wrcPlusTeamB,    // wRC+ del equipo B vs la mano del SP rival
        pitcherAType,    // 'ace', 'similar', 'bottom'
        pitcherBType,    // 'ace', 'similar', 'bottom'
        teamAPays        // momio del equipo A (ej: +100, -110, etc)
    } = req.body;

    // Validaciones básicas
    if (!wrcPlusTeamA || !wrcPlusTeamB) {
        return res.status(400).json({ error: 'Faltan datos de wRC+' });
    }

    // Calcular Diferencial Ofensivo
    const difOfensivo = wrcPlusTeamA - wrcPlusTeamB;

    // Calcular Ajuste SP
    let ajusteSP = 0;
    
    // Caso: abridor de equipo A es ACE, equipo B NO es ACE
    if (pitcherAType === 'ace' && pitcherBType !== 'ace') {
        ajusteSP = 15;
    }
    // Caso: abridor de equipo B es ACE, equipo A NO es ACE
    else if (pitcherBType === 'ace' && pitcherAType !== 'ace') {
        ajusteSP = -15;
    }
    // Caso: ambos ACE o ambos bottom/similar -> ajuste 0

    const ivn = difOfensivo + ajusteSP;

    // Matriz de activación
    let gatillo = null;
    let clasificacion = '';
    let accion = '';

    if (ivn > 25) {
        clasificacion = 'Discrepancia Crítica';
        accion = 'Gatillo Automático: Apuesta a F5 Money Line o F5 Hándicap 0/+0.5';
        gatillo = {
            activado: true,
            nivel: 'critico',
            mensaje: `IVN = ${ivn} (>25) - Apuesta automática recomendada`
        };
    } else if (ivn >= 15 && ivn <= 24) {
        clasificacion = 'Ventaja Moderada';
        // Validar momio positivo o underdog
        const momioNumerico = parseOdds(teamAPays);
        if (momioNumerico >= 100 || teamAPays.toLowerCase().includes('underdog')) {
            accion = 'Validar Momio: Momio positivo o underdog detectado - Operar';
            gatillo = {
                activado: true,
                nivel: 'moderado',
                mensaje: `IVN = ${ivn} (15-24) con momio favorable (${teamAPays}) - Operar`
            };
        } else {
            accion = 'Validar Momio: Momio no favorable - No operar';
            gatillo = {
                activado: false,
                nivel: 'moderado',
                mensaje: `IVN = ${ivn} (15-24) pero momio no favorable (${teamAPays})`
            };
        }
    } else {
        clasificacion = 'Ruido Estadístico';
        accion = 'No Operar: El mercado está bien balanceado';
        gatillo = {
            activado: false,
            nivel: 'ruido',
            mensaje: `IVN = ${ivn} (<15) - Diferencia insuficiente`
        };
    }

    const resultado = {
        equipoA: teamA || 'Equipo A',
        equipoB: teamB || 'Equipo B',
        calculos: {
            difOfensivo,
            ajusteSP,
            ivn
        },
        clasificacion,
        accion,
        gatillo,
        momioAnalizado: teamAPays || 'No especificado',
        recomendacion: gatillo.activado ? 
            `✅ GATILLO ACTIVADO: ${gatillo.mensaje}` : 
            `❌ SIN GATILLO: ${gatillo.mensaje}`
    };

    res.json(resultado);
});

// Convertir momio (+100, -110) a número para comparar
function parseOdds(odds) {
    if (!odds) return 0;
    const oddsStr = odds.toString();
    if (oddsStr.startsWith('+')) {
        return parseInt(oddsStr.substring(1));
    } else if (oddsStr.startsWith('-')) {
        return -parseInt(oddsStr.substring(1));
    }
    return parseInt(oddsStr) || 0;
}

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});