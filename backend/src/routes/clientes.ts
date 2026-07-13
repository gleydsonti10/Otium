import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import prisma from '../db';

export default async function clienteRoutes(fastify: FastifyInstance) {
  // Pre-handler hook to authenticate all routes in this file
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Token de autenticação inválido ou ausente' });
    }
  });

  // GET /api/clientes - List all clients/patients (with search)
  fastify.get('/api/clientes', async (request, reply) => {
    try {
      const { search } = request.query as any;

      const whereClause: Prisma.tb_clienteWhereInput = {};

      if (search) {
        const cleanDigits = search.replace(/\D/g, '');
        whereClause.tb_pessoa_fisica = {
          OR: [
            { nome: { contains: search } },
            { cpf: { contains: search } },
            ...(cleanDigits ? [{ cpf: { contains: cleanDigits } }] : [])
          ]
        };
      }

      const clientes = await prisma.tb_cliente.findMany({
        where: whereClause,
        take: 100,
        include: {
          tb_pessoa_fisica: true,
          tb_endereco: {
            include: {
              tb_cidade: true
            }
          }
        },
        orderBy: {
          tb_pessoa_fisica: {
            nome: 'asc'
          }
        }
      });

      return clientes.map((c) => ({
        id_cliente: c.id_cliente.toString(),
        foto: c.foto,
        status: c.status,
        nome: c.tb_pessoa_fisica.nome,
        cpf: c.tb_pessoa_fisica.cpf,
        telefone: c.tb_pessoa_fisica.telefone,
        email: c.tb_pessoa_fisica.email,
        cidade: c.tb_endereco.tb_cidade.nome,
        estado: c.tb_endereco.tb_cidade.uf
      }));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar clientes.' });
    }
  });

  // GET /api/clientes/:id - Detailed view of a specific patient
  fastify.get('/api/clientes/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;

      const c = await prisma.tb_cliente.findUnique({
        where: { id_cliente: BigInt(id) },
        include: {
          tb_pessoa_fisica: true,
          tb_endereco: {
            include: {
              tb_cidade: true
            }
          }
        }
      });

      if (!c) {
        return reply.status(404).send({ error: 'Paciente não encontrado.' });
      }

      return {
        id_cliente: c.id_cliente.toString(),
        foto: c.foto,
        status: c.status,
        data_criacao: c.data_criacao,
        pf: {
          id_pessoa_fisica: c.tb_pessoa_fisica.id_pessoa_fisica.toString(),
          nome: c.tb_pessoa_fisica.nome,
          nome_social: c.tb_pessoa_fisica.nome_social,
          sexo: c.tb_pessoa_fisica.sexo,
          email: c.tb_pessoa_fisica.email,
          rg: c.tb_pessoa_fisica.rg,
          cpf: c.tb_pessoa_fisica.cpf,
          data_nascimento: c.tb_pessoa_fisica.data_nascimento,
          telefone: c.tb_pessoa_fisica.telefone,
          telefone2: c.tb_pessoa_fisica.telefone2,
          pai: c.tb_pessoa_fisica.pai,
          mae: c.tb_pessoa_fisica.mae,
          responsavel: c.tb_pessoa_fisica.responsavel
        },
        endereco: {
          id_endereco: c.tb_endereco.id_endereco.toString(),
          nome: c.tb_endereco.nome,
          cep: c.tb_endereco.cep,
          logradouro: c.tb_endereco.logradouro,
          numero: c.tb_endereco.numero,
          complemento: c.tb_endereco.complemento,
          bairro: c.tb_endereco.bairro,
          id_cidade: c.tb_endereco.id_cidade,
          cidade: c.tb_endereco.tb_cidade.nome,
          estado: c.tb_endereco.tb_cidade.uf
        }
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar detalhes do cliente.' });
    }
  });
}
