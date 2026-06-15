# Finnnance Mobile

Expo Router mobile app for Finnnance Tracker.

This app now lives inside the Finnnance Tracker monorepo:

```txt
finnnance_tracker/
  apps/mobile
  packages/core
```

## Run From Monorepo Root

From `finnnance_tracker`:

```bash
npm install
npm run mobile:start
```

If Metro keeps an old root cache, use:

```bash
npm run mobile:start:clear
```

Other root scripts:

```bash
npm run mobile:ios
npm run mobile:web
npm run mobile:lint
```

You can still run Expo scripts from this folder if needed:

```bash
npm run start
npm run start:clear
npm run ios
npm run web
```

## Shared Business Logic

Use `@finnnance/core` for shared finance logic instead of duplicating formulas in mobile.

```ts
import {
  TransactionType,
  formatRupiah,
  validateTransactionPayload,
} from "@finnnance/core";
```

Subpath imports are also available:

```ts
import { validateTransactionPayload } from "@finnnance/core/transactions";
import { formatRupiah } from "@finnnance/core/money";
```

See `../../packages/core/README.md` for the full list of shared modules.

## Notes

- Keep UI, Expo Router screens, SecureStore, Clerk Expo, and native-device code in this app.
- Keep pure calculations, payload validation, labels, and enum-like domain constants in `packages/core`.
- Server-only workflows such as Prisma queries and auth checks should stay in the web/API layer and be consumed from mobile through API calls.
- Expo SDK 54 monorepo support is enabled through `experiments.autolinkingModuleResolution` in `app.json`.
