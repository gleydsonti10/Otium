import { FastifyInstance } from 'fastify';
import prisma from '../db';

export default async function caixaRoutes(fastify: FastifyInstance) {
  // Pre-handler hook to authenticate all routes in this file
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Token de autenticação inválido ou ausente' });
    }
  });

  // GET /api/caixa - List all caixas (scoped to user if level < 10, i.e., non-admins)
  fastify.get('/api/caixa', async (request, reply) => {
    try {
      const user = request.user as any;
      const level = user.role.level;

      const whereClause: any = {};
      if (level < 10) {
        whereClause.id_usuario = BigInt(user.id_usuario);
      }

      const caixas = await prisma.tb_caixa.findMany({
        where: whereClause,
        orderBy: { data_abertura: 'desc' },
        include: {
          tb_usuario: {
            include: {
              tb_pessoa: {
                include: {
                  tb_pessoa_fisica: true
                }
              }
            }
          }
        }
      });

      return caixas.map((c) => {
        const pf = c.tb_usuario?.tb_pessoa?.tb_pessoa_fisica?.[0] || null;
        return {
          id_caixa: c.id_caixa.toString(),
          valor_abertura: c.valor_abertura.toString(),
          valor_fechamento: c.valor_fechamento?.toString() || null,
          total_cartao: c.total_cartao?.toString() || null,
          data_abertura: c.data_abertura,
          data_fechamento: c.data_fechamento,
          id_usuario: c.id_usuario.toString(),
          usuario_nome: pf?.nome || c.tb_usuario.email
        };
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar caixas.' });
    }
  });

  // GET /api/caixa/aberto - Get currently open caixa for the authenticated user
  fastify.get('/api/caixa/aberto', async (request, reply) => {
    try {
      const user = request.user as any;
      
      const openCaixa = await prisma.tb_caixa.findFirst({
        where: {
          id_usuario: BigInt(user.id_usuario),
          data_fechamento: null
        },
        include: {
          tb_agendamento_pagamento: true
        }
      });

      if (!openCaixa) {
        return { status: 'closed', caixa: null };
      }

      // Fetch all payments in this caixa, grouping or detailing them
      const pagamentos = openCaixa.tb_agendamento_pagamento.map((p) => ({
        id_agendamento_pagamento: p.id_agendamento_pagamento.toString(),
        tipo: p.tipo,
        descricao: p.descricao,
        valor_pago_cartao: p.valor_pago_cartao.toString(),
        valor_pago_especie: p.valor_pago_especie.toString(),
        valor_pago_pix: p.valor_pago_pix.toString(),
        valor_adicional_cartao: p.valor_adicional_cartao.toString(),
        valor_troco: p.valor_troco.toString(),
        data_criacao: p.data_criacao
      }));

      return {
        status: 'open',
        caixa: {
          id_caixa: openCaixa.id_caixa.toString(),
          valor_abertura: openCaixa.valor_abertura.toString(),
          data_abertura: openCaixa.data_abertura,
          pagamentos
        }
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao verificar caixa aberto.' });
    }
  });

  // POST /api/caixa/abrir - Open a new caixa
  fastify.post('/api/caixa/abrir', async (request, reply) => {
    try {
      const user = request.user as any;
      const { valor_abertura } = request.body as any;

      if (valor_abertura === undefined || isNaN(Number(valor_abertura))) {
        return reply.status(400).send({ error: 'Valor de abertura inválido ou ausente' });
      }

      // Check if user already has an open caixa
      const openCaixa = await prisma.tb_caixa.findFirst({
        where: {
          id_usuario: BigInt(user.id_usuario),
          data_fechamento: null
        }
      });

      if (openCaixa) {
        return reply.status(400).send({ error: 'Usuário já possui um caixa aberto' });
      }

      // Open new caixa
      const newCaixa = await prisma.tb_caixa.create({
        data: {
          valor_abertura: Number(valor_abertura),
          id_usuario: BigInt(user.id_usuario)
        }
      });

      return {
        message: 'Caixa aberto com sucesso!',
        id_caixa: newCaixa.id_caixa.toString()
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao abrir caixa.' });
    }
  });

  // POST /api/caixa/transacao - Post cash transaction (entrada / saida) into active caixa
  fastify.post('/api/caixa/transacao', async (request, reply) => {
    try {
      const user = request.user as any;
      const { tipo, descricao, valor_pago_cartao, valor_pago_especie, valor_troco, valor_adicional_cartao, valor_pago_pix } = request.body as any;

      if (!tipo || !['entrada', 'saida'].includes(tipo)) {
        return reply.status(400).send({ error: 'Tipo de transação inválido' });
      }

      // Find open caixa
      const openCaixa = await prisma.tb_caixa.findFirst({
        where: {
          id_usuario: BigInt(user.id_usuario),
          data_fechamento: null
        }
      });

      if (!openCaixa) {
        return reply.status(400).send({ error: 'Usuário não possui um caixa aberto' });
      }

      const multiplier = tipo === 'saida' ? -1 : 1;

      const vCartao = (Number(valor_pago_cartao || 0) * multiplier);
      const vEspecie = (Number(valor_pago_especie || 0) * multiplier);
      const vPix = (Number(valor_pago_pix || 0) * multiplier);
      const vTroco = (Number(valor_troco || 0) * multiplier);
      const vAdicional = (Number(valor_adicional_cartao || 0) * multiplier);

      const transacao = await prisma.tb_agendamento_pagamento.create({
        data: {
          tipo: tipo === 'entrada' ? 'entrada' : 'saida',
          descricao: descricao || 'Lançamento manual',
          valor_pago_cartao: vCartao,
          valor_pago_especie: vEspecie,
          valor_pago_pix: vPix,
          valor_troco: vTroco,
          valor_adicional_cartao: vAdicional,
          id_caixa: openCaixa.id_caixa
        }
      });

      return {
        message: 'Transação registrada com sucesso!',
        id_agendamento_pagamento: transacao.id_agendamento_pagamento.toString()
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao registrar transação.' });
    }
  });

  // PUT /api/caixa/:id/fechar - Close an open caixa
  fastify.put('/api/caixa/:id/fechar', async (request, reply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as any;

      const caixa = await prisma.tb_caixa.findUnique({
        where: { id_caixa: BigInt(id) },
        include: {
          tb_agendamento_pagamento: true
        }
      });

      if (!caixa) {
        return reply.status(404).send({ error: 'Caixa não encontrado' });
      }

      if (caixa.id_usuario !== BigInt(user.id_usuario)) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      if (caixa.data_fechamento !== null) {
        return reply.status(400).send({ error: 'Este caixa já está fechado' });
      }

      // Sum values: total cash = sum(valor_pago_especie - valor_troco)
      // total card = sum(valor_pago_cartao + valor_adicional_cartao)
      // total pix = sum(valor_pago_pix)
      let totalEspecie = 0;
      let totalCartao = 0;
      let totalPix = 0;

      caixa.tb_agendamento_pagamento.forEach((p) => {
        totalEspecie += Number(p.valor_pago_especie) - Number(p.valor_troco);
        totalCartao += Number(p.valor_pago_cartao) + Number(p.valor_adicional_cartao);
        totalPix += Number(p.valor_pago_pix);
      });

      // According to legacy rule: cash balance cannot be negative
      const valorAbertura = Number(caixa.valor_abertura);
      const valorFechamento = valorAbertura + totalEspecie;

      if (valorFechamento < 0) {
        return reply.status(400).send({ error: 'Caixa não pode ser fechado com saldo em espécie negativo.' });
      }

      await prisma.tb_caixa.update({
        where: { id_caixa: caixa.id_caixa },
        data: {
          data_fechamento: new Date(),
          valor_fechamento: valorFechamento,
          total_cartao: totalCartao,
          total_pix: totalPix
        }
      });

      return {
        message: 'Caixa fechado com sucesso!',
        valor_fechamento: valorFechamento,
        total_cartao: totalCartao,
        total_pix: totalPix
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao fechar caixa.' });
    }
  });
}
