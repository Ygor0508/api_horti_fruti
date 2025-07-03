import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

const prisma = new PrismaClient();
const router = Router();

// Validação com Zod
const carrinhoSchema = z.object({
  quantidade: z.coerce.number().min(0.01, "Quantidade mínima é 0.01"),
  mercadoria_id: z.number(),
  usuario_id: z.string().uuid(), // UUID v4 para consistência com seu schema
});

// GET /carrinho — listar todos os itens no carrinho
router.get("/", async (req, res) => {
  try {
    const itens = await prisma.carrinho.findMany({
      include: { usuario: true, mercadoria: true },
      orderBy: { id: 'desc' },
    });
    res.status(200).json(itens);
  } catch (error) {
    res.status(400).json({ erro: error });
  }
});

// POST /carrinho — adicionar item ao carrinho
router.post("/", async (req, res) => {
  const valida = carrinhoSchema.safeParse(req.body);
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error.format() });
  }

  try {
    const carrinho = await prisma.carrinho.create({
      data: valida.data,
    });
    res.status(201).json(carrinho);
  } catch (error) {
    res.status(400).json({ erro: error });
  }
});

// PATCH /carrinho/:id — atualizar quantidade do item
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { quantidade } = req.body;

  if (!quantidade || Number(quantidade) <= 0) {
    return res.status(400).json({ erro: "Informe uma quantidade válida (> 0)" });
  }

  try {
    const itemAtualizado = await prisma.carrinho.update({
      where: { id: Number(id) },
      data: { quantidade },
    });
    res.status(200).json(itemAtualizado);
  } catch (error) {
    res.status(400).json({ erro: error });
  }
});

// GET /carrinho/:usuario_id — listar itens do carrinho por usuário
router.get("/:usuario_id", async (req, res) => {
  const { usuario_id } = req.params;

  try {
    const itens = await prisma.carrinho.findMany({
      where: { usuario_id },
      include: { mercadoria: true },
    });
    res.status(200).json(itens);
  } catch (error) {
    res.status(400).json({ erro: error });
  }
});

// DELETE /carrinho/:id — remover item do carrinho
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const item = await prisma.carrinho.delete({
      where: { id: Number(id) },
    });
    res.status(200).json(item);
  } catch (error) {
    res.status(400).json({ erro: error });
  }
});

export default router;
