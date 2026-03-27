/**
 * Hilux Client Integrity SDK
 *
 * Server-side component that:
 * 1. Generates a lightweight JS snippet for embed in the frontend
 * 2. Verifies the integrity tokens produced by that snippet
 *
 * The client SDK collects browser signals (canvas, WebGL, timezone,
 * screen, plugins, etc.) and generates an HMAC-signed token that is
 * sent as a header on every request. The server verifies the signature
 * to ensure the request came from a real browser running the SDK.
 */

import crypto from "crypto";

export interface ClientIntegrityConfig {
  enabled: boolean;
  headerName: string;
  secret: string;
  tokenTtlSeconds: number;
  penaltyScore: number;
}

const DEFAULT_INTEGRITY_CONFIG: ClientIntegrityConfig = {
  enabled: false,
  headerName: "x-hilux-integrity",
  secret: "",
  tokenTtlSeconds: 300,
  penaltyScore: 30,
};

export function buildIntegrityConfig(overrides?: Partial<ClientIntegrityConfig>): ClientIntegrityConfig {
  const config = { ...DEFAULT_INTEGRITY_CONFIG, ...overrides };
  if (config.enabled && !config.secret) {
    config.secret = crypto.randomBytes(32).toString("hex");
  }
  return config;
}

/**
 * Generates the client-side JavaScript snippet.
 * The snippet collects fingerprint signals and sends a signed
 * token as a header on subsequent requests.
 */
export function generateClientSDK(config: ClientIntegrityConfig, apiEndpoint: string): string {
  return `(function(){
  "use strict";
  var H=window.__hilux={};
  
  function fp(){
    var s=[];
    s.push(navigator.userAgent||"");
    s.push(navigator.language||"");
    s.push(screen.width+"x"+screen.height+"x"+screen.colorDepth);
    s.push(new Date().getTimezoneOffset().toString());
    s.push(navigator.hardwareConcurrency||0);
    s.push(navigator.maxTouchPoints||0);
    s.push(navigator.platform||"");
    try{
      var c=document.createElement("canvas");
      var ctx=c.getContext("2d");
      if(ctx){
        ctx.textBaseline="top";
        ctx.font="14px Arial";
        ctx.fillStyle="#f60";
        ctx.fillRect(125,1,62,20);
        ctx.fillStyle="#069";
        ctx.fillText("Hilux",2,15);
        ctx.fillStyle="rgba(102,204,0,0.7)";
        ctx.fillText("Hilux",4,17);
        s.push(c.toDataURL());
      }
    }catch(e){s.push("no-canvas")}
    try{
      var g=document.createElement("canvas");
      var gl=g.getContext("webgl")||g.getContext("experimental-webgl");
      if(gl){
        var d=gl.getExtension("WEBGL_debug_renderer_info");
        if(d){
          s.push(gl.getParameter(d.UNMASKED_VENDOR_WEBGL)||"");
          s.push(gl.getParameter(d.UNMASKED_RENDERER_WEBGL)||"");
        }
      }
    }catch(e){s.push("no-webgl")}
    return s.join("|");
  }
  
  async function hash(str){
    var buf=new TextEncoder().encode(str);
    var h=await crypto.subtle.digest("SHA-256",buf);
    return Array.from(new Uint8Array(h)).map(function(b){return b.toString(16).padStart(2,"0")}).join("");
  }
  
  async function sign(data,secret){
    var key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
    var sig=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(data));
    return Array.from(new Uint8Array(sig)).map(function(b){return b.toString(16).padStart(2,"0")}).join("");
  }
  
  async function init(){
    var fingerprint=fp();
    var fpHash=await hash(fingerprint);
    var ts=Math.floor(Date.now()/1000).toString();
    var payload=fpHash+"."+ts;
    var signature=await sign(payload,"${config.secret}");
    H.token=payload+"."+signature;
    H.ready=true;
  }
  
  init().catch(function(){H.ready=false});
  
  var origXHROpen=XMLHttpRequest.prototype.open;
  var origXHRSend=XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open=function(){
    this.__hiluxUrl=arguments[1];
    return origXHROpen.apply(this,arguments);
  };
  XMLHttpRequest.prototype.send=function(){
    if(H.ready&&H.token){
      this.setRequestHeader("${config.headerName}",H.token);
    }
    return origXHRSend.apply(this,arguments);
  };
  
  if(window.fetch){
    var origFetch=window.fetch;
    window.fetch=function(input,init){
      if(H.ready&&H.token){
        init=init||{};
        init.headers=init.headers||{};
        if(init.headers instanceof Headers){
          init.headers.set("${config.headerName}",H.token);
        }else{
          init.headers["${config.headerName}"]=H.token;
        }
      }
      return origFetch.call(window,input,init);
    };
  }
})();`;
}

/**
 * Verifies the integrity token sent by the client SDK.
 * Returns a penalty score (0 = valid/absent, penaltyScore = invalid/tampered).
 */
export function verifyIntegrityToken(
  token: string | undefined,
  config: ClientIntegrityConfig
): { valid: boolean; score: number; reason: string | null } {
  if (!config.enabled) {
    return { valid: true, score: 0, reason: null };
  }

  if (!token) {
    return {
      valid: false,
      score: config.penaltyScore,
      reason: "Missing client integrity token",
    };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return {
      valid: false,
      score: config.penaltyScore,
      reason: "Malformed integrity token",
    };
  }

  const [fpHash, timestamp, signature] = parts;

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) {
    return {
      valid: false,
      score: config.penaltyScore,
      reason: "Invalid token timestamp",
    };
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > config.tokenTtlSeconds) {
    return {
      valid: false,
      score: Math.round(config.penaltyScore * 0.7),
      reason: `Expired integrity token (${Math.abs(now - ts)}s old)`,
    };
  }

  const payload = `${fpHash}.${timestamp}`;
  const expectedSignature = crypto
    .createHmac("sha256", config.secret)
    .update(payload)
    .digest("hex");

  if (signature !== expectedSignature) {
    return {
      valid: false,
      score: config.penaltyScore,
      reason: "Tampered integrity token signature",
    };
  }

  return { valid: true, score: 0, reason: null };
}

export function getIntegrityScriptTag(config: ClientIntegrityConfig, apiEndpoint: string): string {
  const js = generateClientSDK(config, apiEndpoint);
  return `<script>${js}</script>`;
}
