/**
 * JSON file operations utilities
 * Functions for reading and writing JSON files
 */
import { readFileSync, promises } from "node:fs";
import { readFileAsync, writeFileAsync } from "./async-file-operations";

/**
 * Read and parse JSON file synchronously
 */
export const getJsonFile = <T>(filePath: string) => {
  const jsonState = { value: undefined as T | undefined };
  try {
    jsonState.value = JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch (_e) {
    jsonState.value = undefined;
  }
  return jsonState.value;
};

/**
 * Read and parse JSON file asynchronously
 */
export async function getJsonFileAsync<T>(
  filePath: string,
): Promise<T | undefined> {
  try {
    const content = await readFileAsync(filePath);
    return JSON.parse(content) as T;
  } catch (error) {
    console.warn(`Failed to read JSON file ${filePath}:`, error);
    return undefined;
  }
}

/**
 * Write JSON data to file asynchronously
 */
export async function writeJsonFileAsync<T>(
  filePath: string,
  data: T,
  pretty = true,
): Promise<void> {
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  await writeFileAsync(filePath, content);
}
