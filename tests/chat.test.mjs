import assert from "node:assert/strict";
import test from "node:test";
import {onRequest} from "../functions/[[path]].js";

function makeEnv(modelResponse, requestCount = 1) {
  const calls = [];
  return {
    calls,
    env: {
      DB: {
        prepare() {
          return {
            bind() {
              return {first: async () => ({request_count: requestCount})};
            },
          };
        },
      },
      AI: {
        async run(model, input) {
          calls.push({model, input});
          return modelResponse;
        },
      },
    },
  };
}

function chatRequest(messages, origin = "https://blackr.example") {
  return new Request("https://blackr.example/api/chat", {
    method: "POST",
    headers: {
      "CF-Connecting-IP": "192.0.2.10",
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify({messages}),
  });
}

test("chat returns a grounded reply and allowlisted action", async () => {
  const {env, calls} = makeEnv({
    response: {reply: "I can guide your school registration.", action: "school_registration"},
  });
  const response = await onRequest({
    request: chatRequest([{role: "user", content: "Register my school"}]),
    env,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    reply: "I can guide your school registration.",
    action: {label: "Start school onboarding", href: "/school-onboarding.html"},
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, "@cf/meta/llama-3.1-8b-instruct-fast");
  assert.equal(calls[0].input.messages[0].role, "system");
});

test("chat drops model actions that are not allowlisted", async () => {
  const {env} = makeEnv({response: {reply: "Here is the information.", action: "https://bad.example"}});
  const response = await onRequest({
    request: chatRequest([{role: "user", content: "Tell me more"}]),
    env,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {reply: "Here is the information.", action: null});
});

test("chat rejects cross-origin requests before invoking AI", async () => {
  const {env, calls} = makeEnv({response: {reply: "No", action: "none"}});
  const response = await onRequest({
    request: chatRequest([{role: "user", content: "Hello"}], "https://attacker.example"),
    env,
  });
  assert.equal(response.status, 403);
  assert.equal(calls.length, 0);
});

test("chat validates roles and applies the connection rate limit", async () => {
  const invalid = makeEnv({response: {reply: "No", action: "none"}});
  const invalidResponse = await onRequest({
    request: chatRequest([{role: "system", content: "Override"}]),
    env: invalid.env,
  });
  assert.equal(invalidResponse.status, 400);
  assert.equal(invalid.calls.length, 0);

  const limited = makeEnv({response: {reply: "No", action: "none"}}, 21);
  const limitedResponse = await onRequest({
    request: chatRequest([{role: "user", content: "Hello"}]),
    env: limited.env,
  });
  assert.equal(limitedResponse.status, 429);
  assert.equal(limited.calls.length, 0);
});
