import { env } from '@Configs/env.js'
import { logger } from '@Configs/logger.js';
import app from './app.js'


try {
    app.listen(env.PORT, () => {
        console.log(`Servidor ativo e rodando na porta ${env.PORT}`);
        console.log(`Acesse o link a seguir: http://localhost:${env.PORT}`);
        logger.info(`Servidor iniciado com sucesso na porta ${env.PORT} !`);
    })

} catch (e) {
    logger.fatal('‼️ Erro ao inciar o servidor ' + e);
    process.exit(1);
}