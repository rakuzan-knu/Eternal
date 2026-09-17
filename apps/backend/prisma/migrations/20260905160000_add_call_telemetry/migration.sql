-- CreateTable
CREATE TABLE IF NOT EXISTS "call_telemetries" (
    "id" TEXT NOT NULL,
    "call_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "avg_rtt_ms" DOUBLE PRECISION NOT NULL,
    "max_rtt_ms" DOUBLE PRECISION,
    "packet_loss_ratio" DOUBLE PRECISION NOT NULL,
    "jitter_ms" DOUBLE PRECISION,
    "audio_codec" TEXT,
    "video_codec" TEXT,
    "duration_ms" INTEGER NOT NULL,
    "end_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_telemetries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "call_telemetries_user_id_created_at_idx" ON "call_telemetries"("user_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "call_telemetries_call_id_idx" ON "call_telemetries"("call_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'call_telemetries_call_id_fkey'
    ) THEN
        ALTER TABLE "call_telemetries" ADD CONSTRAINT "call_telemetries_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'call_telemetries_user_id_fkey'
    ) THEN
        ALTER TABLE "call_telemetries" ADD CONSTRAINT "call_telemetries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
