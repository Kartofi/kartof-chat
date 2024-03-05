const { invoke } = window.__TAURI__.tauri;
const { listen, emit } = window.__TAURI__.event;
const { open, save } = window.__TAURI__.dialog;
const { stat } = window.__TAURI__.fs;

let messageInputEl;
let messages;
let fileInput;
let sendMessageButton;

let imageViewer;
let imageViewerImage;

let connectedClientEl;

let maxMessages = 50;
let maxMessageSize = 5 * 1024 * 1024;
let maxTextLength = 500;
let maxfileNameShow = 20;

let message_cooldown = false;
let users = [];
let clientName = null;
let connected = false;
let selectedFilePath = null;

let draggingFile = false;

async function connect() {
  if (connected == true) {
    return;
  }
  emit("close_tcp", true);
  const res = await invoke("connect");
  connected = true;
}
listen("tauri://file-drop", (event) => {
  document.getElementById("file-drop-indicator").style.display = "none";
  draggingFile = false;

  selectedFilePath = event.payload[0];
  let parts = selectedFilePath.split("\\");

  let name = parts[parts.length - 1];
  if (name.length > maxfileNameShow) {
    name = name.slice(0, maxfileNameShow - 1) + "...";
  }
  fileInput.textContent = name;

  document.getElementById("file-drop-indicator").style.display = "none";
});
listen("tauri://file-drop-hover", (event) => {
  if (event.payload.length == 0) {
    return;
  }

  document.getElementById("file-drop-indicator").style.display = "flex";
  draggingFile = true;
});
listen("tauri://file-drop-cancelled", (event) => {
  document.getElementById("file-drop-indicator").style.display = "none";
  draggingFile = false;
});
function removeOldMessages() {
  let countCount = messages.children.length;
  let toRemove = countCount - maxMessages;

  if (toRemove > 0) {
    for (let index = 0; index < toRemove; index++) {
      messages.removeChild(messages.firstElementChild);
    }
  }
}
async function listenMsg() {
  const messages_listen = await listen("client_message", async (p) => {
    let json = await p;
    json = await JSON.parse(json.payload);
    console.log(json);
    let element = formatMessageHtml(json);

    messages.insertAdjacentHTML("beforeend", element);
    removeOldMessages();

    messages.scrollTop = messages.scrollHeight;
    console.log(`Got message from ` + json.from + " !");
  });

  const client_name_listen = await listen("client_name", async (p) => {
    let text = await p;
    let data = JSON.parse(text.payload);

    if (clientName == null) {
      clientName = data.name;
    }
    for (let index = 0; index < data.users.length; index++) {
      if (data.users[index] == clientName) {
        data.users[index] += " - (YOU)";
      }
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
      clearInterval(interval);
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
  let date_text = new Date(json.time * 1000).toLocaleTimeString("en-US", {
    hour12: false,
  });

  let time = date_text.split(":");
  time = time[0] + ":" + time[1];

  date_text = time;

  let element = "";

  json.message = escapeHtml(json.message);

  let fileExtension = json.file_type;
  let fileName = json.file_type;

  if (fileExtension.includes(".")) {
    let split = fileExtension.split(".");
    fileName = json.file_type;
    fileExtension = split[1].toLowerCase();
  } else {
    fileName = "file." + fileExtension;
  }

  element = `<a class="message">👤${json.from} 🕛${date_text} : `;

  if (json.message.length > maxTextLength) {
    element += `<br> <button class="download-button" onclick="download('message.txt','${
      json.message
    }')">messsage.txt (${sizeOfString(json.message)})</button>`;
  } else {
    element += `${json.message}<br>`;
  }

  switch (fileExtension) {
    case "plainText":
    case "":
      break;
    case "png":
    case "jpg":
    case "gif":
    case "jpeg":
      if (json.message.length > maxTextLength) {
        element += "<br>";
      }
      element += `<img class="chat-img" draggable="false" onclick="openImageView('data:image/png;base64, ${json.file_data}')"  src="data:image/png;base64, ${json.file_data}">`;

      break;
    case "mp4":
      if (json.message.length > maxTextLength) {
        element += "<br><br>";
      }
      element += `<video  controls> <source src="data:video/webm;base64,${json.file_data}" type="video/mp4"></video>`;

      break;
    case "mp3":
    case "m4a":
      if (json.message.length > maxTextLength) {
        element += "<br><br>";
      }
      element += `<audio  controls> <source src="data:audio/mp3;base64,${json.file_data}" type="audio/mp3"></audio>`;

      break;
    default:
      element += `<button class="download-button" onclick="download('file.${
        json.file_type
      }','${escapeHtml(json.file_data)}')">${fileName} (${sizeOfString(
        json.file_data
      )})</button><br>`;

      break;
  }
  element += "</a>";
  return element;
}

async function getFile() {
  let filepath = await open({
    title: "Select file - Max size 5MB",
    multiple: false,
  });

  selectedFilePath = filepath;
  let split = filepath.split("\\");

  let name = split[split.length - 1];
  if (name.length > maxfileNameShow) {
    name = name.slice(0, maxfileNameShow - 1) + "...";
  }

  fileInput.textContent = name;
  return filepath;
}
function clearForm() {
  fileInput.textContent = "Click or drop your file";
  selectedFilePath = null;
}
function closeImageView() {
  imageViewer.style.display = "none";
}
function openImageView(base64Image) {
  imageViewerImage.src = base64Image;
  imageViewer.style.display = "flex";
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
    fileInput.innerHTML = "Click or drop your file";
  }
  messageInputEl.value = "";
  await emit("message", json);
  sendMessageButton.textContent = "Sending...";
  let inteval = setInterval(function () {
    if (message_cooldown == false) {
      clearInterval(inteval);
      sendMessageButton.textContent = "Send";
    }
  }, 10);
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
  sendMessageButton = document.getElementById("sendMessage");

  connectedClientEl = document.getElementById("connected_clients");

  imageViewer = document.getElementById("image-viewer");
  imageViewerImage = document.getElementById("image-viewer-image");

  document.querySelector("#chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });
});
