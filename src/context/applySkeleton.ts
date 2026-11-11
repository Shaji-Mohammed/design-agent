type SkeletonElement = Record<string, unknown>;
type RuntimeElement = Record<string, unknown>;

function stripNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNulls);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== null) out[k] = stripNulls(v);
    }
    return out;
  }
  return value;
}

export function applySkeleton(skeletons: SkeletonElement[]): RuntimeElement[] {
  const cleaned = skeletons.map(
    (el) => stripNulls(el) as Record<string, unknown>,
  );
  const out: RuntimeElement[] = [];

  for (const el of cleaned) {
    const type = el.type as string;

    if (type === "rectangle" || type === "ellipse" || type === "diamond") {
      const { label, ...shapeFields } = el;
      const shape: RuntimeElement = { ...shapeFields };

      if (label && typeof label === "object") {
        const labelObj = label as Record<string, unknown>;
        const text = labelObj.text;
        if (typeof text === "string" && text.length > 0) {
          const childId = `${el.id}_label`;
          shape.boundElements = [{ id: childId, type: "text" }];
          out.push(shape);
          out.push({
            id: childId,
            type: "text",
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            text,
            containerId: el.id,
            ...(typeof labelObj.fontSize === "number"
              ? { fontSize: labelObj.fontSize }
              : {}),
            ...(typeof labelObj.textAlign === "string"
              ? { textAlign: labelObj.textAlign }
              : {}),
          });
          continue;
        }
      }
      out.push(shape);
      continue;
    }

    if (type === "arrow" || type === "line") {
      const { start, end, label, ...arrowFields } = el;
      const arrow: RuntimeElement = { ...arrowFields };
      if (start && typeof start === "object") {
        const startId = (start as Record<string, unknown>).id;
        if (typeof startId === "string") {
          arrow.startBinding = { elementId: startId, focus: 0, gap: 8 };
        }
      }
      if (end && typeof end === "object") {
        const endId = (end as Record<string, unknown>).id;
        if (typeof endId === "string") {
          arrow.endBinding = { elementId: endId, focus: 0, gap: 8 };
        }
      }

      if (label && typeof label === "object") {
        const labelObj = label as Record<string, unknown>;
        const text = labelObj.text;
        if (typeof text === "string" && text.length > 0) {
          const childId = `${el.id}_label`;
          arrow.boundElements = [{ id: childId, type: "text" }];
          out.push(arrow);
          out.push({
            id: childId,
            type: "text",
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            text,
            containerId: el.id,
          });
          continue;
        }
      }
      out.push(arrow);
      continue;
    }

    out.push(el);
  }

  return out;
}
