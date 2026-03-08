import type { DatabaseID, AppID, HashedString } from '@Types'

export default interface UserI {
   readonly id: DatabaseID;
   readonly publicId: AppID;
   active: boolean
   username: string;
   email: string;
   passwordHash: HashedString;
   cpf: string;

   //--- Aqqui podemos ver campos que podem ser utilizados em relações 1:1 como o usuário é o pilar da maioria das aplicações e é com base nele que os acessos são concedidos, optei por deixar no boilerplate relação 1:1 nas relações já que cobre 90% dos usos recorrentes em aplicações mais padrões
   //####
   stripeId: string | null; 
   walletId: string | null; 
   profileId: DatabaseID;
   
   // --- Auditoria
   readonly createdAt: Date;
   updatedAt: Date | null;
   deletedAt: Date | null;
}

