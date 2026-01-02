import { readdir } from "node:fs/promises";
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
    const files = await readdir("images-output");
    return A.map(files, (f) => `${Bun.env.APP_DOMAIN}/static/${f}`);
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
