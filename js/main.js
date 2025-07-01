import { INSTRUMENTS, ORIGINAL_TUNINGS } from './constants.js';
import { clearInstrumentCache, getCachedFingerings } from './chord-logic.js';
import { generateSingleChord, generateChordSequence, refresh, preserveInteractionAndRefresh, createChordDiagram } from './ui.js';

document.getElementById('noteSelect').addEventListener('change', () => {
    if (!document.getElementById('chordSequence').value.trim()) {
        generateSingleChord();
    }
});

document.getElementById('chordTypeSelect').addEventListener('change', () => {
    if (!document.getElementById('chordSequence').value.trim()) {
        generateSingleChord();
    }
});

document.getElementById('chordSequence').addEventListener('input', generateChordSequence);

document.querySelectorAll('#instrumentOptions input[type="checkbox"]').forEach(cb => {
  cb.addEventListener('change', () => {
    refresh();
  });
});

document.addEventListener('change', (e) => {
  if (e.target.classList.contains('tuning-select')) {
    const instrument = e.target.getAttribute('data-instrument');
    const stringIndex = parseInt(e.target.getAttribute('data-string'), 10);
    const newNote = e.target.value;
    INSTRUMENTS[instrument].strings[stringIndex] = newNote;

    clearInstrumentCache(instrument);
    preserveInteractionAndRefresh();
  }
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('reset-tuning-btn')) {
    const instrument = e.target.getAttribute('data-instrument');
    const defaultTuning = ORIGINAL_TUNINGS[instrument].strings;

    INSTRUMENTS[instrument].strings = [...defaultTuning];

    clearInstrumentCache(instrument);

    document.querySelectorAll(`.tuning-select[data-instrument="${instrument}"]`)
      .forEach(select => {
        const stringIndex = parseInt(select.getAttribute('data-string'), 10);
        select.value = defaultTuning[stringIndex];
      });

    preserveInteractionAndRefresh();
  }

  if (e.target.classList.contains('chord-flipper')) {
    const card = e.target.closest('.sequence-card');
    const instrument = card.getAttribute('data-instrument');
    const chord = card.getAttribute('data-chord');
    const fingerings = getCachedFingerings(instrument, chord);
    let index = parseInt(card.getAttribute('data-fingering-index'), 10);

    if (e.target.classList.contains('prev')) {
        index = (index - 1 + fingerings.length) % fingerings.length;
    } else {
        index = (index + 1) % fingerings.length;
    }

    card.setAttribute('data-fingering-index', index);
    card.querySelector('.chord-diagram').innerHTML = createChordDiagram(fingerings[index], instrument);
    card.querySelector('.fret-info').innerText = `Opción ${index + 1} de ${fingerings.length}`;
  }
});

generateSingleChord();