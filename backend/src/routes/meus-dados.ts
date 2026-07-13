import { FastifyInstance } from 'fastify';
import prisma from '../db';

export default async function meusDadosRoutes(fastify: FastifyInstance) {
  // Pre-handler hook to authenticate all routes in this file
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Token de autenticação inválido ou ausente' });
    }
  });

  // GET /api/meus-dados - Get current user profile details
  fastify.get('/api/meus-dados', async (request, reply) => {
    try {
      const tokenUser = request.user as any;
      const idUsuario = BigInt(tokenUser.id_usuario);

      const user = await prisma.tb_usuario.findUnique({
        where: { id_usuario: idUsuario },
        include: {
          tb_role: true,
          tb_pessoa: {
            include: {
              tb_pessoa_fisica: true,
              tb_pessoa_juridica: true
            }
          }
        }
      });

      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado' });
      }

      // Map values
      const pf = user.tb_pessoa?.tb_pessoa_fisica?.[0] || null;
      const pj = user.tb_pessoa?.tb_pessoa_juridica || null;

      return {
        id_usuario: user.id_usuario.toString(),
        email: user.email,
        status: user.status,
        tipo: user.tb_role.id_role.toString(),
        ultimo_acesso: user.ultimo_acesso,
        pessoa_juridica: user.tb_pessoa?.pessoa_juridica || false,
        pf: pf ? {
          id_pessoa_fisica: pf.id_pessoa_fisica.toString(),
          nome: pf.nome,
          nome_social: pf.nome_social,
          sexo: pf.sexo,
          email: pf.email,
          rg: pf.rg,
          cpf: pf.cpf,
          data_nascimento: pf.data_nascimento,
          telefone: pf.telefone,
          telefone2: pf.telefone2,
          pai: pf.pai,
          mae: pf.mae,
          responsavel: pf.responsavel
        } : null,
        pj: pj ? {
          id_pessoa_juridica: pj.id_pessoa_juridica.toString(),
          razao_social: pj.razao_social,
          nome_fantasia: pj.nome_fantasia,
          cnpj: pj.cnpj,
          telefone: pj.telefone,
          telefone2: pj.telefone2,
          email: pj.email,
          nome_responsavel: pj.nome_responsavel,
          cpf_responsavel: pj.cpf_responsavel,
          telefone_responsavel: pj.telefone_responsavel,
          email_responsavel: pj.email_responsavel
        } : null
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar dados do perfil.' });
    }
  });

  // PUT /api/meus-dados - Update user details & optionally password
  fastify.put('/api/meus-dados', async (request, reply) => {
    try {
      const tokenUser = request.user as any;
      const idUsuario = BigInt(tokenUser.id_usuario);
      const data = request.body as any;

      const user = await prisma.tb_usuario.findUnique({
        where: { id_usuario: idUsuario },
        include: {
          tb_pessoa: {
            include: {
              tb_pessoa_fisica: true,
              tb_pessoa_juridica: true
            }
          }
        }
      });

      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado' });
      }

      const updateData: any = {};
      if (data.email) {
        updateData.email = data.email;
      }
      if (data.senha) {
        // Compute MD5 hash for the new password to trigger BEFORE_UPDATE DB trigger correctly
        updateData.senha = data.senha; 
      }

      // Execute transaction to update both user and associated person records
      await prisma.$transaction(async (tx) => {
        // Update user
        if (Object.keys(updateData).length > 0) {
          await tx.tb_usuario.update({
            where: { id_usuario: idUsuario },
            data: updateData
          });
        }

        // Update physical person details if provided
        if (data.pf && user.tb_pessoa?.tb_pessoa_fisica?.[0]) {
          const pfId = user.tb_pessoa.tb_pessoa_fisica[0].id_pessoa_fisica;
          await tx.tb_pessoa_fisica.update({
            where: { id_pessoa_fisica: pfId },
            data: {
              nome: data.pf.nome,
              nome_social: data.pf.nome_social,
              sexo: data.pf.sexo,
              rg: data.pf.rg,
              cpf: data.pf.cpf?.replace(/[.\-]/g, ''),
              data_nascimento: data.pf.data_nascimento ? new Date(data.pf.data_nascimento) : undefined,
              telefone: data.pf.telefone,
              telefone2: data.pf.telefone2,
              email: data.pf.email,
              pai: data.pf.pai,
              mae: data.pf.mae,
              responsavel: data.pf.responsavel
            }
          });
        }

        // Update legal person details if provided
        if (data.pj && user.tb_pessoa?.tb_pessoa_juridica) {
          const pjId = user.tb_pessoa.tb_pessoa_juridica.id_pessoa_juridica;
          await tx.tb_pessoa_juridica.update({
            where: { id_pessoa_juridica: pjId },
            data: {
              razao_social: data.pj.razao_social,
              nome_fantasia: data.pj.nome_fantasia,
              cnpj: data.pj.cnpj?.replace(/[.\-\/]/g, ''),
              telefone: data.pj.telefone,
              telefone2: data.pj.telefone2,
              email: data.pj.email,
              nome_responsavel: data.pj.nome_responsavel,
              cpf_responsavel: data.pj.cpf_responsavel,
              telefone_responsavel: data.pj.telefone_responsavel,
              email_responsavel: data.pj.email_responsavel
            }
          });
        }
      });

      return { message: 'Dados atualizados com sucesso!' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar dados do perfil.' });
    }
  });
}
