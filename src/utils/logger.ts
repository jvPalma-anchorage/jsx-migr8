import chalk, { ColorName } from "chalk";
import { GlobalState } from "../types";

type Logger = {
  prefix: "NONE" | "SUCS" | "WARN" | "INFO" | "DBUG" | "ERRO";
  color: ColorName;
  message: string;
  rest: any[];
};

const PrefixColors: { [K in Logger["prefix"]]: ColorName } = {
  NONE: "gray",
  SUCS: "green",
  WARN: "yellow",
  INFO: "blue",
  DBUG: "magenta",
  ERRO: "red",
};

const BaseLogger = ({ prefix, color, message, rest }: Logger) => {
  const prefixColor = PrefixColors[prefix];
  const includePrefix = prefix !== "NONE";
  const prefixText = includePrefix ? `${prefix}` : "";
  const finalPrefix = includePrefix ? chalk[prefixColor](prefixText) : "";

  const parsedMessage = message.length < 18 ? message.padEnd(18) : message;

  console.info(finalPrefix, chalk[color](parsedMessage), ...rest);
};

export const getLoggers = (runArgs: GlobalState["runArgs"]) => {
  return {
    logger: (message: string, ...rest: any[]) =>
      BaseLogger({
        prefix: "NONE",
        color: "white",
        message,
        rest,
      }),
    lSuccess: (message: string, ...rest: any[]) =>
      BaseLogger({
        prefix: "SUCS",
        color: "greenBright",
        message,
        rest,
      }),
    lError: (message: string, ...rest: any[]) =>
      BaseLogger({
        prefix: "ERRO",
        color: "redBright",
        message,
        rest,
      }),
    lInfo: (message: string, text2?: string, ...rest: string[]) => {
      if (!runArgs.info && !runArgs.debug) return;
      BaseLogger({
        prefix: "INFO",
        color: "blueBright",
        message,
        rest: [text2, ...rest],
      });
    },
    lDbug: (message: string, text2?: string, ...rest: string[]) => {
      if (!runArgs.info && !runArgs.debug) return;
      BaseLogger({
        prefix: "DBUG",
        color: "greenBright",
        message,
        rest: [text2, ...rest],
      });
    },
    lWarning: (message: string, text2?: string, ...rest: string[]) => {
      if (!runArgs.info && !runArgs.debug) return;
      BaseLogger({
        prefix: "WARN",
        color: "yellowBright",
        message,
        rest: [text2, ...rest],
      });
    },
  };
};
