import { existsSync } from "node:fs";
import { readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { cors } from "@elysiajs/cors";
import openapi from "@elysiajs/openapi";
import staticPlugin from "@elysiajs/static";
import { validateSignature } from "@line/bot-sdk";
import { Array as A, Effect, JSONSchema, Schema as S } from "effect";
import { Elysia } from "elysia";
import { Runtime } from "./runtime";
import { WebhookService } from "./webhook";

const app = new Elysia({
  serve: {
    hostname: "0.0.0.0",
    port: Bun.env.PORT,
  },
})
  .use(cors())
  .use(
    openapi({
      path: "/docs",
      mapJsonSchema: {
        effect: JSONSchema.make,
      },
    })
  )
  .use(
    staticPlugin({
      prefix: "/static",
      assets: "images-output",
    })
  )
  .post(
    "/lh",
    async ({ request, body }) => {
      console.log("request", request, body);

      // biome-ignore lint/suspicious/noExplicitAny: need type casting
      const bodyEvents = (body as any).events;
      await WebhookService.pipe(
        Effect.andThen((svc) => svc.handleWebhookEvents(bodyEvents)),
        Runtime.runPromise
      );
      console.log("done");

      return "Ok";
    },
    {
      headers: S.Struct({
        "x-line-signature": S.String,
      }).pipe(S.standardSchemaV1),
      beforeHandle: ({ headers, body, status }) => {
        console.log("before handle");
        const signature = headers["x-line-signature"];
        const bodyString = JSON.stringify(body);
        const isValidRequest = validateSignature(
          bodyString,
          Bun.env.LINE_CHANNEL_SECRET,
          signature
        );
        if (isValidRequest === false) {
          return status(401);
        }
      },
    }
  )
  .get("/images", async () => {
    const files = (await readdir("images-output")).sort((a, b) =>
      b.localeCompare(a)
    );
    return A.map(files, (f) => `${Bun.env.APP_DOMAIN}/static/${f}`);
  })
  .delete("/images/:filename", async ({ params, set }) => {
    const { filename } = params;

    // Prevent path traversal attacks
    const normalizedFilename = path.basename(filename);
    if (normalizedFilename !== filename) {
      set.status = 400;
      return {
        success: false,
        error: "Invalid filename",
      };
    }

    const originalPath = path.join("images", normalizedFilename);
    const outputPath = path.join("images-output", normalizedFilename);

    const results = {
      deletedFromImages: false,
      deletedFromImagesOutput: false,
      errors: [] as string[],
    };

    // Try to delete from images folder
    if (existsSync(originalPath)) {
      try {
        await unlink(originalPath);
        results.deletedFromImages = true;
      } catch (error) {
        results.errors.push(`Failed to delete from images: ${error}`);
      }
    }

    // Try to delete from images-output folder
    if (existsSync(outputPath)) {
      try {
        await unlink(outputPath);
        results.deletedFromImagesOutput = true;
      } catch (error) {
        results.errors.push(`Failed to delete from images-output: ${error}`);
      }
    }

    // If neither file existed, return 404
    if (!(results.deletedFromImages || results.deletedFromImagesOutput)) {
      set.status = 404;
      return {
        success: false,
        message: "File not found in either folder",
        filename: normalizedFilename,
      };
    }

    // Return detailed status
    const success = results.errors.length === 0;
    set.status = success ? 200 : 207; // 207 for multi-status when there are partial errors

    return {
      success,
      filename: normalizedFilename,
      deletedFromImages: results.deletedFromImages,
      deletedFromImagesOutput: results.deletedFromImagesOutput,
      errors: results.errors.length > 0 ? results.errors : undefined,
    };
  })
  .get("/", () => "Hello Elysia")
  .listen(Bun.env.PORT);

console.log(
  `
    __    _            ____        __
   / /   (_)___  ___  / __ )____  / /_
  / /   / / __ \\/ _ \\/ __  / __ \\/ __/
 / /___/ / / / /  __/ /_/ / /_/ / /_
/_____/_/_/ /_/\\___/_____/\\____/\\__/
`,
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
