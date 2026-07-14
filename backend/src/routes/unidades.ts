import { FastifyInstance } from 'fastify';
import prisma from '../db';

export default async function unitRoutes(fastify: FastifyInstance) {
  // Pre-handler hook to authenticate all routes in this file
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Token de autenticação inválido ou ausente' });
    }
  });

  // GET /api/unidades - List all system units
  fastify.get('/api/unidades', async (request, reply) => {
    try {
      const units = await prisma.tb_unidade.findMany({
        include: {
          tb_endereco: {
            include: {
              tb_cidade: true
            }
          }
        },
        orderBy: {
          label: 'asc'
        }
      });

      return units.map((u) => ({
        id_unidade: u.id_unidade.toString(),
        label: u.label,
        id_pessoa_juridica: u.id_pessoa_juridica.toString(),
        endereco: {
          logradouro: u.tb_endereco.logradouro,
          numero: u.tb_endereco.numero,
          bairro: u.tb_endereco.bairro,
          cep: u.tb_endereco.cep,
          cidade: u.tb_endereco.tb_cidade.nome,
          uf: u.tb_endereco.tb_cidade.uf,
          id_cidade: u.tb_endereco.id_cidade.toString()
        }
      }));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar unidades.' });
    }
  });

  // GET /api/cidades - List all cities
  fastify.get('/api/cidades', async (request, reply) => {
    try {
      const cities = await prisma.tb_cidade.findMany({
        orderBy: { nome: 'asc' }
      });
      return cities.map(c => ({
        id_cidade: c.id_cidade.toString(),
        nome: c.nome,
        uf: c.uf
      }));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar cidades.' });
    }
  });

  // POST /api/unidades - Create a new unit/branch for Otium
  fastify.post('/api/unidades', async (request, reply) => {
    try {
      const user = request.user as any;
      if (user.role.level < 50) {
        return reply.status(403).send({ error: 'Acesso negado: Nível insuficiente' });
      }

      const { label, logradouro, numero, bairro, cep, id_cidade } = request.body as any;

      if (!label) {
        return reply.status(400).send({ error: 'O nome (label) da unidade é obrigatório.' });
      }

      // Find first PJ as fallback
      const pj = await prisma.tb_pessoa_juridica.findFirst();
      if (!pj) {
        return reply.status(400).send({ error: 'Nenhuma entidade jurídica cadastrada no sistema.' });
      }

      // Find first city as fallback if id_cidade is not provided
      let cityId = id_cidade;
      if (!cityId) {
        const city = await prisma.tb_cidade.findFirst();
        if (!city) {
          return reply.status(500).send({ error: 'Nenhuma cidade cadastrada no banco de dados.' });
        }
        cityId = city.id_cidade;
      }

      // Create address
      const address = await prisma.tb_endereco.create({
        data: {
          nome: label,
          logradouro: logradouro || 'Rua Principal',
          numero: numero || 'S/N',
          bairro: bairro || 'Centro',
          cep: cep || '64000-000',
          id_cidade: Number(cityId)
        }
      });

      // Create unit
      const unit = await prisma.tb_unidade.create({
        data: {
          label,
          id_endereco: address.id_endereco,
          id_pessoa_juridica: pj.id_pessoa_juridica
        }
      });

      return {
        message: 'Unidade criada com sucesso!',
        id_unidade: unit.id_unidade.toString(),
        label: unit.label
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar unidade.' });
    }
  });

  // PUT /api/unidades/:id - Update unit details
  fastify.put('/api/unidades/:id', async (request, reply) => {
    try {
      const user = request.user as any;
      if (user.role.level < 50) {
        return reply.status(403).send({ error: 'Acesso negado: Nível insuficiente' });
      }

      const { id } = request.params as any;
      const { label, logradouro, numero, bairro, cep, id_cidade } = request.body as any;

      if (!label) {
        return reply.status(400).send({ error: 'O nome (label) da unidade é obrigatório.' });
      }

      const unit = await prisma.tb_unidade.findUnique({
        where: { id_unidade: BigInt(id) }
      });

      if (!unit) {
        return reply.status(404).send({ error: 'Unidade não encontrada.' });
      }

      // Update address
      await prisma.tb_endereco.update({
        where: { id_endereco: unit.id_endereco },
        data: {
          nome: label,
          logradouro: logradouro || 'Rua Principal',
          numero: numero || 'S/N',
          bairro: bairro || 'Centro',
          cep: cep || '64000-000',
          id_cidade: id_cidade ? Number(id_cidade) : undefined
        }
      });

      // Update unit
      const updatedUnit = await prisma.tb_unidade.update({
        where: { id_unidade: BigInt(id) },
        data: {
          label
        }
      });

      return {
        message: 'Unidade atualizada com sucesso!',
        id_unidade: updatedUnit.id_unidade.toString(),
        label: updatedUnit.label
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar unidade.' });
    }
  });

  // DELETE /api/unidades/:id - Delete unit
  fastify.delete('/api/unidades/:id', async (request, reply) => {
    try {
      const user = request.user as any;
      if (user.role.level < 50) {
        return reply.status(403).send({ error: 'Acesso negado: Nível insuficiente' });
      }

      const { id } = request.params as any;
      const unitId = BigInt(id);

      const unit = await prisma.tb_unidade.findUnique({
        where: { id_unidade: unitId }
      });

      if (!unit) {
        return reply.status(404).send({ error: 'Unidade não encontrada.' });
      }

      // Check if there are employees linked to this unit
      const employeeCount = await prisma.tb_funcionario.count({
        where: { id_unidade: unitId }
      });

      if (employeeCount > 0) {
        return reply.status(400).send({ error: 'Não é possível excluir esta unidade pois existem funcionários vinculados a ela.' });
      }

      // Delete unit
      await prisma.tb_unidade.delete({
        where: { id_unidade: unitId }
      });

      // Delete address
      try {
        await prisma.tb_endereco.delete({
          where: { id_endereco: unit.id_endereco }
        });
      } catch (err) {
        fastify.log.warn('Could not delete address: ' + err);
      }

      return {
        message: 'Unidade excluída com sucesso!'
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao excluir unidade.' });
    }
  });
}
