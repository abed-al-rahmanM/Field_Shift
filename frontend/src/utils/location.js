export function validLocation(value) {
  return Number.isFinite(value?.latitude) && Math.abs(value.latitude)<=90 && Number.isFinite(value?.longitude) && Math.abs(value.longitude)<=180;
}

