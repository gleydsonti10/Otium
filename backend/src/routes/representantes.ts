import { FastifyInstance } from 'fastify';
import prisma from '../db';

export default async function representanteRoutes(fastify: FastifyInstance) {
  // Pre-handler hook to authenticate and restrict based on action
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
      const user = request.user as any;
      
      // GET /api/representantes allows level >= 5 (for appointment creation selection)
      // Modifying routes require level >= 50
      const isGetList = request.method === 'GET' && request.routeOptions.url === '/api/representantes';
      const requiredLevel = isGetList ? 5 : 50;

      if (user.role.level < requiredLevel) {
        return reply.status(403).send({ error: 'Acesso negado: Nível insuficiente' });
      }
    } catch (err) {
      return reply.status(401).send({ error: 'Token de autenticação inválido ou ausente' });
    }
  });

  // GET /api/representantes - List representatives
  fastify.get('/api/representantes', async (request, reply) => {
    try {
      const representatives = await prisma.tb_representante.findMany({
        orderBy: { nome: 'asc' }
      });

      return representatives.map((r) => ({
        id_representante: r.id_representante.toString(),
        nome: r.nome,
        cpf: r.cpf,
        telefones: r.telefones,
        banco: r.banco,
        agencia: r.agencia,
        conta: r.conta,
        chave_pix: r.chave_pix
      }));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar representantes.' });
    }
  });

  // POST /api/representantes - Create representative
  fastify.post('/api/representantes', async (request, reply) => {
    try {
      const data = request.body as any;

      if (!data.nome) {
        return reply.status(400).send({ error: 'O nome é obrigatório.' });
      }

      const rep = await prisma.tb_representante.create({
        data: {
          nome: data.nome,
          cpf: data.cpf || null,
          telefones: data.telefones || null,
          banco: data.banco || null,
          agencia: data.agencia || null,
          conta: data.conta || null,
          chave_pix: data.chave_pix || null
        }
      });

      return {
        message: 'Representante criado com sucesso!',
        id_representante: rep.id_representante.toString()
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar representante.' });
    }
  });

  // PUT /api/representantes/:id - Update representative
  fastify.put('/api/representantes/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = request.body as any;

      const rep = await prisma.tb_representante.findUnique({
        where: { id_representante: BigInt(id) }
      });

      if (!rep) {
        return reply.status(404).send({ error: 'Representante não encontrado.' });
      }

      await prisma.tb_representante.update({
        where: { id_representante: rep.id_representante },
        data: {
          nome: data.nome,
          cpf: data.cpf || null,
          telefones: data.telefones || null,
          banco: data.banco || null,
          agencia: data.agencia || null,
          conta: data.conta || null,
          chave_pix: data.chave_pix || null
        }
      });

      return { message: 'Representante atualizado com sucesso!' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar representante.' });
    }
  });

  // GET /api/representantes/:id/comissoes-pendentes - Get unpaid appointments for a representative
  fastify.get('/api/representantes/:id/comissoes-pendentes', async (request, reply) => {
    try {
      const { id } = request.params as any;

      const appointments = await prisma.tb_agendamento.findMany({
        where: {
          id_representante: BigInt(id),
          representante_pago: { not: true }
        },
        include: {
          tb_agendamento_pagamento: true,
          tb_cliente: {
            include: {
              tb_pessoa_fisica: true
            }
          }
        },
        orderBy: { id_agendamento: 'desc' }
      });

      return appointments.map((a) => ({
        id_agendamento: a.id_agendamento.toString(),
        codigo: a.codigo,
        data_criacao: a.data_criacao,
        nome_cliente: a.tb_cliente.tb_pessoa_fisica.nome,
        valor_representante: a.tb_agendamento_pagamento?.valor_representante?.toString() || '0.00'
      }));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar comissões pendentes.' });
    }
  });

  // GET /api/representantes/:id/pagamentos - List payments made to a representative
  fastify.get('/api/representantes/:id/pagamentos', async (request, reply) => {
    try {
      const { id } = request.params as any;

      const payments = await prisma.tb_representante_pagamento.findMany({
        where: { id_representante: BigInt(id) },
        include: {
          tb_agendamento: {
            include: {
              tb_agendamento_pagamento: true
            }
          }
        },
        orderBy: { id_representante_pagamento: 'desc' }
      });

      return payments.map((p) => {
        let total = 0;
        p.tb_agendamento.forEach((a) => {
          total += Number(a.tb_agendamento_pagamento?.valor_representante || 0);
        });

        return {
          id_representante_pagamento: p.id_representante_pagamento.toString(),
          data_criacao: p.data_criacao,
          total_pagamento: total.toFixed(2),
          qnt_agendamentos: p.tb_agendamento.length
        };
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar histórico de pagamentos.' });
    }
  });

  // PUT /api/representantes/pagar - Mark appointments as paid to representative
  fastify.put('/api/representantes/pagar', async (request, reply) => {
    try {
      const user = request.user as any;
      const { id_representante, agendamentos } = request.body as any; // agendamentos is an array of IDs (strings)

      if (!id_representante || !agendamentos || !Array.isArray(agendamentos) || agendamentos.length === 0) {
        return reply.status(400).send({ error: 'Dados de pagamento inválidos.' });
      }

      await prisma.$transaction(async (tx) => {
        // 1. Create tb_representante_pagamento
        const repPagamento = await tx.tb_representante_pagamento.create({
          data: {
            id_representante: BigInt(id_representante),
            created_by: BigInt(user.id_usuario)
          }
        });

        // 2. Update appointments to marked as paid and reference this payment
        const ids = agendamentos.map((id) => BigInt(id));

        await tx.tb_agendamento.updateMany({
          where: {
            id_agendamento: { in: ids },
            id_representante: BigInt(id_representante)
          },
          data: {
            representante_pago: true,
            id_representante_pagamento: repPagamento.id_representante_pagamento
          }
        });
      });

      return { message: 'Pagamento registrado com sucesso!' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao processar pagamento do representante.' });
    }
  });
}
