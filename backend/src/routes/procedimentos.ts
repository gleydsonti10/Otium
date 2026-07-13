import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import prisma from '../db';

export default async function procedimentoRoutes(fastify: FastifyInstance) {
  // Pre-handler hook to authenticate all routes in this file
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Token de autenticação inválido ou ausente' });
    }
  });

  // GET /api/procedimentos - List global procedures
  fastify.get('/api/procedimentos', async (request, reply) => {
    try {
      const { search } = request.query as any;

      const whereClause: Prisma.tb_procedimentoWhereInput = {};

      if (search) {
        whereClause.nome = { contains: search };
      }

      const procedimentos = await prisma.tb_procedimento.findMany({
        where: whereClause,
        orderBy: { nome: 'asc' },
        include: {
          tb_especialidade: true
        }
      });

      return procedimentos.map((p) => ({
        id_procedimento: p.id_procedimento.toString(),
        nome: p.nome,
        tipo: p.tipo,
        codigo_tuss: p.codigo_tuss,
        codigo_especialidade: p.codigo_especialidade?.toString() || null,
        especialidade: p.tb_especialidade?.nome || null
      }));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar procedimentos.' });
    }
  });

  // GET /api/parceiro-procedimentos/:id_parceiro? - List procedures for a specific partner
  fastify.get('/api/parceiro-procedimentos/:id_parceiro?', async (request, reply) => {
    try {
      const user = request.user as any;
      const level = user.role.level;
      let { id_parceiro } = request.params as any;

      // If user level is below 5, restrict to their own partner id
      if (level < 5) {
        const partnerUser = await prisma.tb_parceiro.findFirst({
          where: { id_pessoa: user.id_pessoa ? BigInt(user.id_pessoa) : 0 }
        });

        if (!partnerUser) {
          return reply.status(404).send({ error: 'Parceiro não encontrado para o usuário atual' });
        }

        id_parceiro = partnerUser.id_parceiro.toString();
      } else if (!id_parceiro) {
        return reply.status(400).send({ error: 'ID do parceiro é obrigatório para administradores.' });
      }

      const partnerProcs = await prisma.tb_parceiro_procedimento.findMany({
        where: {
          id_parceiro: BigInt(id_parceiro),
          status: 1 // Active procedures
        },
        include: {
          tb_procedimento: true
        },
        orderBy: {
          tb_procedimento: {
            nome: 'asc'
          }
        }
      });

      return partnerProcs.map((pp) => ({
        id_parceiro_procedimento: pp.id_parceiro_procedimento.toString(),
        id_parceiro: pp.id_parceiro.toString(),
        id_procedimento: pp.id_procedimento.toString(),
        observacao: pp.observacao,
        horario_atendimento: pp.horario_atendimento,
        comissao: pp.comissao.toString(),
        valor_parceiro: pp.valor_parceiro.toString(),
        valor_total: pp.valor_total.toString(),
        status: pp.status,
        nome: pp.tb_procedimento.nome,
        codigo_tuss: pp.tb_procedimento.codigo_tuss,
        nome_parceiro_procedimento: pp.nome || pp.tb_procedimento.nome
      }));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar procedimentos do parceiro.' });
    }
  });

  // POST /api/parceiro-procedimentos - Add procedure to partner
  fastify.post('/api/parceiro-procedimentos', async (request, reply) => {
    try {
      const data = request.body as any;
      const { id_parceiro, id_procedimento, valor_parceiro, comissao, observacao, horario_atendimento, nome } = data;

      if (!id_parceiro || !id_procedimento) {
        return reply.status(400).send({ error: 'Parceiro e Procedimento são obrigatórios.' });
      }

      // Check if already exists for this partner
      const existing = await prisma.tb_parceiro_procedimento.findFirst({
        where: {
          id_parceiro: BigInt(id_parceiro),
          id_procedimento: Number(id_procedimento),
          status: 1
        }
      });

      if (existing) {
        return reply.status(400).send({ error: 'Este procedimento já está cadastrado para este parceiro.' });
      }

      const vParceiro = Number(valor_parceiro || 0);
      const vComissao = Number(comissao || 0);
      const vTotal = vParceiro + vComissao;

      const pp = await prisma.tb_parceiro_procedimento.create({
        data: {
          id_parceiro: BigInt(id_parceiro),
          id_procedimento: Number(id_procedimento),
          valor_parceiro: new Prisma.Decimal(vParceiro),
          comissao: new Prisma.Decimal(vComissao),
          valor_total: new Prisma.Decimal(vTotal),
          observacao: observacao || null,
          horario_atendimento: horario_atendimento || null,
          nome: nome || null,
          status: 1
        }
      });

      return {
        message: 'Procedimento associado com sucesso!',
        id_parceiro_procedimento: pp.id_parceiro_procedimento.toString()
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao associar procedimento ao parceiro.' });
    }
  });

  // DELETE /api/parceiro-procedimentos/:id - Remove (deactivate) partner procedure
  fastify.delete('/api/parceiro-procedimentos/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;

      const pp = await prisma.tb_parceiro_procedimento.findUnique({
        where: { id_parceiro_procedimento: BigInt(id) }
      });

      if (!pp) {
        return reply.status(404).send({ error: 'Associação de procedimento não encontrada.' });
      }

      // Soft delete: set status to 0
      await prisma.tb_parceiro_procedimento.update({
        where: { id_parceiro_procedimento: pp.id_parceiro_procedimento },
        data: { status: 0 }
      });

      return { message: 'Procedimento desassociado com sucesso!' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao desassociar procedimento.' });
    }
  });

  // PUT /api/parceiro-procedimentos/:id - Update partner procedure
  fastify.put('/api/parceiro-procedimentos/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = request.body as any;
      const { valor_parceiro, comissao, observacao, horario_atendimento, nome } = data;

      const pp = await prisma.tb_parceiro_procedimento.findUnique({
        where: { id_parceiro_procedimento: BigInt(id) }
      });

      if (!pp) {
        return reply.status(404).send({ error: 'Associação de procedimento não encontrada.' });
      }

      const vParceiro = valor_parceiro !== undefined ? Number(valor_parceiro) : Number(pp.valor_parceiro);
      const vComissao = comissao !== undefined ? Number(comissao) : Number(pp.comissao);
      const vTotal = vParceiro + vComissao;

      const updated = await prisma.tb_parceiro_procedimento.update({
        where: { id_parceiro_procedimento: pp.id_parceiro_procedimento },
        data: {
          valor_parceiro: new Prisma.Decimal(vParceiro),
          comissao: new Prisma.Decimal(vComissao),
          valor_total: new Prisma.Decimal(vTotal),
          observacao: observacao !== undefined ? (observacao || null) : pp.observacao,
          horario_atendimento: horario_atendimento !== undefined ? (horario_atendimento || null) : pp.horario_atendimento,
          nome: nome !== undefined ? (nome || null) : pp.nome
        }
      });

      return {
        message: 'Procedimento atualizado com sucesso!',
        id_parceiro_procedimento: updated.id_parceiro_procedimento.toString()
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar procedimento do parceiro.' });
    }
  });
}
