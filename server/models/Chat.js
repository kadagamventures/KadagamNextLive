const mongoose = require('mongoose');
const { Schema } = mongoose;

const chatSchema = new Schema({
  companyId: {
    type: String,
    ref: 'Company',
    required: true,
    index: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  senderName: {
    type: String,
    required: true,
    trim: true
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    index: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxLength: 1000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  attachments: [{
    fileUrl: String,
    fileName: String,
    fileType: String,
    fileSize: Number
  }],
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  delivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date
  },
  edited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    message: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Chat'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Map,
    of: String,
    default: new Map()
  }
}, {
  collection: 'chats',
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ─────────────────────────────
// 📌 Indexes
// ─────────────────────────────
chatSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 });
chatSchema.index({ taskId: 1, timestamp: 1 });
chatSchema.index({ 'attachments.fileUrl': 1 });
chatSchema.index({ message: 'text' });
chatSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90, background: true });

// ─────────────────────────────
// 🧠 Virtual Fields
// ─────────────────────────────
chatSchema.virtual('formattedTime').get(function () {
  return this.timestamp
    ? this.timestamp.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        hour12: true
      })
    : '';
});

chatSchema.virtual('preview').get(function () {
  if (this.messageType === 'text') {
    return this.message.length > 50
      ? this.message.substring(0, 47) + '...'
      : this.message;
  }
  return this.messageType === 'image' ? '📷 Image' : '📎 Attachment';
});

// ─────────────────────────────
// 🧩 Instance Methods
// ─────────────────────────────
chatSchema.methods.markAsRead = async function () {
  if (!this.read) {
    this.read = true;
    this.readAt = new Date();
    await this.save();
  }
};

chatSchema.methods.markAsDelivered = async function () {
  if (!this.delivered) {
    this.delivered = true;
    this.deliveredAt = new Date();
    await this.save();
  }
};

chatSchema.methods.editMessage = async function (newMessage) {
  if (this.message !== newMessage) {
    this.editHistory.push({
      message: this.message,
      editedAt: new Date()
    });
    this.message = newMessage;
    this.edited = true;
    await this.save();
  }
};

// ─────────────────────────────
// 📊 Static Methods
// ─────────────────────────────
chatSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({
    receiverId: userId,
    read: false
  });
};

chatSchema.statics.getConversationMessages = async function (user1Id, user2Id) {
  return this.find({
    $or: [
      { senderId: user1Id, receiverId: user2Id },
      { senderId: user2Id, receiverId: user1Id }
    ]
  })
    .sort({ timestamp: 1 })
    .populate('senderId', 'name email')
    .populate('receiverId', 'name email');
};

// ─────────────────────────────
// ⚙️ Pre-save Hook
// ─────────────────────────────
chatSchema.pre('save', function (next) {
  if (this.isNew) {
    this.delivered = true;
    this.deliveredAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Chat', chatSchema);
