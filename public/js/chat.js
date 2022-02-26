const socket = io();

// elements
const messageForm = document.querySelector("#message-form");
const messageFormInput = messageForm.querySelector("input");
const messageFormButton = messageForm.querySelector("button");
const sendLocation = document.querySelector("#send-location");
const messages = document.querySelector("#messages");

// templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationTemplate = document.querySelector("#location-template").innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

//options
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const autoscroll = () => {
  // new message element
  const newMessage = messages.lastElementChild;

  // height of new message
  const newMessageStyles = getComputedStyle(newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = newMessage.offsetHeight + newMessageMargin;
  console.log(newMessageMargin);

  // visible height
  const visibleHeight = messages.offsetHeight;

  // height of messages container
  const containerHeight = messages.scrollHeight;

  // how far scrolled
  const scrollOffset=messages.scrollTop+visibleHeight

  if(containerHeight-newMessageHeight<=scrollOffset)
  {
    messages.scrollTop=messages.scrollHeight;
  }
};

socket.on("messageReceived", (message) => {
  console.log(message);
  const html = Mustache.render(messageTemplate, {
    message: message.text,
    createdAt: moment(message.createdAt).format("h:mm a"),
    username: message.username,
  });
  messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("locationReceived", (message) => {
  console.log(message);
  const html = Mustache.render(locationTemplate, {
    link: message,
    createdAt: moment(message.createdAt).format("h:mm a"),
    username: message.username,
  });
  messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users,
  });
  document.querySelector("#sidebar").innerHTML = html;
});

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  messageFormButton.setAttribute("disabled", "disabled");
  const message = e.target.elements.message.value;
  socket.emit("messageSent", message, (error) => {
    messageFormButton.removeAttribute("disabled");
    messageFormInput.value = "";
    messageFormInput.focus();
    if (error) {
      return console.log(error);
    }
    console.log("message ", message);
  });
});

sendLocation.addEventListener("click", (e) => {
  e.preventDefault();
  sendLocation.setAttribute("disabled", "disabled");
  if (!navigator.geolocation) {
    return alert("not supported by your browser");
  }
  navigator.geolocation.getCurrentPosition((position) => {
    const location = {
      lat: position.coords.latitude,
      long: position.coords.longitude,
    };
    socket.emit("locationSend", location, () => {
      sendLocation.removeAttribute("disabled");
      console.log("location delivered");
    });
  });
});

socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});
