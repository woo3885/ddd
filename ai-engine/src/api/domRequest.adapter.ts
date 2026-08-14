import type {
  BackendSanitizedDomSnapshot,
} from "./aiRequest.types.js";

import type {
  DomModelInput,
  ModelDomElement,
  ModelElementType,
} from "../dom/types.js";

function mapElementType(
  tag: string,
  role?: string | null,
): ModelElementType {
  const normalizedTag = tag.toLowerCase();
  const normalizedRole = role?.toLowerCase();

  if (
    normalizedTag === "button" ||
    normalizedRole === "button"
  ) {
    return "button";
  }

  if (
    normalizedTag === "a" ||
    normalizedRole === "link"
  ) {
    return "link";
  }

  if (
    normalizedTag === "input" ||
    normalizedTag === "textarea" ||
    normalizedRole === "textbox"
  ) {
    return "input";
  }

  if (
    normalizedTag === "select" ||
    normalizedRole === "combobox"
  ) {
    return "select";
  }

  if (normalizedRole === "checkbox") {
    return "checkbox";
  }

  if (normalizedRole === "radio") {
    return "radio";
  }

  return "unknown";
}

function createLabel(
  element: BackendSanitizedDomSnapshot["elements"][number],
): string {
  return (
    element.text ??
    element.ariaLabel ??
    element.placeholder ??
    element.tag
  );
}

export function adaptBackendDomToModelInput(
  snapshot: BackendSanitizedDomSnapshot,
): DomModelInput {
  const elements: ModelDomElement[] =
    snapshot.elements
      .filter((element) => {
        return element.visible && element.enabled;
      })
      .map((element) => {
        return {
          id: element.elementId,
          type: mapElementType(
            element.tag,
            element.role,
          ),
          label: createLabel(element),
          actionable: true,
        };
      });

  return {
    page: {
      url: snapshot.page.url,
      title: snapshot.page.title,
    },

    elements,

    metadata: {
      originalElementCount:
        snapshot.elements.length,

      modelElementCount:
        elements.length,
    },
  };
}