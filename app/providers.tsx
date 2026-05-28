import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

import { PrivacyModeProvider } from "@/components/PrivacyMode";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider afterSignOutUrl="/sign-in">
      <PrivacyModeProvider>{children}</PrivacyModeProvider>
      <Toaster position="top-right" richColors closeButton />
    </ClerkProvider>
  );
}
