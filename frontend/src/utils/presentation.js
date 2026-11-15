export const cropPhotos = {
  bean: { src: '/images/bean.webp', alt: 'Freshly harvested green beans' },
  potato: { src: '/images/potato.webp', alt: 'Harvested potatoes with earthy skins' },
  tomato: { src: '/images/tomato.webp', alt: 'Fresh red tomatoes' },
  cucumber: { src: '/images/cucumber.webp', alt: 'Fresh green cucumbers' },
  wheat: { src: '/images/farmland.webp', alt: 'Green cereal crops growing in a field' },
};
export function plantingSeason(farm) {
  return new Date(farm.plantingYear, farm.plantingMonth - 1).toLocaleDateString('en', { month: 'long', year: 'numeric' });
}
export function cropReason(item) {
  const ph = item.components.soil.subscores?.ph;
  const temp = item.components.climate.subscores?.temperature;
  if (ph >= 80 && temp >= 80) return 'Your soil pH and historical temperatures suit this crop.';
  if (ph >= 80) return 'Your soil pH suits this crop; check the seasonal fit.';
  if (temp >= 80) return 'Historical temperatures suit this crop; soil needs review.';
  return 'A possible option with conditions to review.';
}

