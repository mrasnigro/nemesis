/**
 * Escolher Avatar gallery.
 * First set: portraits from /avatar (copied into public).
 * Second set: local Unsplash crops already in public/training-ai/avatars.
 */
const FOLDER_PORTRAITS = [
  '01_asian_woman_blazer.webp',
  '02_black_man_suit.webp',
  '03_latina_woman_business.webp',
  'black_guy_studio.webp',
  'ceo_headshot.webp',
  'girl_golden_hour.webp',
  'guy_rooftop_sunset.webp',
  'lawyer_office.webp',
  'paris_cafe.webp',
  'plaid_suit_man.webp',
  'startup_founder.webp',
]

const UNSPLASH_COUNT = 24

export const STOCK_AVATARS = [
  ...FOLDER_PORTRAITS.map((file) => ({
    id: `folder_${file.replace(/\.[^.]+$/, '')}`,
    src: `/training-ai/avatars/${file}`,
  })),
  ...Array.from({ length: UNSPLASH_COUNT }, (_, index) => {
    const n = String(index + 1).padStart(2, '0')
    return {
      id: `stock_${index + 1}`,
      src: `/training-ai/avatars/p${n}.jpg`,
    }
  }),
]

export const AVATAR_PAGE_SIZE = 12
