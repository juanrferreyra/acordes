export const INSTRUMENTS = {
    guitar: {
        name: 'Guitarra',
        icon: '🎸',
        strings: ['E', 'A', 'D', 'G', 'B', 'E'],
        stringNames: ['6ta', '5ta', '4ta', '3ra', '2da', '1ra']
    },
    charango: {
        name: 'Charango',
        icon: '🪕',
        strings: ['G', 'C', 'E', 'A', 'E'],
        stringNames: ['5ta', '4ta', '3ra', '2da', '1ra']
    },
    ronroco: {
        name: 'Ronroco/Maulincho',
        icon: '🎻',
        strings: ['D', 'G', 'B', 'E', 'B'],
        stringNames: ['5ta', '4ta', '3ra', '2da', '1ra']
    },
    ukulele: {
        name: 'Ukelele',
        icon: '🎤',
        strings: ['G', 'C', 'E', 'A'],
        stringNames: ['4ta', '3ra', '2da', '1ra']
    }
};

export const ORIGINAL_TUNINGS = JSON.parse(JSON.stringify(INSTRUMENTS));

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const CHORD_TYPES = {
    major: { name: 'Mayor', intervals: [0, 4, 7], symbol: '' },
    minor: { name: 'Menor', intervals: [0, 3, 7], symbol: 'm' },
    dom7: { name: 'Séptima dominante', intervals: [0, 4, 7, 10], symbol: '7' },
    maj7: { name: 'Séptima mayor', intervals: [0, 4, 7, 11], symbol: 'maj7' },
    min7: { name: 'Séptima menor', intervals: [0, 3, 7, 10], symbol: 'm7' },
    sus2: { name: 'Suspendido 2', intervals: [0, 2, 7], symbol: 'sus2' },
    sus4: { name: 'Suspendido 4', intervals: [0, 5, 7], symbol: 'sus4' },
    dim: { name: 'Disminuido', intervals: [0, 3, 6], symbol: 'dim' },
    aug: { name: 'Aumentado', intervals: [0, 4, 8], symbol: 'aug' }
};