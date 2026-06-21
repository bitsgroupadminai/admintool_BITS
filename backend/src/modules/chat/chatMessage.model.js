import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatSession',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    citations: {
      type: [
        {
          source: { type: String, trim: true },
          excerpt: { type: String, trim: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
