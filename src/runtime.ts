import { Layer, ManagedRuntime } from "effect/index";
import { LineClient } from "./line/client";
import { WebhookService } from "./webhook";

const Live = Layer.mergeAll(LineClient.Default, WebhookService.Default);

export const Runtime = ManagedRuntime.make(Live);
