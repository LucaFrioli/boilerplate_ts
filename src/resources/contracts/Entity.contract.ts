export interface IEntity<T> {
    toDatabaseDTO(): T; // exporta objeto limpo para o banco de dados, e com trtamento para ser realmente seguro trnasportá-lo   
    toPublicDTO(): Partial<T>
}

export abstract class BaseEntity<T> implements IEntity<T> {
    protected props: T;

    constructor(data: unknown) {
        this.props = this.validate(data);
        Object.freeze({ ...this.props })
    }

    // padroniza o retorno de objetos para a API
    public toDatabaseDTO(): T {
        return { ...this.props };
    }

    public abstract toPublicDTO(): Partial<T>;
    protected abstract validate(data: unknown): T;
}