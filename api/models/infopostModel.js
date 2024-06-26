const mongoose = require("mongoose");

//schema for infopost

const infopostSchema = mongoose.Schema({
  id: mongoose.Schema.Types.ObjectId,
  body: { type: String, required: true },
  urls: { type: String, default: "" },
  hidden: { type: Boolean, default: false },
  images: [{ type: String }],
  asked_At: { type: Date, default: Date.now },
  tag: { type: String, required: false }
});

const infopostModel = mongoose.model("infopostModel", infopostSchema);

module.exports = infopostModel;
