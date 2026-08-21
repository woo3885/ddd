import type {
  BackendAiDecisionRequest,
  BackendAiUserDecisionContext,
  BackendSanitizedDomSnapshot,
} from "./aiRequest.types.js";

import {
  isUserDecisionType,
} from "../workflow/userDecision.types.js";

const REQUEST_FIELDS = new Set([
  "userRequest",
  "snapshot",
  "userDecision",
]);

const USER_DECISION_FIELDS = new Set([
  "decisionId",
  "decisionType",
  "selectedOptionIds",
  "sourceSnapshotId",
]);

const PAGE_FIELDS = new Set([
  "url",
  "title",
  "productId",
  "productName",
  "productPeriod",
]);

const MAX_SELECTED_OPTION_COUNT = 20;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function rejectUnknownFields(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  label: string,
): void {
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) {
      throw new Error(
        `[AI Engine] unknown ${label} field: ${field}`,
      );
    }
  }
}

function requireNonBlankString(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `[AI Engine] ${fieldName} must be a non-blank string.`,
    );
  }

  return value;
}

function requireExactId(
  value: unknown,
  fieldName: string,
): string {
  const id = requireNonBlankString(
    value,
    fieldName,
  );

  if (id !== id.trim()) {
    throw new Error(
      `[AI Engine] ${fieldName} must be preserved exactly.`,
    );
  }

  return id;
}

function requireNullableExactString(
  value: unknown,
  fieldName: string,
): string | null {
  if (value === null) {
    return null;
  }

  const exact = requireNonBlankString(
    value,
    fieldName,
  );

  if (exact !== exact.trim()) {
    throw new Error(
      `[AI Engine] ${fieldName} must be preserved exactly.`,
    );
  }

  return exact;
}

function validateSelectedOptionIds(
  value: unknown,
  decisionType: BackendAiUserDecisionContext["decisionType"],
): readonly string[] {
  if (!Array.isArray(value)) {
    throw new Error(
      "[AI Engine] selectedOptionIds must be an array.",
    );
  }

  if (value.length > MAX_SELECTED_OPTION_COUNT) {
    throw new Error(
      "[AI Engine] selectedOptionIds must contain at most 20 IDs.",
    );
  }

  if (
    decisionType !== "TERMS_AGREEMENT" &&
    value.length !== 1
  ) {
    throw new Error(
      `[AI Engine] ${decisionType} requires exactly one selected option.`,
    );
  }

  const seen = new Set<string>();
  const selectedOptionIds = value.map(
    (rawId) => {
      const id = requireExactId(
        rawId,
        "selected option ID",
      );

      if (seen.has(id)) {
        throw new Error(
          `[AI Engine] duplicate selected option ID: ${id}`,
        );
      }

      seen.add(id);
      return id;
    },
  );

  return Object.freeze(selectedOptionIds);
}

export function validateBackendAiUserDecisionContext(
  value: unknown,
): BackendAiUserDecisionContext {
  if (!isRecord(value)) {
    throw new Error(
      "[AI Engine] userDecision must be an object.",
    );
  }

  rejectUnknownFields(
    value,
    USER_DECISION_FIELDS,
    "userDecision",
  );

  if (!isUserDecisionType(value.decisionType)) {
    throw new Error(
      "[AI Engine] userDecision.decisionType is not supported.",
    );
  }

  const decisionType = value.decisionType;

  return Object.freeze({
    decisionId: requireExactId(
      value.decisionId,
      "userDecision.decisionId",
    ),
    decisionType,
    selectedOptionIds: validateSelectedOptionIds(
      value.selectedOptionIds,
      decisionType,
    ),
    sourceSnapshotId: requireExactId(
      value.sourceSnapshotId,
      "userDecision.sourceSnapshotId",
    ),
  });
}

export function validateBackendAiDecisionRequest(
  value: unknown,
): BackendAiDecisionRequest {
  if (!isRecord(value)) {
    throw new Error(
      "[AI Engine] Backend AI decision request must be an object.",
    );
  }

  rejectUnknownFields(
    value,
    REQUEST_FIELDS,
    "request",
  );

  const userRequest = requireNonBlankString(
    value.userRequest,
    "userRequest",
  );

  if (!isRecord(value.snapshot)) {
    throw new Error(
      "[AI Engine] snapshot must be an object.",
    );
  }

  const snapshot =
    value.snapshot as unknown as BackendSanitizedDomSnapshot;

  requireNonBlankString(
    snapshot.snapshotId,
    "snapshot.snapshotId",
  );

  if (!isRecord(snapshot.page)) {
    throw new Error(
      "[AI Engine] snapshot.page must be an object.",
    );
  }

  rejectUnknownFields(
    snapshot.page,
    PAGE_FIELDS,
    "snapshot.page",
  );

  requireNonBlankString(
    snapshot.page.url,
    "snapshot.page.url",
  );
  requireNonBlankString(
    snapshot.page.title,
    "snapshot.page.title",
  );
  requireNullableExactString(
    snapshot.page.productId,
    "snapshot.page.productId",
  );
  requireNullableExactString(
    snapshot.page.productName,
    "snapshot.page.productName",
  );
  requireNullableExactString(
    snapshot.page.productPeriod,
    "snapshot.page.productPeriod",
  );

  if (!("userDecision" in value)) {
    return {
      userRequest,
      snapshot,
    };
  }

  return {
    userRequest,
    snapshot,
    userDecision:
      validateBackendAiUserDecisionContext(
        value.userDecision,
      ),
  };
}
