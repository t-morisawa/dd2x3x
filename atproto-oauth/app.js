const $ = (selector) => document.querySelector(selector);
const steps = [
  { title: "ハンドル解決 & ディスカバリ", category: "DISCOVERY", source: "browser", target: "pds", participants: ["browser", "app", "pds", "as"], route: ["path-browser-app", "path-app-pds", "path-app-as"], tags: ["DISCOVERY"], description: "App ServerがハンドルをDIDに解決し、DID DocumentからPDSを特定。PDSと認可サーバーのメタデータを順に取得します。" },
  { title: "秘密情報・一時パラメータの生成", category: "AUTH INIT", source: "app", target: "supabase", route: ["path-app-supabase"], tags: ["PKCE", "DPoP"], description: "PKCEのverifier/challenge、DPoP鍵ペア、CSRF対策のstateを生成。callbackまで必要な一時情報を10分間だけ保存します。" },
  { title: "PAR — 認可リクエストをPush", category: "AUTH INIT", source: "app", target: "as", route: ["path-app-as"], tags: ["PAR", "DPoP", "CLIENT JWT"], description: "App Serverから認可サーバーへ認可パラメータを直接POST。private_key_jwtでクライアントを証明し、DPoP Proofも添付します。" },
  { title: "認可画面へリダイレクト", category: "CONSENT", source: "app", target: "browser", participants: ["app", "browser", "as"], route: ["path-browser-app", "path-as-browser"], tags: ["REQUEST URI"], description: "認可サーバーからrequest_uriを受け取り、ブラウザを認可画面へ。URLに見えるのは短い参照URIだけで、scopeなどは露出しません。" },
  { title: "Callback — stateを検証", category: "CALLBACK", source: "as", target: "supabase", participants: ["as", "browser", "app", "supabase"], route: ["path-as-browser", "path-browser-app", "path-app-supabase"], tags: ["STATE", "ONE-TIME"], description: "同意後、認可コードとstateがcallbackに届きます。stateを照合してCSRFを防ぎ、一時状態はワンタイムで取り出して削除します。" },
  { title: "トークン交換", category: "TOKEN EXCHANGE", source: "app", target: "as", route: ["path-app-as"], tags: ["PKCE", "DPoP", "CLIENT JWT", "TOKEN"], description: "code_verifier、client_assertion、DPoP Proofを添えて認可コードを交換。検証に成功するとDPoP鍵に紐づいたトークンが発行されます。" },
  { title: "セッションを保存", category: "TOKEN EXCHANGE", source: "app", target: "supabase", route: ["path-app-supabase"], tags: ["SESSION", "TOKEN"], description: "DID、トークン、有効期限、DPoP秘密鍵をサーバー側セッションに保存します。ブラウザにはHttpOnlyのセッションCookieだけを渡します。" },
  { title: "DPoP付き PDS APIアクセス", category: "API CALL", source: "app", target: "pds", route: ["path-app-pds"], tags: ["DPoP", "TOKEN"], description: "API呼び出しごとに新しいDPoP Proofを作成。トークン単体ではなく、対応する秘密鍵による署名もセットで検証します。" },
  { title: "Nonceエラーと自動リトライ", category: "API CALL", source: "pds", target: "app", route: ["path-app-pds"], tags: ["DPoP NONCE", "RETRY"], description: "PDSがNonceを要求した場合、401とDPoP-Nonceを返します。クライアントはNonce入りのProofを作り直し、1回だけ再送します。" },
];
const quiz = [
  { q: "APIアクセス時にアクセストークンだけが盗まれても、不正利用を防ぐ仕組みは？", options: ["PAR — 認可リクエストをサーバーに保存する", "PKCE — 認可コードを検証する", "DPoP — リクエストごとに秘密鍵で署名する", "state — callbackのCSRFを防ぐ"], answer: 2, explain: "DPoPはアクセストークンを公開鍵にバインドします。対応する秘密鍵でProofを作れない攻撃者は、盗んだトークンを使えません。" },
  { q: "PKCEで、認可開始時とトークン交換時に送る値の正しい組み合わせは？", options: ["verifier → challenge", "challenge → verifier", "両方を開始時に送る", "どちらも交換時に送る"], answer: 1, explain: "最初にchallenge（verifierのハッシュ）を送り、交換時に元のverifierを提示します。" },
  { q: "PARを使うと、認可画面へ移動するときブラウザに渡すものは？", options: ["scopeなど全パラメータ", "client_secret", "一時的なrequest_uri", "DPoP秘密鍵"], answer: 2, explain: "パラメータは事前にバックチャネルで登録し、ブラウザにはrequest_uriを渡します。" },
  { q: "分散型のAT Protocolでprivate_key_jwtを使う理由として適切なのは？", options: ["JWTのほうが短いから", "全認可サーバーと秘密を事前共有しなくてよいから", "DPoP鍵が不要になるから", "ユーザーのパスワードを暗号化できるから"], answer: 1, explain: "公開鍵をメタデータとして公開すれば、各認可サーバーとclient_secretを個別共有せず署名を検証できます。" },
];

let currentStep = 0;
let handle = "alice.bsky.social";
let demo = null;
let autoplayTimer = null;
let quizIndex = 0;
let quizScore = 0;
let answered = false;
let toastTimer;

function escapeHTML(value) { return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
function b64url(bytes) { let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function randomString(size = 32) { const bytes = crypto.getRandomValues(new Uint8Array(size)); return b64url(bytes); }
async function makeDemoData() {
  const verifier = randomString(64);
  let challenge = "S256_" + randomString(24);
  let publicJwk = { kty: "EC", crv: "P-256", x: "demo-public-key-x", y: "demo-public-key-y" };
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    challenge = b64url(new Uint8Array(digest));
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  } catch (_) { /* File preview / restricted contexts use illustrative values. */ }
  return { verifier, challenge, state: randomString(24), publicJwk, requestUri: "urn:ietf:params:oauth:request_uri:" + randomString(14), code: "demo_" + randomString(12), access: "eyJ...demo_access_token", refresh: "def5...demo_refresh_token", nonce: "n-" + randomString(10) };
}

function endpoint(which) {
  if (which === "as") return "https://auth.example.net/oauth";
  if (which === "pds") return "https://pds.example.net";
  return "https://booklog.example.app";
}
function authorizationServer() { return "https://auth.example.net"; }
function jsonBlock(value) {
  const escaped = escapeHTML(typeof value === "string" ? value : JSON.stringify(value, null, 2));
  return escaped.replace(/(&quot;[^&]*?&quot;)(?=\s*:)/g, '<span class="key">$1</span>').replace(/: (&quot;.*?&quot;)/g, ': <span class="value">$1</span>');
}
function codePanel(label, body) { return `<div class="http-block"><div class="block-label">${label}</div><pre class="code-block">${jsonBlock(body)}</pre></div>`; }

function requestFor(stepNo) {
  const d = demo;
  const h = escapeHTML(handle);
  const base = `<div class="empty-state"><span class="empty-icon">⌁</span><span>フロー開始後、リクエスト内容が表示されます</span><small>実際のAPI通信は発生しません</small></div>`;
  if (!stepNo || !d) return { method: "READY", html: base };
  const call = (method, url, headers, body, status, response, note) => ({
    method,
    html: `<div class="request-line"><b>${method}</b> ${escapeHTML(url)}</div>${codePanel("REQUEST HEADERS", headers)}${body ? codePanel("REQUEST BODY", body) : ""}${status ? codePanel(`RESPONSE · ${status}`, response) : ""}${note ? `<div class="callout">${note}</div>` : ""}`,
  });
  switch (stepNo) {
    case 1:
      return {
        method: "4 LOOKUPS",
        html: `<div class="discovery-chain">
          <div class="discovery-row"><span class="discovery-index">01</span><div class="discovery-main"><div class="discovery-title">ハンドル → DID <span>HTTPS handle resolution の例</span></div><div class="request-line"><b>GET</b> https://${h}/.well-known/atproto-did</div><div class="discovery-result">200 · text/plain → <code>did:plc:example123</code></div></div></div>
          <div class="discovery-row"><span class="discovery-index">02</span><div class="discovery-main"><div class="discovery-title">DID → DID Document <span>did:plc の場合</span></div><div class="request-line"><b>GET</b> https://plc.directory/did:plc:example123</div><div class="discovery-result">200 · <code>#atproto_pds</code> service → ${endpoint("pds")}</div></div></div>
          <div class="discovery-row"><span class="discovery-index">03</span><div class="discovery-main"><div class="discovery-title">PDS → Authorization Server</div><div class="request-line"><b>GET</b> ${endpoint("pds")}/.well-known/oauth-protected-resource</div><div class="discovery-result">200 · authorization_servers → ${authorizationServer()}</div></div></div>
          <div class="discovery-row"><span class="discovery-index">04</span><div class="discovery-main"><div class="discovery-title">AS → OAuth endpoints</div><div class="request-line"><b>GET</b> ${authorizationServer()}/.well-known/oauth-authorization-server</div><div class="discovery-result">200 · PAR /oauth/par · authorize /oauth/authorize · token /oauth/token</div></div></div>
        </div><div class="http-block"><div class="block-label">共通リクエストヘッダー</div><pre class="code-block">${jsonBlock({ Accept: "application/json, text/plain", "User-Agent": "FlowLab/1.0" })}</pre></div><div class="callout">このデモはHTTPSでハンドルを解決する例です。DNS TXT（_atproto.&lt;handle&gt;）を使う方法もあります。DID Documentの取得先はDID方式で変わります。</div>`,
      };
    case 2:
      return call("INTERNAL", "crypto.subtle + Supabase", { "Runtime": "Cloudflare Workers / WebCrypto" }, { code_challenge: d.challenge, code_challenge_method: "S256", state: d.state, dpop_key: "ES256 P-256 key pair", ttl: "600 seconds" }, "INSERT", { table: "oauth_states", verifier: `${d.verifier.slice(0, 12)}…`, handle: h, expires_in: "10m" }, "verifierとDPoP秘密鍵はサーバー側の一時状態に保存。公開鍵だけをリクエストで提示します。");
    case 3:
      return call("POST", `${endpoint("as")}/par`, { "Content-Type": "application/x-www-form-urlencoded", "DPoP": "<signed proof JWT>" }, { client_id: "https://booklog.example.app/oauth/client-metadata.json", response_type: "code", redirect_uri: "https://booklog.example.app/auth/callback", scope: "atproto repo:com.booklog.record.reading", code_challenge: d.challenge, code_challenge_method: "S256", state: d.state, client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer", client_assertion: "<private_key_jwt>" }, "201 Created", { request_uri: d.requestUri, expires_in: 60 }, "client_assertionはアプリの秘密鍵で署名。DPoP ProofはPOST先・時刻などを署名します。");
    case 4:
      return call("302", `${endpoint("as")}/authorize?client_id=…&request_uri=…`, { "Location": `${endpoint("as")}/authorize?client_id=…&request_uri=${d.requestUri.slice(0, 36)}…` }, null, "200 · CONSENT", { requested_scope: "atproto repo:com.booklog.record.reading", user_action: "Allow" }, "ブラウザのURLにscopeやredirect_uriは並びません。request_uriがサーバー側に保存された要求を参照します。");
    case 5:
      return call("GET", "/auth/callback?code=…&state=…", { "Cookie": "__Host-session=<HttpOnly>" }, null, "STATE MATCH", { code: d.code, state: d.state.slice(0, 12) + "…", oauth_states: "record consumed & deleted" }, "stateが一致しなければ処理を中断。使い終えた一時レコードは再利用できないよう削除します。");
    case 6:
      return call("POST", `${endpoint("as")}/token`, { "Content-Type": "application/x-www-form-urlencoded", "DPoP": "<signed proof JWT>" }, { grant_type: "authorization_code", code: d.code, code_verifier: d.verifier.slice(0, 14) + "…", client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer", client_assertion: "<signed client JWT>" }, "200 OK", { token_type: "DPoP", access_token: d.access, refresh_token: d.refresh, expires_in: 3600 }, "認可サーバーはchallengeとverifierを照合し、クライアント署名とDPoP鍵も検証します。");
    case 7:
      return call("INSERT", "Supabase · oauth_sessions", { "Access": "service_role only", "RLS": "enabled" }, { did: "did:plc:example123", access_token: d.access, refresh_token: d.refresh, dpop_private_key: "<encrypted / server-side>", expires_at: "in 60 minutes" }, "SAVED", { session: "active", browser_cookie: "HttpOnly · Secure · SameSite=Lax" }, "ブラウザのJavaScriptにトークンや秘密鍵を渡しません。");
    case 8:
      return call("POST", `${endpoint("pds")}/xrpc/com.atproto.repo.createRecord`, { "Authorization": `DPoP ${d.access}`, "DPoP": "<fresh proof · includes ath>" }, { collection: "com.booklog.record.reading", record: { "$type": "com.booklog.record.reading", title: "学習用の読書記録" } }, "200 OK", { uri: "at://did:plc:example123/com.booklog.record.reading/…", accepted: true }, "Proofにはhtm・htu・iat・jtiとアクセストークンのハッシュ(ath)を含め、リクエストごとに新しく署名します。");
    case 9:
      return call("POST", `${endpoint("pds")}/xrpc/com.atproto.repo.createRecord`, { "Authorization": `DPoP ${d.access}`, "DPoP": "<proof with nonce>" }, { nonce: d.nonce, retry: "once only", proof: "re-signed with nonce claim" }, "401 → 200 OK", { first_response: { status: 401, "DPoP-Nonce": d.nonce }, retry_response: { status: 200, accepted: true } }, "use_dpop_nonceを受けたときだけnonceを取り込み、proofを作り直して1回再試行します。");
    default: return { method: "DONE", html: base };
  }
}

function securityFor(stepNo) {
  if (!stepNo || !demo) return `<div class="empty-state"><span class="empty-icon">◇</span><span>ステップに応じた暗号情報・DB状態が表示されます</span><small>秘密値はこの画面内だけのデモデータです</small></div>`;
  const d = demo;
  const rows = [];
  if (stepNo >= 1) rows.push(["解決したID", "DID", "did:plc:example123", "DID（分散型識別子）は、AT Protocol上でユーザーを指す一意のIDです。ハンドルと違い、ユーザーがサーバーを移転しても基本的に変わりません。"]);
  if (stepNo >= 2) {
    rows.push(["PKCE", "S256", `<em>verifier</em> ${escapeHTML(d.verifier.slice(0, 15))}…<br/><em>challenge</em> ${escapeHTML(d.challenge.slice(0, 23))}…`, "認可コードの横取り対策です。開始時にverifierのハッシュ（challenge）を送り、トークン交換時に元のverifierを提示して、コードを受け取った本人であることを確かめます。"]);
    rows.push(["DPoP 鍵", "ES256 · P-256", `<span class="secure">公開 JWK</span> ${escapeHTML(d.publicJwk.x?.slice(0, 16) || "demo") }…<br/>秘密鍵 <span class="secure">サーバー側</span>`, "リクエスト署名に使う鍵ペアです。秘密鍵でDPoP Proofを作り、対応する公開鍵に結び付いたトークンだけを使えるようにします。秘密鍵は外部に渡しません。"]);
    rows.push(["OAuth state", "CSRF / one-time", `<span class="secure">${escapeHTML(d.state.slice(0, 16))}…</span> · TTL 10m`, "認証開始時に作るランダムな一時値です。戻り先のcallbackで照合し、別のログイン要求へのすり替え（CSRF）を防ぎます。照合後は再利用しません。"]);
  }
  if (stepNo >= 3) rows.push(["Client JWT", "private_key_jwt", `<span class="secure">ES256 signature</span><br/>aud: authorization server · exp: short-lived`, "アプリ（OAuthクライアント）自身の身元を認可サーバーに証明する署名付きJWTです。アプリの秘密鍵で署名します。ユーザーのAPIアクセスを証明するDPoP Proofとは別の役割です。"]);
  if (stepNo >= 3 && stepNo < 8) rows.push(["DPoP Proof", "typ: dpop+jwt", `htm: <em>${stepNo === 3 || stepNo === 6 ? "POST" : "GET"}</em> · htu: /oauth/${stepNo === 3 ? "par" : "token"}<br/>jti: <span class="secure">unique per request</span>`, "このリクエストのために作る短命な署名です。HTTPメソッドや送信先などを含み、対応するDPoP秘密鍵を持つクライアントからの通信だと示します。リクエストごとに作り直します。"]);
  if (stepNo >= 6) rows.push(["Access token", "DPoP-bound", `<span class="token-value">${escapeHTML(d.access)}</span><br/>refresh: ${escapeHTML(d.refresh)}`, "保護されたAPI（ここではPDS）を利用するための資格情報です。この例ではDPoP鍵に結び付いているため、トークンだけを盗まれてもAPIを呼び出せません。refresh tokenはアクセストークンの更新に使います。"]);
  if (stepNo === 8 || stepNo === 9) rows.push(["API Proof", "ath + nonce", `ath: <span class="secure">SHA-256(access_token)</span><br/>${stepNo === 9 ? `nonce: <span class="secure">${escapeHTML(d.nonce)}</span>` : "fresh jti · htm · htu"}`, "PDSへのAPIリクエストに添えるDPoP Proofです。athはアクセストークンのハッシュでトークンとの組み合わせを示し、nonceがある場合はサーバーの要求に応じてProofへ含めます。"]);
  const stateCount = stepNo >= 2 && stepNo < 5 ? 1 : 0;
  const sessionCount = stepNo >= 7 ? 1 : 0;
  return `<div class="security-list">${rows.map(([name, sub, value, explanation], index) => `<div class="security-item"><div class="security-label"><button class="term-chip" type="button" aria-label="${escapeHTML(name)}。${escapeHTML(explanation)}" aria-describedby="security-tip-${index}">${escapeHTML(name)}<span class="term-help" aria-hidden="true">?</span><span class="term-tooltip" id="security-tip-${index}" role="tooltip">${escapeHTML(explanation)}</span></button><small>${sub}</small></div><div class="security-value">${value}</div></div>`).join("")}</div><div class="security-note"><span>▤</span><span>DB snapshot　<b>oauth_states ${stateCount}件</b>　·　<b>oauth_sessions ${sessionCount}件</b></span></div>`;
}

function render() {
  const step = currentStep ? steps[currentStep - 1] : null;
  const request = requestFor(currentStep);
  $("#stageLabel").textContent = step ? step.category : "準備完了";
  $("#stepCounter").textContent = `${currentStep} / ${steps.length}`;
  $("#progressFill").style.width = `${currentStep / steps.length * 100}%`;
  $("#prevButton").disabled = currentStep <= 1;
  $("#nextLabel").textContent = currentStep === 0 ? "フローを開始" : currentStep === steps.length ? "完了" : "次のステップ";
  $("#nextButton").disabled = currentStep === steps.length;
  $("#loginButton").textContent = currentStep ? "最初から実行" : "フローを開始";
  $("#methodBadge").textContent = request.method;
  $("#methodBadge").className = `method-badge ${request.method === "POST" || request.method === "INSERT" || request.method === "INTERNAL" ? "post" : request.method === "GET" ? "get" : request.method.includes("302") ? "redirect" : request.method.includes("401") ? "response" : ""}`;
  $("#httpContent").innerHTML = request.html;
  $("#securityContent").innerHTML = securityFor(currentStep);
  $("#summaryNumber").textContent = step ? String(currentStep).padStart(2, "0") : "—";
  $("#summaryTitle").textContent = step ? step.title : "フローを開始しましょう";
  $("#summaryDescription").textContent = step ? step.description : "ハンドルを入力して「フローを開始」を押すと、認証の準備からAPIアクセスまでを順に確認できます。";
  $("#summaryTags").innerHTML = step ? step.tags.map(tag => `<span class="tag ${tag.includes("DPoP") ? "dpop" : tag.includes("CLIENT") ? "client" : tag.includes("TOKEN") ? "token" : ""}">${escapeHTML(tag)}</span>`).join("") : '<span class="tag neutral">INTERACTIVE</span>';
  $("#flowActivity").textContent = step ? `${step.source.toUpperCase()} → ${step.target.toUpperCase()}` : "フロー開始前";
  $("#packetCaption").textContent = step ? routeLabel(currentStep) : "通信パケットはここに表示されます";
  $("#stepDots").innerHTML = steps.map((_, i) => `<span class="step-dot ${i + 1 < currentStep ? "done" : i + 1 === currentStep ? "current" : ""}"></span>`).join("");
  updateNodes(step);
  updateRoutes(step);
}

function routeLabel(n) {
  return ["ハンドル解決とメタデータ取得", "一時状態をDBへ保存", "PAR + client_assertion + DPoP", "request_uriで認可画面へ", "callbackでstateを照合", "codeをtokenに交換", "トークン・鍵をセッション保存", "DPoP Proof付きAPIリクエスト", "Nonceを含めて1回リトライ"][n - 1];
}
function updateNodes(step) {
  const names = ["browser", "app", "supabase", "as", "pds"];
  const touched = step ? new Set(step.participants || [step.source, step.target]) : new Set();
  for (const name of names) {
    const node = document.querySelector(`[data-node="${name}"]`);
    node.classList.toggle("active", touched.has(name));
    node.classList.toggle("complete", currentStep > 0 && !touched.has(name) && ((name === "supabase" && currentStep >= 2) || (name === "as" && currentStep >= 3) || (name === "pds" && currentStep >= 8)));
    node.classList.toggle("denied", name === "pds" && currentStep === 9);
    const state = $(`#state-${name}`);
    if (touched.has(name)) state.textContent = "処理中…";
    else if (name === "supabase") state.textContent = currentStep >= 7 ? "1 session" : currentStep >= 2 && currentStep < 5 ? "1 temp state" : "0 records";
    else if ((name === "as" && currentStep >= 3) || (name === "pds" && currentStep >= 8)) state.textContent = "接続済み";
    else state.textContent = "待機中";
  }
}
function updateRoutes(step) {
  document.querySelectorAll(".connection").forEach(path => { path.classList.remove("active", "response"); });
  const packet = $("#packet"); packet.classList.remove("visible");
  if (!step) return;
  step.route.forEach((id, i) => {
    const path = document.getElementById(id);
    if (path) path.classList.add(i === step.route.length - 1 && [4, 5, 7, 9].includes(currentStep) ? "response" : "active");
  });
  const firstRoute = document.getElementById(step.route[step.route.length - 1]);
  if (firstRoute) {
    const length = firstRoute.getTotalLength();
    const point = firstRoute.getPointAtLength(length * .52);
    packet.setAttribute("cx", point.x); packet.setAttribute("cy", point.y); packet.classList.add("visible");
  }
}

async function beginFlow() {
  const raw = $("#handleInput").value.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(raw)) {
    $("#inputHint").textContent = "有効なハンドルを入力してください（例: alice.bsky.social）";
    $("#inputHint").style.color = "#c75d68";
    $("#handleInput").focus();
    return;
  }
  handle = raw;
  $("#inputHint").textContent = "実際のアカウントには接続しません";
  $("#inputHint").style.color = "";
  demo = await makeDemoData();
  currentStep = 1;
  stopAutoplay();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function moveStep(delta) {
  if (currentStep === 0) { beginFlow(); return; }
  currentStep = Math.min(steps.length, Math.max(1, currentStep + delta));
  if (currentStep === steps.length) stopAutoplay();
  render();
}
function stopAutoplay() {
  if (autoplayTimer) clearInterval(autoplayTimer);
  autoplayTimer = null;
  $("#autoButton").setAttribute("aria-pressed", "false");
  $("#autoButton").innerHTML = '<span class="play-icon">▶</span> 自動再生';
}
function toggleAutoplay() {
  if (autoplayTimer) { stopAutoplay(); return; }
  if (currentStep === 0) { beginFlow().then(() => { if (currentStep) runAutoplay(); }); return; }
  if (currentStep >= steps.length) currentStep = 0;
  runAutoplay();
}
function runAutoplay() {
  $("#autoButton").setAttribute("aria-pressed", "true");
  $("#autoButton").innerHTML = '<span class="play-icon">Ⅱ</span> 一時停止';
  autoplayTimer = setInterval(() => {
    if (currentStep < steps.length) { currentStep++; render(); }
    else stopAutoplay();
  }, 2600);
}
function resetFlow() {
  stopAutoplay(); currentStep = 0; demo = null; render();
  $("#handleInput").value = handle || "alice.bsky.social";
}
function showToast(message) {
  const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function renderQuiz() {
  const q = quiz[quizIndex];
  $("#quizCount").textContent = `QUESTION ${quizIndex + 1} / ${quiz.length}`;
  $("#quizScore").textContent = quizIndex ? `SCORE ${quizScore}` : "";
  $("#quizQuestion").textContent = q.q;
  $("#quizFeedback").textContent = "";
  $("#quizNext").hidden = true;
  answered = false;
  $("#quizOptions").innerHTML = q.options.map((option, i) => `<button class="quiz-option" data-answer="${i}"><b>${String.fromCharCode(65 + i)}.</b> ${escapeHTML(option)}</button>`).join("");
  document.querySelectorAll(".quiz-option").forEach(button => button.addEventListener("click", () => answerQuiz(Number(button.dataset.answer))));
}
function answerQuiz(choice) {
  if (answered) return;
  answered = true;
  const correct = choice === quiz[quizIndex].answer;
  if (correct) quizScore++;
  document.querySelectorAll(".quiz-option").forEach((button, i) => {
    button.disabled = true;
    if (i === quiz[quizIndex].answer) button.classList.add("correct");
    else if (i === choice) button.classList.add("wrong");
  });
  $("#quizFeedback").textContent = `${correct ? "正解！" : "もう一度確認してみましょう。"} ${quiz[quizIndex].explain}`;
  $("#quizNext").hidden = false;
  $("#quizNext").textContent = quizIndex === quiz.length - 1 ? "結果を見る →" : "次の問題へ →";
}
function nextQuiz() {
  if (quizIndex < quiz.length - 1) { quizIndex++; renderQuiz(); }
  else {
    $("#quizCount").textContent = "QUIZ COMPLETE";
    $("#quizScore").textContent = `SCORE ${quizScore} / ${quiz.length}`;
    $("#quizQuestion").textContent = quizScore === quiz.length ? "完璧です！フローの仕組みを理解できています。" : `おつかれさまでした。${quiz.length}問中 ${quizScore}問正解です。ステップを見返してみましょう。`;
    $("#quizOptions").innerHTML = ""; $("#quizFeedback").textContent = "";
    $("#quizNext").hidden = false; $("#quizNext").textContent = "もう一度挑戦 ↻"; quizIndex = -1;
  }
}

$("#handleForm").addEventListener("submit", event => { event.preventDefault(); beginFlow(); });
$("#nextButton").addEventListener("click", () => currentStep === 0 ? beginFlow() : moveStep(1));
$("#prevButton").addEventListener("click", () => moveStep(-1));
$("#resetButton").addEventListener("click", resetFlow);
$("#autoButton").addEventListener("click", toggleAutoplay);
$("#helpButton").addEventListener("click", () => showToast("このアプレットはOAuthの仕組みを学ぶためのシミュレーターです。実際の認証処理は行いません。"));
$("#quizToggle").addEventListener("click", () => {
  const expanded = $("#quizToggle").getAttribute("aria-expanded") === "true";
  $("#quizToggle").setAttribute("aria-expanded", String(!expanded));
  $("#quizBody").hidden = expanded;
  if (!expanded && quizIndex === 0 && !$("#quizOptions").children.length) renderQuiz();
});
$("#quizNext").addEventListener("click", () => { if (quizIndex === -1) { quizIndex = 0; quizScore = 0; renderQuiz(); } else nextQuiz(); });
render();
