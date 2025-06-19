/**
 * Migration-specific file utilities
 * Functions specific to jsx-migr8 migration rules
 */
import { readdirSync, promises } from "node:fs";

/**
 * Get migration rule file names synchronously
 */
export const getMigr8RulesFileNames = () =>
  readdirSync("migr8Rules").filter((e) => e.endsWith("migr8.json"));

/**
 * Get migration rule file names asynchronously
 */
export async function getMigr8RulesFileNamesAsync(): Promise<string[]> {
  try {
    const files = await promises.readdir("migr8Rules");
    return files.filter((e) => e.endsWith("migr8.json"));
  } catch (error) {
    console.warn("Failed to read migr8Rules directory:", error);
    return [];
  }
}
