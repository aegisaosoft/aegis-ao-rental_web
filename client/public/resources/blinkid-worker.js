var Le = Object.defineProperty;
var J = (e) => {
  throw TypeError(e);
};
var Oe = (e, t, r) => t in e ? Le(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r;
var x = (e, t, r) => Oe(e, typeof t != "symbol" ? t + "" : t, r), $ = (e, t, r) => t.has(e) || J("Cannot " + r);
var d = (e, t, r) => ($(e, t, "read from private field"), r ? r.call(e) : t.get(e)), p = (e, t, r) => t.has(e) ? J("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), y = (e, t, r, s) => ($(e, t, "write to private field"), s ? s.call(e, r) : t.set(e, r), r), R = (e, t, r) => ($(e, t, "access private method"), r);
var Q = (e, t, r, s) => ({
  set _(n) {
    y(e, t, n, r);
  },
  get _() {
    return d(e, t, s);
  }
});
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const ae = Symbol("Comlink.proxy"), Re = Symbol("Comlink.endpoint"), ve = Symbol("Comlink.releaseProxy"), z = Symbol("Comlink.finalizer"), W = Symbol("Comlink.thrown"), ie = (e) => typeof e == "object" && e !== null || typeof e == "function", Ae = {
  canHandle: (e) => ie(e) && e[ae],
  serialize(e) {
    const { port1: t, port2: r } = new MessageChannel();
    return H(e, t), [r, [r]];
  },
  deserialize(e) {
    return e.start(), Ie(e);
  }
}, Ue = {
  canHandle: (e) => ie(e) && W in e,
  serialize({ value: e }) {
    let t;
    return e instanceof Error ? t = {
      isError: !0,
      value: {
        message: e.message,
        name: e.name,
        stack: e.stack
      }
    } : t = { isError: !1, value: e }, [t, []];
  },
  deserialize(e) {
    throw e.isError ? Object.assign(new Error(e.value.message), e.value) : e.value;
  }
}, ce = /* @__PURE__ */ new Map([
  ["proxy", Ae],
  ["throw", Ue]
]);
function Te(e, t) {
  for (const r of e)
    if (t === r || r === "*" || r instanceof RegExp && r.test(t))
      return !0;
  return !1;
}
function H(e, t = globalThis, r = ["*"]) {
  t.addEventListener("message", function s(n) {
    if (!n || !n.data)
      return;
    if (!Te(r, n.origin)) {
      console.warn(`Invalid origin '${n.origin}' for comlink proxy`);
      return;
    }
    const { id: o, type: c, path: a } = Object.assign({ path: [] }, n.data), l = (n.data.argumentList || []).map(k);
    let i;
    try {
      const u = a.slice(0, -1).reduce((h, w) => h[w], e), f = a.reduce((h, w) => h[w], e);
      switch (c) {
        case "GET":
          i = f;
          break;
        case "SET":
          u[a.slice(-1)[0]] = k(n.data.value), i = !0;
          break;
        case "APPLY":
          i = f.apply(u, l);
          break;
        case "CONSTRUCT":
          {
            const h = new f(...l);
            i = me(h);
          }
          break;
        case "ENDPOINT":
          {
            const { port1: h, port2: w } = new MessageChannel();
            H(e, w), i = fe(h, [h]);
          }
          break;
        case "RELEASE":
          i = void 0;
          break;
        default:
          return;
      }
    } catch (u) {
      i = { value: u, [W]: 0 };
    }
    Promise.resolve(i).catch((u) => ({ value: u, [W]: 0 })).then((u) => {
      const [f, h] = j(u);
      t.postMessage(Object.assign(Object.assign({}, f), { id: o }), h), c === "RELEASE" && (t.removeEventListener("message", s), le(t), z in e && typeof e[z] == "function" && e[z]());
    }).catch((u) => {
      const [f, h] = j({
        value: new TypeError("Unserializable return value"),
        [W]: 0
      });
      t.postMessage(Object.assign(Object.assign({}, f), { id: o }), h);
    });
  }), t.start && t.start();
}
function Me(e) {
  return e.constructor.name === "MessagePort";
}
function le(e) {
  Me(e) && e.close();
}
function Ie(e, t) {
  const r = /* @__PURE__ */ new Map();
  return e.addEventListener("message", function(n) {
    const { data: o } = n;
    if (!o || !o.id)
      return;
    const c = r.get(o.id);
    if (c)
      try {
        c(o);
      } finally {
        r.delete(o.id);
      }
  }), _(e, r, [], t);
}
function M(e) {
  if (e)
    throw new Error("Proxy has been released and is not useable");
}
function ue(e) {
  return L(e, /* @__PURE__ */ new Map(), {
    type: "RELEASE"
  }).then(() => {
    le(e);
  });
}
const B = /* @__PURE__ */ new WeakMap(), C = "FinalizationRegistry" in globalThis && new FinalizationRegistry((e) => {
  const t = (B.get(e) || 0) - 1;
  B.set(e, t), t === 0 && ue(e);
});
function Ne(e, t) {
  const r = (B.get(t) || 0) + 1;
  B.set(t, r), C && C.register(e, t, e);
}
function ze(e) {
  C && C.unregister(e);
}
function _(e, t, r = [], s = function() {
}) {
  let n = !1;
  const o = new Proxy(s, {
    get(c, a) {
      if (M(n), a === ve)
        return () => {
          ze(o), ue(e), t.clear(), n = !0;
        };
      if (a === "then") {
        if (r.length === 0)
          return { then: () => o };
        const l = L(e, t, {
          type: "GET",
          path: r.map((i) => i.toString())
        }).then(k);
        return l.then.bind(l);
      }
      return _(e, t, [...r, a]);
    },
    set(c, a, l) {
      M(n);
      const [i, u] = j(l);
      return L(e, t, {
        type: "SET",
        path: [...r, a].map((f) => f.toString()),
        value: i
      }, u).then(k);
    },
    apply(c, a, l) {
      M(n);
      const i = r[r.length - 1];
      if (i === Re)
        return L(e, t, {
          type: "ENDPOINT"
        }).then(k);
      if (i === "bind")
        return _(e, t, r.slice(0, -1));
      const [u, f] = Z(l);
      return L(e, t, {
        type: "APPLY",
        path: r.map((h) => h.toString()),
        argumentList: u
      }, f).then(k);
    },
    construct(c, a) {
      M(n);
      const [l, i] = Z(a);
      return L(e, t, {
        type: "CONSTRUCT",
        path: r.map((u) => u.toString()),
        argumentList: l
      }, i).then(k);
    }
  });
  return Ne(o, e), o;
}
function We(e) {
  return Array.prototype.concat.apply([], e);
}
function Z(e) {
  const t = e.map(j);
  return [t.map((r) => r[0]), We(t.map((r) => r[1]))];
}
const de = /* @__PURE__ */ new WeakMap();
function fe(e, t) {
  return de.set(e, t), e;
}
function me(e) {
  return Object.assign(e, { [ae]: !0 });
}
function j(e) {
  for (const [t, r] of ce)
    if (r.canHandle(e)) {
      const [s, n] = r.serialize(e);
      return [
        {
          type: "HANDLER",
          name: t,
          value: s
        },
        n
      ];
    }
  return [
    {
      type: "RAW",
      value: e
    },
    de.get(e) || []
  ];
}
function k(e) {
  switch (e.type) {
    case "HANDLER":
      return ce.get(e.name).deserialize(e.value);
    case "RAW":
      return e.value;
  }
}
function L(e, t, r, s) {
  return new Promise((n) => {
    const o = De();
    t.set(o, n), e.start && e.start(), e.postMessage(Object.assign({ id: o }, r), s);
  });
}
function De() {
  return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
}
const Be = async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 3, 1, 0, 1, 10, 14, 1, 12, 0, 65, 0, 65, 0, 65, 0, 252, 10, 0, 0, 11])), Ce = async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 2, 8, 1, 1, 97, 1, 98, 3, 127, 1, 6, 6, 1, 127, 1, 65, 0, 11, 7, 5, 1, 1, 97, 3, 1])), je = async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 7, 1, 5, 0, 208, 112, 26, 11])), Ve = async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 12, 1, 10, 0, 67, 0, 0, 0, 0, 252, 0, 26, 11])), $e = async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 8, 1, 6, 0, 65, 0, 192, 26, 11])), Fe = async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])), _e = () => (async (e) => {
  try {
    return typeof MessageChannel < "u" && new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)), WebAssembly.validate(e);
  } catch {
    return !1;
  }
})(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 4, 1, 3, 1, 1, 10, 11, 1, 9, 0, 65, 0, 254, 16, 2, 0, 26, 11]));
function He() {
  const e = navigator.userAgent.toLowerCase();
  return e.includes("safari") && !e.includes("chrome");
}
async function qe() {
  if (!await _e()) return !1;
  if (!("importScripts" in self))
    throw Error("Not implemented");
  return He() ? !1 : "Worker" in self;
}
async function Ge() {
  const e = [
    Ce(),
    je(),
    Be(),
    Ve(),
    $e()
  ];
  if (!(await Promise.all(e)).every(Boolean))
    throw new Error("Browser doesn't meet minimum requirements!");
  return await Fe() ? await qe() ? "advanced-threads" : "advanced" : "basic";
}
const ee = "application/javascript", Ye = (e, t = {}) => {
  const r = {
    skipSameOrigin: !0,
    useBlob: !0,
    ...t
  };
  return r.skipSameOrigin && new URL(e).origin === self.location.origin ? Promise.resolve(e) : new Promise(
    (s, n) => void fetch(e).then((o) => o.text()).then((o) => {
      new URL(e).href.split("/").pop();
      let a = "";
      if (r.useBlob) {
        const l = new Blob([o], { type: ee });
        a = URL.createObjectURL(l);
      } else
        a = `data:${ee},` + encodeURIComponent(o);
      s(a);
    }).catch(n)
  );
};
function Ke() {
  const e = self.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(e);
}
function Xe(e) {
  return {
    licenseId: e.licenseId,
    licensee: e.licensee,
    applicationIds: e.applicationIds,
    packageName: e.packageName,
    platform: "Browser",
    sdkName: e.sdkName,
    sdkVersion: e.sdkVersion
  };
}
async function te(e, t = "https://baltazar.microblink.com/api/v2/status/check") {
  if (!t || typeof t != "string")
    throw new Error("Invalid baltazarUrl: must be a non-empty string");
  try {
    new URL(t);
  } catch {
    throw new Error(`Invalid baltazarUrl format: ${t}`);
  }
  try {
    const r = await fetch(t, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-cache",
      body: JSON.stringify(Xe(e))
    });
    if (!r.ok)
      throw new Error(
        `Server returned error: ${r.status} ${r.statusText}`
      );
    return await r.text();
  } catch (r) {
    throw console.error("Server permission request failed:", r), r;
  }
}
function re(e) {
  return Math.ceil(e * 1024 * 1024 / 64 / 1024);
}
function I(...e) {
  const t = e.filter((r) => r).join("/").replace(/([^:]\/)\/+/g, "$1");
  try {
    new URL(t, "http://example.com");
  } catch {
    throw new Error(`Invalid URL: ${t}`);
  }
  return t;
}
function he(e) {
  return Object.prototype.toString.call(e).slice(8, -1);
}
function N(e) {
  if (he(e) !== "Object")
    return !1;
  const t = Object.getPrototypeOf(e);
  return !!t && t.constructor === Object && t === Object.prototype;
}
function ne(e) {
  return he(e) === "Symbol";
}
function se(e, t, r, s) {
  const n = {}.propertyIsEnumerable.call(s, t) ? "enumerable" : "nonenumerable";
  n === "enumerable" && (e[t] = r), n === "nonenumerable" && Object.defineProperty(e, t, {
    value: r,
    enumerable: !1,
    writable: !0,
    configurable: !0
  });
}
function ge(e, t, r) {
  if (!N(t))
    return t;
  let s = {};
  if (N(e)) {
    const a = Object.getOwnPropertyNames(e), l = Object.getOwnPropertySymbols(e);
    s = [...a, ...l].reduce((i, u) => {
      const f = e[u];
      return (!ne(u) && !Object.getOwnPropertyNames(t).includes(u) || ne(u) && !Object.getOwnPropertySymbols(t).includes(u)) && se(i, u, f, e), i;
    }, {});
  }
  const n = Object.getOwnPropertyNames(t), o = Object.getOwnPropertySymbols(t);
  return [...n, ...o].reduce((a, l) => {
    let i = t[l];
    const u = N(e) ? e[l] : void 0;
    return u !== void 0 && N(i) && (i = ge(u, i)), se(a, l, i, t), a;
  }, s);
}
function Je(e, ...t) {
  return t.reduce((r, s) => ge(r, s), e);
}
function pe(e) {
  return {
    country: (e == null ? void 0 : e.country) ?? void 0,
    region: (e == null ? void 0 : e.region) ?? void 0,
    type: (e == null ? void 0 : e.type) ?? void 0
  };
}
const Qe = (e) => ({
  documentFilter: pe(e.documentFilter),
  fields: e.fields ?? []
}), Ze = (e) => ({
  documentFilter: pe(e.documentFilter),
  fields: e.fields || [],
  documentNumberAnonymizationSettings: e.documentNumberAnonymizationSettings ? {
    prefixDigitsVisible: e.documentNumberAnonymizationSettings.prefixDigitsVisible,
    suffixDigitsVisible: e.documentNumberAnonymizationSettings.suffixDigitsVisible
  } : void 0
});
function et(e = {}, t) {
  var c, a, l, i;
  e && (e = Object.fromEntries(
    Object.entries(e).filter(([u, f]) => f !== void 0)
  ));
  const r = ((a = (c = e == null ? void 0 : e.scanningSettings) == null ? void 0 : c.customDocumentRules) == null ? void 0 : a.map(
    Qe
  )) ?? [], s = ((i = (l = e == null ? void 0 : e.scanningSettings) == null ? void 0 : l.customDocumentAnonymizationSettings) == null ? void 0 : i.map(
    Ze
  )) ?? [], n = {
    ...e == null ? void 0 : e.scanningSettings,
    customDocumentRules: r,
    customDocumentAnonymizationSettings: s
  };
  return Je(t, {
    ...e,
    scanningSettings: n
  });
}
const tt = { basic: { full: 3242579, lightweight: 3280109 }, advanced: { full: 3261412, lightweight: 3297593 }, "advanced-threads": { full: 3308419, lightweight: 3343699 } }, rt = { basic: { full: 13393962, lightweight: 11761277 }, advanced: { full: 13393962, lightweight: 11761277 }, "advanced-threads": { full: 13393962, lightweight: 11761277 } }, nt = {
  wasm: tt,
  data: rt
};
function st(e, t, r) {
  return nt[e][t][r];
}
async function oe(e, t, r, s, n) {
  var f;
  const o = await fetch(e);
  if (!n)
    return o.arrayBuffer();
  const c = o.headers.get("Content-Length"), a = c ? parseInt(c, 10) : st(t, r, s);
  if (isNaN(a) || a <= 0)
    throw new Error(
      `Invalid content length for ${t} file: ${a}`
    );
  let l = 0;
  const i = new TransformStream({
    transform(h, w) {
      l += h.length;
      const V = Math.min(
        Math.round(l / a * 100),
        100
      );
      n({
        loaded: l,
        contentLength: a,
        progress: V,
        finished: !1
      }), w.enqueue(h);
    },
    flush() {
      n({
        loaded: l,
        contentLength: a,
        progress: 100,
        finished: !0
      });
    }
  });
  return new Response(
    (f = o.body) == null ? void 0 : f.pipeThrough(i),
    o
  ).arrayBuffer();
}
class F extends Error {
  constructor(t, r, s) {
    super(`Proxy URL validation failed for "${s}": ${r}`), this.code = t, this.url = s, this.name = "ProxyUrlValidationError";
  }
}
function ot(e) {
  const t = e.unlockResult === "requires-server-permission", { allowPingProxy: r, allowBaltazarProxy: s, hasPing: n } = e;
  if (!r && !s)
    throw new Error(
      "Microblink proxy URL is set but your license doesn't permit proxy usage. Check your license."
    );
  if (!t && !n)
    throw new Error(
      "Microblink proxy URL is set but your license doesn't permit proxy usage. Check your license."
    );
  if (!t && n && s && !r || t && !n && !s && r)
    throw new Error(
      "Microblink proxy URL is set but your license doesn't permit proxy usage. Check your license."
    );
}
function at(e) {
  let t;
  try {
    t = new URL(e);
  } catch {
    throw new F(
      "INVALID_PROXY_URL",
      `Failed to create URL instance for provided Microblink proxy URL "${e}". Expected format: https://your-proxy.com or https://your-proxy.com/`,
      e
    );
  }
  if (t.protocol !== "https:")
    throw new F(
      "HTTPS_REQUIRED",
      `Proxy URL validation failed for "${e}": HTTPS protocol must be used. Expected format: https://your-proxy.com or https://your-proxy.com/`,
      e
    );
  const r = t.origin;
  try {
    const s = new URL("/api/v2/status/check", r).toString();
    return {
      ping: r,
      baltazar: s
    };
  } catch {
    throw new F(
      "INVALID_PROXY_URL",
      "Failed to build baltazar service URL",
      e
    );
  }
}
var m, v, A, U, T, b, O, P, ye, D;
class it {
  constructor() {
    p(this, P);
    /**
     * The Wasm module.
     */
    p(this, m);
    /**
     * The default session settings.
     *
     * Must be initialized when calling initBlinkId.
     */
    p(this, v);
    /**
     * The progress status callback.
     */
    x(this, "progressStatusCallback");
    /**
     * Whether the demo overlay is shown.
     */
    p(this, A, !0);
    /**
     * Whether the production overlay is shown.
     */
    p(this, U, !0);
    /**
     * Current session number.
     */
    p(this, T, 0);
    /**
     * Sanitized proxy URLs for Microblink services.
     */
    p(this, b);
    p(this, O);
  }
  reportPinglet(t) {
    if (!d(this, m))
      throw new Error("Wasm module not loaded");
    d(this, m).isPingEnabled() && d(this, m).queuePinglet(
      JSON.stringify(t.data),
      t.schemaName,
      t.schemaVersion,
      // session number can be overriden by pinglet, otherwise use current
      // session count
      t.sessionNumber ?? d(this, T)
    );
  }
  sendPinglets() {
    if (!d(this, m))
      throw new Error("Wasm module not loaded");
    d(this, m).sendPinglets();
  }
  /**
   * This method initializes everything.
   */
  async initBlinkId(t, r, s) {
    var a;
    const n = new URL(
      "resources/",
      t.resourcesLocation
    ).toString();
    if (y(this, v, r), this.progressStatusCallback = s, y(this, O, t.userId), await R(this, P, ye).call(this, {
      resourceUrl: n,
      variant: t.wasmVariant,
      initialMemory: t.initialMemory,
      useLightweightBuild: t.useLightweightBuild
    }), !d(this, m))
      throw new Error("Wasm module not loaded");
    const o = new lt({
      packageName: self.location.hostname,
      platform: "Emscripten",
      product: "BlinkID",
      userId: d(this, O)
    });
    this.reportPinglet(o), this.sendPinglets();
    const c = d(this, m).initializeWithLicenseKey(
      t.licenseKey,
      t.userId,
      !1
    );
    if (this.sendPinglets(), c.licenseError)
      throw R(this, P, D).call(this, {
        errorType: "Crash",
        errorMessage: c.licenseError
      }), this.sendPinglets(), new ut(
        "License unlock error: " + c.licenseError,
        "LICENSE_ERROR"
      );
    if (t.microblinkProxyUrl && (ot(c), y(this, b, at(t.microblinkProxyUrl)), c.allowPingProxy && c.hasPing && (d(this, m).setPingProxyUrl(d(this, b).ping), console.debug(`Using ping proxy URL: ${d(this, b).ping}`))), c.unlockResult === "requires-server-permission") {
      const i = ((a = d(this, b)) == null ? void 0 : a.baltazar) && c.allowBaltazarProxy ? d(this, b).baltazar : void 0;
      i && console.debug(`Using Baltazar proxy URL: ${i}`);
      const u = i ? await te(c, i) : await te(c), f = d(this, m).submitServerPermission(
        u
      );
      if (f != null && f.error)
        throw R(this, P, D).call(this, {
          errorType: "Crash",
          errorMessage: f.error
        }), this.sendPinglets(), new Error("Server unlock error: " + f.error);
    }
    console.debug(`BlinkID SDK ${c.sdkVersion} unlocked`), y(this, A, c.showDemoOverlay), y(this, U, c.showProductionOverlay), d(this, m).initializeSdk(t.userId), this.sendPinglets();
  }
  /**
   * This method creates a BlinkID scanning session.
   *
   * @param options - The options for the session.
   * @returns The session.
   */
  createBlinkIdScanningSession(t) {
    if (!d(this, m))
      throw new Error("Wasm module not loaded");
    const r = et(
      t,
      d(this, v)
    ), s = d(this, m).createBlinkIdScanningSession(
      r,
      d(this, O)
    );
    return this.sendPinglets(), Q(this, T)._++, this.createProxySession(s, r);
  }
  /**
   * This method creates a proxy session.
   *
   * @param session - The session.
   * @param sessionSettings - The session settings.
   * @returns The proxy session.
   */
  createProxySession(t, r) {
    return me({
      getResult: () => t.getResult(),
      process: (n) => {
        const o = t.process(n);
        if ("error" in o)
          throw R(this, P, D).call(this, {
            errorType: "NonFatal",
            errorMessage: o.error
          }), new Error(`Error processing frame: ${o.error}`);
        return fe(
          {
            ...o,
            arrayBuffer: n.data.buffer
          },
          [n.data.buffer]
        );
      },
      ping: (n) => this.reportPinglet(n),
      sendPinglets: () => this.sendPinglets(),
      getSettings: () => r,
      reset: () => t.reset(),
      delete: () => t.delete(),
      deleteLater: () => t.deleteLater(),
      isDeleted: () => t.isDeleted(),
      isAliasOf: (n) => t.isAliasOf(n),
      showDemoOverlay: () => d(this, A),
      showProductionOverlay: () => d(this, U)
    });
  }
  /**
   * This method is called when the worker is terminated.
   */
  [z]() {
  }
  /**
   * Terminates the workers and the Wasm runtime.
   */
  async terminate() {
    if (self.setTimeout(() => self.close, 5e3), !d(this, m)) {
      console.warn(
        "No Wasm module loaded during worker termination. Skipping cleanup."
      ), self.close();
      return;
    }
    d(this, m).terminateSdk(), await new Promise((s) => setTimeout(s, 0)), this.sendPinglets();
    const r = Date.now();
    for (; d(this, m).arePingRequestsInProgress() && Date.now() - r < 5e3; )
      await new Promise((s) => setTimeout(s, 100));
    y(this, m, void 0), console.debug("BlinkIdWorker terminated 🔴"), self.close();
  }
}
m = new WeakMap(), v = new WeakMap(), A = new WeakMap(), U = new WeakMap(), T = new WeakMap(), b = new WeakMap(), O = new WeakMap(), P = new WeakSet(), ye = async function({
  resourceUrl: t,
  variant: r,
  useLightweightBuild: s,
  initialMemory: n
}) {
  if (d(this, m)) {
    console.log("Wasm already loaded");
    return;
  }
  const o = r ?? await Ge(), c = s ? "lightweight" : "full", a = "BlinkIdModule", l = I(
    t,
    c,
    o
  ), i = I(l, `${a}.js`), u = I(l, `${a}.wasm`), f = I(l, `${a}.data`), h = await Ye(i), V = (await import(
    /* @vite-ignore */
    h
  )).default;
  n || (n = Ke() ? 700 : 200);
  const we = new WebAssembly.Memory({
    initial: re(n),
    maximum: re(2048),
    shared: o === "advanced-threads"
  });
  let S, E, q = 0;
  const be = 32, G = () => {
    if (!this.progressStatusCallback || !S || !E)
      return;
    const g = S.finished && E.finished, Y = S.loaded + E.loaded, K = S.contentLength + E.contentLength, ke = g ? 100 : Math.min(Math.round(Y / K * 100), 100), X = performance.now();
    X - q < be || (q = X, this.progressStatusCallback({
      loaded: Y,
      contentLength: K,
      progress: ke,
      finished: g
    }));
  }, Pe = (g) => {
    S = g, G();
  }, Se = (g) => {
    E = g, G();
  }, [Ee, xe] = await Promise.all([
    oe(
      u,
      "wasm",
      o,
      c,
      Pe
    ),
    oe(
      f,
      "data",
      o,
      c,
      Se
    )
  ]);
  if (this.progressStatusCallback && S && E) {
    const g = S.contentLength + E.contentLength;
    this.progressStatusCallback({
      loaded: g,
      contentLength: g,
      progress: 100,
      finished: !0
    });
  }
  if (y(this, m, await V({
    locateFile: (g) => `${l}/${o}/${g}`,
    // pthreads build breaks without this:
    // "Failed to execute 'createObjectURL' on 'URL': Overload resolution failed."
    mainScriptUrlOrBlob: h,
    wasmBinary: Ee,
    getPreloadedPackage() {
      return xe;
    },
    wasmMemory: we,
    noExitRuntime: !0
  })), !d(this, m))
    throw new Error("Failed to load Wasm module");
}, D = function(t) {
  const r = {
    data: {
      errorType: t.errorType,
      errorMessage: t.errorMessage
    },
    schemaName: "ping.error",
    schemaVersion: "1.0.0"
  };
  this.reportPinglet(r);
};
const ct = new it();
H(ct);
class lt {
  constructor(t) {
    x(this, "data");
    /** Needs to be 0 for sorting purposes */
    x(this, "sessionNumber", 0);
    x(this, "schemaName", "ping.sdk.init.start");
    x(this, "schemaVersion", "1.0.0");
    this.data = t;
  }
}
class ut extends Error {
  constructor(r, s) {
    super(r);
    x(this, "code");
    this.name = "LicenseError", this.code = s;
  }
}
