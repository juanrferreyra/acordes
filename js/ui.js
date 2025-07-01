import { INSTRUMENTS, NOTES, ORIGINAL_TUNINGS, CHORD_TYPES } from './constants.js';
import { getNoteIndex, getNoteByIndex, getChordNotes, generateChordFingerrings, cacheFingerings, getCachedFingerings, parseChordSequence } from './chord-logic.js';

// Función para crear diagrama SVG del acorde
export function createChordDiagram(fingering, instrument) {
    const strings = INSTRUMENTS[instrument].strings;
    const stringCount = strings.length;
    const fretCount = 5;
    
    const width = 100;
    const height = 140;
    const stringSpacing = width / (stringCount - 1);
    const fretSpacing = (height - 40) / fretCount;
    
    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    
    for (let i = 0; i < stringCount; i++) {
        const x = i * stringSpacing;
        svg += `<line x1="${x}" y1="10" x2="${x}" y2="${height - 30}" stroke="#666" stroke-width="1"/>`;
    }
    
    for (let i = 0; i <= fretCount; i++) {
        const y = 10 + i * fretSpacing;
        const strokeWidth = i === 0 ? 3 : 1;
        svg += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#333" stroke-width="${strokeWidth}"/>`;
    }
    
    const { frets, barre, fingers } = fingering;
    
    if (barre) {
        const y = 10 + (barre.fret - 0.5) * fretSpacing;
        const x1 = barre.fromString * stringSpacing;
        const x2 = barre.toString * stringSpacing;
        svg += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#000" stroke-width="6" stroke-linecap="round"/>`;
        svg += `<text x="${(x1 + x2) / 2}" y="${y - 8}" text-anchor="middle" font-size="8" fill="#000">1</text>`;
    }
    
    for (let i = 0; i < frets.length; i++) {
        const x = i * stringSpacing;
        const fret = frets[i];
        const finger = fingers[i];
        
        if (fret === 'x') {
            svg += `<text x="${x}" y="8" text-anchor="middle" font-size="12" fill="red">×</text>`;
        } else if (fret === 0) {
            svg += `<circle cx="${x}" cy="8" r="4" fill="white" stroke="#333" stroke-width="2"/>`;
        } else if (finger && (!barre || fret !== barre.fret)) {
            const y = 10 + (fret - 0.5) * fretSpacing;
            svg += `<circle cx="${x}" cy="${y}" r="6" fill="#667eea"/>`;
            svg += `<text x="${x}" y="${y + 1}" text-anchor="middle" font-size="8" fill="white">${finger}</text>`;
        }
    }
    
    const noteY = height - 15;
    for (let i = 0; i < frets.length; i++) {
        const x = i * stringSpacing;
        const fret = frets[i];
        
        if (fret !== 'x') {
            const stringNote = strings[i];
            const stringNoteIndex = getNoteIndex(stringNote);
            const resultNote = getNoteByIndex(stringNoteIndex + (typeof fret === 'number' ? fret : 0));
            svg += `<text x="${x}" y="${noteY}" text-anchor="middle" font-size="10" fill="#333">${resultNote}</text>`;
        }
    }
    
    svg += '</svg>';
    return svg;
}

function createTuningPanel(instrumentKey) {
    const instrument = INSTRUMENTS[instrumentKey];
    const tuningOptions = instrument.strings.map((note, i) => {
        const select = `<select class="tuning-select" data-instrument="${instrumentKey}" data-string="${i}">
            ${NOTES.map(n => `<option value="${n}"${n === note ? ' selected' : ''}>${n}</option>`).join('')}
        </select>`;
        return `<div class='control-item'><label>${instrument.stringNames[i]}:</label> ${select}</div>`;
    }).join('');
    const tuningOptionsGroup = `<div class='control-group'>${tuningOptions}</div>`;

    return `
      <details>
        <summary>Afinación personalizada</summary>
        <div>
          ${tuningOptionsGroup}
          <button type="button" class="reset-tuning-btn" data-instrument="${instrumentKey}">🔄 Restaurar afinación estándar</button>
        </div>
      </details>
    `;
}

export function generateSingleChord() {
    const note = document.getElementById('noteSelect').value;
    const chordType = document.getElementById('chordTypeSelect').value;
    const chordNotes = getChordNotes(note, chordType);
    const chordSymbol = note + CHORD_TYPES[chordType].symbol;

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    const activeInstrumentKeys = Array.from(document.querySelectorAll('#instrumentOptions input[type="checkbox"]:checked'))
      .map(cb => cb.getAttribute('data-instrument'));

    activeInstrumentKeys.forEach(instrumentKey => {
        const instrument = INSTRUMENTS[instrumentKey];
        const fingerings = generateChordFingerrings(instrumentKey, chordNotes);

        const section = document.createElement('div');
        section.className = 'instrument-section';
        
        section.innerHTML = `
            <h3 class="instrument-title">
                <span>${instrument.icon}</span>
                ${instrument.name} - ${chordSymbol}
            </h3>
            ${createTuningPanel(instrumentKey)}
            <div class="chord-grid">
                ${fingerings.map((fingering, index) => `
                    <div class="chord-card">
                        <div class="chord-name">Opción ${index + 1}</div>
                        <div class="chord-diagram">
                            ${createChordDiagram(fingering, instrumentKey)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        resultsDiv.appendChild(section);
    });
    markModifiedTunings();
}

export function generateChordSequence() {
    const sequence = document.getElementById('chordSequence').value.trim();
    if (!sequence) {
        generateSingleChord();
        return;
    }

    const chords = parseChordSequence(sequence);
    if (chords.length === 0) {
        document.getElementById('results').innerHTML = '<div class="no-results">No se pudieron interpretar los acordes de la secuencia</div>';
        return;
    }
    
    const currentSelection = {};
    document.querySelectorAll('.sequence-card').forEach(card => {
      const key = `${card.getAttribute('data-instrument')}|${card.getAttribute('data-chord')}`;
      currentSelection[key] = parseInt(card.getAttribute('data-fingering-index'), 10);
    });
    
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <div class="sequence-section">
            <h3>Secuencia:</h3>
            <div class="sequence-chords">
                ${chords.map(chord => `<span class="sequence-chord">${chord.symbol}</span>`).join('')}
            </div>
        </div>
    `;

    const activeInstrumentKeys = Array.from(document.querySelectorAll('#instrumentOptions input[type="checkbox"]:checked'))
      .map(cb => cb.getAttribute('data-instrument'));

    activeInstrumentKeys.forEach(instrumentKey => {
        const instrument = INSTRUMENTS[instrumentKey];
        const section = document.createElement('div');
        section.className = 'instrument-section';
        
        const chordDiagrams = chords.map(chord => {
            let fingerings = getCachedFingerings(instrumentKey, chord.symbol);
            if (!fingerings.length) {
              fingerings = generateChordFingerrings(instrumentKey, chord.notes);
              cacheFingerings(instrumentKey, chord.symbol, fingerings);
            }

            const key = `${instrumentKey}|${chord.symbol}`;
            const savedIndex = currentSelection[key] ?? 0;
            const safeIndex = Math.min(savedIndex, fingerings.length - 1);
            const curFingering = fingerings[safeIndex] || null;
            
            return `
                <div class="chord-card sequence-card"
                    data-fingering-index="${safeIndex}"
                    data-instrument="${instrumentKey}"
                    data-chord="${chord.symbol}"
                    data-fingering-count="${fingerings.length}">
                    <button class="chord-flipper prev">‹</button>
                    <div class="chord-name">${chord.symbol}</div>
                    <div class="chord-diagram">
                        ${curFingering ? createChordDiagram(fingerings[safeIndex], instrumentKey) : '<div style="height:140px;display:flex;align-items:center;justify-content:center;color:#999;">N/A</div>'}
                    </div>
                    <div class="fret-info">Opción ${safeIndex + 1} de ${fingerings.length}</div>
                    <button class="chord-flipper next">›</button>
                </div>
            `;
        }).join('');

        section.innerHTML = `
            <h3 class="instrument-title">
                <span>${instrument.icon}</span>
                ${instrument.name}
            </h3>
            ${createTuningPanel(instrumentKey)}
            <div class="chord-grid">
                ${chordDiagrams}
            </div>
        `;
        
        resultsDiv.appendChild(section);
    });
    markModifiedTunings();
}

export function refresh() {
    const sequence = document.getElementById('chordSequence').value.trim();
    if (sequence) {
      generateChordSequence();
    } else {
      generateSingleChord();
    }
}

export function markModifiedTunings() {
  Object.keys(INSTRUMENTS).forEach(instrument => {
    const current = INSTRUMENTS[instrument].strings;
    const original = ORIGINAL_TUNINGS[instrument].strings;

    let modified = false;

    current.forEach((note, i) => {
      const sel = document.querySelector(`.tuning-select[data-instrument="${instrument}"][data-string="${i}"]`);
      if (!sel) return;

      const isChanged = note !== original[i];
      sel.classList.toggle('modified', isChanged);
      if (isChanged) modified = true;
    });

    const details = document.querySelector(`.instrument-section .reset-tuning-btn[data-instrument="${instrument}"]`)
                      ?.closest('.instrument-section')
                      ?.querySelector('details');
    if (details) {
      details.classList.toggle('modified', modified);
    }
  });
}

export function preserveInteractionAndRefresh() {
  const active = document.activeElement;
  const activeId = active?.id || null;
  const activeData = active?.getAttribute('data-instrument') || null;
  const activeType = active?.classList?.contains('tuning-select') ? 'select'
                     : active?.classList?.contains('reset-tuning-btn') ? 'button'
                     : null;

  const openDetails = Array.from(document.querySelectorAll('.instrument-section details'))
    .filter(d => d.open)
    .map(d => d.closest('.instrument-section')?.querySelector('.reset-tuning-btn')?.getAttribute('data-instrument'));

  refresh();

  setTimeout(() => {
    openDetails.forEach(instrument => {
      const section = document.querySelector(`.instrument-section .reset-tuning-btn[data-instrument="${instrument}"]`)?.closest('.instrument-section');
      section?.querySelector('details')?.setAttribute('open', '');
    });

    if (activeType === 'select') {
      const el = document.querySelector(`.tuning-select[data-instrument="${activeData}"][data-string="${active.getAttribute('data-string')}"]`);
      el?.focus();
    } else if (activeType === 'button') {
      const el = document.querySelector(`.reset-tuning-btn[data-instrument="${activeData}"]`);
      el?.focus();
    }
    markModifiedTunings();
  }, 10);
}
