import { Layer } from "../types";

export function compareLayerIdsAsc(a: Layer, b: Layer) {
  const aNum = Number(a.id);
  const bNum = Number(b.id);
  const bothNumeric = Number.isFinite(aNum) && Number.isFinite(bNum);

  if (bothNumeric) {
    return aNum - bNum;
  }

  return a.id.localeCompare(b.id, undefined, { numeric: true });
}
