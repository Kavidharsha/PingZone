const express = require("express");
const Message = require("../models/Message");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Send a message
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      senderId,
      receiverId,
      channel,
      text,
    } = req.body;

    if (!senderId || !text) {
      return res.status(400).json({
        message: "Sender and message text are required",
      });
    }

    if (!receiverId && !channel) {
      return res.status(400).json({
        message: "Receiver or channel is required",
      });
    }

    const message = await Message.create({
      senderId,
      receiverId: receiverId || null,
      channel: channel || null,
      text,
    });

    const populatedMessage = await Message.findById(
      message._id
    ).populate(
      "senderId",
      "name email"
    );

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Send message error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// Get public channel messages
router.get(
  "/channel/:channel",
  authMiddleware,
  async (req, res) => {
  try {
    const messages = await Message.find({
      channel: req.params.channel,
      receiverId: null,
    })
      .populate("senderId", "name email")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Get channel messages error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// Get private conversation
router.get(
  "/private/:user1/:user2",
  authMiddleware,
  async (req, res) => {
  try {
    const { user1, user2 } = req.params;

    const messages = await Message.find({
      receiverId: {
        $in: [user1, user2],
      },
      senderId: {
        $in: [user1, user2],
      },
      channel: null,
    })
      .populate("senderId", "name email")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Get private messages error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// Delete a message
router.delete(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const deletedMessage = await Message.findByIdAndDelete(
        req.params.id
      );
  
      if (!deletedMessage) {
        return res.status(404).json({
          message: "Message not found",
        });
      }
  
      res.status(200).json({
        message: "Message deleted successfully",
      });
    } catch (error) {
      console.error("Delete message error:", error);
  
      res.status(500).json({
        message: "Server error",
      });
    }
  });

module.exports = router;