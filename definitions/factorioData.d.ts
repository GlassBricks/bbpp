declare module "DataStage" {
  interface Data {
    raw: PRecord<string, any>

    extend(data: Record<string, any>[]): void
  }
}
