import { Command } from "commander";
import { taskCommand } from "./commands/task.js";
import { statusCommand } from "./commands/status.js";
import { listCommand } from "./commands/list.js";
import { sessionCommand } from "./commands/session.js";
import { getHelpText, getExamplesText } from "./utils/help.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const program = new Command();

program
  .name("openclaw-opencode")
  .description("CLI for dispatching OpenClaw tasks to OpenCode")
  .version(pkg.version)
  .addHelpText("before", getHelpText())
  .addHelpText("after", getExamplesText())
  .configureHelp({
    helpWidth: 100,
  });

program.addCommand(taskCommand);
program.addCommand(statusCommand);
program.addCommand(listCommand);
program.addCommand(sessionCommand);

program.parse();
