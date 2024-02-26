const { invoke } = window.__TAURI__.tauri;
const { listen, emit } = window.__TAURI__.event;
const { open, save } = window.__TAURI__.dialog;

let messageInputEl;
let messages;

let maxMessages = 50;
let maxMessageSize = 5000000;
let maxTextLength = 100;

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
    document.getElementById("client_name").innerHTML =
      "Your name is " + text.payload;
  });

  emit("message", {
    request: "get_name",
  });
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
        } 🕛${date_text} : <button onclick="download("message.txt","${
          json.message
        }")">file.txt (${sizeOfString(json.message)})</button><br></a>`;
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
        element = `<a class="message">👤${json.from} 🕛${date_text} : <button onclick="download("message.txt","${json.message}")"</button><br><img src="${json.file_data}"></a>`;
      } else {
        element = `<a class="message">👤${json.from} 🕛${date_text} : ${json.message}<br><img src="${json.file_data}"></a>`;
      }

      break;
    default:
      if (json.message.length > maxTextLength) {
        element = `<a class="message">👤${
          json.from
        } 🕛${date_text} : <br> <button onclick="download("message.txt","${
          json.message
        }")">messsage.txt (${sizeOfString(
          json.message
        )})</button><button onclick="download("file.${json.file_type}","${
          json.file_data
        }")">file.${json.file_type} (${sizeOfString(
          json.message
        )})</button><br></a>`;
      } else {
        element = `<a class="message">👤${json.from} 🕛${date_text} : ${
          json.message
        } <br><button onclick="download("file.${json.file_type}","${
          json.file_data
        }")">file.${json.file_type} (${sizeOfString(
          json.file_data
        )})</button><br></a>`;
      }

      break;
  }

  return element;
}

function getFile() {
  var fileInput = document.getElementById("fileInput");
  if (fileInput.files.length == 0) {
    return null;
  }
  var file = fileInput.files[0];
  return file;
}

async function sendMessage() {
  if (messageInputEl.value.length <= 0) {
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
  let file = getFile();
  console.log(file);
  if (file != null) {
    if (file.size > maxMessageSize) {
      alert("File is too large! Max size is 5MB.");
      return;
    }
    json.file_type = file.name;
  }
  emit("message", json);
}

if (
  window.performance.navigation.type !=
  window.performance.navigation.TYPE_RELOAD
) {
  connect();
} else {
  listenMsg();
}

async function handler() {
  let filepath = await open();
  console.log(filepath);
}
handler();
window.addEventListener("DOMContentLoaded", () => {
  messageInputEl = document.querySelector("#message-input");
  messages = document.getElementById("messages");
  document.querySelector("#chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });
});
