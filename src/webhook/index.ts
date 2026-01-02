import type { ImageEventMessage, WebhookEvent } from "@line/bot-sdk";
import { Data, Effect } from "effect/index";
import { FfmpegService, type ShellExecError } from "../ffmpeg";
import { ImageFsService } from "../image-fs";
import { type GetMessageContentError, LineClient } from "../line/client";

export class HandleImageEventError extends Data.TaggedError(
  "Error/HandleImageEvent"
)<{ error: unknown }> {}

export class InvalidContentProvider extends Data.TaggedError(
  "Invalid/ContentProvider"
) {}

export class WriteToFileError extends Data.TaggedError("Error/Write")<{
  error: unknown;
}> {}

export class InvalidWebhookEvent extends Data.TaggedError(
  "Invalid/WebhookEvent"
) {}

export class InvalidEventMessageType extends Data.TaggedError(
  "Invalid/EventMessageType"
) {}

export class WebhookService extends Effect.Service<WebhookService>()(
  "Service/Webhook",
  {
    dependencies: [
      LineClient.Default,
      ImageFsService.Default,
      FfmpegService.Default,
    ],
    effect: Effect.gen(function* () {
      const lineClient = yield* LineClient;
      const imageFs = yield* ImageFsService;
      const ffmpeg = yield* FfmpegService;

      const handleImageEvent = (
        event: ImageEventMessage
      ): Effect.Effect<
        string,
        InvalidContentProvider | WriteToFileError | GetMessageContentError,
        never
      > => {
        if (event.contentProvider.type !== "line")
          return Effect.fail(new InvalidContentProvider());
        const imageName = `${Bun.randomUUIDv7("hex")}.jpg`;
        return lineClient.getMessageContent(event.id).pipe(
          Effect.andThen((res) => {
            return Effect.tryPromise({
              try: () => Bun.write(`./images/${imageName}`, res),
              catch: (error) => new WriteToFileError({ error }),
            });
          }),
          Effect.andThen(() => imageName)
        );
      };

      const handleEvent = (
        event: WebhookEvent
      ): Effect.Effect<
        string,
        | InvalidWebhookEvent
        | InvalidEventMessageType
        | InvalidContentProvider
        | GetMessageContentError
        | WriteToFileError
        | ShellExecError,
        never
      > => {
        console.log("event", event);
        if (event.type !== "message")
          return Effect.fail(new InvalidWebhookEvent());
        const msgEvent = event.message;
        if (msgEvent.type !== "image")
          return Effect.fail(new InvalidEventMessageType());
        const imgEvent: ImageEventMessage = msgEvent;
        console.log("img event", imgEvent);

        return Effect.gen(function* () {
          const imageName = yield* handleImageEvent(imgEvent);
          const originalFullPath = imageFs.getOriginalFullPath(imageName);
          const outputFullPath = imageFs.getOutputFullPath(imageName);
          yield* ffmpeg.fillWatermark(
            originalFullPath,
            outputFullPath,
            imageFs.getWatermarkFullPath
          );
          return outputFullPath;
        });
      };

      const handleWebhookEvents = (events: WebhookEvent[]) =>
        Effect.forEach(
          events,
          (e) => handleEvent(e).pipe(Effect.orElse(() => Effect.void)),
          { concurrency: 1 }
        );

      return {
        handleWebhookEvents,
      };
    }),
  }
) {}
