import { test } from "node:test";
import assert from "node:assert/strict";
import { mayAccessLpp } from "../lib/lpp/policy";

const user = { id: "enrolled-user", email: "member@example.test", emailVerified: false };
const manual = JSON.stringify({ [user.email]: user.id });
test("Manual LPP enrollment requires both the exact account and email allowlist", () => {
  assert.equal(mayAccessLpp(user, user.email, manual), true);
  assert.equal(mayAccessLpp(null, user.email, manual), false);
  assert.equal(mayAccessLpp(user, user.email), false);
  assert.equal(mayAccessLpp(user, "", manual), false);
  assert.equal(mayAccessLpp({ ...user, id: "another-user" }, user.email, manual), false);
  assert.equal(mayAccessLpp({ ...user, email: "other@example.test" }, "other@example.test", manual), false);
  assert.equal(mayAccessLpp(user, user.email, "invalid-json"), false);
  assert.equal(mayAccessLpp(user, user.email, "null"), false);
  assert.equal(mayAccessLpp({ ...user, emailVerified: true }, user.email), true);
  assert.equal(mayAccessLpp({ ...user, emailVerified: true }, ""), false);
});
