const { invoke } = window.__TAURI__.tauri;
const { listen, emit } = window.__TAURI__.event;

let greetInputEl;
let messages;

let maxMessages = 50;

async function greet() {
  messages.textContent = await invoke("greet", { name: greetInputEl.value });
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
  listenMsg();
  const res = await invoke("connect");
  console.log(res);
}
function removeOldMessages() {
  let html = messages.innerHTML;
  let count = html.split("<br>");

  let countCount = count.length;
  let toRemove = countCount - maxMessages;

  if (toRemove > 0) {
    for (let index = 0; index < toRemove; index++) {
      count.splice(0, 1);
    }
    return count.join("<br>");
  }
  return html;
}
async function listenMsg() {
  const destroy = await listen("client_message", async (p) => {
    let json = await p;
    json = await JSON.parse(json.payload);

    let date_text = new Date(json.time).toLocaleTimeString("en-US");

    let time = date_text.split(":");
    time = time[0] + ":" + time[1];

    let pmAM = date_text.split(" ")[1];

    date_text = time + " " + pmAM;
    let element =
      "<a class='message'>" +
      "👤" +
      json.from +
      " 🕛" +
      date_text +
      " : " +
      json.message +
      "<br>" +
      "</a>";
    messages.innerHTML = messages.innerHTML + element;
    messages.innerHTML = removeOldMessages();
    messages.scrollTop = messages.scrollHeight;
    console.log(`Got message from ` + json.from + " !");
  });

  const destroy1 = await listen("client_name", async (p) => {
    let text = await p;
    document.getElementById("client_name").innerHTML =
      "Your name is " + text.payload;
  });

  emit("message", "");
}

async function sendMessage() {
  emit("message", {
    from: "",
    message: greetInputEl.value,
    time: 0,
  });
}

if (
  window.performance.navigation.type !=
  window.performance.navigation.TYPE_RELOAD
) {
  connect();
} else {
  listenMsg();
}
window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector("#message-input");
  messages = document.getElementById("messages");
  document.querySelector("#greet-form").addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });
});
