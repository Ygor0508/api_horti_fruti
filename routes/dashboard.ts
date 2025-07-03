import { PrismaClient } from "@prisma/client";
import { Router } from "express";

const prisma = new PrismaClient();
const router = Router();

// Rota 1: Estatísticas Gerais
// URL: /dashboard/stats
router.get("/stats", async (req, res) => {
  try {
    const totalUsuarios = await prisma.usuario.count();
    const totalFeirantes = await prisma.feirante.count();
    const totalPedidos = await prisma.pedido.count();
    
    res.status(200).json({ totalUsuarios, totalFeirantes, totalPedidos });
  } catch (error) {
    res.status(400).json(error);
  }
});

// Rota 2: Contagem de Mercadorias por Categoria
// URL: /dashboard/mercadorias-por-categoria
router.get("/mercadorias-por-categoria", async (req, res) => {
  try {
    const mercadoriasAgrupadas = await prisma.mercadoria.groupBy({
      by: ['categoria'],
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    const resultadoFormatado = mercadoriasAgrupadas.map(item => ({
      categoria: item.categoria,
      quantidade: item._count._all
    }));

    res.status(200).json(resultadoFormatado);
  } catch (error) {
    res.status(400).json(error);
  }
});


// Rota 3: Contagem de Usuários por Bairro (CORRIGIDA)
// URL: /dashboard/usuarios-por-bairro
router.get("/usuarios-por-bairro", async (req, res) => {
  try {
    // 1. Busca todos os usuários para garantir que nenhum seja perdido
    const todosUsuarios = await prisma.usuario.findMany({
      select: {
        bairro: true
      }
    });

    // 2. Agrupa os bairros manualmente no código
    const contagemPorBairro: { [key: string]: number } = {};

    todosUsuarios.forEach(usuario => {
      // Se o bairro for nulo, vazio ou indefinido, agrupa como "Não Informado"
      const bairro = usuario.bairro || "Não Informado";
      if (contagemPorBairro[bairro]) {
        contagemPorBairro[bairro]++;
      } else {
        contagemPorBairro[bairro] = 1;
      }
    });

    // 3. Formata o resultado para o formato que o frontend espera
    const resultadoFormatado = Object.keys(contagemPorBairro).map(bairro => ({
      bairro: bairro,
      quantidade: contagemPorBairro[bairro]
    }));

    res.status(200).json(resultadoFormatado);
  } catch (error) {
    res.status(400).json(error);
  }
});

export default router;
