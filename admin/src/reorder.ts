export type Lift = {
  id: number | string;
  from: number;
  to: number;
  tops: number[];
  heights: number[];
};

export function insertionIndex(y: number, tops: number[], heights: number[], from: number) {
  let at = 0;
  for (let index = 0; index < tops.length; index += 1) {
    if (index === from) continue;
    if (y < tops[index] + heights[index] / 2) return at;
    at += 1;
  }
  return at;
}

export function shiftsFor(from: number, to: number, tops: number[], heights: number[]) {
  const order: number[] = [];
  for (let index = 0; index < tops.length; index += 1) if (index !== from) order.push(index);
  order.splice(Math.max(0, Math.min(to, order.length)), 0, from);
  const gap = tops.length > 1 ? tops[1] - tops[0] - heights[0] : 0;
  const desired = new Array<number>(tops.length);
  let y = tops[0] ?? 0;
  for (const original of order) {
    desired[original] = y;
    y += heights[original] + gap;
  }
  return desired.map((top, index) => (index === from ? 0 : top - tops[index]));
}

export function applyInsert<T>(list: T[], from: number, to: number) {
  if (from === to) return list;
  const next = list.slice();
  const [moving] = next.splice(from, 1);
  if (!moving) return list;
  next.splice(to, 0, moving);
  return next;
}
