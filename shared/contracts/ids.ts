/** Cross-module ID factory; implementations must return unique IDs. */
export interface IdGenerator {
  /** Returns a UUID, optionally prefixed, e.g. `msg_8f14...`. */
  newId(prefix?: string): string;
}
