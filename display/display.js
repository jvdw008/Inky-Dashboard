const path = require("path");
const { spawn } = require("child_process");

const PYTHON = "python3";
const SCRIPT = path.resolve(__dirname, "epd_render.py");

// Simple mutex
let rendering = Promise.resolve();

function run(payload, mode = "render") {
  rendering = rendering.then(() => {
    return new Promise((resolve, reject) => {
      const args = [SCRIPT, mode];
      if (payload) args.push(JSON.stringify(payload));

      const p = spawn(PYTHON, args);

      p.stderr.on("data", d =>
        console.error("[EPD]", d.toString())
      );

      p.on("close", code => {
        if (code === 0) resolve();
        else reject(new Error(`EPD exited with ${code}`));
      });
    });
  });

  return rendering;
}

async function renderHomepage(payload) {
  return run(payload, "render");
}

async function renderBootMessage(message) {
  return run({ message }, "boot");
}

module.exports = {
  renderHomepage,
  renderBootMessage,
};
