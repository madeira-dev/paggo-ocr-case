-- CreateTable
CREATE TABLE "CompiledDocument" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "sourceMessageId" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "extractedOcrText" TEXT NOT NULL,
    "chatHistoryJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompiledDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompiledDocument_chatId_key" ON "CompiledDocument"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "CompiledDocument_sourceMessageId_key" ON "CompiledDocument"("sourceMessageId");

-- AddForeignKey
ALTER TABLE "CompiledDocument" ADD CONSTRAINT "CompiledDocument_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompiledDocument" ADD CONSTRAINT "CompiledDocument_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
