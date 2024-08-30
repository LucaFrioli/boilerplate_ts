import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import configs from '../configs/configServer';
import cors from 'cors';
import router from './routes';

const app = express();
const port: number = 3000;

const allowedOrigens: string[] | string =
    process.env.PRODUCTION === 'y'
        ? configs.allowedOrigensList
        : 'http://localhost:5173';

app.use(
    cors({
        origin: [...allowedOrigens],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    })
);
app.use(router);


app.listen(port, () => {
    console.log(
        `Servidor iniciado com sucesso na porta ${port}
		\nPorgentileza acesse http://localhost:${port}`
    );
});
