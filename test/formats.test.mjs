import test from "node:test";
import assert from "node:assert/strict";
import { detectFormat, parseImport, toCookierule, toCookieEditor, toNetscape, parseNetscape } from "../extension/lib/formats.js";

const cookieEditor = JSON.stringify([
  { name: "sid", value: "abc", domain: ".example.com", hostOnly: false, path: "/", secure: true, httpOnly: true, sameSite: "lax", session: false, expirationDate: 1800000000, storeId: "0" },
  { name: "theme", value: "dark", domain: "example.com", hostOnly: true, path: "/", secure: false, httpOnly: false, sameSite: "unspecified", session: true, storeId: "0" }
]);

const editThisCookie = JSON.stringify([
  { domain: ".example.com", expirationDate: 1800000000, hostOnly: false, httpOnly: false, name: "a", path: "/", sameSite: "no_restriction", secure: true, session: false, storeId: "0", value: "1", id: 1 },
  { domain: "example.com", hostOnly: true, httpOnly: false, name: "b", path: "/", sameSite: "unspecified", secure: false, session: true, storeId: "0", value: "2", id: 2 }
]);

const netscape = `# Netscape HTTP Cookie File
.example.com\tTRUE\t/\tTRUE\t1800000000\tsid\tabc
#HttpOnly_.example.com\tTRUE\t/\tTRUE\t1800000000\tsecret\tx=y
example.com\tFALSE\t/\tFALSE\t0\ttheme\tdark
`;

test("detects formats", () => {
  assert.equal(detectFormat(cookieEditor), "cookie-editor");
  assert.equal(detectFormat(editThisCookie), "editthiscookie");
  assert.equal(detectFormat(netscape), "netscape");
  assert.equal(detectFormat(toCookierule([])), "cookierule");
  assert.equal(detectFormat("hello"), null);
});

test("parses Cookie-Editor JSON", () => {
  const { format, cookies } = parseImport(cookieEditor);
  assert.equal(format, "cookie-editor");
  assert.equal(cookies.length, 2);
  assert.equal(cookies[0].expirationDate, 1800000000);
  assert.equal(cookies[0].sameSite, "lax");
  assert.equal(cookies[1].session, true);
  assert.equal(cookies[1].expirationDate, null);
  assert.equal(cookies[1].hostOnly, true);
});

test("parses EditThisCookie JSON", () => {
  const { format, cookies } = parseImport(editThisCookie);
  assert.equal(format, "editthiscookie");
  assert.equal(cookies[0].sameSite, "no_restriction");
  assert.equal(cookies[1].session, true);
});

test("parses Netscape cookies.txt incl. #HttpOnly_ prefix and tabs in value", () => {
  const cookies = parseNetscape(netscape);
  assert.equal(cookies.length, 3);
  assert.equal(cookies[0].hostOnly, false);
  assert.equal(cookies[1].httpOnly, true);
  assert.equal(cookies[1].value, "x=y");
  assert.equal(cookies[2].session, true);
  assert.equal(cookies[2].hostOnly, true);
});

test("round-trips through every export format", () => {
  const { cookies } = parseImport(cookieEditor);
  for (const text of [toCookierule(cookies), toCookieEditor(cookies), toNetscape(cookies)]) {
    const back = parseImport(text).cookies;
    assert.equal(back.length, cookies.length);
    for (let i = 0; i < cookies.length; i++) {
      for (const k of ["name", "value", "domain", "hostOnly", "path", "secure", "httpOnly", "session", "expirationDate"]) {
        assert.deepEqual(back[i][k], cookies[i][k], `${k} differs after round trip (#${i})`);
      }
    }
  }
});

test("rejects garbage", () => {
  assert.throws(() => parseImport("not json"));
  assert.throws(() => parseImport("{}"));
});
