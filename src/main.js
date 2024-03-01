const { invoke } = window.__TAURI__.tauri;
const { listen, emit } = window.__TAURI__.event;
const { open, save } = window.__TAURI__.dialog;
const { stat } = window.__TAURI__.fs;

let messageInputEl;
let messages;
let fileInput;

let clientNameEl;
let connectedClientEl;

let maxMessages = 50;
let maxMessageSize = 5 * 1024 * 1024;
let maxTextLength = 100;

let message_cooldown = false;
let users = [];
let clientName = null;
let connected = false;

async function connect() {
  if (connected == true) {
    return;
  }
  emit("close_tcp", true);
  const res = await invoke("connect");
  connected = true;
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
  const messages_listen = await listen("client_message", async (p) => {
    let json = await p;
    json = await JSON.parse(json.payload);

    let element = formatMessageHtml(json);

    messages.innerHTML = messages.innerHTML + element;
    messages.innerHTML = removeOldMessages();
    messages.scrollTop = messages.scrollHeight;
    console.log(`Got message from ` + json.from + " !");
  });

  const client_name_listen = await listen("client_name", async (p) => {
    let text = await p;
    let data = JSON.parse(text.payload);

    if (clientName == null) {
      clientNameEl.innerHTML = "Your name is " + data.name;
      clientName = data.name;
    }
    connectedClientEl.innerHTML =
      data.users.length + " - users<br>👤" + data.users.join("<br>👤");
    console.log(data);
  });
  const message_cooldown_listen = await listen(
    "message_cooldown",
    async (p) => {
      let data = await p;
      console.log(data.payload);
      message_cooldown = data.payload;
    }
  );
  const error_listen = await listen("client_error", async (p) => {
    let data = await p;
    if (data.payload == "reconnect") {
      connected = false;
      clientName = null;
      console.log("reconnect");
      connect();
    } else {
      alert(data.payload);
    }
  });
  emit("message", {
    request: 1,
  });
  let interval = setInterval(() => {
    if (clientName == null) {
      emit("message", {
        request: 1,
      });
      interval();
    }
  }, 100);
}
function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    "Bytes",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
  ];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
function sizeOfString(str) {
  return formatBytes(sizeInBytes(str));
}
function sizeInBytes(str) {
  var m = encodeURIComponent(str).match(/%[89ABab]/g);
  return str.length + (m ? m.length : 0);
}
function escapeHtml(unsafe) {
  return unsafe.replace(/[&<"']/g, function (match) {
    switch (match) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#039;";
    }
  });
}
function formatMessageHtml(json) {
  let date_text = new Date(json.time).toLocaleTimeString("en-US");

  let time = date_text.split(":");
  time = time[0] + ":" + time[1];

  let pmAM = date_text.split(" ")[1];

  date_text = time + " " + pmAM;

  let element = "";

  json.message = escapeHtml(json.message);

  switch (json.file_type) {
    case "plainText":
    case "":
      if (json.message.length > maxTextLength) {
        element = `<a class="message">👤${
          json.from
        } 🕛${date_text} : <button onclick="download('message.txt','${
          json.message
        }')">file.txt (${sizeOfString(json.message)})</button><br></a>`;
      } else {
        element =
          "<a class='message'>" +
          "👤" +
          json.from +
          " 🕛" +
          date_text +
          " : " +
          json.message +
          "<br>" +
          "</a>";
      }

      break;
    case "png":
    case "jpg":
    case "gif":
      if (json.message.length > maxTextLength) {
        element = `<a class="message">👤${json.from} 🕛${date_text} : <button onclick="download("message.txt","${json.message}")"</button><br><img src="data:image/png;base64, ${json.file_data}"></a>`;
      } else {
        element = `<a class="message">👤${json.from} 🕛${date_text} : ${json.message}<br><img src="data:image/png;base64, ${json.file_data}"></a>`;
      }

      break;
    default:
      if (json.message.length > maxTextLength) {
        element = `<a class="message">👤${
          json.from
        } 🕛${date_text} : <br> <button onclick="download('message.txt','${
          json.message
        }')">messsage.txt (${sizeOfString(
          json.message
        )})</button><button onclick="download('file.${
          json.file_type
        }','${escapeHtml(json.file_data)}')">file.${
          json.file_type
        } (${sizeOfString(json.file_data)})</button><br></a>`;
      } else {
        element = `<a class="message">👤${json.from} 🕛${date_text} : ${
          json.message
        } <br><button onclick="download('file.${json.file_type}','${escapeHtml(
          json.file_data
        )}')">file.${json.file_type} (${sizeOfString(
          json.file_data
        )})</button><br></a>`;
        console.log(element);
      }

      break;
  }

  return element;
}

let selectedFilePath = null;

async function getFile() {
  let filepath = await open({
    title: "Select file - Max size 5MB",
    multiple: false,
  });

  selectedFilePath = filepath;
  let split = filepath.split("\\");
  fileInput.innerHTML = split[split.length - 1];
  return filepath;
}

async function sendMessage() {
  if (message_cooldown == true) {
    alert("Please wait for the last message to be send.");
    return;
  }
  if (messageInputEl.value.length <= 0 && selectedFilePath == null) {
    alert("Enter something in the text box or select file to send!");
    return;
  }
  let json = {
    from: "",
    message: messageInputEl.value,
    file_type: "plainText",
    file_data: "",
    time: 0,
  };
  let sizeMessage = sizeInBytes(json.message);

  if (sizeMessage > maxMessageSize) {
    alert("Message is too large");
    return;
  }
  if (selectedFilePath != null) {
    json.file_type = selectedFilePath;
    selectedFilePath = null;
    fileInput.innerHTML = "Click to select file";
  }
  messageInputEl.value = "";
  emit("message", json);
}

if (
  window.performance.navigation.type !=
  window.performance.navigation.TYPE_RELOAD
) {
  listenMsg();
  connect();
} else {
  listenMsg();
}

window.addEventListener("DOMContentLoaded", () => {
  messageInputEl = document.querySelector("#message-input");
  messages = document.getElementById("messages");
  fileInput = document.getElementById("fileInput");

  clientNameEl = document.getElementById("client_name");
  connectedClientEl = document.getElementById("connected_clients");

  document.querySelector("#chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });
});
