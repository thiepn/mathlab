/**
 * Monotonic token for asynchronous mathematical operations.
 * A result may update the active workbench only if no newer operation or
 * context reset has superseded its token.
 */
export class LatestOperationGate {
  private revision = 0;

  begin(): number {
    this.revision += 1;
    return this.revision;
  }

  invalidate(): void {
    this.revision += 1;
  }

  isCurrent(revision: number): boolean {
    return revision === this.revision;
  }
}
