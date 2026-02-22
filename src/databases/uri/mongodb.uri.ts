import { logger } from '@Configs/logger.js';
import { env } from '@Configs/env.js';

class MongoConnectionString {
    private _uri: string = '';
    private password: string = '';
    private _fine_settings: string = 'retryWrites=true&w=majority&authSource=admin'
    private mongoConnectionstringLogger = logger.child({ module: 'mongodb', fileType: 'uri' })

    constructor() {
        this.initilize();
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

    private initilize() {
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

    private prodFormation(): void {
        const { DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD, NODE_ENV } = env;

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

export const mongoURI = new MongoConnectionString().uri;