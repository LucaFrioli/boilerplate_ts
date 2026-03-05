import { createChildLogger } from '@Configs/logger.js'
import { type Brand } from '@Types/brand.type.js'

/**
 * *StringWithFixedLegth*
 * 
 * Para usá-lo utilize a função **`StringWithLegthGen`** ela além de garantir o typo ela já realiza uma pequena validação garantindo a tipagem correta
 * 
 * É um tipo que permite refinar a lógica do tipo primitivo e declarar,
 * de forma definitiva que uma string deve ter um tamanho `N` específico.
*/
export type StringWithLegth<N extends number> = Brand<string, { length: N }>
export function StringWithLegthGen<N extends number>(value: string, n: N): StringWithLegth<N> {
    const fixed_length_logger = createChildLogger({ fileType: 'core', service: 'typo', module: 'StringWithLegthGen' })

    if (typeof value !== 'string') {
        fixed_length_logger.error({ expectedTypo: 'string', recivedTypo: typeof value }, 'Tipo de variavel errôneo')
        throw new Error(`Era esperada uma string porém foi recebida uma ${typeof value}`);

    }

    if (value.length !== n) {
        fixed_length_logger.error({ expectedLength: n, recivedLegth: value.length }, 'Passaram um valor com tamanho diferente do esperado');
        throw new Error(`Tanaho esperado ${n}, tamanho recebido ${value.length}`)
    }

    return value as StringWithLegth<N>
}