import express from 'express'
import cors from 'cors'
import routesMercadorias from './routes/mercadorias'
import routesFotos from './routes/fotos'
import routesFeirantes from "./routes/feirantes"
import routesUsuarios from "./routes/usuarios"
// import routesConsumidores from "./routes/consumidores"
// import routesMotoboys from "./routes/Motoboys"
import routesLogin from "./routes/login"
import routesPedido from "./routes/pedido"
import routesAdmins from './routes/admins'
import routesLoginAdmin from './routes/adminLogin'
import routesCarrinho from './routes/carrinho'
import routesDashboard from './routes/dashboard'
// import routesDashboard from './routes/dashboard'


const app = express()
const port = 3001

app.use(express.json())
app.use(cors())

app.use("/feirantes", routesFeirantes)
app.use("/mercadorias", routesMercadorias)
app.use("/usuarios", routesUsuarios)
app.use("/fotos", routesFotos)
// app.use("/consumidores", routesConsumidores)
// app.use("/motoboys", routesMotoboys)
app.use("/login", routesLogin)
app.use("/pedido", routesPedido)
app.use("/admins", routesAdmins)
app.use("/admins/login", routesLoginAdmin)
app.use("/carrinho", routesCarrinho)
app.use("/dashboard", routesDashboard)


app.get('/', (req, res) => {
  res.send('API: Venda de Hortifrutis')
})

app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`)
})