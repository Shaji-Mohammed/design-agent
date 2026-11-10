import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import Canvas from "./components/Canvas";
import { useAgentChat } from "agents/chat/react";
import ChatPanel from "./components/chat/ChatPanel";
import { serializeCanvasState } from "./context/canvas-state";
import "./App.css";
import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  newElementWith,
} from "@excalidraw/excalidraw";
import { useAgent } from "agents/react";

const sessionId = crypto.randomUUID();

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

export default function App() {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  useEffect(() => {
    excalidrawAPIRef.current = excalidrawAPI;
  }, [excalidrawAPI]);

  const appliedToolCalls = useRef(new Set());

  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    setExcalidrawAPI(api);
  }, []);
  const agent = useAgent({ agent: "design-agent", name: sessionId });

  const { messages, sendMessage, status } = useAgentChat({
    agent,
    onToolCall: async ({ toolCall, addToolOutput }) => {
      const api = excalidrawAPIRef.current;
      if (!api) {
        addToolOutput({
          toolCallId: toolCall.toolCallId,
          output: {
            error:
              "canvas not ready. Let the user know to try again in a few seconds.",
          },
        });
        return;
      }

      if (toolCall.toolName === "queryCanvas") {
        addToolOutput({
          toolCallId: toolCall.toolCallId,
          output: {
            summary: serializeCanvasState(api.getSceneElements() as any),
          },
        });
        return;
      }

      if (toolCall.toolName === "addElements") {
        const { elements } = toolCall.input as any;
        const cleaned = elements.map(stripNulls);
        const newOnes = convertToExcalidrawElements(cleaned, {
          regenerateIds: false,
        });
        const next = [...api.getSceneElements(), ...newOnes];
        api.updateScene({
          elements: next,
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });
        api.scrollToContent(next, { fitToContent: true });
        addToolOutput({
          toolCallId: toolCall.toolCallId,
          output: { added: newOnes.length },
        });
        return;
      }

      if (toolCall.toolName === "updateElements") {
        const { updates } = toolCall.input as any;
        const byId = new Map(
          updates.map((update) => [update.id, stripNulls(update.fields)]),
        );
        const next = api.getSceneElements().map((el) => {
          const fields = byId.get(el.id);
          return fields && Object.keys(fields).length > 0
            ? newElementWith(el, fields)
            : el;
        });

        api.updateScene({
          elements: next,
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });
        addToolOutput({
          toolCallId: toolCall.toolCallId,
          output: { updated: byId.size },
        });

        return;
      }

      if (toolCall.toolName === "removeElements") {
        const { ids } = toolCall.input as any;
        const remove = new Set(ids);
        const next = api.getSceneElements().filter((el) => !remove.has(el.id));
        api.updateScene({
          elements: next,
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });
        addToolOutput({
          toolCallId: toolCall.toolCallId,
          output: { removed: remove.size },
        });

        return;
      }
    },
  });
  const sendWithCanvas = useMemo(
    () => (msg: { role: "user"; parts: { type: "text"; text: string }[] }) => {
      const elements = excalidrawAPI?.getSceneElements() ?? [];
      sendMessage({
        ...msg,
        parts: [
          ...msg.parts,
          { type: "data-canvas-state", data: { elements } },
        ],
      });
    },
    [sendMessage, excalidrawAPI],
  );

  useEffect(() => {
    if (!excalidrawAPI) return;
    for (const message of messages) {
      if (message.role !== "assistant") continue;
      for (const part of message.parts ?? []) {
        if (
          part.type !== "tool-generateDiagram" &&
          part.type !== "tool-modifyDiagram"
        ) {
          continue;
        }
        if (part.state !== "output-available") continue;
        if (appliedToolCalls.current.has(part.toolCallId)) continue;

        if (part.type === "tool-generateDiagram") {
          appliedToolCalls.current.add(part.toolCallId);
          const output = part.output as { elements?: any };
          const skeletonELements = output.elements;

          if (Array.isArray(skeletonELements) && skeletonELements.length > 0) {
            const elements = convertToExcalidrawElements(skeletonELements, {
              regenerateIds: false,
            });
            excalidrawAPI.updateScene({ elements });
            excalidrawAPI.scrollToContent(elements, { fitToContent: true });
          }
        } else if (part.type === "tool-modifyDiagram") {
          appliedToolCalls.current.add(part.toolCallId);
          const output = part.output as {
            elementid?: string;
            updates?: Record<string, any>;
          };

          if (output?.elementid && output.updates) {
            const current = excalidrawAPI.getSceneElements();
            const next = current.map((el) => {
              return el.id === output.elementid
                ? newElementWith(el, output.updates as any)
                : el;
            }) as any;

            excalidrawAPI.updateScene({
              elements: next,
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
          }
        }
      }
    }
  }, [messages, excalidrawAPI]);

  return (
    <div className={`app ${theme}`}>
      <div className="canvas-container">
        <Canvas onApiReady={handleApiReady} onThemeChange={setTheme} />
      </div>
      <ChatPanel
        messages={messages}
        sendMessage={sendMessage}
        status={status}
      />
      <a
        href="#viewer"
        className="viewer-launch"
        title="Open diagram viewer for human scoring"
      >
        viewer
      </a>
    </div>
  );
}
