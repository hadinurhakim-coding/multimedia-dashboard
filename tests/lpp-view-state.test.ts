import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LPP_NAVIGATION_STATE,
  lppNavigationStorageKey,
  parseLppNavigationState,
} from "../lib/lpp/view-state";

test("LPP navigation state parser restores valid screens, folders, months, and drafts", () => {
  assert.deepEqual(parseLppNavigationState(null), DEFAULT_LPP_NAVIGATION_STATE);
  assert.deepEqual(parseLppNavigationState("not-json"), DEFAULT_LPP_NAVIGATION_STATE);

  const draftsRoot = parseLppNavigationState(
    JSON.stringify({ screen: "drafts", folderId: null, monthFilter: "2026-03", templateId: null, draftId: null })
  );
  assert.deepEqual(draftsRoot, {
    screen: "drafts",
    folderId: null,
    monthFilter: "all",
    templateId: null,
    draftId: null,
  });

  const folderId = "842a601cc954e5f69fe10187d7ad3b9ec60c8d6fed45f3fbc8fdf2cbbdf951ad";
  const draftId = "9558e926-32ae-48c9-8c8c-1a447cc3e08a";
  const insideFolder = parseLppNavigationState(
    JSON.stringify({ screen: "drafts", folderId, monthFilter: "2026-03", templateId: null, draftId: null })
  );
  assert.deepEqual(insideFolder, {
    screen: "drafts",
    folderId,
    monthFilter: "2026-03",
    templateId: null,
    draftId: null,
  });

  const insideFolderRange = parseLppNavigationState(
    JSON.stringify({ screen: "drafts", folderId, monthFilter: "2026-03-01..2026-10-01", templateId: null, draftId: null })
  );
  assert.deepEqual(insideFolderRange, {
    screen: "drafts",
    folderId,
    monthFilter: "2026-03-01..2026-10-01",
    templateId: null,
    draftId: null,
  });

  const openDraft = parseLppNavigationState(
    JSON.stringify({ screen: "editor", folderId: "../bad", monthFilter: "bad", templateId: folderId, draftId })
  );
  assert.deepEqual(openDraft, {
    screen: "editor",
    folderId: null,
    monthFilter: "all",
    templateId: folderId,
    draftId,
  });

  assert.equal(
    lppNavigationStorageKey("user-123"),
    "pln-lpp-view-state-v1:user-123"
  );
});
