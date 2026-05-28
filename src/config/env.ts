export type AppEnv = {
  port: number;
  outputDir: string;
  sampleEventsPath: string;
};

export function loadEnv(): AppEnv {
  return {
    port: Number(process.env.PORT ?? 3000),
    outputDir: process.env.OUTPUT_DIR ?? "data/output",
    sampleEventsPath:
      process.env.SAMPLE_EVENTS_PATH ?? "data/samples/market-events.sample.json"
  };
}
