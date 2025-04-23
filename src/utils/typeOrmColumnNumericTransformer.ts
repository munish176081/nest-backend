export class ColumnNumericTransformer {
  to(data: number): number {
    return data;
  }
  from(data: string): number | undefined | null | string {
    if (data === undefined || data === null) return data;
    return parseFloat(data);
  }
}
