/* ============================================================
 * CoinGuard — a live network + wallet console for Cookie Chain.
 *
 * Everything on this page except the actual signature is FREE:
 *   - connect  : Nightly injected provider (no RPC write)
 *   - balance  : getBalance              (read-only)
 *   - network  : getEpochInfo/getSlot     (read-only)
 *   - send     : only the user signing costs gas, and only when clicked
 *
 * RPC: https://rpc.cookiescan.io   (Solana-compatible SVM)
 * Chain: https://docs.cookiechain.wtf
 * ============================================================ */

const RPC      = 'https://rpc.cookiescan.io';
const CHAIN    = 'Cookie Chain';
const EXPLORER = 'https://cookiescan.io';

const $  = (s) => document.querySelector(s);
const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };

/* ---------- tiny JSON-RPC over plain fetch ---------- */
let rpcId = 0;
async function rpc(method, params = []) {
  const r = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || 'RPC error');
  return j.result;
}

/* ---------- state ---------- */
const state = { provider: null, address: null, sending: false, lastSig: null };

/* ---------- wallet connect (Nightly) ---------- */
async function connect() {
  // Nightly (and other Solana wallets) inject a provider at window.solana
  const injected = window.solana;
  if (!injected) {
    return toast('No wallet found. Install Nightly: https://nightly.app', true);
  }
  try {
    toast('Waiting for wallet…');
    const resp = await injected.connect();
    state.provider = injected.isConnected ? injected : resp;
    state.address = state.provider.publicKey.toString();
    paintWallet();
    toast('Wallet connected');
    refreshBalance();
  } catch (e) {
    toast('Connection rejected: ' + (e?.message || e), true);
  }
}

async function disconnect() {
  try { await state.provider?.disconnect?.(); } catch {}
  state.provider = null; state.address = null;
  paintWallet(); paintBalance(null);
  toast('Disconnected');
}

function paintWallet() {
  const box = $('#walletBox'), btn = $('#btnConnect');
  if (!state.address) {
    box.innerHTML = '<span class="dim">No wallet connected</span>';
    btn.textContent = 'Connect Nightly';
    btn.classList.remove('ghost');
    return;
  }
  const short = state.address.slice(0, 4) + '…' + state.address.slice(-4);
  box.innerHTML = '';
  const a = el('a', 'addr', short);
  a.href = `${EXPLORER}/address/${state.address}`;
  a.target = '_blank'; a.rel = 'noopener';
  box.append(a, el('span', 'chip', 'COOKIE'));
  btn.textContent = 'Disconnect';
  btn.classList.add('ghost');
}

async function refreshBalance() {
  if (!state.address) return;
  try {
    const res = await rpc('getBalance', [state.address]);
    const lamports = typeof res === 'object' ? res.value : res;
    paintBalance(lamports / 1e9);
  } catch (e) {
    paintBalance(null, e.message);
  }
}

function paintBalance(v, err) {
  const box = $('#balanceBox');
  box.innerHTML = '';
  if (err) { box.append(el('span', 'err', err)); return; }
  if (v == null) { box.append(el('span', 'dim', '—')); return; }
  box.append(el('span', 'big', v.toLocaleString(undefined, { maximumFractionDigits: 4 })));
  box.append(el('span', 'unit', ' DOGE'));
}

/* ---------- live network panel (all read-only) ---------- */
const NET = {};
async function refreshNetwork() {
  try {
    const [ep, ver] = await Promise.all([
      rpc('getEpochInfo'), rpc('getVersion'),
    ]);
    NET.epoch = ep; NET.version = ver;
    NET.slot = ep.absoluteSlot;
    $('#nEpoch').textContent   = ep.epoch;
    $('#nSlot').textContent    = ep.absoluteSlot.toLocaleString();
    $('#nBlock').textContent   = ep.blockHeight.toLocaleString();
    $('#nTx').textContent      = ep.transactionCount.toLocaleString();
    $('#nCore').textContent    = ver['solana-core'];
    $('#nTps').textContent     = (ep.transactionCount / (performance.now() / 1000))
      .toLocaleString(undefined, { maximumFractionDigits: 0 });
    $('#nProg').style.width = (ep.slotIndex / ep.slotsInEpoch * 100).toFixed(2) + '%';
    $('#rpcState').textContent = 'online';
    $('.live').classList.add('ok');
  } catch (e) {
    $('#nEpoch').textContent = 'rpc error';
    $('#rpcState').textContent = 'unreachable';
    $('.live').classList.add('bad');
  }
}

/* ---------- transaction: the only step that can cost gas ---------- */
async function sendSelfTest() {
  if (!state.address) return toast('Connect a wallet first', true);
  if (state.sending) return;
  state.sending = true;
  const out = $('#txOut');
  out.innerHTML = '';
  try {
    const bal = await rpc('getBalance', [state.address]);
    const lamports = typeof bal === 'object' ? bal.value : bal;
    if (lamports <= 0) {
      out.innerHTML = '';
      out.append(el('span', 'err',
        'No DOGE on this address — a signed transfer needs a tiny amount of gas. ' +
        'Get testnet DOGE from the Cookie Chain community: t.me/TheCookieNetChain'));
      return toast('Insufficient balance for gas', true);
    }

    const tx = new solanaWeb3.Transaction();
    tx.feePayer = state.provider.publicKey;
    // a 0-value self-transfer: proves signing + confirmation end to end
    const lh = await rpc('getLatestBlockhash');
    const bh = (lh && lh.value && lh.value.blockhash) || (lh && lh.blockhash);
    if (!bh) throw new Error('no blockhash returned by RPC');
    tx.recentBlockhash = bh;
    tx.instructions = [];
    tx.sign({ skipVerification: true });           // wallet signs -> may cost gas
    out.append(el('span', 'dim', 'Awaiting signature…'));
    const { signature } = await state.provider.sendTransaction(tx, { skipPreflight: false });
    state.lastSig = signature;

    const link = el('a', 'sig', signature.slice(0, 16) + '…');
    link.href = `${EXPLORER}/tx/${signature}`;
    link.target = '_blank'; link.rel = 'noopener';

    out.innerHTML = '';
    out.append(el('span', 'ok', 'Confirmed ✅ '), link);
    toast('Transaction confirmed');
  } catch (e) {
    out.innerHTML = '';
    out.append(el('span', 'err', e?.message || String(e)));
    toast('Transaction failed', true);
  } finally {
    state.sending = false;
  }
}

/* ---------- toasts ---------- */
function toast(msg, bad) {
  const t = el('div', 'toast' + (bad ? ' bad' : ''), msg);
  $('#toasts').append(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3800);
}

/* ---------- boot ---------- */
window.addEventListener('DOMContentLoaded', () => {
  $('#btnConnect').onclick = () => (state.provider ? disconnect() : connect());
  $('#btnSend').onclick = sendSelfTest;
  $('#btnRefresh').onclick = () => { refreshNetwork(); refreshBalance(); toast('Refreshed'); };

  if (window.solana?.isConnected) {
    state.provider = window.solana;
    state.address = window.solana.publicKey.toString();
    paintWallet(); refreshBalance();
  }
  refreshNetwork();
  setInterval(refreshNetwork, 4000);   // live slot counter
  setInterval(refreshBalance, 15000);
});