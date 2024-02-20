const { invoke } = window.__TAURI__.tauri;
const { listen, emit } = window.__TAURI__.event;

let greetInputEl;
let greetMsgEl;

async function greet() {
  greetMsgEl.textContent = await invoke("greet", { name: greetInputEl.value });
}

async function progress() {
  const destroy = await listen("progress-update", (p) => {
    console.log(`Progress -> ${p.payload}`);
  });
  const res = await invoke("do_with_progress");
  console.log(res);
  if (res == "done") {
    progress();
  }
  destroy();
}
async function connect() {
  const res = await invoke("connect");
  console.log(res);
}
window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector("#greet-input");
  greetMsgEl = document.querySelector("#greet-msg");
  document.querySelector("#greet-form").addEventListener("submit", (e) => {
    e.preventDefault();
    connect();
  });
});
