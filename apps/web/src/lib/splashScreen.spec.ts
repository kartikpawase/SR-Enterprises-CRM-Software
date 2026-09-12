import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  notifyCrmReady,
  executeSplashTransition,
  isSplashScreenDismissed,
  isCrmReadySignaled,
  resetSplashScreenStateForTests,
} from './splashScreen';

describe('Splash Screen Lifecycle & Timing Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSplashScreenStateForTests();
    document.body.innerHTML = `
      <div id="crm-splash-screen">
        <picture class="crm-splash-picture">
          <img id="crm-splash-img" src="/splash-desktop.png" alt="SR Enterprises CRM" />
        </picture>
        <div class="crm-splash-footer">Developed by Kartik & Siddharth</div>
      </div>
      <div id="root"></div>
    `;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('immediately displays the splash screen in the DOM with developer branding', () => {
    const splash = document.getElementById('crm-splash-screen');
    expect(splash).not.toBeNull();
    expect(splash?.textContent).toContain('Developed by Kartik & Siddharth');
    expect(isCrmReadySignaled()).toBe(false);
    expect(isSplashScreenDismissed()).toBe(false);
  });

  it('keeps the splash screen visible while CRM is loading in background', () => {
    const splash = document.getElementById('crm-splash-screen');
    // Simulate background loading taking 3 seconds
    vi.advanceTimersByTime(3000);

    expect(isCrmReadySignaled()).toBe(false);
    expect(isSplashScreenDismissed()).toBe(false);
    expect(splash?.classList.contains('crm-splash-fade-out')).toBe(false);
  });

  it('waits EXACTLY 2 additional seconds AFTER notifyCrmReady is called before starting fade-out', () => {
    const splash = document.getElementById('crm-splash-screen');

    // Simulate CRM taking 1500ms to initialize
    vi.advanceTimersByTime(1500);
    expect(isCrmReadySignaled()).toBe(false);

    // CRM is now fully ready!
    notifyCrmReady();
    expect(isCrmReadySignaled()).toBe(true);

    // At 1900ms after readiness, splash MUST still be fully visible (no fade-out yet)
    vi.advanceTimersByTime(1900);
    expect(isSplashScreenDismissed()).toBe(false);
    expect(splash?.classList.contains('crm-splash-fade-out')).toBe(false);

    // At exactly 2000ms after readiness, fade-out transition begins
    vi.advanceTimersByTime(100);
    expect(splash?.classList.contains('crm-splash-fade-out')).toBe(true);

    // After 650ms fade-out transition, splash is hidden and removed from DOM
    vi.advanceTimersByTime(650);
    expect(isSplashScreenDismissed()).toBe(true);
    expect(document.getElementById('crm-splash-screen')).toBeNull();
  });

  it('ignores subsequent notifyCrmReady calls during internal route navigation', () => {
    notifyCrmReady();
    vi.advanceTimersByTime(2650);
    expect(isSplashScreenDismissed()).toBe(true);

    // Subsequent route navigation (e.g. Dashboard -> Customers) should not re-trigger
    notifyCrmReady();
    expect(document.getElementById('crm-splash-screen')).toBeNull();
  });
});
