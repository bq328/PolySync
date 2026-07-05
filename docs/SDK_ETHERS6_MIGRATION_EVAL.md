# SDK / ethers 6 migration evaluation

Date: 2026-07-05

## Summary

Do not run a blind `npm audit fix --force`.

The current dependency warning is not a simple patch upgrade. The clean migration path is:

1. Keep `@polymarket/client` as the trading SDK.
2. Move PolySync from the SDK `ethers-v5` adapter to the SDK `viem` adapter.
3. Replace project-local ethers v5 utilities with `viem` / `ox` equivalents.
4. Remove `ethers`, `ethers-v5`, and `@ethersproject/wallet` only after live signing tests pass.

Calling this an "ethers 6 migration" is slightly misleading for this project: `@polymarket/client` currently exposes `@polymarket/client/ethers-v5` and `@polymarket/client/viem`, not an ethers 6 adapter.

## Current State

Runtime dependency chain:

- `@polymarket/client@0.1.0-beta.7`
- `ethers-v5@npm:ethers@5.8.0`
- `ethers@5.8.0`
- `@ethersproject/wallet@5.8.0`
- transitive `ws@8.18.0`
- transitive `elliptic@6.6.1`

Audit result:

- `ws` high severity appears through `ethers@5` / `@ethersproject/providers`.
- `elliptic` appears through `@ethersproject/signing-key`.
- `npm audit fix --force` wants to install `ethers@6.17.0`, which is breaking for the existing SDK adapter path.

Upstream metadata checked on npm:

- `ethers` latest: `6.17.0`; legacy v5 tag: `5.8.0`
- `ws` latest: `8.21.0`
- `viem` latest: `2.54.3`
- `@polymarket/client` latest dist-tag: `0.1.0-beta.4`
- `@polymarket/client` beta dist-tag: `0.1.0-beta.12`
- `@polymarket/client@0.1.0-beta.12` still declares optional peer `ethers-v5@^5.8.0` and `viem@^2.46.3`
- latest canary checked also still declares optional peer `ethers-v5@^5.8.0` and `viem@^2.46.3`

## Current Code Touchpoints

Production code uses ethers v5 in these areas:

- `src/executor/secure-client.ts`
  - `Wallet` for EOA address derivation
  - `@polymarket/client/ethers-v5` `signerFrom(...)`
- `src/executor/deposit-wallet-clob-auth.ts`
  - `Wallet._signTypedData`
  - `utils.keccak256`
  - `utils.toUtf8Bytes`
  - `utils.defaultAbiCoder.encode`
  - `utils.hexlify`
- `src/config/load.ts`
  - `Wallet(privateKey).address`
- `src/config/account-schema.ts`
  - `Wallet(privateKey).address`
- `src/api/accounts.ts`
  - `Wallet(privateKey).address`

Scripts and tests also use ethers v5. They can be migrated after the runtime path is stable.

## Recommended Migration Path

### Phase 1: Introduce a wallet crypto helper

Create a small internal helper, for example `src/crypto/wallet.ts`, that owns:

- private key normalization
- EOA address derivation
- typed-data signing
- ABI encoding / hashing helpers needed by `deposit-wallet-clob-auth`

This isolates the migration and avoids touching business logic repeatedly.

### Phase 2: Switch SecureClient signing to viem

Replace:

```ts
import { Wallet } from "ethers";
import { signerFrom } from "@polymarket/client/ethers-v5";

const signer = signerFrom(new Wallet(wallet.privateKey));
```

with the SDK viem adapter:

```ts
import { privateKey } from "@polymarket/client/viem";

const signer = privateKey(wallet.privateKey);
```

This is the key step that allows removing the SDK `ethers-v5` peer from the live trading path.

### Phase 3: Replace direct ethers helpers

Likely viem equivalents:

- `new Wallet(pk).address` -> `privateKeyToAccount(pk).address`
- `utils.keccak256(utils.toUtf8Bytes(x))` -> `keccak256(toBytes(x))`
- `utils.defaultAbiCoder.encode(...)` -> `encodeAbiParameters(...)`
- `wallet._signTypedData(...)` -> `account.signTypedData(...)`

The deposit-wallet CLOB auth wrapper is high risk and must be covered by deterministic tests before replacing it.

### Phase 4: Remove ethers v5 dependencies

Only after the runtime tests pass:

- remove `ethers`
- remove `ethers-v5`
- remove `@ethersproject/wallet`
- add `viem` as a direct dependency

Then rerun:

```bash
npm install
npm run lint
npm test
npm run build --prefix dashboard
npm audit --omit=dev --audit-level=high
```

Expected result: the `ws` and `elliptic` findings from ethers v5 should disappear from runtime dependencies.

## Required Tests Before Merge

Minimum automated coverage:

- private key -> EOA address derivation matches current ethers output
- signature type auto-detection still returns proxy vs EOA correctly
- SecureClient can be constructed with viem signer in a mocked test
- deposit-wallet CLOB auth hash/wrapper output remains byte-for-byte stable against known fixtures
- live connection self-test still does not call approval setup or place orders
- existing copy-cycle and mode-transition tests remain green

Manual or controlled live checks:

- `实盘连接自检` passes with a real wallet and proxy
- balance / allowance reads still work
- first approval setup is not triggered by self-test
- a deliberately tiny real order path is tested only after wallet funding and risk limits are confirmed

## Risk Assessment

| Area | Risk | Notes |
| --- | --- | --- |
| SDK signer adapter | Medium | SDK supports viem, but PolySync currently uses ethers-v5. |
| Deposit wallet CLOB auth | High | Custom typed-data wrapping must remain byte-for-byte compatible. |
| Address derivation | Low | Straightforward replacement with viem account helpers. |
| Scripts | Low/Medium | Diagnostic scripts can lag behind runtime migration. |
| Dependency audit | Medium | Removing ethers v5 should clear the high `ws` finding, but must be verified. |

## Recommendation

Proceed with a controlled viem migration branch, not a direct ethers 6 upgrade.

Suggested branch name:

```bash
git checkout -b chore/viem-sdk-signer-migration
```

Suggested first implementation commit:

```text
replace ethers signer path with viem adapter
```

Do not remove ethers dependencies in the first commit. First switch runtime code behind tests, then remove dependencies in a second commit after audit confirms the chain is gone.
