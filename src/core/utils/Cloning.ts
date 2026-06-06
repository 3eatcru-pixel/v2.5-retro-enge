/**
 * Safe, robust clone function that preserves prototypes (class instances)
 * and correctly duplicates native types like Dates, Maps, and Sets.
 */
export function safeDeepClone<T>(obj: T, seen = new WeakMap<any, any>()): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (seen.has(obj)) {
    return seen.get(obj);
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }
  
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as any;
  }
  
  if (obj instanceof Map) {
    const clone = new Map();
    seen.set(obj, clone);
    obj.forEach((value, key) => {
      clone.set(safeDeepClone(key, seen), safeDeepClone(value, seen));
    });
    return clone as any;
  }
  
  if (obj instanceof Set) {
    const clone = new Set();
    seen.set(obj, clone);
    obj.forEach((value) => {
      clone.add(safeDeepClone(value, seen));
    });
    return clone as any;
  }

  // Handle standard JS Arrays
  if (Array.isArray(obj)) {
    const clone: any[] = [];
    seen.set(obj, clone);
    for (let i = 0; i < obj.length; i++) {
      clone.push(safeDeepClone(obj[i], seen));
    }
    return clone as any;
  }

  // Handle vanilla objects & class instances
  try {
    const proto = Object.getPrototypeOf(obj);
    const clone = Object.create(proto);
    seen.set(obj, clone);
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clone[key] = safeDeepClone((obj as any)[key], seen);
      }
    }
    return clone;
  } catch (e) {
    // Fallback if prototype creation fails
    const clone: any = {};
    seen.set(obj, clone);
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clone[key] = safeDeepClone((obj as any)[key], seen);
      }
    }
    return clone;
  }
}
