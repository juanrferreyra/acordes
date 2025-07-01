import { NOTES, CHORD_TYPES, INSTRUMENTS } from './constants.js';

// Almacenamiento global de digitaciones precalculadas por instrumento|acorde
const fingeringCache = {};

// Función para obtener el índice de una nota
export function getNoteIndex(note) {
    return NOTES.indexOf(note);
}

// Función para obtener una nota por índice
export function getNoteByIndex(index) {
    return NOTES[((index % 12) + 12) % 12];
}

// Función para generar las notas de un acorde
export function getChordNotes(rootNote, chordType) {
    const rootIndex = getNoteIndex(rootNote);
    const intervals = CHORD_TYPES[chordType].intervals;
    
    return intervals.map(interval => getNoteByIndex(rootIndex + interval));
}

// DEBUG: versión instrumentada para revisar combinaciones descartadas
export function generateChordFingerrings(instrument, chordNotes, maxFret = 5) {
    const strings = INSTRUMENTS[instrument].strings;
    const fingerings = [];
    let rejectedByValidation = 0;
    let rejectedByPlayability = 0;
    let totalGenerated = 0;

    function generateCombinations(stringIndex, currentFingering, usedNotes) {
        if (stringIndex >= strings.length) {
            totalGenerated++;
            if (isValidFingering(currentFingering, chordNotes, instrument)) {
                const processedFingering = processFingeringWithBarre(currentFingering, instrument);
                if (processedFingering && isPlayableFingering(processedFingering)) {
                    fingerings.push(processedFingering);
                } else {
                    rejectedByPlayability++;
                }
            } else {
                rejectedByValidation++;
            }
            return;
        }

        const stringNote = strings[stringIndex];
        const stringNoteIndex = getNoteIndex(stringNote);

        // Cuerda al aire
        const openNote = getNoteByIndex(stringNoteIndex);
        if (chordNotes.includes(openNote)) {
            currentFingering[stringIndex] = 0;
            usedNotes.add(openNote);
            generateCombinations(stringIndex + 1, currentFingering, usedNotes);
            usedNotes.delete(openNote);
        }

        // Trastes del 1 al maxFret
        for (let fret = 1; fret <= maxFret; fret++) {
            const frettedNote = getNoteByIndex(stringNoteIndex + fret);
            if (chordNotes.includes(frettedNote)) {
                currentFingering[stringIndex] = fret;
                usedNotes.add(frettedNote);
                generateCombinations(stringIndex + 1, currentFingering, usedNotes);
                usedNotes.delete(frettedNote);
            }
        }

        // Cuerda no tocada
        currentFingering[stringIndex] = 'x';
        generateCombinations(stringIndex + 1, currentFingering, usedNotes);
    }

    generateCombinations(0, new Array(strings.length), new Set());

    return fingerings
        .filter(f => f && f.frets.length > 0)
        .sort((a, b) => calculateFingeringScore(b, instrument, chordNotes) - calculateFingeringScore(a, instrument, chordNotes))
        .slice(0, 6);
}

// Procesa una digitación de acorde y determina si debe tener cejilla según reglas musicales
function processFingeringWithBarre(fingering, instrument) {
    if (!fingering) return null; // Control de null explícito

    const frets = [...fingering];

    // 1. No puede haber cuerdas al aire (0)
    const hasOpen = frets.includes(0);
    if (hasOpen) return { frets, barre: null, fingers: assignFingers(frets, null) };

    // 2. Las "x" deben estar solo a la izquierda (antes de cualquier nota tocada)
    let foundNonX = false;
    for (let i = 0; i < frets.length; i++) {
        if (frets[i] !== 'x') {
            foundNonX = true;
        } else if (foundNonX) {
            return { frets, barre: null, fingers: assignFingers(frets, null) };
        }
    }

    // 3. Buscar el traste más bajo usado
    const usedFrets = frets.filter(f => typeof f === 'number' && f > 0);
    if (usedFrets.length < 2) return { frets, barre: null, fingers: assignFingers(frets, null) };

    const minFret = Math.min(...usedFrets);

    // 4. Verificar que haya al menos 2 cuerdas en ese traste (posible cejilla)
    const stringsOnMinFret = frets.reduce((arr, f, i) => {
        if (f === minFret) arr.push(i);
        return arr;
    }, []);

    if (stringsOnMinFret.length < 2) return { frets, barre: null, fingers: assignFingers(frets, null) };

    // 5. Definir el rango de cuerdas que abarca la cejilla
    const barre = {
        fret: minFret,
        fromString: Math.min(...stringsOnMinFret),
        toString: Math.max(...stringsOnMinFret)
    };

    // 6. Asignar dedos y verificar que no se usen más de 3 dedos extra (además del dedo 1 para cejilla)
    const fingers = assignFingers(frets, barre);
    if (!fingers) return { frets, barre: null, fingers: assignFingers(frets, null) }; // Control null por falta de dedos

    const fingerCount = new Set(fingers.filter((f, i) => typeof frets[i] === 'number' && frets[i] > minFret && f !== 1)).size;

    if (fingerCount > 3) return { frets, barre: null, fingers: assignFingers(frets, null) };

    return { frets, barre, fingers };
}

// Asigna dedos a cada traste presionado, teniendo en cuenta la cejilla si existe
function assignFingers(frets, barre) {
    const fingers = new Array(frets.length).fill(null);
    const usedFingers = new Set();

    // 1. Asignar dedo 1 a la cejilla
    if (barre) {
        for (let i = barre.fromString; i <= barre.toString; i++) {
            if (frets[i] === barre.fret) {
                fingers[i] = 1;
            }
        }
        usedFingers.add(1);
    }

    // 2. Asignar dedos a otros trastes mayores que la cejilla
    const availableFingers = [1, 2, 3, 4].filter(f => !usedFingers.has(f));
    let fingerIndex = 0;

    // Ordenar primero por trastes crecientes para priorizar los más cercanos al clavijero
    const sorted = frets.map((f, i) => ({ index: i, fret: f }))
        .filter(item => typeof item.fret === 'number' && item.fret > 0)
        .sort((a, b) => a.fret - b.fret);

    for (const { index, fret } of sorted) {
        if (barre && fret === barre.fret && fingers[index] === 1) continue; // ya asignado por cejilla
        if (fingers[index] != null) continue;

        if (fingerIndex < availableFingers.length) {
            fingers[index] = availableFingers[fingerIndex++];
        } else {
            return null; // no hay dedos disponibles
        }
    }

    return fingers;
}

// Verifica si la digitación es tocable con la mano
function isPlayableFingering(fingering) {
    if (!fingering || !fingering.fingers) return false;

    const { frets, barre, fingers } = fingering;

    // 1. Las cuerdas "x" deben estar solo a la izquierda
    let foundNonX = false;
    for (let i = 0; i < frets.length; i++) {
        if (frets[i] !== 'x') {
            foundNonX = true;
        } else if (foundNonX) {
            return false;
        }
    }

    // 2. Si hay cejilla, no puede haber cuerdas al aire a su derecha
    if (barre) {
        for (let i = 0; i < frets.length; i++) {
            if (frets[i] === 0 && i >= barre.fromString) {
                return false;
            }
        }
    }

    // 3. Todos los trastes presionados deben tener dedo asignado
    for (let i = 0; i < frets.length; i++) {
        if (typeof frets[i] === 'number' && frets[i] > 0) {
            if (!fingers[i]) {
                return false;
            }
        }
    }

    // 4. El rango entre el traste más bajo y el más alto debe ser de máximo 3
    const numericFrets = frets.filter(f => typeof f === 'number' && f > 0);
    if (numericFrets.length > 0) {
        const minFret = Math.min(...numericFrets);
        const maxFret = Math.max(...numericFrets);
        if (maxFret - minFret > 3) {
            return false;
        }
    }

    // 5. Restricción de inversión entre dedos consecutivos
    const fingerPos = [];
    for (let i = 0; i < fingers.length; i++) {
        const f = fingers[i];
        const fret = frets[i];
        if (f && typeof fret === 'number' && fret > 0) {
            if (!(barre && f === 1 && fret === barre.fret)) {
                fingerPos.push({ stringIndex: i, fret, finger: f });
            }
        }
    }
    fingerPos.sort((a, b) => a.finger - b.finger);

    for (let i = 1; i < fingerPos.length; i++) {
        const prev = fingerPos[i - 1];
        const curr = fingerPos[i];
        if (curr.finger === prev.finger + 1) {
            const stringDist = Math.abs(curr.stringIndex - prev.stringIndex);
            const fretDist = Math.abs(curr.fret - prev.fret);
            if ((stringDist > 0 && fretDist > 0) && (stringDist + fretDist > 4)) {
                return false;
            }
        }
    }

    // 6. Restricción general entre cualquier par de dedos: evitar saltos extremos
    for (let i = 0; i < fingerPos.length; i++) {
        for (let j = i + 1; j < fingerPos.length; j++) {
            const stringDist = Math.abs(fingerPos[i].stringIndex - fingerPos[j].stringIndex);
            const fretDist = Math.abs(fingerPos[i].fret - fingerPos[j].fret);
            if (stringDist > 3 && fretDist > 3) {
                return false;
            }
        }
    }

    return true;
}

// Guarda una digitación para poder usarla después
export function cacheFingerings(instrument, chordSymbol, fingerings) {
    fingeringCache[`${instrument}|${chordSymbol}`] = fingerings;
}

// Recupera una digitación previamente guardada
export function getCachedFingerings(instrument, chordSymbol) {
    return fingeringCache[`${instrument}|${chordSymbol}`] || [];
}

// Limpia el caché para un instrumento específico
export function clearInstrumentCache(instrumentKey) {
    for (const key in fingeringCache) {
        if (key.startsWith(`${instrumentKey}|`)) {
            delete fingeringCache[key];
        }
    }
}

function isValidFingering(fingering, chordNotes, instrument) {
    const requiredNotes = new Set(chordNotes);
    const foundNotes = new Set();

    for (let i = 0; i < fingering.length; i++) {
        const fret = fingering[i];
        if (fret === 'x') continue;

        const stringNote = INSTRUMENTS[instrument].strings[i];
        const note = getNoteByIndex(getNoteIndex(stringNote) + (typeof fret === 'number' ? fret : 0));
        foundNotes.add(note);
    }

    for (const note of foundNotes) {
        requiredNotes.delete(note);
    }

    const usedStrings = fingering.filter(f => f !== 'x').length;

    return requiredNotes.size === 0 && usedStrings >= 3;
}

// Función para calcular puntuación de digitación (mayor es mejor)
function calculateFingeringScore(fingering, instrument, chordNotes) {
    let score = 0;
    const strings = INSTRUMENTS[instrument].strings;
    const { frets, barre } = fingering;
    
    // Puntos por cuerdas usadas
    const usedStrings = frets.filter(f => f !== 'x').length;
    score += usedStrings * 10;
    
    // Penalizar trastes altos
    const maxFret = Math.max(...frets.filter(f => typeof f === 'number'));
    score -= maxFret * 2;
    
    // Bonus si empieza con la tónica
    const firstUsedString = frets.findIndex(f => f !== 'x');
    const firstUsedStringNote = strings[firstUsedString];
    const firstUsedFret = frets[firstUsedString];
    if (typeof firstUsedFret === 'number') {
        const firstNote = getNoteByIndex(getNoteIndex(firstUsedStringNote) + firstUsedFret);
        if (firstNote === chordNotes[0]) {
            score += 50; // Bonus grande por tónica en el bajo
        }
    }
    
    // Penalizar digitaciones complejas
    const usedFingers = new Set(fingering.fingers.filter(f => f !== null));
    score -= Math.max(0, usedFingers.size - 4) * 10;
    
    return score;
}

export function parseChordSequence(sequence) {
    const chordStrings = sequence.split(/\s+/).filter(s => s.length > 0);
    const chords = [];

    chordStrings.forEach(chordStr => {
        const parsed = parseChord(chordStr);
        if (parsed) {
            chords.push(parsed);
        }
    });

    return chords;
}

export function parseChord(chordStr) {
    const chordRegex = /^([A-G][#b]?)(m|maj7|m7|7|sus2|sus4|dim|aug)?$/i;
    const match = chordStr.match(chordRegex);
    
    if (!match) return null;

    let rootNote = match[1].toUpperCase();
    let chordType = (match[2] || '').toLowerCase();

    if (rootNote.includes('b')) {
        const noteMap = {'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'};
        rootNote = noteMap[rootNote] || rootNote;
    }

    const typeMap = {
        '': 'major',
        'm': 'minor',
        '7': 'dom7',
        'maj7': 'maj7',
        'm7': 'min7',
        'sus2': 'sus2',
        'sus4': 'sus4',
        'dim': 'dim',
        'aug': 'aug'
    };

    chordType = typeMap[chordType] || 'major';

    const notes = getChordNotes(rootNote, chordType);
    const symbol = rootNote + CHORD_TYPES[chordType].symbol;

    return {
        root: rootNote,
        type: chordType,
        notes: notes,
        symbol: symbol
    };
}