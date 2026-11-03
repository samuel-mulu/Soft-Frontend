'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallAppButton({ className = '' }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) setIos(true);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  if (deferred) {
    return (
      <button
        type="button"
        className={`btn btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3 min-h-[36px] ${className}`}
        onClick={() => {
          void deferred.prompt().then(() => setDeferred(null));
        }}
      >
        <Download size={15} />
        Install app
      </button>
    );
  }

  if (!ios) return null;

  return (
    <div className={className}>
      <button
        type="button"
        className="btn btn-ghost inline-flex items-center gap-1.5 text-xs py-2 px-3 min-h-[36px]"
        onClick={() => setShowIosHelp((open) => !open)}
      >
        <Download size={15} />
        Add to Home Screen
      </button>
      {showIosHelp && (
        <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground">
          Tap Share, then Add to Home Screen. The icon is the BG logo.
        </p>
      )}
    </div>
  );
}
