const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Route to get all notifications of a particular student
router.get('/:studentId', notificationController.getNotificationsByStudent);


module.exports = router;
