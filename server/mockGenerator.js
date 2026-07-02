import { query } from './db.js';
import { detectBrand } from './brandDetector.js';

const CITIES = [
  'Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Timur', 'Jakarta Barat', 'Jakarta Utara',
  'Bandung Dago', 'Bandung Buahbatu', 'Surabaya Barat', 'Surabaya Timur', 'Medan Baru',
  'Makassar Panakkukang', 'Semarang Candi', 'Bekasi Kota', 'Depok Margonda', 'Tangerang Serpong',
  'Bogor Pajajaran', 'Malang Dinoyo', 'Yogyakarta Kaliurang', 'Solo Adisucipto', 'Denpasar Renon',
  'Palembang Sudirman', 'Pekanbaru City', 'Balikpapan Center', 'Samarinda Ulu'
];

const BRAND_DISTRIBUTIONS = {
  'les-privat': { name: 'Les Privat', target: 320, keyword: 'Les Privat' },
  'brainacademy': { name: 'Brainacademy', target: 280, keyword: 'Brainacademy' },
  'englishacademy': { name: 'Englishacademy', target: 210, keyword: 'Englishacademy' },
  'mathchamps': { name: 'Mathchamps', target: 140, keyword: 'Mathchamps' },
  'ruangguru-coding': { name: 'Ruangguru Coding', target: 110, keyword: 'Ruangguru Coding' },
  'workabroad-academy': { name: 'Workabroad Academy', target: 65, keyword: 'Workabroad Academy' },
  'wonderlab': { name: 'Wonderlab', target: 45, keyword: 'Wonderlab' },
  'altaglobalschool': { name: 'Altaglobalschool', target: 30, keyword: 'Altaglobalschool' }
};

export async function generateMockData() {
  console.log('Memulai pembuatan mock data (~1200 cabang)...');
  
  // Clean up existing data first
  await query.exec('DELETE FROM profiles');
  await query.exec('DELETE FROM profile_metrics');
  await query.exec('DELETE FROM photo_checklists');
  await query.exec('DELETE FROM brand_mappings');
  await query.exec('DELETE FROM sync_runs');
  await query.exec('DELETE FROM import_runs');

  const timestamp = new Date().toISOString();
  let totalGenerated = 0;
  let storeCounter = 1000;

  // Begin database transaction for high performance
  await query.exec('BEGIN TRANSACTION');

  try {
    // 1. Generate Canonical Brand profiles
    for (const [brandId, dist] of Object.entries(BRAND_DISTRIBUTIONS)) {
      for (let i = 1; i <= dist.target; i++) {
        const city = CITIES[(i + storeCounter) % CITIES.length];
        const storeCode = `RG-${brandId.substring(0, 3).toUpperCase()}-${storeCounter++}`;
        const profileName = `${dist.keyword} - ${city} ${i}`;
        const locationId = `loc_${brandId}_${i}_${Math.floor(Math.random() * 100000)}`;
        
        await insertProfile(locationId, profileName, storeCode, city, timestamp);
        totalGenerated++;
      }
    }

    // 2. Generate Ambiguous Profiles needing review (~50 profiles)
    const ambiguousPrefixes = [
      'Bimbel RG', 'Les Privat Hebat', 'RG Coding & Camp', 
      'Pusat Belajar English', 'Math Champs Center', 'Wonderlab Tech'
    ];
    
    for (let i = 1; i <= 50; i++) {
      const city = CITIES[i % CITIES.length];
      const storeCode = `RG-AMB-${storeCounter++}`;
      const prefix = ambiguousPrefixes[i % ambiguousPrefixes.length];
      const profileName = `${prefix} - ${city} ${i}`; // Will trigger needs_review
      const locationId = `loc_amb_${i}_${Math.floor(Math.random() * 100000)}`;

      await insertProfile(locationId, profileName, storeCode, city, timestamp);
      totalGenerated++;
    }

    await query.exec('COMMIT');
    console.log(`Mock data berhasil dibuat. Total cabang: ${totalGenerated}`);
    
    // Save a successful sync run log
    await query.run(`
      INSERT INTO sync_runs (status, started_at, finished_at, profiles_seen, profiles_success, profiles_failed, error_summary)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['success', timestamp, timestamp, totalGenerated, totalGenerated, 0, null]);

  } catch (error) {
    await query.exec('ROLLBACK');
    console.error('Gagal membuat mock data, transaction rolled back:', error.message);
    throw error;
  }
}

async function insertProfile(locationId, profileName, storeCode, city, timestamp) {
  // Determine Profile Status probability:
  // 88% verified, 6% need_verification, 3% rejected, 2% permanently_closed, 1% temporarily_closed
  const roll = Math.random() * 100;
  let profileStatus = 'verified';
  let rawStatusReason = null;

  if (roll > 99) {
    profileStatus = 'temporarily_closed';
  } else if (roll > 97) {
    profileStatus = 'permanently_closed';
  } else if (roll > 94) {
    profileStatus = 'rejected';
    rawStatusReason = 'GUIDELINE_VIOLATION: Quality of location details is suspicious';
  } else if (roll > 88) {
    profileStatus = 'need_verification';
    rawStatusReason = 'Merchant needs voice verification or video upload';
  }

  // Detect Brand automatically using brandDetector
  const { brandId, status: brandMappingStatus } = detectBrand(profileName);

  // Insert to profiles
  await query.run(`
    INSERT INTO profiles (
      location_id, account_id, profile_name, store_code, address, city,
      brand_id, brand_mapping_status, profile_status, raw_status_reason,
      last_seen_at, last_synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    locationId, 'acc_ruangguru_123', profileName, storeCode,
    `Jl. Jenderal Sudirman No. ${Math.floor(Math.random() * 100) + 1}, ${city}`, city,
    brandId, brandMappingStatus, profileStatus, rawStatusReason,
    timestamp, timestamp
  ]);

  // Insert to profile_metrics
  // Generate Clicks: Clicks are N/A for closed/rejected locations occasionally to test compliance
  const isMetricsAvailable = profileStatus !== 'rejected' && profileStatus !== 'permanently_closed';
  
  // Rating distributions: 80% excellent (4.5 - 4.9), 15% standard (4.0 - 4.4), 5% problematic (2.1 - 3.8)
  const ratingRoll = Math.random() * 100;
  let rating = 4.5 + Math.random() * 0.4;
  if (ratingRoll > 95) {
    rating = 2.1 + Math.random() * 1.7; // Low rating
  } else if (ratingRoll > 80) {
    rating = 4.0 + Math.random() * 0.4; // Mid rating
  }
  rating = Math.round(rating * 10) / 10;

  const totalReviews = Math.floor(Math.random() * 250) + 1; // 1 to 250 reviews
  const websiteClicks = Math.floor(Math.random() * 2000) + 20;
  const phoneCallClicks = Math.floor(Math.random() * 800) + 5;

  await query.run(`
    INSERT INTO profile_metrics (
      location_id, period_start, period_end, website_clicks, phone_call_clicks,
      rating, total_reviews, metric_sync_status, partial_error, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    locationId,
    '2026-05-01', '2026-05-28', // Last 28 days default range
    isMetricsAvailable ? websiteClicks : null,
    isMetricsAvailable ? phoneCallClicks : null,
    isMetricsAvailable ? rating : null,
    isMetricsAvailable ? totalReviews : null,
    'success', null, timestamp
  ]);

  // Insert to photo_checklists:
  // Random checkbox checklist values (0 or 1)
  const hasInterior = Math.random() > 0.3 ? 1 : 0;
  const hasBuilding = Math.random() > 0.25 ? 1 : 0;
  const hasLearning = Math.random() > 0.4 ? 1 : 0;

  await query.run(`
    INSERT INTO photo_checklists (
      location_id, has_interior_photo, has_building_photo, has_learning_activity_photo, note, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `, [
    locationId, hasInterior, hasBuilding, hasLearning,
    Math.random() > 0.8 ? 'Dokumen foto lengkap diperiksa oleh SPV.' : null,
    timestamp
  ]);

  // Insert to brand_mappings (auto or manual sync records)
  if (brandId) {
    await query.run(`
      INSERT INTO brand_mappings (location_id, brand_id, source, updated_at)
      VALUES (?, ?, ?, ?)
    `, [locationId, brandId, 'auto', timestamp]);
  }
}
