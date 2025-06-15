-- AlterTable
ALTER TABLE "CompiledDocument" ADD COLUMN     "sourceFileBlobPathname" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "originalUserFileName" TEXT;
