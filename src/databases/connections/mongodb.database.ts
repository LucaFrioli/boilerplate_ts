import { logger } from '@/configs/logger.js';
import { env } from '@Configs/env.js';

class MongoConnectionString {
    private _uri: string = '';
    private _fine_settings:string = 'retryWrites=true&w=majority&authSource=admin'

    constructor() {
        this.generateUri();
    }

    public get uri(): string {
        return this._uri;
    }

    private generateUri(): void {
        const {
            DATABASE_TYPE, DATABASE_HOST, DATABASE_PORT,
            DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD, NODE_ENV
        } = env;

        if (DATABASE_TYPE !== 'mongodb') {
            logger.fatal({ databaseType: DATABASE_TYPE }, "Tentativa de formação MongoURI porém DATABASE_TYPE é incompatível");
            throw new Error(`FATAL ERROR tetativa de fromação de URI Mongo porém env configurda como ${DATABASE_TYPE}`);
        }

        const auth = DATABASE_USERNAME && DATABASE_PASSWORD
            ? `${DATABASE_USERNAME}:${DATABASE_PASSWORD}@`
            : "";

        if (NODE_ENV === "development") {
            this._uri = `mongodb://${auth}${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}?retryWrites=true`;

            logger.debug({
                host: DATABASE_HOST,
                port: DATABASE_PORT,
                uri: this._uri.replace(DATABASE_PASSWORD ?? '', '******'),
            }, "URI do Banco De Dados para Desenvolvimento gerada");
            return;
        } 

        this.prodFormation();
    }

    private prodFormation(): void {
        const { DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD, NODE_ENV } = env;

        const auth = `${DATABASE_USERNAME}:${DATABASE_PASSWORD}@`;
        const isSRV = DATABASE_HOST.includes('.mongodb.net');
        const hasMultipleHosts = DATABASE_HOST.includes(',');

        if (isSRV) {
            this._uri = `mongodb+srv://${auth}${DATABASE_HOST}/${DATABASE_NAME}?${this._fine_settings}`;
            logger.info({
                host: DATABASE_HOST,
                port: DATABASE_PORT,
                modality:'srv',
                uri: this._uri.replace(DATABASE_PASSWORD ?? '', '******'), 
            }, "URI do Banco De Dados para Produção gerada");
            return;
        } 
        
        if (hasMultipleHosts) {
            this._uri = `mongodb://${auth}${DATABASE_HOST}/${DATABASE_NAME}?${this._fine_settings}`;
            logger.info({
                host: DATABASE_HOST,
                port: DATABASE_PORT,
                modality:'Multi-hosted',
                uri: this._uri.replace(DATABASE_PASSWORD ?? '', '******'), 
            }, "URI do Banco De Dados para Produção gerada");
            return;
        } 
        
        this._uri = `mongodb://${auth}${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}?${this._fine_settings}`;
        logger.info({
            host: DATABASE_HOST,
            port: DATABASE_PORT,
            modality: 'Single-hosted',
            uri: this._uri.replace(DATABASE_PASSWORD ?? '', '******'), 
        }, "URI do Banco De Dados para Produção gerada");
        return;
        
    }
}

export const mongoURI = new MongoConnectionString().uri;