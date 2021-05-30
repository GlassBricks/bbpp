declare module "Data" {
  interface Data {
    raw: PRecord<string, any>

    extend(data: Record<string, any>[]): void
  }

}
