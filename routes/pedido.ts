import { PrismaClient, Status } from "@prisma/client"
import { Router } from "express"
import { z } from "zod"
import nodemailer from "nodemailer"

const prisma = new PrismaClient()
const router = Router()

// Validação de criação de pedido
const pedidoSchema = z.object({
  quantidade: z.number().min(1),
  status: z.nativeEnum(Status),
  mercadoria_id: z.number(),
  usuario_id: z.string(),
})

// Validação para o corpo da requisição de finalizar pedido
const finalizarPedidoSchema = z.object({
  usuario_id: z.string(),
  // Esperamos um array de itens que vêm do carrinho
  itens: z.array(z.object({
    id: z.number(), // ID do item no carrinho (para podermos deletá-lo)
    
    // --- CORREÇÃO AQUI ---
    // Usamos z.coerce.number() para converter a quantidade (que pode vir como string) para número.
    quantidade: z.coerce.number(), 
    
    mercadoria: z.object({
      id: z.number() // ID da mercadoria
    })
  }))
});

// POST /pedido/finalizar — Rota transacional para criar o pedido e limpar o carrinho
router.post("/finalizar", async (req, res) => {
  const valida = finalizarPedidoSchema.safeParse(req.body);
  if (!valida.success) {
    // Adiciona mais detalhes ao erro para facilitar o debug
    return res.status(400).json({ erro: "Dados inválidos", detalhes: valida.error.flatten() });
  }

  const { usuario_id, itens } = valida.data;

  try {
    // Usamos uma transação do Prisma para garantir que ambas as operações ocorram com sucesso
    const resultado = await prisma.$transaction(async (tx) => {
      
      // 1. Mapeia os itens do carrinho para o formato que a tabela 'Pedido' espera
      const dadosParaCriarPedidos = itens.map(item => ({
        quantidade: item.quantidade, // A quantidade já foi convertida pelo Zod
        status: Status.PENDENTE, // Define um status inicial padrão
        mercadoria_id: item.mercadoria.id,
        usuario_id: usuario_id,
      }));

      // 2. Cria todos os registros de pedido de uma só vez (muito eficiente)
      const novosPedidos = await tx.pedido.createMany({
        data: dadosParaCriarPedidos,
      });

      // 3. Pega os IDs dos itens do carrinho que foram transformados em pedido
      const idsDosItensDoCarrinhoParaRemover = itens.map(item => item.id);

      // 4. Remove esses itens do carrinho
      const itensRemovidos = await tx.carrinho.deleteMany({
        where: {
          id: {
            in: idsDosItensDoCarrinhoParaRemover,
          },
        },
      });

      return { novosPedidos, itensRemovidos };
    });

    res.status(201).json({ mensagem: "Pedido finalizado com sucesso!", ...resultado });

  } catch (error) {
    res.status(500).json({ erro: "Ocorreu um erro ao finalizar o pedido.", detalhes: error });
  }
});

// GET /pedido/ — listar todos os pedidos
router.get("/", async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      include: { usuario: true, mercadoria: true },
      orderBy: { id: 'desc' }
    })
    res.status(200).json(pedidos)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

// POST /pedido/ — criar novo pedido
router.post("/", async (req, res) => {
  const valida = pedidoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }
  try {
    const pedido = await prisma.pedido.create({
      data: valida.data
    })
    res.status(201).json(pedido)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

// Função de envio de e-mail para atualização de status do pedido
async function enviaEmailPedido(
  nome: string,
  email: string,
  mercadoria: string,
  status: string
) {
  const transporter = nodemailer.createTransport({
    // host: "sandbox.smtp.mailtrap.io",
    // port: 587,
    // secure: false,
    // auth: {
    //   user: "968f0dd8cc78d9",
    //   pass: "89ed8bfbf9b7f9"
    // }
    host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
  })

  const info = await transporter.sendMail({
    // from: 'no-reply@seusistema.com',
    from: process.env.SMTP_FROM,
    to: email,
    subject: `Atualização do seu pedido: ${mercadoria}`,
    text: `Olá ${nome},\n\nSeu pedido da mercadoria "${mercadoria}" agora está com status: ${status}.`,
    html: `
      <h3>Olá, ${nome}</h3>
      <p>Sua mercadoria: <strong>${mercadoria}</strong></p>
      <p>Status do pedido: <strong>${status}</strong></p>
      <p>Obrigado por comprar conosco!</p>
    `
  })

  console.log("E-mail enviado: %s", info.messageId)
}

//rota de alteração patch
const updatePedidoSchema = z.object({
  quantidade: z.coerce.number().min(1).optional(), // Usamos coerce para converter string para número
  status: z.nativeEnum(Status).optional(),
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;

  // 1. Valida o corpo da requisição com o novo schema
  const result = updatePedidoSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ erro: "Dados inválidos", detalhes: result.error.flatten() });
  }

  const { quantidade, status } = result.data;

  // 2. Verifica se pelo menos um campo foi enviado para atualização
  if (!quantidade && !status) {
    return res.status(400).json({ erro: "Nenhum campo para atualizar foi fornecido." });
  }
  
  try {
    // 3. Atualiza o pedido no banco de dados
    const pedidoAtualizado = await prisma.pedido.update({
      where: { id: Number(id) },
      // O 'data' agora contém os campos que foram validados.
      // O Prisma ignora campos que são 'undefined', então só o que for enviado será atualizado.
      data: {
        quantidade,
        status,
      },
      // Inclui os dados para o e-mail
      include: {
        usuario: true,
        mercadoria: true,
      }
    });

    // 4. Envia o e-mail apenas se o status tiver sido alterado
    if (status && pedidoAtualizado) {
      await enviaEmailPedido(
        pedidoAtualizado.usuario.nome as string,
        pedidoAtualizado.usuario.email as string,
        pedidoAtualizado.mercadoria.nome as string,
        status
      );
    }

    res.status(200).json(pedidoAtualizado);

  } catch (error) {
    res.status(500).json({ erro: "Ocorreu um erro ao atualizar o pedido.", detalhes: error });
  }
});

// PATCH /pedido/:id — atualizar status e/ou motoboy, e enviar e-mail
// router.patch("/:id", async (req, res) => {
//   const { id } = req.params
//   const { status, quantidade } = req.body // Removido motoboy_id que não estava sendo usado
  

//   if (!status) {
//     return res.status(400).json({ erro: "Informe o novo status do pedido" })
//   }

//   try {
//     // Atualiza o pedido
//     const pedido = await prisma.pedido.update({
//       where: { id: Number(id) },
//       data: {
//         quantidade,
//         status
//       }
//     })

//     // Busca dados para envio de e-mail
//     const dados = await prisma.pedido.findUnique({
//       where: { id: Number(id) },
//       include: {
//         usuario: true,
//         mercadoria: true
//       }
//     })

//     if (dados) {
//       await enviaEmailPedido(
//         dados.usuario.nome as string,
//         dados.usuario.email as string,
//         dados.mercadoria.nome as string,
//         status
//       )
//     }

//     res.status(200).json(pedido)
//   } catch (error) {
//     res.status(400).json({ erro: error })
//   }
// })

// GET /pedido/:usuarioId — pedidos de um usuario
router.get("/:usuario_id", async (req, res) => {
  const { usuario_id } = req.params
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { usuario_id: String(usuario_id) },
      include: { mercadoria: true }
    })
    res.status(200).json(pedidos)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

// DELETE /pedido/:id — remover pedido
router.delete("/:id", async (req, res) => {
  const { id } = req.params
  try {
    const pedido = await prisma.pedido.delete({
      where: { id: Number(id) }
    })
    res.status(200).json(pedido)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

export default router
