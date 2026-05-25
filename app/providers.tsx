import { ClerkProvider } from "@clerk/nextjs";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ClerkProvider afterSignOutUrl="/sign-in">{children}</ClerkProvider>;
}
