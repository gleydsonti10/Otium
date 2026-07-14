import { FastifyInstance } from 'fastify';
import prisma from '../db';

export default async function funcionarioRoutes(fastify: FastifyInstance) {
  // Pre-handler hook to authenticate and restrict to admins (level >= 50)
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
      const user = request.user as any;
      if (user.role.level < 50) {
        return reply.status(403).send({ error: 'Acesso negado: Nível insuficiente' });
      }
    } catch (err) {
      return reply.status(401).send({ error: 'Token de autenticação inválido ou ausente' });
    }
  });

  // GET /api/funcionarios - List all employees
  fastify.get('/api/funcionarios', async (request, reply) => {
    try {
      const employees = await prisma.tb_funcionario.findMany({
        include: {
          tb_pessoa_fisica: true,
          tb_unidade: true,
          tb_funcionario_unidade: {
            include: {
              tb_unidade: true
            }
          }
        },
        orderBy: {
          tb_pessoa_fisica: {
            nome: 'asc'
          }
        }
      });

      return employees.map((e) => ({
        id_funcionario: e.id_funcionario.toString(),
        id_unidade: e.id_unidade.toString(),
        unidade_label: e.tb_unidade.label,
        unidades_ids: [
          e.id_unidade.toString(),
          ...e.tb_funcionario_unidade.map(fu => fu.id_unidade.toString())
        ].filter((value, index, self) => self.indexOf(value) === index),
        unidades_adicionais: e.tb_funcionario_unidade.map(fu => ({
          id_unidade: fu.id_unidade.toString(),
          label: fu.tb_unidade.label
        })),
        id_pessoa_fisica: e.id_pessoa_fisica.toString(),
        nome: e.tb_pessoa_fisica.nome,
        nome_social: e.tb_pessoa_fisica.nome_social,
        sexo: e.tb_pessoa_fisica.sexo,
        data_nascimento: e.tb_pessoa_fisica.data_nascimento,
        cpf: e.tb_pessoa_fisica.cpf,
        rg: e.tb_pessoa_fisica.rg,
        telefone: e.tb_pessoa_fisica.telefone,
        telefone2: e.tb_pessoa_fisica.telefone2,
        email: e.tb_pessoa_fisica.email,
        pai: e.tb_pessoa_fisica.pai,
        mae: e.tb_pessoa_fisica.mae,
        responsavel: e.tb_pessoa_fisica.responsavel
      }));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar funcionários.' });
    }
  });



  // POST /api/funcionarios - Create new employee
  fastify.post('/api/funcionarios', async (request, reply) => {
    try {
      const data = request.body as any;

      const unidadesIds: string[] = Array.isArray(data.unidades_ids) && data.unidades_ids.length > 0
        ? data.unidades_ids
        : (data.id_unidade ? [data.id_unidade.toString()] : []);

      if (!data.nome || !data.cpf || !data.telefone || unidadesIds.length === 0 || !data.data_nascimento) {
        return reply.status(400).send({ error: 'Campos obrigatórios ausentes. Associe pelo menos uma unidade.' });
      }

      // Check if CPF already exists
      const existingPF = await prisma.tb_pessoa_fisica.findUnique({
        where: { cpf: data.cpf.replace(/[.-]/g, '') }
      });

      if (existingPF) {
        return reply.status(400).send({ error: 'Já existe uma pessoa cadastrada com este CPF.' });
      }

      // Create using transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create tb_pessoa
        const pessoa = await tx.tb_pessoa.create({
          data: {
            pessoa_juridica: false
          }
        });

        // 2. Create tb_pessoa_fisica
        const pf = await tx.tb_pessoa_fisica.create({
          data: {
            nome: data.nome,
            nome_social: data.nome_social || null,
            sexo: data.sexo === undefined ? true : Boolean(data.sexo),
            data_nascimento: new Date(data.data_nascimento),
            cpf: data.cpf.replace(/[.-]/g, ''),
            rg: data.rg || null,
            telefone: data.telefone,
            telefone2: data.telefone2 || null,
            email: data.email || null,
            pai: data.pai || null,
            mae: data.mae || null,
            responsavel: data.responsavel || null,
            id_pessoa: pessoa.id_pessoa
          }
        });

        // 3. Create tb_funcionario
        const func = await tx.tb_funcionario.create({
          data: {
            id_pessoa_fisica: pf.id_pessoa_fisica,
            id_unidade: BigInt(unidadesIds[0])
          }
        });

        // 4. Create tb_funcionario_unidade mappings
        await tx.tb_funcionario_unidade.createMany({
          data: unidadesIds.map((uid: string) => ({
            id_funcionario: func.id_funcionario,
            id_unidade: BigInt(uid)
          }))
        });

        return func;
      });

      return {
        message: 'Funcionário cadastrado com sucesso!',
        id_funcionario: result.id_funcionario.toString()
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao cadastrar funcionário.' });
    }
  });

  // PUT /api/funcionarios/:id - Update employee
  fastify.put('/api/funcionarios/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = request.body as any;

      const employee = await prisma.tb_funcionario.findUnique({
        where: { id_funcionario: BigInt(id) }
      });

      if (!employee) {
        return reply.status(404).send({ error: 'Funcionário não encontrado.' });
      }

      const unidadesIds: string[] = Array.isArray(data.unidades_ids) && data.unidades_ids.length > 0
        ? data.unidades_ids
        : (data.id_unidade ? [data.id_unidade.toString()] : []);

      await prisma.$transaction(async (tx) => {
        // 1. Update tb_pessoa_fisica
        await tx.tb_pessoa_fisica.update({
          where: { id_pessoa_fisica: employee.id_pessoa_fisica },
          data: {
            nome: data.nome,
            nome_social: data.nome_social || null,
            sexo: data.sexo === undefined ? true : Boolean(data.sexo),
            data_nascimento: data.data_nascimento ? new Date(data.data_nascimento) : undefined,
            rg: data.rg || null,
            telefone: data.telefone,
            telefone2: data.telefone2 || null,
            email: data.email || null,
            pai: data.pai || null,
            mae: data.mae || null,
            responsavel: data.responsavel || null
          }
        });

        // 2. Update tb_funcionario (primary unit)
        if (unidadesIds.length > 0) {
          await tx.tb_funcionario.update({
            where: { id_funcionario: employee.id_funcionario },
            data: {
              id_unidade: BigInt(unidadesIds[0])
            }
          });

          // Delete existing unit mappings
          await tx.tb_funcionario_unidade.deleteMany({
            where: { id_funcionario: employee.id_funcionario }
          });

          // Insert new unit mappings
          await tx.tb_funcionario_unidade.createMany({
            data: unidadesIds.map((uid: string) => ({
              id_funcionario: employee.id_funcionario,
              id_unidade: BigInt(uid)
            }))
          });
        }
      });

      return { message: 'Funcionário atualizado com sucesso!' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar funcionário.' });
    }
  });

  // DELETE /api/funcionarios/:id - Delete employee
  fastify.delete('/api/funcionarios/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;

      const employee = await prisma.tb_funcionario.findUnique({
        where: { id_funcionario: BigInt(id) }
      });

      if (!employee) {
        return reply.status(404).send({ error: 'Funcionário não encontrado.' });
      }

      // Delete funcionario record
      await prisma.tb_funcionario.delete({
        where: { id_funcionario: employee.id_funcionario }
      });

      return { message: 'Funcionário excluído com sucesso!' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao excluir funcionário.' });
    }
  });
}
