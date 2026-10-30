import { v4 as uuidv4 } from "uuid";

/** Uses secure random bytes when the browser does not expose randomUUID. */
export function criarIdCliente(): string {
  return uuidv4();
}