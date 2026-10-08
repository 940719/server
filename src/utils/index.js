export const deepClone = (obj, hash = new WeakMap()) => {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (hash.has(obj)) {
    return hash.get(obj);
  }
  const copyObj = Array.isArray(obj) ? [] : {};
  hash.set(obj, copyObj);
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      copyObj[key] = deepClone(obj[key], hash);
    }
  }
  return copyObj;
};
const origin = { a: 1, b: { c: 2 } };
export const copy = structuredClone(origin);
