import assert from "node:assert/strict";
import test from "node:test";
import {onRequest} from "../functions/[[path]].js";

function parentPayload() {
  return {
    first_name: "Test",
    surname: "Parent",
    street_address: "",
    city: "Maphumulo",
    province: "KwaZulu-Natal",
    postal_code: "4470",
    id_number: "9001015009087",
    phone: "083 000 0000",
    email: "parent@example.com",
    applicant_role: "parent",
    consent: true,
  };
}

function submissionRequest({companyFax = "", startedAt = Date.now() - 5000} = {}) {
  const body = new FormData();
  body.set("type", "parent");
  body.set("payload", JSON.stringify(parentPayload()));
  body.set("company_fax", companyFax);
  body.set("started_at", String(startedAt));
  body.set("turnstile_token", "valid-test-token");
  return new Request("https://blackr.example/api/submit", {
    method: "POST",
    headers: {Origin: "https://blackr.example"},
    body,
  });
}

function submissionEnv(sqlCalls) {
  return {
    TURNSTILE_SECRET_KEY: "test-secret",
    DB: {
      prepare(sql) {
        sqlCalls.push(sql);
        return {
          bind() {
            return {
              first: async () => ({request_count: 1}),
              run: async () => ({success: true}),
            };
          },
        };
      },
    },
  };
}

test("a successful submission explicitly confirms that D1 stored it", async (t) => {
  const sqlCalls = [];
  t.mock.method(globalThis, "fetch", async () => Response.json({
    success: true,
    hostname: "blackr.example",
    action: "onboarding",
  }));

  const response = await onRequest({
    request: submissionRequest(),
    env: submissionEnv(sqlCalls),
  });
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.stored, true);
  assert.match(result.reference, /^PAR-[A-F0-9]{10}$/);
  assert.ok(sqlCalls.some((sql) => sql.includes("INSERT INTO submissions")));
});

test("a triggered bot trap returns an error instead of a fake success reference", async () => {
  const sqlCalls = [];
  const response = await onRequest({
    request: submissionRequest({companyFax: "autofilled value"}),
    env: submissionEnv(sqlCalls),
  });
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(typeof result.error, "string");
  assert.equal(result.reference, undefined);
  assert.equal(sqlCalls.length, 0);
});

test("an impossibly fast submission returns an error instead of fake success", async () => {
  const sqlCalls = [];
  const response = await onRequest({
    request: submissionRequest({startedAt: Date.now()}),
    env: submissionEnv(sqlCalls),
  });
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(result.reference, undefined);
  assert.equal(sqlCalls.length, 0);
});

test("a stale Turnstile secret is reported as configuration failure", async (t) => {
  const sqlCalls = [];
  t.mock.method(globalThis, "fetch", async () => Response.json({
    success: false,
    "error-codes": ["invalid-input-secret"],
  }));

  const response = await onRequest({
    request: submissionRequest(),
    env: submissionEnv(sqlCalls),
  });
  const result = await response.json();

  assert.equal(response.status, 503);
  assert.match(result.error, /misconfigured/i);
  assert.equal(sqlCalls.length, 0);
});
