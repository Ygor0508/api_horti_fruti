-- AlterTable
ALTER TABLE "feirantes" ADD COLUMN     "adminId" VARCHAR(36);

-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "adminId" VARCHAR(36);

-- CreateTable
CREATE TABLE "admins" (
    "id" VARCHAR(36) NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "email" VARCHAR(40) NOT NULL,
    "senha" VARCHAR(60) NOT NULL,
    "nivel" SMALLINT NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "feirantes" ADD CONSTRAINT "feirantes_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
