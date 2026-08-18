/**
 * Seed data — two merchants, realistic products and stock.
 * Idempotent: drops existing seed rows before re-inserting. Safe to call any time.
 */
import { DatabaseService } from './database.service';
import { nanoid } from 'nanoid';

type Variant = {
  name: string;
  attributes: Record<string, string>;
  stock: number;
  threshold: number;
};

type Product = {
  name: string;
  sku: string;
  category: string;
  description: string;
  variants: Variant[];
};

type MerchantSeed = {
  name: string;
  slug: string;
  category: string;
  ownerName: string;
  alertEmail: string;
  defaultThreshold: number;
  products: Product[];
};

const now = () => new Date().toISOString();

/* -------------------- Aquarius Cosmetics -------------------- */

/**
 * Hand-curated "hero" colors we always want in the demo. Keep Forest Green here
 * explicitly per the brief ("sold in 5ml, 15ml, and 18ml") and the other
 * named colors so existing smoke-test assertions and screenshot stories stay
 * stable across re-seeds.
 */
const AQUARIUS_HERO_COLORS: Array<{ color: string; popular: boolean; sizes: string[] }> = [
  { color: 'Forest Green', popular: true, sizes: ['5ml', '15ml', '18ml'] },
  { color: 'Starry Night', popular: true, sizes: ['5ml', '15ml'] },
  { color: 'Coral Sunset', popular: true, sizes: ['5ml', '15ml', '18ml'] },
  { color: 'Midnight Plum', popular: false, sizes: ['5ml', '15ml'] },
  { color: 'Iced Lavender', popular: true, sizes: ['5ml', '15ml', '18ml'] },
  { color: 'Bare Necessity', popular: false, sizes: ['5ml', '15ml'] },
  { color: 'Rose Quartz', popular: true, sizes: ['5ml', '15ml', '18ml'] },
  { color: 'Cosmic Black', popular: true, sizes: ['5ml'] },
  { color: 'Mocha Swirl', popular: false, sizes: ['15ml', '18ml'] },
  { color: 'Glacier Blue', popular: false, sizes: ['5ml', '15ml'] },
  { color: 'Honey Glow', popular: false, sizes: ['5ml', '15ml', '18ml'] },
  { color: 'Silver Lining', popular: true, sizes: ['5ml', '15ml'] },
];

/**
 * Generated color names so the seed actually paints at the scale the brief
 * describes ("hundreds of nail polish colors"). Deterministic — no Math.random
 * in the name itself — so the SKU space is reproducible across re-seeds.
 */
const COLOR_ADJECTIVES = [
  'Antique', 'Amber', 'Apricot', 'Autumn', 'Aurora', 'Bay', 'Berry', 'Bordeaux',
  'Bramble', 'Bronze', 'Burnt', 'Butter', 'Candy', 'Canyon', 'Caramel', 'Carmine',
  'Cashmere', 'Cedar', 'Champagne', 'Cherry', 'Citrine', 'Cobalt', 'Copper', 'Coral',
  'Cosmic', 'Crimson', 'Crystal', 'Dahlia', 'Daisy', 'Dawn', 'Denim', 'Desert',
  'Dune', 'Dusty', 'Emerald', 'Ember', 'Espresso', 'Evergreen', 'Faded', 'Fern',
  'Festive', 'Fire', 'Forest', 'Frosted', 'Fuchsia', 'Galaxy', 'Garnet', 'Gilded',
  'Glacial', 'Glow', 'Golden', 'Grape', 'Hazy', 'Heather', 'Hibiscus', 'Honey',
  'Icicle', 'Imperial', 'Indigo', 'Ink', 'Iris', 'Iron', 'Ivory', 'Jade',
  'Jasmine', 'Juniper', 'Khaki', 'Lace', 'Lagoon', 'Lavender', 'Lemon', 'Lilac',
  'Linen', 'Lotus', 'Magenta', 'Mahogany', 'Maple', 'Marigold', 'Marina', 'Marsh',
  'Mauve', 'Meadow', 'Mercury', 'Midnight', 'Mint', 'Misty', 'Mocha', 'Mojave',
  'Mulberry', 'Mustard', 'Navy', 'Neon', 'Nude', 'Oasis', 'Ochre', 'Olive',
  'Onyx', 'Opal', 'Orchid', 'Pacific', 'Paisley', 'Pavement', 'Peach', 'Pearl',
  'Pebble', 'Periwinkle', 'Pewter', 'Pine', 'Pink', 'Pistachio', 'Plum', 'Pomegranate',
  'Poppy', 'Powder', 'Pumpkin', 'Quartz', 'Rain', 'Raspberry', 'Regal', 'River',
  'Rose', 'Rosewood', 'Ruby', 'Rust', 'Saffron', 'Sage', 'Salsa', 'Sand',
  'Sapphire', 'Scarlet', 'Sea', 'Sepia', 'Shadow', 'Shamrock', 'Sherbet', 'Sienna',
  'Silk', 'Silver', 'Sky', 'Slate', 'Smoke', 'Snow', 'Spice', 'Spruce',
  'Star', 'Steel', 'Stone', 'Storm', 'Sugar', 'Sunset', 'Tangerine', 'Teal',
  'Thunder', 'Topaz', 'Tropical', 'Tulip', 'Tuscany', 'Twilight', 'Velvet', 'Vintage',
  'Violet', 'Walnut', 'Wheat', 'White', 'Wild', 'Wine', 'Winter', 'Wisteria',
];

const COLOR_NOUNS = [
  'Beach', 'Berry', 'Blossom', 'Breeze', 'Cabin', 'Canyon', 'Charm', 'Cloud',
  'Cove', 'Cream', 'Dawn', 'Dream', 'Dusk', 'Ember', 'Fairy', 'Feather',
  'Field', 'Fire', 'Fog', 'Forest', 'Garden', 'Glow', 'Harbor', 'Haze',
  'Heaven', 'Hills', 'Horizon', 'Hush', 'Island', 'Jewel', 'Kiss', 'Lagoon',
  'Lake', 'Leaf', 'Light', 'Lily', 'Meadow', 'Mirage', 'Mist', 'Moon',
  'Morn', 'Moth', 'Mountain', 'Nebula', 'Night', 'Oasis', 'Orchard', 'Peony',
  'Petal', 'Plume', 'Pool', 'Prairie', 'Rain', 'Reef', 'River', 'Rose',
  'Sand', 'Sea', 'Shadow', 'Shore', 'Silk', 'Sky', 'Smoke', 'Snow',
  'Spark', 'Star', 'Stone', 'Storm', 'Stream', 'Sun', 'Sunrise', 'Tide',
  'Twilight', 'Valley', 'Velvet', 'Vine', 'Wave', 'Whisper', 'Wisp', 'Wish',
];

/** Build the full color list: heroes + generated. No duplicates. */
function buildAquariusColors(): Array<{ color: string; popular: boolean; sizes: string[] }> {
  const seen = new Set(AQUARIUS_HERO_COLORS.map((c) => c.color.toLowerCase()));
  const generated: Array<{ color: string; popular: boolean; sizes: string[] }> = [];

  // Deterministic pseudo-random based on (i, j) so seed is reproducible.
  const rng = (seed: number) => {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  };

  let seed = 1;
  for (let i = 0; i < COLOR_ADJECTIVES.length && generated.length < 120; i++) {
    for (let j = 0; j < COLOR_NOUNS.length && generated.length < 120; j++) {
      const adj = COLOR_ADJECTIVES[i];
      const noun = COLOR_NOUNS[j];
      // Skip adjective-only (e.g. "Forest Green" → already have a hero); use "<Adj> <Noun>" combo.
      const name = `${adj} ${noun}`;
      if (seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());

      // Popularity: ~25% of generated colors are popular best-sellers.
      const r = rng(seed++)();
      const popular = r < 0.25;

      // Sizes: most colors come in 2-3 sizes; some only one (rare/limited).
      const sizeRoll = rng(seed++)();
      const sizes =
        sizeRoll < 0.55
          ? ['5ml', '15ml', '18ml']
          : sizeRoll < 0.85
          ? ['5ml', '15ml']
          : sizeRoll < 0.95
          ? ['15ml', '18ml']
          : ['5ml'];

      generated.push({ color: name, popular, sizes });
    }
  }
  return [...AQUARIUS_HERO_COLORS, ...generated];
}

const AQUARIUS_NAIL_POLISH_COLORS = buildAquariusColors();

/** Low-stock for popular colors to demo the alert immediately. */
function popularStockMultiplier(popular: boolean): number {
  return popular ? 1 : 6;
}

const AQUARIUS: MerchantSeed = {
  name: 'Aquarius Cosmetics',
  slug: 'aquarius',
  category: 'Cosmetics',
  ownerName: 'Marybeth (day-to-day: daughter Ashley)',
  alertEmail: 'ashley@aquarius.example',
  defaultThreshold: 5,
  products: AQUARIUS_NAIL_POLISH_COLORS.map(({ color, popular, sizes }) => {
    const mult = popularStockMultiplier(popular);
    return {
      name: `${color} Nail Polish`,
      sku: color.replace(/\s+/g, '-').toUpperCase(),
      category: 'Nail Polish',
      description: `${color} — a ${popular ? 'best-seller' : 'staff pick'} available in ${sizes.join(', ')}.`,
      variants: sizes.map((size) => {
        // popular colors have stock near threshold to show alerts right away
        const baseStock = popular ? Math.max(0, Math.floor(Math.random() * 3)) : 8 + Math.floor(Math.random() * 30);
        const stock = Math.min(baseStock * mult, 60);
        const threshold = popular ? 5 : size === '5ml' ? 6 : size === '15ml' ? 4 : 3;
        return {
          name: `${size} bottle`,
          attributes: { color, size },
          stock,
          threshold,
        };
      }),
    };
  }),
};

/* -------------------- Mountain House Furniture -------------------- */

const MOUNTAIN_HOUSE: MerchantSeed = {
  name: 'Mountain House',
  slug: 'mountain-house',
  category: 'Furniture & Home Decor',
  ownerName: 'David',
  alertEmail: 'david@mountainhouse.example',
  defaultThreshold: 2,
  products: [
    {
      name: 'Brooklyn Tripod Lamp',
      sku: 'LAMP-BRK-TRP',
      category: 'Lighting',
      description: 'Mid-century inspired tripod floor lamp with walnut legs and linen shade.',
      variants: [
        { name: 'Walnut / Natural Shade', attributes: { finish: 'Walnut', shade: 'Natural' }, stock: 1, threshold: 2 },
      ],
    },
    {
      name: 'Hudson Lounge Chair',
      sku: 'CHR-HUD-LNG',
      category: 'Seating',
      description: 'Low-profile lounge chair, performance fabric, brass legs.',
      variants: [
        { name: 'Charcoal', attributes: { fabric: 'Charcoal' }, stock: 4, threshold: 2 },
        { name: 'Sand', attributes: { fabric: 'Sand' }, stock: 2, threshold: 2 },
        { name: 'Forest', attributes: { fabric: 'Forest' }, stock: 5, threshold: 2 },
      ],
    },
    {
      name: 'Asheville Wool Throw',
      sku: 'THR-ASH-WOOL',
      category: 'Throws',
      description: 'Heavy wool throw, mountain-loom dyed.',
      variants: [
        { name: 'Slate', attributes: { color: 'Slate' }, stock: 7, threshold: 3 },
        { name: 'Ochre', attributes: { color: 'Ochre' }, stock: 3, threshold: 3 },
      ],
    },
    {
      name: 'Marquette Side Table',
      sku: 'TBL-MRQ-SDE',
      category: 'Tables',
      description: 'Round side table, travertine top, black steel base.',
      variants: [
        { name: 'Travertine / Black', attributes: { top: 'Travertine', base: 'Black' }, stock: 2, threshold: 2 },
      ],
    },
    {
      name: 'Cascade Ceramic Vase',
      sku: 'VSE-CSC-CRM',
      category: 'Decor',
      description: 'Hand-thrown ceramic vase, matte finish.',
      variants: [
        { name: 'Small / Cream', attributes: { size: 'Small', color: 'Cream' }, stock: 9, threshold: 3 },
        { name: 'Large / Charcoal', attributes: { size: 'Large', color: 'Charcoal' }, stock: 2, threshold: 2 },
      ],
    },
    {
      name: 'Blackwater Brass Mirror',
      sku: 'MIR-BLK-BRS',
      category: 'Mirrors',
      description: 'Round wall mirror with brass frame.',
      variants: [
        { name: '24"', attributes: { diameter: '24"' }, stock: 3, threshold: 2 },
        { name: '30"', attributes: { diameter: '30"' }, stock: 1, threshold: 2 },
      ],
    },
    {
      name: 'Smoky Mountain Candle',
      sku: 'CND-SMK-MNT',
      category: 'Decor',
      description: 'Soy candle, smoked-cedar scent.',
      variants: [
        { name: '8oz', attributes: { size: '8oz' }, stock: 14, threshold: 4 },
        { name: '16oz', attributes: { size: '16oz' }, stock: 6, threshold: 3 },
      ],
    },
    {
      name: 'Cobblestone Coasters (Set of 4)',
      sku: 'CST-CBL-4PK',
      category: 'Decor',
      description: 'Cork-backed stone coasters.',
      variants: [
        { name: 'Slate', attributes: { color: 'Slate' }, stock: 8, threshold: 3 },
        { name: 'Sand', attributes: { color: 'Sand' }, stock: 5, threshold: 3 },
      ],
    },
    {
      name: 'Riviera Woven Rug',
      sku: 'RUG-RIV-WVN',
      category: 'Rugs',
      description: 'Cotton-woven runner, hand-loomed.',
      variants: [
        { name: '2x6 ft', attributes: { size: '2x6 ft' }, stock: 3, threshold: 2 },
        { name: '4x6 ft', attributes: { size: '4x6 ft' }, stock: 1, threshold: 2 },
      ],
    },
    {
      name: 'Lakeside Bookshelf',
      sku: 'SHF-LKS-BK',
      category: 'Storage',
      description: 'Solid pine 5-shelf bookcase.',
      variants: [
        { name: 'Natural Pine', attributes: { finish: 'Natural Pine' }, stock: 2, threshold: 2 },
      ],
    },
  ],
};

const SEEDS: MerchantSeed[] = [AQUARIUS, MOUNTAIN_HOUSE];

export function seedAll(db: DatabaseService): { merchants: number; products: number; variants: number } {
  // Wipe in dependency order.
  db.exec(`
    DELETE FROM audit_log;
    DELETE FROM alerts;
    DELETE FROM inventory;
    DELETE FROM product_variants;
    DELETE FROM products;
    DELETE FROM merchants;
  `);

  let mCount = 0;
  let pCount = 0;
  let vCount = 0;

  const insertMerchant = db.prepare(
    `INSERT INTO merchants (id, name, slug, category, owner_name, alert_email, default_threshold, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertProduct = db.prepare(
    `INSERT INTO products (id, merchant_id, name, sku, category, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertVariant = db.prepare(
    `INSERT INTO product_variants (id, product_id, name, attributes_json, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const insertInventory = db.prepare(
    `INSERT INTO inventory (id, variant_id, stock_qty, threshold, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  );

  db.tx(() => {
    for (const m of SEEDS) {
      const mid = nanoid();
      insertMerchant.run(mid, m.name, m.slug, m.category, m.ownerName, m.alertEmail, m.defaultThreshold, now());
      mCount++;

      for (const p of m.products) {
        const pid = nanoid();
        insertProduct.run(pid, mid, p.name, p.sku, p.category, p.description, now());
        pCount++;

        for (const v of p.variants) {
          const vid = nanoid();
          insertVariant.run(vid, pid, v.name, JSON.stringify(v.attributes ?? {}), now());
          insertInventory.run(nanoid(), vid, v.stock, v.threshold, now());
          vCount++;
        }
      }
    }
  });

  return { merchants: mCount, products: pCount, variants: vCount };
}
