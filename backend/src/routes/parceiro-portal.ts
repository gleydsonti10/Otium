import { FastifyInstance } from 'fastify';
import prisma from '../db';

export default async function parceiroPortalRoutes(fastify: FastifyInstance) {
  // Pre-handler hook to authenticate all routes in this file
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Token de autenticação inválido ou ausente' });
    }
  });

  // GET /api/parceiro-portal/agendamentos - List all realized/pago appointments for logged partner
  fastify.get('/api/parceiro-portal/agendamentos', async (request, reply) => {
    try {
      const user = request.user as any;
      if (!user.id_pessoa) {
        return reply.status(400).send({ error: 'Usuário não está associado a nenhuma pessoa física/jurídica.' });
      }

      // Find partner
      const partner = await prisma.tb_parceiro.findFirst({
        where: { id_pessoa: BigInt(user.id_pessoa) }
      });

      if (!partner) {
        return reply.status(404).send({ error: 'Clínica parceira não encontrada.' });
      }

      const { data_inicial, data_final } = request.query as any;

      const whereClause: any = {
        id_parceiro: partner.id_parceiro,
        status: {
          in: ['realizado', 'pago']
        }
      };

      if (data_inicial || data_final) {
        whereClause.data_criacao = {};
        if (data_inicial) {
          const startDate = new Date(data_inicial);
          startDate.setHours(0, 0, 0, 0);
          whereClause.data_criacao.gte = startDate;
        }
        if (data_final) {
          const endDate = new Date(data_final);
          endDate.setHours(23, 59, 59, 999);
          whereClause.data_criacao.lte = endDate;
        }
      }

      // Find realized or paid appointments for this partner
      const appointments = await prisma.tb_agendamento.findMany({
        where: whereClause,
        take: 200,
        include: {
          tb_cliente: {
            include: {
              tb_pessoa_fisica: true
            }
          },
          tb_agendamento_procedimento: {
            include: {
              tb_parceiro_procedimento: {
                include: {
                  tb_procedimento: true
                }
              }
            }
          }
        },
        orderBy: { id_agendamento: 'desc' }
      });

      return appointments.map((a) => {
        const procedimentos = a.tb_agendamento_procedimento.map((ap) => {
          const valorTotal = Number(ap.tb_parceiro_procedimento?.valor_total || 0);
          const valorParceiro = Number(ap.tb_parceiro_procedimento?.valor_parceiro || 0);
          return {
            id_parceiro_procedimento: ap.id_parceiro_procedimento.toString(),
            nome: ap.tb_parceiro_procedimento?.tb_procedimento?.nome || ap.tb_parceiro_procedimento?.nome || 'Procedimento',
            quantidade: ap.quantidade,
            valor_total: valorTotal,
            valor_parceiro: valorParceiro,
            total_parceiro: valorParceiro * ap.quantidade
          };
        });

        const totalParceiro = procedimentos.reduce((sum, p) => sum + p.total_parceiro, 0);

        return {
          id_agendamento: a.id_agendamento.toString(),
          codigo: a.codigo,
          status: a.status,
          data_criacao: a.data_criacao,
          total_parceiro: totalParceiro,
          procedimentos,
          cliente: {
            nome: a.tb_cliente.tb_pessoa_fisica.nome,
            cpf: a.tb_cliente.tb_pessoa_fisica.cpf
          }
        };
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar agendamentos do parceiro.' });
    }
  });

  // GET /api/parceiro-portal/bi - Fetch BI data (metrics & trends) for the partner portal
  fastify.get('/api/parceiro-portal/bi', async (request, reply) => {
    try {
      const user = request.user as any;
      if (!user.id_pessoa) {
        return reply.status(400).send({ error: 'Usuário não está associado a nenhuma pessoa física/jurídica.' });
      }

      // Find partner
      const partner = await prisma.tb_parceiro.findFirst({
        where: { id_pessoa: BigInt(user.id_pessoa) }
      });

      if (!partner) {
        return reply.status(404).send({ error: 'Clínica parceira não encontrada.' });
      }

      const { data_inicial, data_final } = request.query as any;

      // Default to last 30 days
      const startDate = data_inicial ? new Date(data_inicial) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = data_final ? new Date(data_final) : new Date();

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      // Find realized or paid appointments for this partner in the date range
      const appointments = await prisma.tb_agendamento.findMany({
        where: {
          id_parceiro: partner.id_parceiro,
          status: {
            in: ['realizado', 'pago']
          },
          data_criacao: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          tb_agendamento_procedimento: {
            include: {
              tb_parceiro_procedimento: {
                include: {
                  tb_procedimento: true
                }
              }
            }
          }
        },
        orderBy: { data_criacao: 'asc' }
      });

      // Aggregators
      let faturamentoTotal = 0;
      const totalGuias = appointments.length;

      const dailyData: { [key: string]: { bruto: number; volume: number } } = {};
      const proceduresCount: { [key: string]: number } = {};
      const statusCounts: { [key: string]: number } = { pago: 0, realizado: 0 };

      appointments.forEach((a) => {
        // Daily revenue and volume
        const dateKey = a.data_criacao.toISOString().split('T')[0];
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { bruto: 0, volume: 0 };
        }

        const appRevenue = a.tb_agendamento_procedimento.reduce((sum, ap) => {
          const valorParceiro = Number(ap.tb_parceiro_procedimento?.valor_parceiro || 0);
          return sum + (valorParceiro * ap.quantidade);
        }, 0);

        faturamentoTotal += appRevenue;
        dailyData[dateKey].bruto += appRevenue;
        dailyData[dateKey].volume += 1;

        // Status counts
        const st = (a.status || '').toLowerCase();
        if (st in statusCounts) {
          statusCounts[st]++;
        }

        // Procedures distribution
        a.tb_agendamento_procedimento.forEach((ap) => {
          const name = ap.tb_parceiro_procedimento?.tb_procedimento?.nome || ap.tb_parceiro_procedimento?.nome || 'Procedimento';
          proceduresCount[name] = (proceduresCount[name] || 0) + ap.quantidade;
        });
      });

      // Format revenue trend (ensure chronological order)
      const revenueTrend = Object.keys(dailyData)
        .map((date) => {
          const parts = date.split('-');
          return {
            rawDate: date,
            dateLabel: `${parts[2]}/${parts[1]}`,
            valor: dailyData[date].bruto,
            volume: dailyData[date].volume
          };
        })
        .sort((a, b) => a.rawDate.localeCompare(b.rawDate));

      // Format procedure distribution
      const procedureDistribution = Object.keys(proceduresCount)
        .map((name) => ({
          name,
          value: proceduresCount[name]
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Limit to top 5

      // Format status distribution
      const totalStatus = statusCounts.pago + statusCounts.realizado;
      const statusDistribution = [
        { name: 'Pago', value: statusCounts.pago, color: '#34D399' },
        { name: 'Realizado', value: statusCounts.realizado, color: '#38BDF8' }
      ].map((item) => ({
        ...item,
        percentage: totalStatus > 0 ? (item.value / totalStatus) * 100 : 0
      }));

      return {
        kpis: {
          faturamentoTotal,
          totalGuias,
          ticketMedio: totalGuias > 0 ? faturamentoTotal / totalGuias : 0
        },
        revenueTrend,
        procedureDistribution,
        statusDistribution
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao compilar dados do BI do parceiro.' });
    }
  });

  // POST /api/parceiro-portal/realizar - Transition a pending appointment code to realized
  fastify.post('/api/parceiro-portal/realizar', async (request, reply) => {
    try {
      const user = request.user as any;
      const { codigo } = request.body as any;

      if (!codigo) {
        return reply.status(400).send({ error: 'Código da guia é obrigatório.' });
      }

      if (!user.id_pessoa) {
        return reply.status(400).send({ error: 'Usuário não está associado a nenhuma pessoa física/jurídica.' });
      }

      // Find partner
      const partner = await prisma.tb_parceiro.findFirst({
        where: { id_pessoa: BigInt(user.id_pessoa) }
      });

      if (!partner) {
        return reply.status(404).send({ error: 'Clínica parceira não encontrada.' });
      }

      // Find appointment with this code, belonging to this partner, in pending status
      const appointment = await prisma.tb_agendamento.findFirst({
        where: {
          codigo: codigo,
          id_parceiro: partner.id_parceiro,
          status: 'pendente'
        }
      });

      if (!appointment) {
        return reply.status(404).send({ error: 'Guia pendente não encontrada para esta clínica parceira.' });
      }

      // Update appointment status to realizado
      await prisma.tb_agendamento.update({
        where: { id_agendamento: appointment.id_agendamento },
        data: {
          status: 'realizado',
          modified_by: BigInt(user.id_usuario)
        }
      });

      return {
        message: 'Guia realizada com sucesso!',
        codigo: codigo
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao realizar guia.' });
    }
  });
}
