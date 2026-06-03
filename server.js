const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Endpoint para obtener partidos del día
app.get('/api/games', (req, res) => {
    try {
        const dataPath = path.join(__dirname, 'data', 'games.json');
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            const games = JSON.parse(data);
            res.json(games);
        } else {
            res.json({ fecha: new Date().toISOString().split('T')[0], partidos: [] });
        }
    } catch (error) {
        console.error('Error reading games.json:', error);
        res.json({ fecha: new Date().toISOString().split('T')[0], partidos: [] });
    }
});

// Endpoint para modo GANADOR F5 (algoritmo original)
app.post('/api/analyze', (req, res) => {
    const {
        teamA,
        teamB,
        wrcPlusTeamA,
        wrcPlusTeamB,
        pitcherAType,
        pitcherBType,
        teamAPays
    } = req.body;

    if (!wrcPlusTeamA || !wrcPlusTeamB) {
        return res.status(400).json({ error: 'Faltan datos de wRC+' });
    }

    const difOfensivo = wrcPlusTeamA - wrcPlusTeamB;
    let ajusteSP = 0;
    
    if (pitcherAType === 'ace' && pitcherBType !== 'ace') {
        ajusteSP = 15;
    } else if (pitcherBType === 'ace' && pitcherAType !== 'ace') {
        ajusteSP = -15;
    }

    const ivn = difOfensivo + ajusteSP;
    let gatillo = null;
    let clasificacion = '';
    let accion = '';

    if (ivn > 25) {
        clasificacion = 'Discrepancia Crítica';
        accion = '✅ Gatillo Automático: Apuesta a F5 Money Line';
        gatillo = { activado: true, nivel: 'critico', mensaje: `IVN = ${ivn} (>25)` };
    } else if (ivn >= 15 && ivn <= 24) {
        clasificacion = 'Ventaja Moderada';
        const momioNumerico = parseOdds(teamAPays);
        if (momioNumerico >= 100) {
            accion = '✅ Validar Momio: Operar';
            gatillo = { activado: true, nivel: 'moderado', mensaje: `IVN = ${ivn} con momio favorable` };
        } else {
            accion = '⚠️ Momio no favorable - No operar';
            gatillo = { activado: false, nivel: 'moderado', mensaje: `IVN = ${ivn} pero momio no favorable` };
        }
    } else {
        clasificacion = 'Ruido Estadístico';
        accion = '❌ No Operar';
        gatillo = { activado: false, nivel: 'ruido', mensaje: `IVN = ${ivn} (<15)` };
    }

    res.json({
        equipoA: teamA,
        equipoB: teamB,
        calculos: { difOfensivo, ajusteSP, ivn },
        clasificacion,
        accion,
        gatillo,
        recomendacion: gatillo.activado ? `🔥 GATILLO ACTIVADO: ${gatillo.mensaje}` : `⏸️ SIN GATILLO: ${gatillo.mensaje}`
    });
});

// Endpoint para modo TOTALES F5 (nuevo algoritmo)
app.post('/api/analyze-totals', (req, res) => {
    const {
        teamA,
        teamB,
        wrcPlusTeamA,
        wrcPlusTeamB,
        xFIPA,
        xFIPB,
        pitcherAType,
        pitcherBType
    } = req.body;

    if (!wrcPlusTeamA || !wrcPlusTeamB || !xFIPA || !xFIPB) {
        return res.status(400).json({ error: 'Faltan datos de wRC+ o xFIP' });
    }

    // Cálculo del Índice de Entorno F5 (IEF5)
    const FOC = wrcPlusTeamA + wrcPlusTeamB;
    const RPC = parseFloat(xFIPA) + parseFloat(xFIPB);
    
    let accion = '';
    let tipoApuesta = '';
    let clasificacion = '';
    let gatillo = { activado: false, nivel: '', mensaje: '' };
    let subGatillo = null;

    // Matriz de activación principal
    if (FOC < 195 && RPC < 7.20) {
        clasificacion = 'Escenario "Duelo de Pitcheo"';
        accion = '✅ Gatillo de BAJAS (F5 Under)';
        tipoApuesta = `Under ${suggestUnderLine(RPC)} carreras`;
        gatillo = { activado: true, nivel: 'under', mensaje: `FOC = ${FOC} | RPC = ${RPC.toFixed(2)}` };
    } 
    else if (FOC > 230 && RPC > 8.80) {
        clasificacion = 'Escenario "Fuego Cruzado"';
        accion = '✅ Gatillo de ALTAS (F5 Over)';
        tipoApuesta = `Over ${suggestOverLine(FOC)} carreras`;
        gatillo = { activado: true, nivel: 'over', mensaje: `FOC = ${FOC} | RPC = ${RPC.toFixed(2)}` };
    }
    else {
        clasificacion = 'Entorno Balanceado';
        accion = '❌ No Operar - Línea bien puesta';
        gatillo = { activado: false, nivel: 'balance', mensaje: `FOC = ${FOC} | RPC = ${RPC.toFixed(2)}` };
        
        // Sub-Gatillo Especial para Team Total Under
        if ((wrcPlusTeamA < 90 && parseFloat(xFIPB) < 3.40) || (wrcPlusTeamB < 90 && parseFloat(xFIPA) < 3.40)) {
            let equipoDebil = '';
            let xFIPDominante = '';
            
            if (wrcPlusTeamA < 90 && parseFloat(xFIPB) < 3.40) {
                equipoDebil = teamA;
                xFIPDominante = xFIPB;
            } else if (wrcPlusTeamB < 90 && parseFloat(xFIPA) < 3.40) {
                equipoDebil = teamB;
                xFIPDominante = xFIPA;
            }
            
            subGatillo = {
                activado: true,
                equipo: equipoDebil,
                xFIPRival: xFIPDominante,
                wRCPlus: Math.min(wrcPlusTeamA, wrcPlusTeamB),
                apuesta: `${equipoDebil} Team Total Under 1.5 carreras en F5`
            };
        }
    }

    const resultado = {
        equipoA,
        equipoB,
        calculos: {
            FOC,
            RPC: RPC.toFixed(2),
            wrcPlusTeamA,
            wrcPlusTeamB,
            xFIPA,
            xFIPB
        },
        clasificacion,
        accion,
        tipoApuesta: tipoApuesta || '',
        gatillo,
        subGatillo,
        recomendacion: gatillo.activado ? 
            `🔥 GATILLO DE TOTALES: ${gatillo.mensaje} → ${tipoApuesta}` : 
            (subGatillo ? `🎯 SUB-GATILLO: ${subGatillo.apuesta}` : `⏸️ SIN GATILLO: ${gatillo.mensaje}`)
    };

    res.json(resultado);
});

function parseOdds(odds) {
    if (!odds) return 0;
    const oddsStr = odds.toString();
    if (oddsStr.startsWith('+')) return parseInt(oddsStr.substring(1));
    if (oddsStr.startsWith('-')) return -parseInt(oddsStr.substring(1));
    return parseInt(oddsStr) || 0;
}

function suggestUnderLine(RPC) {
    if (RPC < 6.5) return '3.5';
    if (RPC < 7.2) return '4.0';
    return '4.5';
}

function suggestOverLine(FOC) {
    if (FOC > 250) return '5.0';
    if (FOC > 230) return '4.5';
    return '4.0';
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});