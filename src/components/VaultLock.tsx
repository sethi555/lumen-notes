import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint, Lock } from "lucide-react";
import { toast } from "sonner";

// Biometric vault using the WebAuthn API (TouchID/FaceID/platform authenticator).
async function biometricUnlock(): Promise<boolean> {
  if (typeof window === "undefined" || !("PublicKeyCredential" in window)) {
    toast.error("Biometric unlock isn't supported on this device.");
    return false;
  }
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: "required",
        rpId: window.location.hostname,
      },
    });
    return true;
  } catch {
    // No registered credential or user cancelled — still allow a verified gesture fallback.
    try {
      const available = await (window as any).PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.();
      if (!available) {
        toast.error("No biometric authenticator available.");
        return false;
      }
    } catch { /* ignore */ }
    toast.error("Biometric verification cancelled.");
    return false;
  }
}

export function VaultLock({ onUnlock }: { onUnlock: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
        <Lock className="h-8 w-8" />
      </div>
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">This note is private</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">Verify with your device biometrics (Touch ID / Face ID) to unlock the vault.</p>
      </div>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const ok = await biometricUnlock();
          setBusy(false);
          if (ok) { toast.success("Unlocked"); onUnlock(); }
        }}
      >
        <Fingerprint className="mr-2 h-4 w-4" /> Unlock with biometrics
      </Button>
    </div>
  );
}
