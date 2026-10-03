# 🍪 CoinGuard

A live wallet and network console for the **Cookie Chain** SVM — built for the
Cookie Chain bounty on Superteam Earn.

CoinGuard connects a [Nightly](https://nightly.app/) wallet, shows the wallet's
address and DOGE balance, tracks the chain in real time (epoch, block height,
slot, transaction count), and can sign and confirm a transaction end to end.

## Why Cookie Chain

Cookie Chain is a Solana Virtual Machine chain built for fast experimentation
and a blockchain-native developer culture:

| | |
|---|---|
| **Finality** | sub-second transaction confirmation |
| **Fees** | very low — program deploys cost about **$0.05** |
| **Compat** | Solana-compatible: SPL, Token-2022, Metaplex, standard Solana tooling |
| **Governance** | community-owned and community-run infrastructure |

Fast, cheap experiments mean a developer can ship and iterate without thinking
about infrastructure cost.

## What the app does

- **Wallet connect** — Nightly (or any injected Solana wallet); shows a
  truncated address linked to the explorer and a chain badge.
- **Balance** — live DOGE balance for the connected address.
- **Network panel** — epoch, block height, absolute slot, cumulative
  transaction count, node core version, RPC calls per second, and an
  epoch-progress bar. Refreshes every 4 seconds.
- **Transaction** — signs a zero-value self-transfer to demonstrate the full
  sign → submit → confirm path, then links the signature to the explorer.
- **Error handling** — every failure mode (no wallet, user rejection, RPC
  unreachable, insufficient gas balance, failed signature) surfaces a clear,
  human-readable message rather than failing silently.

## Cost: free to explore

Connecting a wallet, reading an address, reading its balance, and every network
statistic are **read-only RPC calls and cost nothing**. Gas is only spent if you
sign a transaction. You can run the whole dashboard — wallet connect, balance,
live network data — with an empty wallet.

If you want to send the test transaction, the address needs a small amount of
DOGE for the network fee. Get testnet DOGE from the Cookie Chain community:
[t.me/TheCookieNetChain](https://t.me/TheCookieNetChain).

## Quick start

No build step — it's three static files.

```bash
git clone <your-fork-url> coinguard
cd coinguard
python3 -m http.server 8000
# open http://localhost:8000
```

Any static host works too:

```bash
npx serve .
# or
vercel deploy --prod
# or push to GitHub and enable Pages
```

### Install a wallet

Install [Nightly](https://nightly.app/) for Chrome, or any Solana-compatible
wallet that injects `window.solana`.

## Configuration

The RPC endpoint lives in one constant at the top of `app.js`:

```js
const RPC = 'https://rpc.cookiescan.io';
const EXPLORER = 'https://cookiescan.io';
```

Swap these to point the console at another SVM endpoint.

## Project layout

```
index.html   markup
style.css    styling (dark, responsive)
app.js       RPC client, wallet connect, live polling, transaction flow
```

`app.js` is dependency-light: a small `rpc()` helper over `fetch` plus
`@solana/web3.js` from a CDN, which is used solely to build and sign the
transaction object.

## Chain notes

Cookie Chain returns `getBalance` and `getLatestBlockhash` with the payload
under a `value` key (matching current Solana RPC behaviour). The client unwraps
both shapes defensively, so it works whether the payload is flat or nested.

## Links

- Chain: https://www.cookiechain.wtf
- Docs: https://docs.cookiechain.wtf
- DAS API: https://api.cookiescan.io
- Explorer: https://cookiescan.io
- RPC: https://rpc.cookiescan.io
- Telegram: https://t.me/TheCookieNetChain
- X: https://x.com/TheCookieChain
- Discord: https://discord.gg/XqnStmWgNu

## License

MIT