import * as runtimeEnvironment from "browser-or-node";
import { browserParse } from "./browser/index.js";
import { nodeParse } from "./node/index.js";

export * from "./parser-models.js";

export const parseHTML = (htmlInput: string) =>
  runtimeEnvironment.isBrowser
    ? browserParse(htmlInput)
    : nodeParse(htmlInput);
