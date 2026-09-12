import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  notifyCrmReady,
  executeSplashTransition,
  isSplashScreenDismissed,
  isCrmReadySignaled,
  updateSplashProgress,
  getSplashProgress,
  resetSplashScreenStateForTests,
} from './splashScreen';

describe('Splash Screen Lifecycle & Timing Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSplashScreenStateForTests();
    document.body.innerHTML = `
      <div id="crm-splash-screen" role="status">
        <div class="crm-splash-container">
          <div class="crm-splash-logo-wrapper">
            <img id="crm-splash-logo" src="/crm-logo.png" alt="SR Enterprises CRM" />
          </div>
          <div class="crm-splash-tagline">Manage · Grow · Succeed Together</div>
          <div class="crm-splash-loader-bar">
            <div id="crm-splash-progress" class="crm-splash-progress-fill" style="width: 25%;"></div>
          </div>
          <div class="crm-splash-text">Loading your CRM...</div>
          <div class="crm-splash-subtext">Building better business relationships</div>
        </div>
        <div class="crm-splash-footer">Developed by Kartik & Siddharth</div>
      </div>
      <div id="root"></div>
    `;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('immediately displays the code-based loading screen with logo PNG, HTML text, and developer branding', () => {
    const splash = document.getElementById('crm-splash-screen');
    const logo = document.getElementById('crm-splash-logo') as HTMLImageElement;
    const progress = document.getElementById('crm-splash-progress');

    expect(splash).not.toBeNull();
    expect(logo).not.toBeNull();
    expect(logo.getAttribute('src')).toBe('/crm-logo.png');
    expect(progress).not.toBeNull();
    expect(splash?.textContent).toContain('Manage · Grow · Succeed Together');
    expect(splash?.textContent).toContain('Loading your CRM...');
    expect(splash?.textContent).toContain('Building better business relationships');
    expect(splash?.textContent).toContain('Developed by Kartik & Siddharth');

    // Does NOT use full reference screenshots
    expect(document.querySelector('img[src="/splash-desktop.png"]')).toBeNull();
    expect(document.querySelector('img[src="/splash-mobile.png"]')).toBeNull();

    expect(isCrmReadySignaled()).toBe(false);
    expect(isSplashScreenDismissed()).toBe(false);
  });

  it('updates the real loading bar progress dynamically', () => {
    updateSplashProgress(50);
    expect(getSplashProgress()).toBe(50);
    expect(document.getElementById('crm-splash-progress')?.style.width).toBe('50%');

    updateSplashProgress(75);
    expect(getSplashProgress()).toBe(75);
    expect(document.getElementById('crm-splash-progress')?.style.width).toBe('75%');
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
