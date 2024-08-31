import configs from '../../configs/configServer';

/**
 * Configuração para endereços permitidos no acesso da API;
 * @param {boolean} isProduction
 * @returns {string | string[]}
 */
function configureCors(isProduction: boolean): string | string[] {
    const allowedOrigens: string[] | string = isProduction
        ? configs.allowedOrigensList
        : 'http://localhost:5173';

    return allowedOrigens;
}

export default configureCors;
