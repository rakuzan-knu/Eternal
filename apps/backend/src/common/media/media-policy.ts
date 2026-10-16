const MIB = 1024 * 1024;

/** Admission limits; these do not measure total bucket occupancy. */
export const MEDIA_POLICY = {
  maxImageBytes: 5 * MIB,
  maxVideoBytes: 20 * MIB,
  maxAudioBytes: 10 * MIB,
  maxAttachmentBytes: 20 * MIB,
  maxReelDurationSeconds: 60,
  maxVideoDimension: 1920,
  uploadLeaseSeconds: 15 * 60,
} as const;
