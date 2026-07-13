import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import prisma from '../db';

export default async function partnerRoutes(fastify: FastifyInstance) {
  // Pre-handler hook to authenticate all routes in this file
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Token de autenticação inválido ou ausente' });
    }
  });

  // GET /api/parceiros - List all partners/clinics (with search)
  fastify.get('/api/parceiros', async (request, reply) => {
    try {
      const { search } = request.query as any;

      const whereClause: Prisma.tb_parceiroWhereInput = {
        status: 1
      };

      if (search) {
        whereClause.nome = { contains: search };
      }

      const partners = await prisma.tb_parceiro.findMany({
        where: whereClause,
        include: {
          tb_endereco: {
            include: {
              tb_cidade: true
            }
          },
          tb_pessoa: {
            include: {
              tb_pessoa_fisica: true,
              tb_pessoa_juridica: true
            }
          }
        },
        orderBy: {
          nome: 'asc'
        }
      });

      return partners.map((p) => {
        const isPj = p.tb_pessoa.pessoa_juridica;
        const cnpj = p.tb_pessoa.tb_pessoa_juridica?.cnpj || null;
        const cpf = p.tb_pessoa.tb_pessoa_fisica?.[0]?.cpf || null;

        return {
          id_parceiro: p.id_parceiro.toString(),
          nome: p.nome,
          telefone: p.telefone,
          status: p.status,
          imagem: p.imagem,
          tipo: isPj ? 'PJ' : 'PF',
          cnpj_cpf: isPj ? cnpj : cpf,
          cidade: p.tb_endereco.tb_cidade.nome,
          estado: p.tb_endereco.tb_cidade.uf
        };
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar parceiros.' });
    }
  });

  // GET /api/parceiros/:id - Detailed view of a specific partner clinic
  fastify.get('/api/parceiros/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;

      const p = await prisma.tb_parceiro.findUnique({
        where: { id_parceiro: BigInt(id) },
        include: {
          tb_endereco: {
            include: {
              tb_cidade: true
            }
          },
          tb_pessoa: {
            include: {
              tb_pessoa_fisica: true,
              tb_pessoa_juridica: true
            }
          }
        }
      });

      if (!p) {
        return reply.status(404).send({ error: 'Parceiro não encontrado.' });
      }

      const isPj = p.tb_pessoa.pessoa_juridica;
      const pf = p.tb_pessoa.tb_pessoa_fisica?.[0] || null;
      const pj = p.tb_pessoa.tb_pessoa_juridica || null;

      return {
        id_parceiro: p.id_parceiro.toString(),
        nome: p.nome,
        horario_funcionamento: p.horario_funcionamento,
        ciclo_pagamento: p.ciclo_pagamento,
        data_fechamento_ciclo: p.data_fechamento_ciclo,
        telefone: p.telefone,
        imagem: p.imagem,
        banco: p.banco,
        agencia: p.agencia,
        conta: p.conta,
        chave_pix: p.chave_pix,
        status: p.status,
        tipo: isPj ? 'PJ' : 'PF',
        pf: pf ? {
          nome: pf.nome,
          cpf: pf.cpf,
          telefone: pf.telefone,
          email: pf.email
        } : null,
        pj: pj ? {
          razao_social: pj.razao_social,
          nome_fantasia: pj.nome_fantasia,
          cnpj: pj.cnpj,
          telefone: pj.telefone,
          email: pj.email
        } : null,
        endereco: {
          id_endereco: p.tb_endereco.id_endereco.toString(),
          nome: p.tb_endereco.nome,
          cep: p.tb_endereco.cep,
          logradouro: p.tb_endereco.logradouro,
          numero: p.tb_endereco.numero,
          complemento: p.tb_endereco.complemento,
          bairro: p.tb_endereco.bairro,
          cidade: p.tb_endereco.tb_cidade.nome,
          estado: p.tb_endereco.tb_cidade.uf
        }
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar detalhes do parceiro.' });
    }
  });

  // PUT /api/parceiros/:id - Update partner details
  fastify.put('/api/parceiros/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = request.body as any;
      const {
        nome,
        horario_funcionamento,
        ciclo_pagamento,
        telefone,
        banco,
        agencia,
        conta,
        chave_pix,
        endereco, // { logradouro, numero, complemento, bairro, cep }
        pj, // { razao_social, nome_fantasia, email }
        pf  // { nome, email }
      } = data;

      const p = await prisma.tb_parceiro.findUnique({
        where: { id_parceiro: BigInt(id) },
        include: {
          tb_endereco: true,
          tb_pessoa: {
            include: {
              tb_pessoa_fisica: true,
              tb_pessoa_juridica: true
            }
          }
        }
      });

      if (!p) {
        return reply.status(404).send({ error: 'Parceiro não encontrado.' });
      }

      // 1. Update partner itself
      await prisma.tb_parceiro.update({
        where: { id_parceiro: p.id_parceiro },
        data: {
          nome: nome !== undefined ? nome : p.nome,
          horario_funcionamento: horario_funcionamento !== undefined ? horario_funcionamento : p.horario_funcionamento,
          ciclo_pagamento: ciclo_pagamento !== undefined ? Number(ciclo_pagamento) : p.ciclo_pagamento,
          telefone: telefone !== undefined ? telefone : p.telefone,
          banco: banco !== undefined ? banco : p.banco,
          agencia: agencia !== undefined ? agencia : p.agencia,
          conta: conta !== undefined ? conta : p.conta,
          chave_pix: chave_pix !== undefined ? (chave_pix || null) : p.chave_pix,
          data_modificacao: new Date()
        }
      });

      // 2. Update address
      if (endereco) {
        await prisma.tb_endereco.update({
          where: { id_endereco: p.id_endereco },
          data: {
            logradouro: endereco.logradouro !== undefined ? endereco.logradouro : p.tb_endereco.logradouro,
            numero: endereco.numero !== undefined ? endereco.numero : p.tb_endereco.numero,
            complemento: endereco.complemento !== undefined ? endereco.complemento : p.tb_endereco.complemento,
            bairro: endereco.bairro !== undefined ? endereco.bairro : p.tb_endereco.bairro,
            cep: endereco.cep !== undefined ? endereco.cep : p.tb_endereco.cep
          }
        });
      }

      // 3. Update person details
      const isPj = p.tb_pessoa.pessoa_juridica;
      if (isPj && pj && p.tb_pessoa.tb_pessoa_juridica) {
        await prisma.tb_pessoa_juridica.update({
          where: { id_pessoa_juridica: p.tb_pessoa.tb_pessoa_juridica.id_pessoa_juridica },
          data: {
            razao_social: pj.razao_social !== undefined ? pj.razao_social : p.tb_pessoa.tb_pessoa_juridica.razao_social,
            nome_fantasia: pj.nome_fantasia !== undefined ? pj.nome_fantasia : p.tb_pessoa.tb_pessoa_juridica.nome_fantasia,
            email: pj.email !== undefined ? pj.email : p.tb_pessoa.tb_pessoa_juridica.email,
            data_modificacao: new Date()
          }
        });
      } else if (!isPj && pf && p.tb_pessoa.tb_pessoa_fisica?.[0]) {
        const pfRecord = p.tb_pessoa.tb_pessoa_fisica[0];
        await prisma.tb_pessoa_fisica.update({
          where: { id_pessoa_fisica: pfRecord.id_pessoa_fisica },
          data: {
            nome: pf.nome !== undefined ? pf.nome : pfRecord.nome,
            email: pf.email !== undefined ? pf.email : pfRecord.email,
            data_modificacao: new Date()
          }
        });
      }

      return { message: 'Dados do parceiro atualizados com sucesso!' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar dados do parceiro.' });
    }
  });
}
