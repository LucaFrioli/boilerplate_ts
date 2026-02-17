import { env } from '@Configs/env.js'
import app from './app.js'
import { logger } from './configs/logger.js';


try {
    app.listen(env.PORT, () => {
        console.log(`Servidor ativo e rodando na porta ${env.PORT}`);
        console.log(`Acesse o link a seguir: http://localhost:${env.PORT}`);
        logger.info('Servidor iniciado com sucesso!');
    })

} catch (e) {
    logger.fatal('‼️ Erro ao inciar o servidor ' + e);
    process.exit(1);
}