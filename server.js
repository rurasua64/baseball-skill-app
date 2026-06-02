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

// Endpoint para calcular el IVN
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

    // Validaciones básicas
    if (!wrcPlusTeamA || !wrcPlusTeamB) {
        return res.status(400).json({ error: 'Faltan datos de wRC+' });
    }

    // Calcular Diferencial Ofensivo
    const difOfensivo = wrcPlusTeamA - wrcPlusTeamB;

    // Calcular Ajuste SP
    let ajusteSP = 0;
    
    if (pitcherAType === 'ace' && pitcherBType !== 'ace') {
        ajusteSP = 15;
    } else if (pitcherBType === 'ace' && pitcherAType !== 'ace') {
        ajusteSP = -15;
    }

    const ivn = difOfensivo + ajusteSP;

    // Matriz de activación
    let gatillo = null;
    let clasificacion = '';
    let accion = '';

    if (ivn > 25) {
        clasificacion = 'Discrepancia Crítica';
        accion = '✅ Gatillo Automático: Apuesta a F5 Money Line o F5 Hándicap 0/+0.5';
        gatillo = {
            activado: true,
            nivel: 'critico',
            mensaje: `IVN = ${ivn} (>25) - Apuesta automática recomendada`
        };
    } else if (ivn >= 15 && ivn <= 24) {
        clasificacion = 'Ventaja Moderada';
        const momioNumerico = parseOdds(teamAPays);
        if (momioNumerico >= 100 || (teamAPays && teamAPays.toLowerCase().includes('underdog'))) {
            accion = '✅ Validar Momio: Momio positivo o underdog detectado - Operar';
            gatillo = {
                activado: true,
                nivel: 'moderado',
                mensaje: `IVN = ${ivn} (15-24) con momio favorable (${teamAPays}) - Operar`
            };
        } else {
            accion = '⚠️ Validar Momio: Momio no favorable - No operar';
            gatillo = {
                activado: false,
                nivel: 'moderado',
                mensaje: `IVN = ${ivn} (15-24) pero momio no favorable (${teamAPays})`
            };
        }
    } else {
        clasificacion = 'Ruido Estadístico';
        accion = '❌ No Operar: El mercado está bien balanceado';
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
            `🔥 GATILLO ACTIVADO: ${gatillo.mensaje}` : 
            `⏸️ SIN GATILLO: ${gatillo.mensaje}`
    };

    res.json(resultado);
});

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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});