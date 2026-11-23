// Analytics wrapper. Firebase Analytics gets wired in once the Firebase project exists;
// until then this records nothing (and on web it always records nothing).
export type EventParams = Record<string, string | number | boolean>;

export function logEvent(name: string, params: EventParams = {}): void {
  if (__DEV__) console.log(`[analytics] ${name}`, params);
}
