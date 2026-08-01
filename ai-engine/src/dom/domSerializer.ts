import {
  DomModelInput,
  ModelDomElement,
} from "./types.js";

function serializeElement(
  element: ModelDomElement,
): string {
  const actionStatus = element.actionable
    ? `가능 행동: ${element.actionHint ?? "없음"}`
    : "조작 불가";

  return [
    `[${element.id}]`,
    element.type,
    element.label,
    actionStatus,
  ].join(" | ");
}

/**
 * AI 프롬프트에 삽입할 수 있는 문자열로 변환합니다.
 */
export function serializeDomModelInput(
  input: DomModelInput,
): string {
  const elementLines =
    input.elements.length > 0
      ? input.elements.map(serializeElement).join("\n")
      : "사용 가능한 요소가 없습니다.";

  return [
    `현재 페이지: ${input.page.title}`,
    `URL: ${input.page.url}`,
    "",
    "사용 가능한 요소:",
    elementLines,
    "",
    `원본 요소 수: ${input.metadata.originalElementCount}`,
    `모델 입력 요소 수: ${input.metadata.modelElementCount}`,
  ].join("\n");
}