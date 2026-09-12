/**
 * SR Enterprises CRM - Splash Screen Lifecycle Coordinator
 *
 * Responsibilities:
 * 1. Immediate presentation at HTML parse time (embedded in index.html).
 * 2. Background loading of CRM application and dependencies.
 * 3. Exact 2-second additional display timer after CRM is fully ready.
 * 4. Smooth professional fade-out transition (~600ms).
 * 5. Full cleanup and session persistence (no re-trigger on internal client-side routes).
 * 6. Error safety fallback: Never traps the user in an infinite splash screen.
 */

let isReadySignaled = false;
let isDismissed = false;
let readyTimestamp: number | null = null;
let timerId: ReturnType<typeof setTimeout> | null = null;
let safetyTimerId: ReturnType<typeof setTimeout> | null = null;

/**
 * Signals that the CRM application has completed its initial bootstrap,
 * authentication/session verification, and initial view rendering.
 *
 * Starts the EXACT 2-second additional display timer.
 */
export function notifyCrmReady(): void {
  if (isReadySignaled || isDismissed) return;
  isReadySignaled = true;
  readyTimestamp = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

  if (safetyTimerId) {
    clearTimeout(safetyTimerId);
    safetyTimerId = null;
  }

  // Exactly 2 seconds additional display time AFTER CRM readiness
  timerId = setTimeout(() => {
    executeSplashTransition();
  }, 2000);
}

/**
 * Executes the smooth fade-out transition from the splash screen to the CRM.
 */
export function executeSplashTransition(): void {
  if (isDismissed) return;
  isDismissed = true;

  if (typeof document === 'undefined') return;

  const splash = document.getElementById('crm-splash-screen');
  if (!splash) return;

  // Add transition fade-out class (triggers ~600ms CSS opacity transition)
  splash.classList.add('crm-splash-fade-out');

  // After fade-out completes, hide and cleanly detach
  setTimeout(() => {
    splash.classList.add('crm-splash-hidden');
    splash.setAttribute('aria-hidden', 'true');
    if (splash.parentNode) {
      splash.parentNode.removeChild(splash);
    }
  }, 650);
}

/**
 * Safety fallback: If for any reason initialization hangs longer than 8 seconds,
 * dismiss the splash screen so the user can see error boundaries / network states.
 */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  safetyTimerId = setTimeout(() => {
    if (!isReadySignaled && !isDismissed) {
      console.warn('[SplashScreen] Safety fallback triggered after 8s timeout.');
      notifyCrmReady();
    }
  }, 8000);
}

export function isSplashScreenDismissed(): boolean {
  return isDismissed;
}

export function isCrmReadySignaled(): boolean {
  return isReadySignaled;
}

export function getReadyTimestamp(): number | null {
  return readyTimestamp;
}

export function resetSplashScreenStateForTests(): void {
  isReadySignaled = false;
  isDismissed = false;
  readyTimestamp = null;
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  if (safetyTimerId) {
    clearTimeout(safetyTimerId);
    safetyTimerId = null;
  }
}
