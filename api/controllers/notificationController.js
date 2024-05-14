const asyncHandler = require("express-async-handler");
const dotenv = require("dotenv");
dotenv.config();
const notificationModel = require("../models/notificationModel");
const path = require("path");

const createNotification = asyncHandler(async (senderid, recipientlist, contentid, content) => {
    try {
        const newNotification = new notificationModel({
            senderid: senderid,
            recipientlist: recipientlist,
            contentid: contentid,
            content: content
        });
        await newNotification.save();

        return newNotification;
    } catch (err) {
        throw new Error("An error occurred while creating notification");
    }
});


module.exports = {
    createNotification
};