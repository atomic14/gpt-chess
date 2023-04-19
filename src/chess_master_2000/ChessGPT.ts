import { Color } from "chess.js";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";

type MessageHistory = {
  user: string;
  assistant: string;
};

const HISTORY_LIMIT = 5;
const SYSTEM_PROMPT = `You are an expert at playing chess.
Given the FEN of the board and the last 10 moves, suggest the best move to make next from the current position.
Use SAN for the move syntax. For example, e4, Nf3, Bb5, etc.

Output your results using the following single blob of JSON. Do not include any other information.

{
"san": "The move in SAN format",
"reason": "Why this is a good move"
}`;

export default class ChessGPT {
  private openai?: OpenAIApi;
  private messageHistory: MessageHistory[] = [];

  clear() {
    this.messageHistory = [];
  }

  getEstimatedTokens(
    fen: string,
    pgn: string,
    validMoves: string[],
    aiColor: Color
  ): number {
    const userPrompt = this.getUserPrompt(fen, pgn, validMoves, aiColor);
    const messages = this.getMessages(userPrompt);
    // build up a string of all the text - this is going to be very rough and ready
    const text = messages.map((message) => message.content).join("\n");
    // estimate the number of tokens
    const wordCount = text.split(" ").length;
    const charCount = text.length;
    let tokensCountWordEst = wordCount / 0.75;
    let tokensCountCharEst = charCount / 4.0;

    //  Include additional tokens for spaces and punctuation marks
    const matches = text.match(/[\s.,!?;]/g);
    const additionalTokens = matches ? matches.length : 0;

    tokensCountWordEst += additionalTokens;
    tokensCountCharEst += additionalTokens;
    return Math.round(Math.max(tokensCountWordEst, tokensCountCharEst));
  }

  getMessages(userPrompt: string) {
    const messages: ChatCompletionRequestMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];
    this.messageHistory.forEach((message) => {
      messages.push({ role: "user", content: message.user });
      messages.push({ role: "assistant", content: message.assistant });
    });
    messages.push({ role: "user", content: userPrompt });
    return messages;
  }

  getUserPrompt(
    fen: string,
    pgn: string,
    validMoves: string[],
    aiColor: Color
  ): string {
    // feed in the user message
    const userPrompt = `You are playing ${
      aiColor === "w" ? "white" : "black"
    } and it is your turn.

This is the current state of the game:

FEN: ${fen}
PGN: ${pgn}

Output the best move that to follow this position using the following single blob of JSON. Do not include any other information.

Only use the moves in this list: ${validMoves.join(", ")}

{
  "san": "The move in SAN format",
  "reason": "Why this is a good move"
}`;
    return userPrompt;
  }

  async getNextMove(
    fen: string,
    pgn: string,
    validMoves: string[],
    aiColor: Color,
    model: string,
    apiKey: string
  ): Promise<{
    san: string;
    reason: string;
    tokensUsed?: number;
  }> {
    if (this.openai === undefined) {
      const configuration = new Configuration({
        apiKey: apiKey,
      });
      this.openai = new OpenAIApi(configuration);
    }

    const userPrompt = this.getUserPrompt(fen, pgn, validMoves, aiColor);

    // build the messages
    console.log("Calling OpenAI API", fen);
    const messages = this.getMessages(userPrompt);

    const completion = await this.openai.createChatCompletion({
      model: model,
      messages: messages,
      max_tokens: 500,
    });
    if (completion.data.choices.length === 0) {
      throw new Error("No choices returned from OpenAI");
    }
    const result = completion.data.choices[0].message?.content;
    console.log(result);
    if (result === undefined) {
      throw new Error("No message returned from OpenAI");
    }
    // try and parse the result
    try {
      const { san, reason } = this.parseResult(result);
      this.messageHistory.push({
        user: userPrompt,
        assistant: JSON.stringify({ san, reason }),
      });
      if (this.messageHistory.length > HISTORY_LIMIT) {
        this.messageHistory.shift();
      }
      return {
        san,
        reason,
        tokensUsed: completion.data.usage?.total_tokens || 0,
      };
    } catch (e) {
      throw new Error("Invalid result from OpenAI");
    }
  }

  parseResult(result: string): { san: string; reason: string } {
    // extract the json blob from the result
    // find the first "{" and the last "}"
    const start = result.indexOf("{");
    const end = result.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("Failed to parse result from OpenAI");
    }
    const json = result.substring(start, end + 1);
    console.log("JSON:", json);
    const data = JSON.parse(json);
    if (data.san === undefined || data.reason === undefined) {
      throw new Error("Invalid result from OpenAI");
    }
    return {
      san: data.san,
      reason: data.reason,
    };
  }
}
