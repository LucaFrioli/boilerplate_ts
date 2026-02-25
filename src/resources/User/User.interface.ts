import type { UUID } from "node:crypto";

export default interface UserI{
   readonly id?: UUID;
   username: string;
   email: string;
   password: string;
   cpf?: string;
   //--- Aqqui podemos ver campos que podem ser utilizados em relações 1:1 como o usuário é o pilar da maioria das aplicações e é com base nele que os acessos são concedidos, optei por deixar no boilerplate relação 1:1 nas relações já que cobre 90% dos usos recorrentes em aplicações mais padrões
   //####
   stripeId?: string; // este campo está aqui para lembrar de sua existência incrmento para próxima versão do boilerplate
   walletId?: string; // este campo será implementado em uma versão 3.0 ou 4.0
   profileId?: UUID;
   //---
   createdAt?: Date;
   updatedAt?: Date | null;
   deletedAt?: Date | null;
}

