import { AIChatAgent } from "@cloudflare/ai-chat";
import { convertToModelMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { streamAgent } from "./agent-core";

interface ENV {
  OPENAI_API_KEY: string;
}

export class DesignAgent extends AIChatAgent<ENV> {
  async onChatMessage() {
    const openai = createOpenAI({ apiKey: this.env.OPENAI_API_KEY });

    const result = streamAgent({
      model: openai("gpt-5.4-mini"),
      messages: await convertToModelMessages(this.messages),
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error("DesignAgent stream error:", error);
        return "An error occurred.";
      },
    });
  }
}
