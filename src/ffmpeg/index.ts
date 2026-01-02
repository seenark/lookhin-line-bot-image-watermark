import { Data, Effect } from "effect/index";

export class ShellExecError extends Data.TaggedError("Error/Shell/Exec")<{
  error: unknown;
}> {}

export class FfmpegService extends Effect.Service<FfmpegService>()(
  "Service/FFMPEG",
  {
    effect: Effect.gen(function* () {
      const fillWatermark = (
        imageFullPath: string,
        outputFullPath: string,
        watermarkFullPath: string
      ) => {
        const command = [
          "ffmpeg",
          "-i",
          imageFullPath,
          "-i",
          watermarkFullPath,
          "-filter_complex",
          "[1:v]scale=iw*0.15:-1[wm];[0:v][wm]overlay=20:H-h-20",
          "-q:v",
          "2",
          outputFullPath,
        ];

        return Effect.tryPromise({
          try: () => Bun.$`${command}`,
          catch: (error) => new ShellExecError({ error }),
        });
      };

      const echo = (text: string) =>
        Effect.tryPromise({
          try: () => Bun.$`echo ${text}`,
          catch: (error) => new ShellExecError({ error }),
        });

      return {
        fillWatermark,
        echo,
      };
    }),
  }
) {}
