/**
 * ================================================================
 * SERVICE: BRAND DETECTION ENGINE
 * ================================================================
 */

export const BRANDS = {
  'les-privat': { id: 'les-privat', name: 'Les Privat', color: '#0f9488' },
  'brainacademy': { id: 'brainacademy', name: 'Brainacademy', color: '#0284c7' },
  'englishacademy': { id: 'englishacademy', name: 'Englishacademy', color: '#e11d48' },
  'mathchamps': { id: 'mathchamps', name: 'Mathchamps', color: '#16a34a' },
  'ruangguru-coding': { id: 'ruangguru-coding', name: 'Ruangguru Coding', color: '#7c3aed' },
  'workabroad-academy': { id: 'workabroad-academy', name: 'Workabroad Academy', color: '#d97706' },
  'wonderlab': { id: 'wonderlab', name: 'Wonderlab', color: '#db2777' },
  'altaglobalschool': { id: 'altaglobalschool', name: 'Altaglobalschool', color: '#4f46e5' }
};

/**
 * Mendeteksi brand dari nama profil Google Business Profile.
 * @param {string} profileName Nama lokasi bisnis.
 * @returns {object} { brandId: string | null, status: 'auto' | 'needs_review' }
 */
export function detectBrand(profileName) {
  if (!profileName) {
    return { brandId: null, status: 'needs_review' };
  }

  // Normalisasi string: lowercase, hilangkan tanda baca & spasi ekstra
  const normalized = profileName
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Definisikan alias pencocokan brand
  const rules = [
    { brandId: 'brainacademy', keywords: ['brainacademy', 'brain academy', 'ba'] },
    { brandId: 'englishacademy', keywords: ['englishacademy', 'english academy', 'ea'] },
    { brandId: 'mathchamps', keywords: ['mathchamps', 'math champs'] },
    { brandId: 'ruangguru-coding', keywords: ['ruangguru coding', 'rg coding', 'ruanggurucoding'] },
    { brandId: 'workabroad-academy', keywords: ['workabroad academy', 'workabroad', 'work abroad'] },
    { brandId: 'wonderlab', keywords: ['wonderlab', 'wonder lab'] },
    { brandId: 'altaglobalschool', keywords: ['altaglobalschool', 'alta global', 'altaglobal', 'alta global school'] },
    { brandId: 'les-privat', keywords: ['les privat', 'lesprivat', 'privat ruangguru'] }
  ];

  const matchedBrands = [];

  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        matchedBrands.push(rule.brandId);
        break; // Lanjut ke brand berikutnya bila keyword ini sudah match
      }
    }
  }

  // Evaluasi kecocokan
  if (matchedBrands.length === 1) {
    return { brandId: matchedBrands[0], status: 'auto' };
  }
  
  // Jika match lebih dari 1 (ambigu) atau tidak ada match (0), set needs_review
  return { brandId: null, status: 'needs_review' };
}
