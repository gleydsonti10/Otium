import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import prisma from '../db';

export default async function financeiroRoutes(fastify: FastifyInstance) {
  // Pre-handler hook to authenticate all routes in this file
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Token de autenticação inválido ou ausente' });
    }
  });

  // GET /api/financeiro - List billing cycles
  fastify.get('/api/financeiro', async (request, reply) => {
    try {
      const user = request.user as any;
      const level = user.role.level;

      const whereClause: Prisma.tb_financeiroWhereInput = {};

      // If user level is below 5, restrict to their own partner id
      if (level < 5) {
        const partnerUser = await prisma.tb_parceiro.findFirst({
          where: { id_pessoa: user.id_pessoa ? BigInt(user.id_pessoa) : 0 }
        });

        if (!partnerUser) {
          return reply.status(404).send({ error: 'Parceiro não encontrado para o usuário atual' });
        }

        whereClause.id_parceiro = partnerUser.id_parceiro;
      }

      // Fetch financial cycles
      const financeiro = await prisma.tb_financeiro.findMany({
        where: whereClause,
        orderBy: { id_financeiro: 'desc' },
        include: {
          tb_parceiro: true,
          tb_usuario: {
            select: {
              email: true
            }
          },
          tb_agendamento: {
            include: {
              tb_agendamento_procedimento: {
                include: {
                  tb_parceiro_procedimento: true
                }
              }
            }
          }
        }
      });

      // Map values and calculate totals
      const mapped = financeiro.map((f) => {
        // Calculate sum of valor_parceiro * quantidade for all completed/relevant appointments in this billing cycle
        let totalParceiro = 0;
        f.tb_agendamento.forEach((ag) => {
          ag.tb_agendamento_procedimento.forEach((proc) => {
            totalParceiro += Number(proc.tb_parceiro_procedimento.valor_parceiro) * proc.quantidade;
          });
        });

        return {
          id_financeiro: f.id_financeiro.toString(),
          codigo: f.codigo,
          status: f.status,
          data_criacao: f.data_criacao,
          id_parceiro: f.id_parceiro.toString(),
          nome_parceiro: f.tb_parceiro.nome,
          created_by: f.created_by?.toString() || null,
          email_usuario: f.tb_usuario?.email || null,
          total_parceiro: totalParceiro.toFixed(2)
        };
      });

      return mapped;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar dados financeiros.' });
    }
  });

  // GET /api/financeiro/:id - Get details of a financial cycle including all appointments
  fastify.get('/api/financeiro/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const user = request.user as any;
      const level = user.role.level;

      const f = await prisma.tb_financeiro.findUnique({
        where: { id_financeiro: BigInt(id) },
        include: {
          tb_parceiro: true,
          tb_usuario: {
            select: {
              email: true
            }
          },
          tb_agendamento: {
            include: {
              tb_cliente: {
                include: {
                  tb_pessoa_fisica: true
                }
              },
              tb_agendamento_procedimento: {
                include: {
                  tb_parceiro_procedimento: true
                }
              }
            }
          }
        }
      });

      if (!f) {
        return reply.status(404).send({ error: 'Ciclo financeiro não encontrado.' });
      }

      // Check access permission for partners
      if (level < 5) {
        const partnerUser = await prisma.tb_parceiro.findFirst({
          where: { id_pessoa: user.id_pessoa ? BigInt(user.id_pessoa) : 0 }
        });
        if (!partnerUser || partnerUser.id_parceiro !== f.id_parceiro) {
          return reply.status(403).send({ error: 'Acesso negado a este ciclo financeiro.' });
        }
      }

      // Map appointments inside the financial cycle
      const agendamentosMapped = f.tb_agendamento.map((ag) => {
        let valorParceiro = 0;
        let comissaoTotal = 0;

        ag.tb_agendamento_procedimento.forEach((proc) => {
          valorParceiro += Number(proc.tb_parceiro_procedimento.valor_parceiro) * proc.quantidade;
          comissaoTotal += Number(proc.tb_parceiro_procedimento.comissao) * proc.quantidade;
        });

        return {
          id_agendamento: ag.id_agendamento.toString(),
          codigo: ag.codigo,
          id_cliente: ag.id_cliente.toString(),
          cpf: ag.tb_cliente.tb_pessoa_fisica.cpf,
          nome_cliente: ag.tb_cliente.tb_pessoa_fisica.nome,
          status: ag.status,
          // Sum quantities
          quantidade: ag.tb_agendamento_procedimento.reduce((sum, p) => sum + p.quantidade, 0),
          valor_parceiro: valorParceiro.toFixed(2),
          comissao: comissaoTotal.toFixed(2)
        };
      });

      // Calculate cycle total
      const totalParceiroCycle = agendamentosMapped.reduce((sum, ag) => sum + parseFloat(ag.valor_parceiro), 0);

      return {
        id_financeiro: f.id_financeiro.toString(),
        codigo: f.codigo,
        status: f.status,
        data_criacao: f.data_criacao,
        id_parceiro: f.id_parceiro.toString(),
        nome_parceiro: f.tb_parceiro.nome,
        created_by: f.created_by?.toString() || null,
        email_usuario: f.tb_usuario?.email || null,
        total_parceiro: totalParceiroCycle.toFixed(2),
        agendamentos: agendamentosMapped
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar detalhes financeiros.' });
    }
  });

  // GET /api/financeiro/previa-ciclos - Get billing cycle previews for active partners
  fastify.get('/api/financeiro/previa-ciclos', async (request, reply) => {
    try {
      const user = request.user as any;
      if (user.role.level < 50) {
        return reply.status(403).send({ error: 'Acesso negado: Nível insuficiente' });
      }

      // Fetch all active partners with their completed appointments that don't belong to a batch
      const partners = await prisma.tb_parceiro.findMany({
        where: { status: 1 },
        include: {
          tb_agendamento: {
            where: {
              status: 'realizado',
              id_financeiro: null
            },
            include: {
              tb_agendamento_procedimento: {
                include: {
                  tb_parceiro_procedimento: true
                }
              }
            }
          }
        },
        orderBy: { nome: 'asc' }
      });

      const today = new Date();
      today.setUTCHours(23, 59, 59, 999);

      return partners.map((p) => {
        let totalPendente = 0;
        p.tb_agendamento.forEach((ag) => {
          ag.tb_agendamento_procedimento.forEach((proc) => {
            totalPendente += Number(proc.tb_parceiro_procedimento.valor_parceiro) * proc.quantidade;
          });
        });

        const isDue = p.data_fechamento_ciclo ? new Date(p.data_fechamento_ciclo) <= today : false;

        return {
          id_parceiro: p.id_parceiro.toString(),
          nome: p.nome,
          ciclo_pagamento: p.ciclo_pagamento,
          data_fechamento_ciclo: p.data_fechamento_ciclo,
          total_pendente: totalPendente.toFixed(2),
          qtd_pendente: p.tb_agendamento.length,
          is_due: isDue
        };
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar prévia dos ciclos.' });
    }
  });

  // POST /api/financeiro/gerar-lote - Generate payment batch individually or in bulk
  fastify.post('/api/financeiro/gerar-lote', async (request, reply) => {
    try {
      const user = request.user as any;
      if (user.role.level < 50) {
        return reply.status(403).send({ error: 'Acesso negado: Nível insuficiente' });
      }

      const { id_parceiro, data_limite } = request.body as any;

      if (id_parceiro) {
        // Individual generation for one partner
        const partner = await prisma.tb_parceiro.findUnique({
          where: { id_parceiro: BigInt(id_parceiro) }
        });

        if (!partner) {
          return reply.status(404).send({ error: 'Parceiro não encontrado.' });
        }

        const cutOffDate = data_limite ? new Date(data_limite) : (partner.data_fechamento_ciclo || new Date());
        cutOffDate.setHours(23, 59, 59, 999);

        // Fetch completed appointments without batch and before or on the cutoff date
        const appointments = await prisma.tb_agendamento.findMany({
          where: {
            id_parceiro: partner.id_parceiro,
            status: 'realizado',
            id_financeiro: null,
            data_realizacao: { lte: cutOffDate }
          }
        });

        if (appointments.length === 0) {
          return reply.status(400).send({ error: 'Nenhum agendamento pendente encontrado para este parceiro no período.' });
        }

        // Generate batch
        const financeiro = await prisma.$transaction(async (tx) => {
          const f = await tx.tb_financeiro.create({
            data: {
              id_parceiro: partner.id_parceiro,
              created_by: BigInt(user.id_usuario),
              status: 'pendente'
            }
          });

          await tx.tb_agendamento.updateMany({
            where: {
              id_agendamento: { in: appointments.map(a => a.id_agendamento) }
            },
            data: {
              id_financeiro: f.id_financeiro,
              modified_by: BigInt(user.id_usuario)
            }
          });

          return f;
        });

        return {
          message: 'Lote financeiro gerado com sucesso!',
          id_financeiro: financeiro.id_financeiro.toString(),
          codigo: financeiro.codigo
        };
      } else {
        // Bulk generation for all partners whose cycle is due
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        // Find partners due
        const duePartners = await prisma.tb_parceiro.findMany({
          where: {
            status: 1,
            data_fechamento_ciclo: { lte: today }
          }
        });

        let createdCount = 0;
        const generatedLotes: any[] = [];

        for (const partner of duePartners) {
          const cutOffDate = partner.data_fechamento_ciclo || today;
          cutOffDate.setHours(23, 59, 59, 999);

          const appointments = await prisma.tb_agendamento.findMany({
            where: {
              id_parceiro: partner.id_parceiro,
              status: 'realizado',
              id_financeiro: null,
              data_realizacao: { lte: cutOffDate }
            }
          });

          if (appointments.length > 0) {
            await prisma.$transaction(async (tx) => {
              const f = await tx.tb_financeiro.create({
                data: {
                  id_parceiro: partner.id_parceiro,
                  created_by: BigInt(user.id_usuario),
                  status: 'pendente'
                }
              });

              await tx.tb_agendamento.updateMany({
                where: {
                  id_agendamento: { in: appointments.map(a => a.id_agendamento) }
                },
                data: {
                  id_financeiro: f.id_financeiro,
                  modified_by: BigInt(user.id_usuario)
                }
              });

              generatedLotes.push({
                id_financeiro: f.id_financeiro.toString(),
                id_parceiro: partner.id_parceiro.toString(),
                nome_parceiro: partner.nome,
                agendamentos_count: appointments.length
              });
              createdCount++;
            });
          }
        }

        return {
          message: `${createdCount} lotes financeiros gerados com sucesso!`,
          lotes: generatedLotes
        };
      }
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao gerar lote financeiro.' });
    }
  });

  // PUT /api/financeiro/pagar - Mark a payment batch as paid
  fastify.put('/api/financeiro/pagar', async (request, reply) => {
    try {
      const user = request.user as any;
      if (user.role.level < 50) {
        return reply.status(403).send({ error: 'Acesso negado: Nível insuficiente' });
      }

      const { id_financeiro } = request.body as any;

      if (!id_financeiro) {
        return reply.status(400).send({ error: 'ID do lote financeiro é obrigatório.' });
      }

      const f = await prisma.tb_financeiro.findUnique({
        where: { id_financeiro: BigInt(id_financeiro) }
      });

      if (!f) {
        return reply.status(404).send({ error: 'Lote financeiro não encontrado.' });
      }

      if (f.status === 'pago') {
        return reply.status(400).send({ error: 'Este lote financeiro já está pago.' });
      }

      await prisma.tb_financeiro.update({
        where: { id_financeiro: f.id_financeiro },
        data: {
          status: 'pago',
          data_modificacao: new Date()
        }
      });

      return { message: 'Lote financeiro marcado como pago com sucesso!' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao marcar lote financeiro como pago.' });
    }
  });

  // PUT /api/financeiro/cancelar - Cancel a payment batch
  fastify.put('/api/financeiro/cancelar', async (request, reply) => {
    try {
      const user = request.user as any;
      if (user.role.level < 50) {
        return reply.status(403).send({ error: 'Acesso negado: Nível insuficiente' });
      }

      const { id_financeiro } = request.body as any;

      if (!id_financeiro) {
        return reply.status(400).send({ error: 'ID do lote financeiro é obrigatório.' });
      }

      const f = await prisma.tb_financeiro.findUnique({
        where: { id_financeiro: BigInt(id_financeiro) }
      });

      if (!f) {
        return reply.status(404).send({ error: 'Lote financeiro não encontrado.' });
      }

      if (f.status === 'cancelado') {
        return reply.status(400).send({ error: 'Este lote financeiro já está cancelado.' });
      }

      if (f.status === 'pago') {
        return reply.status(400).send({ error: 'Não é possível cancelar um lote financeiro que já foi pago.' });
      }

      await prisma.tb_financeiro.update({
        where: { id_financeiro: f.id_financeiro },
        data: {
          status: 'cancelado',
          data_modificacao: new Date()
        }
      });

      return { message: 'Lote financeiro cancelado com sucesso!' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao cancelar lote financeiro.' });
    }
  });
}
