export function distance(a, b) {
  let d = 0;

  d += (a.price - b.price) ** 2;
  d += (a.capacity - b.capacity) ** 2;

  if (a.category !== b.category) d += 1000;

  return Math.sqrt(d);
}