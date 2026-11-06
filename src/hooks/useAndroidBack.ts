import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';

export type AppSection = 'calculadora' | 'ia' | 'historial' | 'comparador';
export interface AppScreen {
  section: AppSection;
  historyEntryId: string | null;
}

const EXIT_INTERVAL_MS = 2000;
const sameScreen = (a: AppScreen, b: AppScreen) => a.section === b.section && a.historyEntryId === b.historyEntryId;

export function useAndroidBack(
  screen: AppScreen,
  restoreScreen: (screen: AppScreen) => void,
  dismissOverlay: () => boolean,
  sessionKey: string | null,
) {
  const current = useRef(screen);
  const previousScreens = useRef<AppScreen[]>([]);
  const previousSession = useRef(sessionKey);
  const restoring = useRef(false);
  const callbacks = useRef({ restoreScreen, dismissOverlay });
  callbacks.current = { restoreScreen, dismissOverlay };
  const lastExitAttempt = useRef<number | null>(null);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [exitNotice, setExitNotice] = useState<string | null>(null);

  const resetExit = () => {
    lastExitAttempt.current = null;
    if (expiry.current) clearTimeout(expiry.current);
    expiry.current = null;
    setExitNotice(null);
  };

  // Keep the in-app history in sync even though this SPA does not change browser URLs.
  useLayoutEffect(() => {
    if (previousSession.current !== sessionKey || screen.section === 'calculadora') {
      previousScreens.current = [];
    } else if (!restoring.current && !sameScreen(current.current, screen)) {
      previousScreens.current.push(current.current);
      if (previousScreens.current.length > 32) previousScreens.current.shift();
    }
    previousSession.current = sessionKey;
    current.current = screen;
    restoring.current = false;
    resetExit();
  }, [screen.section, screen.historyEntryId, sessionKey]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    let disposed = false;
    const handles: PluginListenerHandle[] = [];
    const keep = (registration: Promise<PluginListenerHandle>) => {
      void registration.then(handle => {
        if (disposed) void handle.remove();
        else handles.push(handle);
      }).catch(error => console.error('No se pudo registrar la navegación Android:', error));
    };

    keep(NativeApp.addListener('backButton', () => {
      if (callbacks.current.dismissOverlay()) {
        resetExit();
        return;
      }
      if (current.current.section !== 'calculadora') {
        const target = previousScreens.current.pop() || { section: 'calculadora', historyEntryId: null };
        restoring.current = true;
        current.current = target;
        resetExit();
        callbacks.current.restoreScreen(target);
        return;
      }
      const now = Date.now();
      const elapsed = lastExitAttempt.current === null ? Infinity : now - lastExitAttempt.current;
      if (elapsed >= 0 && elapsed < EXIT_INTERVAL_MS) {
        resetExit();
        void NativeApp.exitApp().catch(error => console.error('No se pudo cerrar la aplicación:', error));
      } else {
        resetExit();
        lastExitAttempt.current = now;
        setExitNotice('Pulsa atrás de nuevo para salir');
        expiry.current = setTimeout(resetExit, EXIT_INTERVAL_MS);
      }
    }));
    keep(NativeApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) resetExit();
    }));

    return () => {
      disposed = true;
      if (expiry.current) clearTimeout(expiry.current);
      lastExitAttempt.current = null;
      handles.forEach(handle => { void handle.remove(); });
    };
  }, []);

  return exitNotice;
}
