const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  phone_number: String,
  password: String,
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
  priority: { type: Number, enum: [0, 1, 2, 3], default: 3 },
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
