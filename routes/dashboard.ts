import { PrismaClient } from "@prisma/client"
import { Router } from "express"

const prisma = new PrismaClient()
const router = Router()

router.get("/gerais", async (req, res) => {
  try {
    const usuarios = await prisma.usuario.count()
    const feirantes = await prisma.feirante.count()
    const pedidos = await prisma.pedido.count()
    res.status(200).json({ usuarios, feirantes, pedidos })
  } catch (error) {
    res.status(400).json(error)
  }
})

// clientes = usuarios
// carro = feirante
// proposta = pedido
// marca = mercadoria
// cidade = endereco

// Rota de feirantes por mercadoria
router.get("/feirantesMercadoria", async (req, res) => {
    try {
    
        const mercadoriasAgrupadas = await prisma.mercadoria.groupBy({
        by: ['nome'],        
        _count: {
            _all: true,       
        },
        orderBy: {          
            _count: {
            nome: 'desc'
            }
        }
        })

        
        const resultadoFormatado = mercadoriasAgrupadas.map(item => ({
        mercadoria: item.nome,
                num: item._count._all 
            }))
        res.status(200).json(resultadoFormatado)
        } catch (error) {
        res.status(400).json(error)
        }
    })


router.get("/usuarioEndereco", async (req, res) => {
  try {
    const usuarios = await prisma.usuario.groupBy({
      by: ['endereco'],
      _count: {
        endereco: true,
      },
    })

    const usuarios2 = usuarios.map(usuario => ({
      endereco: usuario.endereco,
      num: usuario._count.endereco
    }))

    res.status(200).json(usuarios2)
  } catch (error) {
    res.status(400).json(error)
  }
})

export default router
