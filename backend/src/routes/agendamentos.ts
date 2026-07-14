import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import prisma from '../db';

export default async function agendamentoRoutes(fastify: FastifyInstance) {
  // Pre-handler hook to authenticate all routes in this file
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Token de autenticação inválido ou ausente' });
    }
  });

  // GET /api/agendamentos - List and filter appointments
  fastify.get('/api/agendamentos', async (request, reply) => {
    try {
      const user = request.user as any;
      const level = user.role.level;

      const {
        page = '1',
        per_page = '100',
        status,
        data_criacao,
        id_parceiro,
        id_cliente,
        id_representante,
        search_field,
        search_value
      } = request.query as any;

      const pageNum = parseInt(page, 10) || 1;
      const limit = parseInt(per_page, 10) || 100;
      const skip = (pageNum - 1) * limit;

      // Base query filters
      const whereClause: Prisma.tb_agendamentoWhereInput = {};

      // Active unit scope filtering
      const activeUnitIdHeader = request.headers['x-active-unit-id'];
      if (activeUnitIdHeader) {
        const activeUnitId = BigInt(activeUnitIdHeader as string);
        whereClause.tb_usuario_tb_agendamento_created_byTotb_usuario = {
          tb_pessoa: {
            tb_pessoa_fisica: {
              some: {
                tb_funcionario: {
                  some: {
                    OR: [
                      { id_unidade: activeUnitId },
                      {
                        tb_funcionario_unidade: {
                          some: { id_unidade: activeUnitId }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        };
      }

      // If user level is below 5 (e.g. Partner/Doctor level 4), restrict results to their own partner id
      if (level < 5) {
        // Query to find partner associated with user
        const partnerUser = await prisma.tb_parceiro.findFirst({
          where: { id_pessoa: user.id_pessoa ? BigInt(user.id_pessoa) : 0 }
        });

        if (!partnerUser) {
          return reply.status(404).send({ error: 'Parceiro não encontrado para o usuário atual' });
        }

        whereClause.id_parceiro = partnerUser.id_parceiro;
        whereClause.status = { not: 'pendente' }; // Partners can't see pending appointments
      } else {
        // Administrative filter controls (level >= 5)
        if (id_parceiro) {
          whereClause.id_parceiro = BigInt(id_parceiro);
        }
        if (id_cliente) {
          whereClause.id_cliente = BigInt(id_cliente);
        }
        if (id_representante) {
          whereClause.id_representante = BigInt(id_representante);
        }
        if (status) {
          whereClause.status = status;
        }
        if (data_criacao) {
          const startOfDay = new Date(data_criacao);
          startOfDay.setUTCHours(0, 0, 0, 0);
          const endOfDay = new Date(data_criacao);
          endOfDay.setUTCHours(23, 59, 59, 999);

          whereClause.data_criacao = {
            gte: startOfDay,
            lte: endOfDay
          };
        }

        // Custom field searches
        if (search_field && search_value) {
          if (search_field === 'numero') {
            whereClause.codigo = { startsWith: search_value };
          } else if (search_field === 'cpf') {
            whereClause.tb_cliente = {
              tb_pessoa_fisica: {
                cpf: { startsWith: search_value }
              }
            };
          }
        }
      }

      // Fetch appointments
      const agendamentos = await prisma.tb_agendamento.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { id_agendamento: 'desc' },
        include: {
          tb_cliente: {
            include: {
              tb_pessoa_fisica: true
            }
          },
          tb_parceiro: true,
          tb_agendamento_procedimento: {
            include: {
              tb_parceiro_procedimento: true
            }
          }
        }
      });

      // Map data to the format expected by the frontend
      const mappedAgendamentos = agendamentos.map((ag) => {
        // Calculate total cost of procedures in the appointment
        const total = ag.tb_agendamento_procedimento.reduce((sum, proc) => {
          const valor = level < 5 
            ? Number(proc.tb_parceiro_procedimento.valor_parceiro) 
            : Number(proc.tb_parceiro_procedimento.valor_total);
          const quantidade = proc.quantidade;
          const desconto = Number(proc.desconto);
          return sum + (valor * quantidade - desconto);
        }, 0);

        return {
          id_agendamento: ag.id_agendamento.toString(),
          codigo: ag.codigo,
          status: ag.status,
          total: total.toFixed(2),
          data_criacao: ag.data_criacao,
          representante_pago: ag.representante_pago,
          id_representante: ag.id_representante?.toString() || null,
          cliente: {
            id_cliente: ag.id_cliente.toString(),
            nome: ag.tb_cliente.tb_pessoa_fisica.nome,
            nome_social: ag.tb_cliente.tb_pessoa_fisica.nome_social,
            cpf: ag.tb_cliente.tb_pessoa_fisica.cpf,
            telefone: ag.tb_cliente.tb_pessoa_fisica.telefone
          },
          parceiro: {
            id_parceiro: ag.id_parceiro.toString(),
            nome: ag.tb_parceiro.nome,
            telefone: ag.tb_parceiro.telefone
          }
        };
      });

      return mappedAgendamentos;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar agendamentos.' });
    }
  });

  // GET /api/agendamentos/:id - Get details of a single appointment
  fastify.get('/api/agendamentos/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const user = request.user as any;
      const level = user.role.level;

      const ag = await prisma.tb_agendamento.findUnique({
        where: { id_agendamento: BigInt(id) },
        include: {
          tb_cliente: {
            include: {
              tb_pessoa_fisica: true
            }
          },
          tb_parceiro: {
            include: {
              tb_endereco: true
            }
          },
          tb_agendamento_pagamento: true,
          tb_agendamento_procedimento: {
            include: {
              tb_parceiro_procedimento: {
                include: {
                  tb_procedimento: true
                }
              }
            }
          }
        }
      });

      if (!ag) {
        return reply.status(404).send({ error: 'Agendamento não encontrado.' });
      }

      // Check access permission for partners
      if (level < 5) {
        const partnerUser = await prisma.tb_parceiro.findFirst({
          where: { id_pessoa: user.id_pessoa ? BigInt(user.id_pessoa) : 0 }
        });
        if (!partnerUser || partnerUser.id_parceiro !== ag.id_parceiro) {
          return reply.status(403).send({ error: 'Acesso negado a este agendamento.' });
        }
      }

      // Calculate totals
      const total = ag.tb_agendamento_procedimento.reduce((sum, proc) => {
        const valor = level < 5 
          ? Number(proc.tb_parceiro_procedimento.valor_parceiro) 
          : Number(proc.tb_parceiro_procedimento.valor_total);
        const quantidade = proc.quantidade;
        const desconto = Number(proc.desconto);
        return sum + (valor * quantidade - desconto);
      }, 0);

      // Map to response object
      return {
        id_agendamento: ag.id_agendamento.toString(),
        codigo: ag.codigo,
        status: ag.status,
        total: total.toFixed(2),
        data_criacao: ag.data_criacao,
        representante_pago: ag.representante_pago,
        id_representante: ag.id_representante?.toString() || null,
        valor_representante: ag.tb_agendamento_pagamento?.valor_representante?.toString() || '0.00',
        valor_adicional_cartao: ag.tb_agendamento_pagamento?.valor_adicional_cartao?.toString() || '0.00',
        cliente: {
          id_cliente: ag.id_cliente.toString(),
          nome: ag.tb_cliente.tb_pessoa_fisica.nome,
          nome_social: ag.tb_cliente.tb_pessoa_fisica.nome_social,
          cpf: ag.tb_cliente.tb_pessoa_fisica.cpf,
          telefone: ag.tb_cliente.tb_pessoa_fisica.telefone
        },
        parceiro: {
          id_parceiro: ag.id_parceiro.toString(),
          nome: ag.tb_parceiro.nome,
          horario_funcionamento: ag.tb_parceiro.horario_funcionamento,
          telefone: ag.tb_parceiro.telefone,
          endereco: ag.tb_parceiro.tb_endereco ? {
            logradouro: ag.tb_parceiro.tb_endereco.logradouro,
            bairro: ag.tb_parceiro.tb_endereco.bairro,
            numero: ag.tb_parceiro.tb_endereco.numero,
            complemento: ag.tb_parceiro.tb_endereco.complemento,
            cep: ag.tb_parceiro.tb_endereco.cep,
            id_cidade: ag.tb_parceiro.tb_endereco.id_cidade
          } : null
        },
        procedimentos: ag.tb_agendamento_procedimento.map((proc) => ({
          id_parceiro_procedimento: proc.id_parceiro_procedimento.toString(),
          nome: proc.tb_parceiro_procedimento.tb_procedimento.nome,
          codigo_tuss: proc.tb_parceiro_procedimento.tb_procedimento.codigo_tuss,
          tipo: proc.tb_parceiro_procedimento.tb_procedimento.tipo,
          valor_total: proc.tb_parceiro_procedimento.valor_total.toString(),
          valor_parceiro: proc.tb_parceiro_procedimento.valor_parceiro.toString(),
          desconto: proc.desconto.toString(),
          comissao: proc.tb_parceiro_procedimento.comissao.toString(),
          quantidade: proc.quantidade,
          horario_atendimento: proc.tb_parceiro_procedimento.horario_atendimento,
          observacao: proc.tb_parceiro_procedimento.observacao,
          status: proc.tb_parceiro_procedimento.status
        }))
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar detalhes do agendamento.' });
    }
  });

  // POST /api/agendamentos - Create new appointment
  fastify.post('/api/agendamentos', async (request, reply) => {
    try {
      const user = request.user as any;
      const {
        id_cliente,
        id_representante,
        valor_pago_especie,
        valor_pago_cartao,
        valor_pago_pix,
        valor_adicional_cartao,
        valor_representante,
        valor_troco,
        procedimentos
      } = request.body as any;

      if (!id_cliente || !procedimentos || !Array.isArray(procedimentos) || procedimentos.length === 0) {
        return reply.status(400).send({ error: 'Dados do agendamento inválidos.' });
      }

      // Check open cash drawer
      const openCaixa = await prisma.tb_caixa.findFirst({
        where: {
          id_usuario: BigInt(user.id_usuario),
          data_fechamento: null
        }
      });

      if (!openCaixa) {
        return reply.status(400).send({ error: 'O usuário não possui um caixa aberto. Abra o caixa primeiro.' });
      }

      const createdIds = await prisma.$transaction(async (tx) => {
        // 1. Create payment entry
        const payment = await tx.tb_agendamento_pagamento.create({
          data: {
            tipo: 'entrada',
            descricao: 'Recebimento de Agendamento',
            valor_pago_especie: Number(valor_pago_especie || 0),
            valor_pago_cartao: Number(valor_pago_cartao || 0),
            valor_pago_pix: Number(valor_pago_pix || 0),
            valor_adicional_cartao: Number(valor_adicional_cartao || 0),
            valor_representante: Number(valor_representante || 0),
            valor_troco: Number(valor_troco || 0),
            id_caixa: openCaixa.id_caixa
          }
        });

        // Group procedures by partner
        const distinctPartners = Array.from(new Set(procedimentos.map((p: any) => p.id_parceiro)));
        const agendamentoIds: Record<string, bigint> = {};

        // 2. Create one agendamento per partner
        for (const pId of distinctPartners) {
          const ag = await tx.tb_agendamento.create({
            data: {
              status: 'pendente',
              id_cliente: BigInt(id_cliente),
              id_parceiro: BigInt(pId as string),
              id_representante: id_representante ? BigInt(id_representante) : null,
              id_agendamento_pagamento: payment.id_agendamento_pagamento,
              created_by: BigInt(user.id_usuario)
            }
          });

          agendamentoIds[pId as string] = ag.id_agendamento;

          // Set 9-padded code
          const code = ag.id_agendamento.toString().padStart(9, '0');
          await tx.tb_agendamento.update({
            where: { id_agendamento: ag.id_agendamento },
            data: { codigo: code }
          });
        }

        // 3. Create procedures links
        for (const p of procedimentos) {
          const agId = agendamentoIds[p.id_parceiro];
          await tx.tb_agendamento_procedimento.create({
            data: {
              id_agendamento: agId,
              id_parceiro_procedimento: BigInt(p.id_parceiro_procedimento),
              quantidade: Number(p.quantidade),
              desconto: Number(p.desconto || 0)
            }
          });
        }

        return Object.values(agendamentoIds).map(id => id.toString());
      });

      return {
        message: 'Agendamento cadastrado com sucesso!',
        ids: createdIds
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao cadastrar agendamento.' });
    }
  });
}
