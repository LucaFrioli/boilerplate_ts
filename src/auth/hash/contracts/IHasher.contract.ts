import { KeyDerivation } from '@Crypto/keyDerivation/KeyDerivation.factory.crypto.js';
import { EmailValidator } from '@Validations/Email.validations.js';
import { nodeEnvSupported } from '@Configs/Constants';
import { hasherEnvValidationSchema } from '@Configs/Schemas/hasherEnv.schema.js';
import { env } from '@Configs/env.js';
import { createChildLogger } from '@Configs/logger.js';
import {
	assertsValidCryptoKey,
	isHashedString,
	type DerivedKey,
	type HashedString,
	type ValidEmail,
} from '@Types';
import z from 'zod';

// // Fazemos uma função de resolução tardia:
// let cachedDerivedKey: DerivedKey<32> | null = null;

async function getDerivedKey(): Promise<DerivedKey<32>> {
	// A derivação física só ocorre na primeira vez que esta função for de fato chamada
	const key = await KeyDerivation.derive(
		env.HASHER_SECURITY_PEPPER,
		'hasher:derived:securityPepper',
		32,
	);
	assertsValidCryptoKey(key);

	return key;
}

export type EnvForHasherProvider = Pick<
	typeof env,
	| 'NODE_ENV'
	| 'HASHER_PROVIDER'
	| 'EMAIL_TO_CONTACT'
	| 'HASHER_MEMORY_COST'
	| 'HASHER_TIME_COST'
	| 'HASHER_PARALLELISM'
	| 'HASHER_SECURITY_PEPPER'
	| 'HASHER_LENGTH'
	| 'HASHER_SALT_LENGTH'
	| 'HASHER_BCRYPT_ROUNDS'
>;

export interface IHasherProvider {
	/**
	 * Recebe uma string limpa e retorna o hash gerado.
	 * @param payload - O dado sensível (ex: senha)
	 */
	generate(payload: string): Promise<HashedString>;

	/**
	 * Compara um texto puro com um hash existente.
	 * @param payload - O texto enviado pelo usuário
	 * @param hashed - O hash recuperado do banco de dados
	 */
	compare(payload: string, hashedString: string): Promise<boolean>;

	/**
	 * Validar se uma string pretence ao tipo semântico de hash
	 * @param hasheddString - texto de hash que deverá ser validado
	 */
	validateHash(hasheddString: string): boolean;
}

export abstract class BaseHasher implements IHasherProvider {
	protected hasherLogger = createChildLogger({
		module: 'security',
		fileType: 'util',
		service: 'hasher',
	});

	protected static _baseEnv?: EnvForHasherProvider;


	protected async validateEnvValues(): Promise<EnvForHasherProvider> {
		const method = 'validateEnvValue' as const;
		if (BaseHasher._baseEnv === undefined) {
			const baseEnvHahserProviderShild: z.ZodType<EnvForHasherProvider> = z.object({
				NODE_ENV: z.enum(nodeEnvSupported),
				HASHER_BCRYPT_ROUNDS: hasherEnvValidationSchema.shape.HASHER_BCRYPT_ROUNDS,
				HASHER_LENGTH: hasherEnvValidationSchema.shape.HASHER_LENGTH,
				HASHER_MEMORY_COST: hasherEnvValidationSchema.shape.HASHER_MEMORY_COST,
				HASHER_PARALLELISM: hasherEnvValidationSchema.shape.HASHER_PARALLELISM,
				HASHER_PROVIDER: hasherEnvValidationSchema.shape.HASHER_PROVIDER,
				HASHER_SALT_LENGTH: hasherEnvValidationSchema.shape.HASHER_SALT_LENGTH,
				// POr momento estraei deixando a derivação ddessa maniera futuramente extraio ela deaqui e utilizo object compose
				HASHER_SECURITY_PEPPER: hasherEnvValidationSchema.shape.HASHER_SECURITY_PEPPER,
				HASHER_TIME_COST: hasherEnvValidationSchema.shape.HASHER_TIME_COST,
				EMAIL_TO_CONTACT: z.custom<ValidEmail>((val) => {
					if (typeof val !== 'string') return false;
					val = val.trim();
					return EmailValidator.isValid(val);
				}),
			});

			const shildResult = await baseEnvHahserProviderShild.safeParseAsync(env);

			if (!shildResult.success) {
				this.handleFatalErrors(z.treeifyError(shildResult.error), method);
			}

			try {
				const derivedKey = await getDerivedKey();
				assertsValidCryptoKey(derivedKey);
				shildResult.data.HASHER_SECURITY_PEPPER = derivedKey;
			} catch (e) {
				this.handleFatalErrors(
					{ e, message: 'erro no momento da derivação de chave' },
					method,
				);
			}
			BaseHasher._baseEnv = shildResult.data;
		}

		return BaseHasher._baseEnv;
	}

	/**
	 * Obriga o desenvolvedor a declara o nome de serviço trzendo ainda mais informação para os logs e depuração
	 */
	protected abstract get ServiceName(): string;

	/**
	 * Metódo que deve ser implementado nas classes filhas com lógica de como o hash deve ocorrrer
	 * @param payload - O dado sensível que seráa tratado pelo serviço de hasher
	 */
	protected abstract executeHash(payload: string): Promise<string>;
	/**
	 * Método que deve ser implementado nas classes filhas com a lógica de comparação de hash e como a lógica deve ocorrer
	 * @param hahsedString - string que já tem o hahs
	 * @param payload - o alvo que deve ser objeto de comeparação
	 */
	protected abstract executeCompare(payload: string, hashedString: string): Promise<boolean>;

	protected abstract executeValidation(hashedString: string): boolean;

	public async generate(payload: string): Promise<HashedString> {
		if (!BaseHasher._baseEnv) {
			await this.validateEnvValues();
		}

		if (!payload || payload.trim().length === 0) {
			this.hasherLogger.warn(
				{ serviceName: this.ServiceName },
				'Tentativa de gerar hash de payload vazio',
			);
			throw new Error('O payload para geração de hash não pode estar vazio');
		}

		try {
			if (!BaseHasher._baseEnv) throw new Error('Erro as variaveis de hambientes derivadas e validadas, froma maculadas')
			const hash = await this.executeHash(payload);
			if (!isHashedString(hash, BaseHasher._baseEnv.HASHER_PROVIDER))
				throw new Error('Erro ao tentar gerar a string');
			return hash;
		} catch (e) {
			this.handleFatalErrors(e, 'generate');
		}
	}

	public async compare(payload: string, hashedString: string): Promise<boolean> {
		try {
			return await this.executeCompare(payload, hashedString);
		} catch (e) {
			this.hasherLogger.error(
				{ error: e, serviceName: this.ServiceName },
				`Erro de verificação comparativa no ${this.ServiceName}`,
			);
			return false;
		}
	}

	public validateHash(hashedString: string): boolean {
		try {
			return this.executeValidation(hashedString);
		} catch (e) {
			this.hasherLogger.error(
				{ error: e, serviceName: this.ServiceName },
				`Erro de validação do tipop string hash no ${this.ServiceName}`,
			);
			throw new Error('Verifique novamente a senha enviada!', { cause: e });
		}
	}

	/**
	 * *handleFatalErrors*
	 * @param e unknown - error catched in method
	 * @param method string - name of the method on error is catched
	 *
	 * @returns void - returns nothing in case trhows an Error
	 * Este método loga um erro fatal que pode ocorrer e serviços de hasher e lança um erro critico,
	 * dizendo que o usuário deve entrar em contato com a administração do sistema permitindo que haja um
	 * email de comunicação com a daministração
	 */
	protected handleFatalErrors(e: unknown, method: string): never {
		this.hasherLogger.fatal(
			{ error: e, method: method, serviceName: this.ServiceName },
			`Falha crítica no motor de criptografia no método ${method}`,
		);
		throw new Error(
			`Erro interno crítico, contate algum administrador por meio dos canais legais ${env.EMAIL_TO_CONTACT}`,
		);
	}
}
