import mongoose from 'mongoose';

const knowledgeDocumentVersionSchema = new mongoose.Schema(
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
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeDocument',
      required: true,
      index: true,
    },
    version: { type: Number, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    extractedTextPreview: { type: String, default: '' },
    changeType: { type: String, enum: ['upload', 'replace', 'delete'], default: 'upload' },
  },
  { timestamps: true },
);

knowledgeDocumentVersionSchema.index({ documentId: 1, version: 1 }, { unique: true });

export const KnowledgeDocumentVersion = mongoose.model(
  'KnowledgeDocumentVersion',
  knowledgeDocumentVersionSchema,
);
