import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

import { PrivacyModeProvider } from "@/components/PrivacyMode";
import { UiDensityProvider } from "@/components/UiDensityProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider afterSignOutUrl="/sign-in">
      <UiDensityProvider>
        <PrivacyModeProvider>{children}</PrivacyModeProvider>
      </UiDensityProvider>
      <Toaster position="top-right" richColors closeButton />
    </ClerkProvider>
  );
}
