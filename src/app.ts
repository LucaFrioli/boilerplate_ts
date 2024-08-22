import express from 'express';
import router from './routes';

const app = express();
const port: number = 3000;

app.use(router);

app.listen(port, () => {
	console.log(
		`Servidor iniciado com sucesso na porta ${port}
		\nPorgentileza acesse http://localhost:${port}`
	);
});
