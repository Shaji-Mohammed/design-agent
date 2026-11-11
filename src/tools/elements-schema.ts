import { z } from "zod";

const styling = {
  strokeColor: z
    .string()
    .nullable()
    .describe("Hex stroke color. Null for default '#1e1e1e'."),
  backgroundColor: z
    .string()
    .nullable()
    .describe("Hex fill color. Null for transparent."),
  fillStyle: z.enum(["solid", "hachure", "cross-hatch"]).nullable(),
  strokeWidth: z.number().nullable(),
  roughness: z
    .number()
    .nullable()
    .describe("0 for clean, 1 for sketchy. Null for default."),
  opacity: z.number().nullable(),
};

const labelSchema = z
  .object({
    text: z
      .string()
      .describe("The label text rendered inside the shape or on the arrow."),
    fontSize: z.number().nullable(),
    textAlign: z.enum(["left", "center", "right"]).nullable(),
  })
  .describe(
    "Label rendered inside this shape (or on this arrow). Excalidraw centers the text inside the container automatically and creates the bound text element for you. This is the ONLY way to put text inside a box. Null for unlabeled shapes.",
  );

const baseFields = {
  id: z
    .string()
    .describe(
      "Unique, concise, meaningful id like 'rect_login' or 'arrow_user_api'. Other elements reference this id, so it must be unique within the canvas and stable across calls.",
    ),
  x: z.number().describe("X position in pixels"),
  y: z.number().describe("Y position in pixels"),
  width: z.number().describe("Width in pixels. At least 20."),
  height: z.number().describe("Height in pixels. At least 20."),
};

const rectangleSchema = z.object({
  type: z.literal("rectangle"),
  ...baseFields,
  label: labelSchema.nullable(),
  ...styling,
});

const ellipseSchema = z.object({
  type: z.literal("ellipse"),
  ...baseFields,
  label: labelSchema.nullable(),
  ...styling,
});

const diamondSchema = z.object({
  type: z.literal("diamond"),
  ...baseFields,
  label: labelSchema.nullable(),
  ...styling,
});

const endpointSchema = z
  .object({
    id: z
      .string()
      .describe(
        "Id of the shape this end of the arrow attaches to. The shape must exist in the same call or already on the canvas.",
      ),
  })
  .describe(
    "Arrow endpoint binding. Set both start AND end for any arrow that connects two shapes.",
  );

const arrowSchema = z.object({
  type: z.literal("arrow"),
  ...baseFields,
  start: endpointSchema.nullable(),
  end: endpointSchema.nullable(),
  label: labelSchema
    .nullable()
    .describe(
      "Optional label rendered on the arrow itself, e.g. 'yes', 'no', '1. login'. Null for unlabeled arrows.",
    ),
  ...styling,
});

const lineSchema = z.object({
  type: z.literal("line"),
  ...baseFields,
  start: endpointSchema.nullable(),
  end: endpointSchema.nullable(),
  ...styling,
});

const textSchema = z.object({
  type: z.literal("text"),
  ...baseFields,
  text: z.string().describe("The text content. Required."),
  fontSize: z.number().nullable(),
  textAlign: z.enum(["left", "center", "right"]).nullable(),
  ...styling,
});

export const elementSchema = z.union([
  rectangleSchema,
  ellipseSchema,
  diamondSchema,
  arrowSchema,
  lineSchema,
  textSchema,
]);

export type ElementInput = z.infer<typeof elementSchema>;
