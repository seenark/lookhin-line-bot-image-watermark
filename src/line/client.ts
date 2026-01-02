import { messagingApi } from "@line/bot-sdk";
import { Data, Effect } from "effect/index";

export class GetMessageContentError extends Data.TaggedError(
  "Error/GetMessageContent"
)<{ error: unknown }> {}

export class LineClient extends Effect.Service<LineClient>()("Line/Client", {
  effect: Effect.gen(function* () {
    const linetClient = new messagingApi.MessagingApiClient({
      channelAccessToken: Bun.env.LINE_CHANNEL_ACCESS_TOKEN,
    });

    const getMessageContent = (messageId: string) => {
      const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;

      return Effect.tryPromise({
        try: () =>
          Bun.fetch(url, {
            headers: {
              Authorization: `Bearer ${Bun.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            },
          }),
        catch: (error) => new GetMessageContentError({ error }),
      });
    };

    return {
      linetClient,
      getMessageContent,
    };
  }),
  dependencies: [],
}) {}
