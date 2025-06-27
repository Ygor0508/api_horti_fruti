import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import bcrypt from 'bcrypt'
import { z } from 'zod'
// import { verificaToken } from '../middlewares/verificaToken'
// import { verificaNivel } from '../middlewares/verificaNivel'

const prisma = new PrismaClient()
const router = Router()

const usuarioSchema = z.object({
  // id: z.string(),
  nome: z.string(),
  email: z.string(),
  senha: z.string(),
  nivel: z.number()
})

router.get("/", async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany()
    res.status(200).json(usuarios)
  } catch (error) {
    res.status(400).json(error)
  }
})

function validaSenha(senha: string) {

  const mensa: string[] = []

 
  if (senha.length < 8) {
    mensa.push("Erro... senha deve possuir, no mínimo, 8 caracteres")
  }

  // contadores
  let pequenas = 0
  let grandes = 0
  let numeros = 0
  let simbolos = 0

 
  for (const letra of senha) {
   
    if ((/[a-z]/).test(letra)) {
      pequenas++
    }
    else if ((/[A-Z]/).test(letra)) {
      grandes++
    }
    else if ((/[0-9]/).test(letra)) {
      numeros++
    } else {
      simbolos++
    }
  }

  if (pequenas == 0) {
    mensa.push("Erro... senha deve possuir letra(s) minúscula(s)")
  }

  if (grandes == 0) {
    mensa.push("Erro... senha deve possuir letra(s) maiúscula(s)")
  }

  if (numeros == 0) {
    mensa.push("Erro... senha deve possuir número(s)")
  }

  if (simbolos == 0) {
    mensa.push("Erro... senha deve possuir símbolo(s)")
  }

  return mensa
}

// router.post("/", verificaToken, verificaNivel(3), async (req, res) => {
router.post("/", async (req, res) => {

  const valida = usuarioSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }
  

  const erros = validaSenha(valida.data.senha)
  if (erros.length > 0) {
    res.status(400).json({ erro: erros.join("; ") })
    return
  }

  const salt = bcrypt.genSaltSync(12)
 
  const hash = bcrypt.hashSync(valida.data.senha, salt)

  try {
    const usuario = await prisma.usuario.create({
      data: { ...valida.data, senha: hash }
    })
    res.status(201).json(usuario)
  } catch (error) {
    res.status(400).json({ mensagem: 'E-mail já cadastrado.' })
  }
})

// router.patch("/alterar-senha/:id", verificaToken, async (req, res) => {
router.patch("/alterar-senha/:id", async (req, res) => {
  const { id } = req.params;
  const { senha, senhaNova } = req.body;

  const userId = id;
  if (userId != "") {
    return res.status(400).json({ erro: "ID inválido" });
  }

  const erros = validaSenha(senhaNova);
  if (erros.length > 0) {
    return res.status(400).json({ erro: erros.join("; ") });
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    const senhaValida = bcrypt.compareSync(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(400).json({ erro: "Senha antiga incorreta" });
    }

    const salt = bcrypt.genSaltSync(12);
    const hash = bcrypt.hashSync(senhaNova, salt);

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: userId },
      data: { senha: hash },
    });

    res.status(200).json(usuarioAtualizado);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Erro ao alterar senha:", error.message);
      res.status(400).json({ erro: "Erro ao processar a solicitação", detalhes: error.message });
    } else {
      console.error("Erro desconhecido:", error);
      res.status(400).json({ erro: "Erro desconhecido ao processar a solicitação" });
    }
  }
});
export default router