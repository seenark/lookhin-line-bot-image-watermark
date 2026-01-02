import path from "node:path";
import process from "node:process";
import { Effect } from "effect/index";

export class ImageFsService extends Effect.Service<ImageFsService>()(
  "Service/ImageFs",
  {
    effect: Effect.gen(function* () {
      const getFullPath = (filename: string, folder: string) =>
        path.join(process.cwd(), folder, filename);

      const getOriginalFullPath = (filename: string) =>
        getFullPath(filename, "images");

      const getOutputFullPath = (filename: string) =>
        getFullPath(filename, "images-output");

      const getWatermarkFullPath = path.join(
        process.cwd(),
        "src/watermark/photo-mark.png"
      );

      return {
        getFullPath,
        getOriginalFullPath,
        getOutputFullPath,
        getWatermarkFullPath,
      };
    }),
  }
) {}
