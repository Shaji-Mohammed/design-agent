import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import Canvas from "./components/Canvas";
import { useAgentChat } from "agents/chat/react";
import ChatPanel from "./components/chat/ChatPanel";
import "./App.css";
import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  newElementWith,
} from "@excalidraw/excalidraw";
import { useAgent } from "agents/react";

const sessionId = crypto.randomUUID();

export default function App() {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const appliedToolCalls = useRef(new Set());
  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    setExcalidrawAPI(api);
  }, []);

  const agent = useAgent({ agent: "design-agent", name: sessionId });

  const { messages, sendMessage, status } = useAgentChat({ agent });
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
        sendMessage={sendWithCanvas}
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
