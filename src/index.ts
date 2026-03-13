import { Command } from "commander";
import { taskCommand } from "./commands/task.js";
import { statusCommand } from "./commands/status.js";
import { listCommand } from "./commands/list.js";
import { getHelpText, getExamplesText } from "./utils/help.js";

const program = new Command();

program
  .name("openclaw-opencode")
  .description("CLI for dispatching OpenClaw tasks to OpenCode")
  .version("1.0.0")
  .addHelpText("before", getHelpText())
  .addHelpText("after", getExamplesText())
  .configureHelp({
    helpWidth: 100,
  });

program.addCommand(taskCommand);
program.addCommand(statusCommand);
program.addCommand(listCommand);

program.parse();
