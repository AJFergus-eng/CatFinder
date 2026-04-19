export const SPECIES_COLORS: Record<string, string> = { 
  'Abyssinian':             '#E07B54',
  'Bengal':                 '#A78BFA',
  'Birman':                 '#F472B6',
  'Bombay':                 '#6EE7B7',
  'British_Shorthair':      '#FCD34D',
  'Egyptian_Mau':           '#93C5FD',
  'Maine_Coon':             '#F87171',
  'Persian':                '#34D399',
  'Ragdoll':                '#FB923C',
  'Russian_Blue':           '#818CF8',
  'Siamese':                '#4ADE80',
  'Sphynx':                 '#60A5FA',
};

export const DEFAULT_COLOR = '#94A3B8';

export function getSpeciesColor(species: string): string {
  const key = (species || '').toLowerCase().trim();
  for (const [name, color] of Object.entries(SPECIES_COLORS)) {
    if (key.includes(name)) return color;
  }
  return DEFAULT_COLOR;
}

export function fuzzyCoords(lat: number, lng: number): { lat: number; lng: number } {
  // 1 mile ≈ 0.01449 degrees, 0.25 miles ≈ 0.00362 degrees
const min = 0.000724; // ~0.5 miles
const max = 0.00145; // ~0.1 miles
  const offset = () => {
    const magnitude = min + Math.random() * (max - min);
    return Math.random() < 0.5 ? magnitude : -magnitude;
  };
  return { lat: lat + offset(), lng: lng + offset() };
}