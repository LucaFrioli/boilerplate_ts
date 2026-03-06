export interface IEntity<T> {
    toDTO(): T; // exporta objeto limpo para o banco de dados, e com trtamento para ser realmente seguro trnasportá-lo   
}

export abstract class BaseEntity<T> implements IEntity<T> {
    protected props: T;

    constructor(data: unknown) {
        this.props = this.validate(data);
        Object.freeze({ ...this.props })
    }

    // padroniza o retorno de objetos para a API
    public toDTO(): T {
        return { ...this.props };
    }

    protected abstract validate(data: unknown): T;
}