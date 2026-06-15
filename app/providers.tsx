import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

import { PrivacyModeProvider } from "@/components/PrivacyMode";
import { UiDensityProvider } from "@/components/UiDensityProvider";

const clerkProviderProps = {
  afterSignOutUrl: "/sign-in",
  __internal_clerkJSUrl:
    process.env.NEXT_PUBLIC_CLERK_JS_URL || "/clerk/clerk.browser.js",
} as React.ComponentProps<typeof ClerkProvider> & {
  __internal_clerkJSUrl: string;
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider {...clerkProviderProps}>
      <UiDensityProvider>
        <PrivacyModeProvider>{children}</PrivacyModeProvider>
      </UiDensityProvider>
      <Toaster position="top-right" richColors closeButton />
    </ClerkProvider>
  );
}
