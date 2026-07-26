// This comment mentions "not a real string" and should be ignored.
const greeting = "hello world";
const single = 'single quoted';
const name = "Even";
const template = `Hi ${name}, welcome back!`;

const config = {
  "api-key": "abc123",
  timeout: 3000,
  label: 'dashboard',
};

function log(msg) {
  console.log(`[app] ${msg}`);
  return "done";
}

const arr = ["one", "two", "two"];

export { greeting, config, log, arr };
