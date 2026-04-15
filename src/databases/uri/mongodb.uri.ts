import { type DatabaseURI, isDatabaseUri } from '@Types/security.types.js';
import { BaseUri, type EnvDataForUri } from './contracts/BaseUri.contract.js';
import { acceptedMongoSrvDomains } from '@Configs/constants/env.constants.js';

export class MongoConnectionString extends BaseUri {
	protected get uriGeneratorName(): string {
		return 'MongoConnectionString';
	}
	protected get _fine_settings(): string {
		return 'retryWrites=true&w=majority&authSource=admin';
	}
	private auth!: string;

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
				method: 'guardBroken',
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
				method: 'guardBroken',
			});
		}

		if (this._baseEnvValues.DATABASE_PASSWORD && this._baseEnvValues.DATABASE_USERNAME) {
			this.normalizePassword(this._baseEnvValues.DATABASE_PASSWORD);
			this.generateAuth(this._baseEnvValues);
		}
	}
	protected maskUriToLog(unmaskUri: string): string {
		// por momento em prol da entrga ficará como dívida técnica a necessidade de realizar um braker ou algo do genero aqui, por momento iremos retornar uma string vazia
		if (!unmaskUri) return '';
		return unmaskUri.replace(/:([^:@]+)@/, ':*********@');
	}

	private generateAuth(validatedEnvValues: EnvDataForUri): void {
		if (
			validatedEnvValues.NODE_ENV !== 'development' &&
			typeof validatedEnvValues.DATABASE_USERNAME !== 'string' &&
			typeof validatedEnvValues.DATABASE_PASSWORD !== 'string'
		) {
			this.handlerErrors({
				erroLevel: 'fatal',
				message: 'Em produção adicione as credências, válidas no arquivo .env',
				error: {
					typeofUserName: typeof validatedEnvValues.DATABASE_USERNAME,
					typeofPassword: typeof validatedEnvValues.DATABASE_PASSWORD,
				},
				method: 'generateAuth',
			});
		}

		this.auth =
			validatedEnvValues.DATABASE_USERNAME &&
			validatedEnvValues.DATABASE_PASSWORD &&
			this._password
				? `${validatedEnvValues.DATABASE_USERNAME}:${this._password}@`
				: '';
	}

	protected generateUriToDev(validatedEnvValues: EnvDataForUri): DatabaseURI {
		const formatedUrl = `mongodb://${this.auth}${validatedEnvValues.DATABASE_HOST}:${String(validatedEnvValues.DATABASE_PORT)}?retryWrites=true&authSource=admin`;

		if (!isDatabaseUri(formatedUrl)) {
			this.handlerErrors({
				erroLevel: 'fatal',
				error: {
					rawValue: this.maskUriToLog(formatedUrl),
					typeofValue: typeof formatedUrl,
					guardResult: isDatabaseUri(formatedUrl),
				},
				message: 'Erro ao validar como uma url válida para banco de dados',
				method: 'generateUriToDev',
			});
		}

		this.logInfo('String de conexão ccom o banco de dados mongodb formada', {
			connectionString: this.maskUriToLog(formatedUrl),
		});

		return formatedUrl;
	}
	protected generateUriToProd(validatedEnvValues: EnvDataForUri): DatabaseURI {
		const authIsString = typeof this.auth === 'string';
		if (this.auth === '' || !authIsString)
			this.handlerErrors({
				erroLevel: 'fatal',
				error: {
					rawAuth: this.maskUriToLog(this.auth),
					authLength: !authIsString
						? 'Não foi possível verificar tamnaho pois auth não é string'
						: this.auth.length,
					typeof: typeof this.auth,
				},
				message:
					'Falha ao gerar autenticação para a URI, verifique a env, ou lógic aplicada',
				method: 'generateUriToProd',
			});

		const isSRV: boolean = acceptedMongoSrvDomains.some((domain) =>
			validatedEnvValues.DATABASE_HOST.includes(domain),
		);

		const hasMultipleHosts: boolean = validatedEnvValues.DATABASE_HOST.includes(',');

		if (isSRV) {
			const formatedUri = `mongodb+srv://${this.auth}${validatedEnvValues.DATABASE_HOST}/${validatedEnvValues.DATABASE_NAME}?${this._fine_settings}`;

			if (!isDatabaseUri(formatedUri)) {
				this.handlerErrors({
					erroLevel: 'fatal',
					error: {
						rawValue: this.maskUriToLog(formatedUri),
						typeofValue: typeof formatedUri,
						guardResult: !isDatabaseUri(formatedUri),
						modality: '+srv',
					},
					message: 'Erro ao criar connection string para Mongodb em modalidade srv',
					method: 'generateUriToProd',
				});
			}

			this.logInfo('String de conexão para mongodb formada com sucesso', {
				connectionString: this.maskUriToLog(formatedUri),
				modality: '+srv',
			});
			return formatedUri;
		}

		if (hasMultipleHosts) {
			const formatedUri = `mongodb://${this.auth}${validatedEnvValues.DATABASE_HOST}/${validatedEnvValues.DATABASE_NAME}?${this._fine_settings}`;

			if (!isDatabaseUri(formatedUri)) {
				this.handlerErrors({
					erroLevel: 'fatal',
					error: {
						rawValue: this.maskUriToLog(formatedUri),
						typeofValue: typeof formatedUri,
						guardResult: !isDatabaseUri(formatedUri),
						modality: 'Multi-hosted',
					},
					message:
						'Erro ao criar connection string para Mongodb em modalidade multi host',
					method: 'generateUriToProd',
				});
			}

			this.logInfo('String de conexão para mongodb formada com sucesso', {
				connectionString: this.maskUriToLog(formatedUri),
				modality: 'Multi-hosted',
			});
			return formatedUri;
		}

		const formatedUri = `mongodb://${this.auth}${validatedEnvValues.DATABASE_HOST}:${String(validatedEnvValues.DATABASE_PORT)}/${validatedEnvValues.DATABASE_NAME}?${this._fine_settings}`;

		if (!isDatabaseUri(formatedUri)) {
			this.handlerErrors({
				erroLevel: 'fatal',
				error: {
					rawValue: this.maskUriToLog(formatedUri),
					typeofValue: typeof formatedUri,
					guardResult: !isDatabaseUri(formatedUri),
					modality: 'Single-host',
				},
				message: 'Erro ao criar connection string para Mongodb em modalidade single-host',
				method: 'generateUriToProd',
			});
		}

		this.logInfo('String de conexão para mongodb formada com sucesso', {
			connectionString: this.maskUriToLog(formatedUri),
			modality: 'Single-host',
		});

		return formatedUri;
	}
}

/**
 * Modulo retorna a URI já fromatada e validada seja ela feita para rodar em produção ou desenvolvimento
 */
export const mongoURI = new MongoConnectionString().uri;
