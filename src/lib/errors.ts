// Domain errors carry messages that are safe to show to end users. Anything
// else (driver errors, unexpected failures) must be masked before it reaches
// a client.
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
