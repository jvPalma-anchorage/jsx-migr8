import { Migr8Spec } from "@/report";
import { getJsonFile, getMigr8RulesFileNames } from "./fs-utils";

export const transformFileIntoOptions = () => {
  const validOptions: {
    name: string;
    description: string;
    value: Migr8Spec;
    disabled: boolean;
  }[] = [];
  const migr8RuleFiles = getMigr8RulesFileNames();

  migr8RuleFiles.forEach((fileName) => {
    const filePath = `migr8Rules/${fileName}`;

    const migr8Spec = getJsonFile<Migr8Spec>(filePath);
    if (!migr8Spec) return;

    migr8Spec.migr8rules.forEach((migr8rule) => {
      const name = `${migr8rule.component} -> ${migr8rule.importTo.component} from ${migr8rule.importTo.importStm}`;
      validOptions.push({
        name,

        value: migr8Spec,
        // disabled: name.includes("TODO"),
        disabled: false,
        description: `imported from 📦 ${migr8rule.package}`,
      });
    });
  });

  return validOptions;
};
