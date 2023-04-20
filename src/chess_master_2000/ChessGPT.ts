import { Color } from "chess.js";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";

type MessageHistory = {
  user: string;
  assistant: string;
};

type MoveArgs = {
  fen: string;
  pgn: string;
  ascii: string;
  boardDescription: string;
  validMoves: string[];
  invalidAttemptedMoves: string[];
  aiColor: Color;
};

type AiMoveArgs = MoveArgs & {
  model: string;
  apiKey: string;
};

const HISTORY_LIMIT = 0;
const SYSTEM_PROMPT = `You are an expert at playing chess.
Given the FEN of the board, suggest the best move in SAN format to make next from the current position.

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

  getEstimatedTokens({
    fen,
    pgn,
    ascii,
    boardDescription,
    validMoves,
    invalidAttemptedMoves,
    aiColor,
  }: MoveArgs): number {
    const userPrompt = this.getUserPrompt({
      fen,
      pgn,
      ascii,
      boardDescription,
      validMoves,
      invalidAttemptedMoves,
      aiColor,
    });
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

  getUserPrompt({
    fen,
    pgn,
    ascii,
    boardDescription,
    validMoves,
    invalidAttemptedMoves,
    aiColor,
  }: MoveArgs): string {
    // feed in the user message
    let userPrompt = `You are playing ${
      aiColor === "w" ? "white" : "black"
    } and it is your turn.

This is the current state of the game use this to work out where the pieces are on the board:

FEN: ${fen}
Move History: ${pgn}
`;
    if (invalidAttemptedMoves.length > 0) {
      userPrompt += `Use one of the following valid moves: ${validMoves.join(
        ", "
      )}\n`;
      userPrompt += `You have already tried the following invalid moves: ${invalidAttemptedMoves.join(
        ", "
      )}\n`;
    }
    userPrompt += `
Output the best move in SAN format to follow this position. Use the following single blob of JSON. Do not include any other information.

{
  "san": "The move in SAN format",
  "reason": "Why this is a good move"
}
`;
    return userPrompt;
  }

  async getNextMove({
    fen,
    pgn,
    ascii,
    boardDescription,
    validMoves,
    invalidAttemptedMoves,
    aiColor,
    model,
    apiKey,
  }: AiMoveArgs): Promise<{
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

    const userPrompt = this.getUserPrompt({
      fen,
      pgn,
      ascii,
      boardDescription,
      validMoves,
      invalidAttemptedMoves,
      aiColor,
    });

    // build the messages
    console.log("Calling OpenAI API", fen);
    const messages = this.getMessages(userPrompt);

    const completion = await this.openai.createChatCompletion({
      model: model,
      messages: messages,
      max_tokens: 500,
      temperature: 0.1,
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
