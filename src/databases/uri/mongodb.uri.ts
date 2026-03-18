import { type DatabaseURI, isDatabaseUri } from '@Types/security.types.js';
import { BaseUri, type EnvDataForUri } from './contracts/BaseUri.contract.js';

class MongoConnectionString extends BaseUri {
	protected uriGeneratorName: string = 'MongoConnectionString';
	protected _uri?: DatabaseURI;
	protected _password?: string;
	protected _specificEnvValues?: Record<string, unknown>;
	private _fine_settings: string = 'retryWrites=true&w=majority&authSource=admin';
	private auth: string = '';

	protected validateSpecificEnvValues(): void {
		throw new Error('Method not implemented.');
	}
	protected guardBroken(): void {
		if (!this._baseEnvValues) {
			this.handlerErrors({
				erroLevel: 'fatal',
				message:
					'Algo deu errado ao instânciar as variaveis de ambinente para o gerador de URI',
				error: {
					rawValue: this._baseEnvValues,
				},
			});
		}

		if (this._baseEnvValues.DATABASE_TYPE !== 'mongodb') {
			this.handlerErrors({
				erroLevel: 'fatal',
				error: {
					databaseType: this._baseEnvValues.DATABASE_TYPE,
					specify: 'Tentativa de formação MongoURI porém DATABASE_TYPE é incompatível',
				},
				message: `FATAL ERROR tetativa de fromação de URI Mongo porém env configurda como ${this._baseEnvValues.DATABASE_TYPE}`,
			});
		}

		if (this._baseEnvValues.DATABASE_PASSWORD && this._baseEnvValues.DATABASE_USERNAME) {
			this.normalizePassword(this._baseEnvValues.DATABASE_PASSWORD);
			this.generateAuth(this._baseEnvValues);
		}
	}
	protected maskUriToLog(unmaskUri: string): string {
		return unmaskUri.replace(/:([^:@]+)@/, ':*********@');
	}

	private generateAuth(validatedEnvValues: EnvDataForUri): void {
		if(validatedEnvValues.NODE_ENV !== 'development' && typeof validatedEnvValues.DATABASE_USERNAME !== 'string' && typeof validatedEnvValues.DATABASE_PASSWORD !== 'string'){
			this.handlerErrors({
				erroLevel: 'fatal',
				message: 'Em produção adicione as credências, válidas no arquivo .env',
				error:{
					typeofUserName: typeof validatedEnvValues.DATABASE_USERNAME,
					typeofPassword: typeof validatedEnvValues.DATABASE_PASSWORD,
				}
			})
		}


		this.auth = validatedEnvValues.DATABASE_USERNAME && validatedEnvValues.DATABASE_PASSWORD && this._password ? `${validatedEnvValues.DATABASE_USERNAME}:${this._password}@` : '';
	}

	protected generateUriToDev(validatedEnvValues: EnvDataForUri): DatabaseURI {
		const formatedUrl = `mongodb://${this.auth}${validatedEnvValues.DATABASE_HOST}:${String(validatedEnvValues.DATABASE_PORT)}?retryWrites=true&authSource=admin`;

		if (!isDatabaseUri(formatedUrl)) {
			this.handlerErrors({
				erroLevel: 'fatal',
				error: {
					rawValue: this.maskUriToLog(formatedUrl),
					typeofValue: typeof formatedUrl,
					guardResult: isDatabaseUri(formatedUrl)
				},
				message: 'Erro ao validar como uma url válida para banco de dados'
			});
		}

		this.logInfo('String de conexão ccom o banco de dados formada',{
			connectionString: this.maskUriToLog(formatedUrl)
		});

		return formatedUrl
	}
	protected generateUriToProd(validatedEnvValues: EnvDataForUri): DatabaseURI {
		throw new Error('Method not implemented.');
	}
}

/**
 * Modulo retorna a URI já fromatada e validada seja ela feita para rodar em produção ou desenvolvimento
 */
export const mongoURI = new MongoConnectionString().uri;
