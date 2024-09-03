// dependencias de bibliotecas
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';

// dependencias dentro de arquivos
import router from './routes';
import configureCors from './utils/corsConfiguration';

// averiguando se é produção
const production: string | undefined = process.env.PRODUCTION?.toLowerCase();
const isProduction: boolean = production === 'y' || production === 'yes';

// configurando variaveis
const app = express();
const port: number = isProduction ? Number(process.env.PORT) : 3000;
const allowedOrigens: string | string[] = configureCors(isProduction);

// definindo middlewares
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
