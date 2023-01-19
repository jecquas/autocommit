#!/usr/bin/env zx

$.verbose = false;

require("dotenv").config({ path: __dirname + "/.env" });
const { Configuration, OpenAIApi } = require("openai");
import { spinner } from "zx/experimental";
import inquirer from "inquirer";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

try {
  const { stdout } = await $`git rev-parse --is-inside-work-tree`;
  if (stdout.trim() !== "true") {
    throw new Error();
  }
} catch (err) {
  console.error("You should run this command inside a git repository");
  process.exit(1);
}

const { stdout } = await $`git diff HEAD`;
if (!stdout.trim().length) {
  console.log("No changes staged. Did you run `git add` ?");
  process.exit(1);
}

const completion = await spinner("Thinking ...", async () => {
  return await openai.createCompletion({
    model: "text-davinci-003",
    prompt: `${stdout.trim()} \n give me a commit message\n`,
    n: 3,
    max_tokens: 200,
    temperature: 0.4,
  });
});

const { commit } = await inquirer.prompt({
  name: "commit",
  type: "list",
  message: "Choose one of these commit messages\n",
  choices: [
    ...completion?.data?.choices.map((choice) => ({
      name: choice.text.trim(),
      value: choice.text.trim(),
    })),
    { name: "None of these", value: null },
  ],
});

if (commit) {
  echo("Committing...");
  await $`git commit -m ${commit}`;
}

echo(`Done ✨`);
