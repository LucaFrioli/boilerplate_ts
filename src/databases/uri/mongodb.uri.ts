import { createChildLogger } from '@Configs/logger.js';
import { env } from '@Configs/env.js';

class MongoConnectionString {
    private _uri: string = '';
    // caso não tenha senha se mantém, porém se foi criada uma senha a URI é definida de froma autônoma para uma normalização de URIEncode
    private password: string = '';
    private _fine_settings: string = 'retryWrites=true&w=majority&authSource=admin'
    private mongoConnectionstringLogger = createChildLogger({ module: 'mongodb', fileType: 'uri', service: 'database' })

    constructor() {
        this.initialize();
    }

    public get uri(): string {
        return this._uri;
    }

    private maskUri(uri: string): string {
        // Regex que encontra ':senha@' e substitui por ':******@'
        return uri.replace(/:([^:@]+)@/, ':******@');
    }

    private normalizePassword(password: string): string {
        return encodeURIComponent(password);
    }

    /**
     * initilize
     * Esta função é responsável por validar algumas informações vindas do env,
     * após a validação da sinformações e se houver senha no banco de dados ela 
     * normaliza a senha para poder se encaixar 
     * em uma URI válida independente do uso de carcteres especiais
     * @throws {Error} - caso o DATABSE_TYPE não seja mongodb
    */
    private initialize() {
        const { DATABASE_TYPE, DATABASE_PASSWORD } = env

        if (DATABASE_TYPE !== 'mongodb') {
            this.mongoConnectionstringLogger.fatal({ databaseType: DATABASE_TYPE }, "Tentativa de formação MongoURI porém DATABASE_TYPE é incompatível");
            throw new Error(`FATAL ERROR tetativa de fromação de URI Mongo porém env configurda como ${DATABASE_TYPE}`);
        }

        if (DATABASE_PASSWORD) {
            this.password = this.normalizePassword(DATABASE_PASSWORD)
        }

        this.generateUri();
    }

    /**
     * **genreateUri** 
     * 
     * Método dedicado a definir como a uri deve ser foca principalmente na de desenvolvimento, 
     * caso o app não esteja em modeo de desenvolvimento faz a chamda para a criação de URI em prod pelo método específico
     * o processo de formatação é o seguinte verifica usuário senha, junta na formatação correta para 
     * mongo via a constante `auth`, e forma uma conexão `mongodb://`
    */
    private generateUri(): void {
        const {
            DATABASE_HOST, DATABASE_PORT,
            DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD, NODE_ENV
        } = env;



        const auth = DATABASE_USERNAME && DATABASE_PASSWORD
            ? `${DATABASE_USERNAME}:${this.password}@`
            : "";

        if (NODE_ENV === "development") {
            this._uri = `mongodb://${auth}${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}?retryWrites=true&authSource=admin`;

            this.mongoConnectionstringLogger.debug({
                host: DATABASE_HOST,
                port: DATABASE_PORT,
                uri: this.maskUri(this._uri),
            }, "URI do Banco De Dados para Desenvolvimento gerada");
            return;
        }

        this.prodFormation();
    }

    /**
     * **prodFromation**
     * 
     * Este método permite verificar em que tipo de modalidade o mongo está definido podendo formar de demais maneira uris 
     * para mongo em server via o próprio mongo multihost ou mongo local em prod
     * 
     * **Suporta protocolos SRV (Atlas), Multi-host (Replica Sets) e instâncias únicas.**
    */
    private prodFormation(): void {
        const { DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USERNAME } = env;

        const auth = `${DATABASE_USERNAME}:${this.password}@`;
        const isSRV = DATABASE_HOST.includes('.mongodb.net');
        const hasMultipleHosts = DATABASE_HOST.includes(',');

        if (isSRV) {
            this._uri = `mongodb+srv://${auth}${DATABASE_HOST}/${DATABASE_NAME}?${this._fine_settings}`;
            this.mongoConnectionstringLogger.info({
                host: DATABASE_HOST,
                port: DATABASE_PORT,
                modality: 'srv',
                uri: this.maskUri(this._uri),
            }, "URI do Banco De Dados para Produção gerada");
            return;
        }

        if (hasMultipleHosts) {
            this._uri = `mongodb://${auth}${DATABASE_HOST}/${DATABASE_NAME}?${this._fine_settings}`;
            this.mongoConnectionstringLogger.info({
                host: DATABASE_HOST,
                port: DATABASE_PORT,
                modality: 'Multi-hosted',
                uri: this.maskUri(this._uri),
            }, "URI do Banco De Dados para Produção gerada");
            return;
        }

        this._uri = `mongodb://${auth}${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}?${this._fine_settings}`;
        this.mongoConnectionstringLogger.info({
            host: DATABASE_HOST,
            port: DATABASE_PORT,
            modality: 'Single-hosted',
            uri: this.maskUri(this._uri),
        }, "URI do Banco De Dados para Produção gerada");
        return;

    }
}

/**
 * Modulo retorna a URI já fromatada e validada seja ela feita para rodar em produção ou desenvolvimento
*/
export const mongoURI = new MongoConnectionString().uri;