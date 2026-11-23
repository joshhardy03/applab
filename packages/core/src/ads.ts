// Ads wrapper. AdMob (with Google UMP consent and iOS ATT) gets wired in once the AdMob
// account exists and Josh approves; test ads only until then. Until wired, no ads show.
export const adsEnabled = false;

export function AdSlot(_props: { placement: string }): null {
  return null;
}
