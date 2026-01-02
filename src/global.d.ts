/** biome-ignore-all lint/style/useConsistentTypeDefinitions: i wanna use */
/** biome-ignore-all lint/style/noNamespace: i wanna use */
type Env = {
  PORT: string;
  APP_DOMAIN: string;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  LINE_CHANNEL_ID: string;
  LINE_CHANNEL_SECRET: string;
};

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Env {
      NODE_ENV: "development" | "production" | "test" | "uat";
    }
  }
}
export type IEnv = Env;
