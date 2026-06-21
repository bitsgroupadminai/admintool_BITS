import mongoose from 'mongoose';

const knowledgeDocumentSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
      index: true,
    },
    offeringId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offering',
    },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    filePath: { type: String, required: true },
    extractedText: { type: String },
    indexStatus: {
      type: String,
      enum: ['pending', 'indexing', 'indexed', 'failed', 'skipped'],
      default: 'pending',
    },
    chunkCount: { type: Number, default: 0 },
    indexedAt: { type: Date },
    indexError: { type: String },
  },
  { timestamps: true },
);

export const KnowledgeDocument = mongoose.model('KnowledgeDocument', knowledgeDocumentSchema);
