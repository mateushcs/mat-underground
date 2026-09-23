// Party mode trigger shared by every spinnable CD: spin continuously for
// PARTY_SPIN_MS (pauses under PARTY_GAP_MS still count) to start the party,
// then keep-alive pings every PARTY_PING_MS keep it going while spinning.
const PARTY_SPIN_MS = 3000;
const PARTY_GAP_MS = 350;
const PARTY_PING_MS = 200;

export function createPartySpinTracker() {
  let since = 0;
  let lastMove = 0;
  let lastPing = 0;
  let on = false;
  /** Report `moved` degrees of rotation from a drag. */
  return (moved: number) => {
    if (moved < 0.5) return;
    const now = performance.now();
    if (now - lastMove > PARTY_GAP_MS) {
      since = now;
      on = false;
    }
    lastMove = now;
    if (!on && now - since >= PARTY_SPIN_MS) {
      on = true;
      lastPing = now;
      window.dispatchEvent(new Event("mats:party"));
    } else if (on && now - lastPing >= PARTY_PING_MS) {
      lastPing = now;
      window.dispatchEvent(new Event("mats:party-spin"));
    }
  };
}
