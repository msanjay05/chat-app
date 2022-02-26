const express = require("express");
const http = require("http");
const path = require("path");
const Filter = require("bad-words");
const socetio = require("socket.io");
const { generateMessage } = require("./utils/messages");
const { addUser, removeUser, getUser, getUsersInRoom } = require("./utils/users");

const port = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socetio(server);

const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));
// let count = 0;
io.on("connection", (socket) => {
  console.log("New Websocket connection");

  socket.on("join", (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });
    if (error) {
      return callback(error);
    }
    socket.join(user.room);
    socket.emit("messageReceived", generateMessage("welcome",'Admin'));
    socket.broadcast
      .to(user.room)
      .emit("messageReceived", generateMessage(`${user.username} has joined`));
    
    io.to(user.room).emit('roomData',{
      room:user.room,
      users:getUsersInRoom(user.room)
    })
    callback();
  });

  socket.on("messageSent", (messageReceived, callback) => {
    const filter = new Filter();
    if (filter.isProfane(messageReceived)) {
      return callback("profanity is not allowed");
    }
    const user=getUser(socket.id);
    io.to(user.room).emit("messageReceived", generateMessage(messageReceived,user.username));
    callback();
  });
  socket.on("locationSend", (location, callback) => {
    const user=getUser(socket.id);
    io.to(user.room).emit(
      "locationReceived",
      generateMessage(`https://www.google.com/maps?q=${location.lat},${location.long}`,user.username)
    );
    callback();
  });
  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "messageReceived",
        generateMessage(`${user.username} has left`,'Admin')
      );
      io.to(user.room).emit('roomData',{
        room:user.room,
        users:getUsersInRoom(user.room)
      })
    }
  });
});

server.listen(port, () => {
  console.log("Server up and running on ", port);
});
