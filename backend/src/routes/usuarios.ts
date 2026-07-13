import { FastifyInstance } from 'fastify';
import prisma from '../db';
import crypto from 'crypto';

export default async function usuarioRoutes(fastify: FastifyInstance) {
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

  // GET /api/usuarios - List users
  fastify.get('/api/usuarios', async (request, reply) => {
    try {
      const users = await prisma.tb_usuario.findMany({
        include: {
          tb_role: true,
          tb_pessoa: {
            include: {
              tb_pessoa_fisica: true,
              tb_pessoa_juridica: true
            }
          }
        },
        orderBy: { email: 'asc' }
      });

      return users.map((u) => {
        let nomeUsuario = 'Usuário';
        let cpfCnpj = '';

        if (u.tb_pessoa) {
          if (u.tb_pessoa.pessoa_juridica && u.tb_pessoa.tb_pessoa_juridica) {
            nomeUsuario = u.tb_pessoa.tb_pessoa_juridica.nome_fantasia;
            cpfCnpj = u.tb_pessoa.tb_pessoa_juridica.cnpj;
          } else if (u.tb_pessoa.tb_pessoa_fisica && u.tb_pessoa.tb_pessoa_fisica.length > 0) {
            nomeUsuario = u.tb_pessoa.tb_pessoa_fisica[0].nome;
            cpfCnpj = u.tb_pessoa.tb_pessoa_fisica[0].cpf;
          }
        }

        return {
          id_usuario: u.id_usuario.toString(),
          email: u.email,
          status: u.status,
          ultimo_acesso: u.ultimo_acesso,
          role: {
            id_role: u.tb_role.id_role.toString(),
            nome: u.tb_role.nome,
            level: u.tb_role.level
          },
          nome_usuario: nomeUsuario,
          cpf_cnpj: cpfCnpj
        };
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar usuários.' });
    }
  });

  // GET /api/roles - List all available roles
  fastify.get('/api/roles', async (request, reply) => {
    try {
      const roles = await prisma.tb_role.findMany({
        orderBy: { level: 'asc' }
      });

      return roles.map((r) => ({
        id_role: r.id_role.toString(),
        nome: r.nome,
        level: r.level
      }));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar perfis.' });
    }
  });

  // POST /api/usuarios - Create user
  fastify.post('/api/usuarios', async (request, reply) => {
    try {
      const data = request.body as any;

      if (!data.email || !data.senha || !data.id_role || !data.nome || !data.cpf) {
        return reply.status(400).send({ error: 'Campos obrigatórios ausentes.' });
      }

      // Check if email already exists
      const existingUser = await prisma.tb_usuario.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        return reply.status(400).send({ error: 'Este e-mail já está sendo utilizado.' });
      }

      // Check if CPF already exists in physical person
      const cpfClean = data.cpf.replace(/[.-]/g, '');
      const existingPF = await prisma.tb_pessoa_fisica.findUnique({
        where: { cpf: cpfClean }
      });

      let id_pessoa: bigint;

      if (existingPF) {
        // If physical person already exists, link user to the existing tb_pessoa
        id_pessoa = existingPF.id_pessoa;
      } else {
        // Otherwise, create tb_pessoa and tb_pessoa_fisica in a transaction
        const result = await prisma.$transaction(async (tx) => {
          const pessoa = await tx.tb_pessoa.create({
            data: {
              pessoa_juridica: false
            }
          });

          await tx.tb_pessoa_fisica.create({
            data: {
              nome: data.nome,
              nome_social: data.nome_social || null,
              sexo: data.sexo === undefined ? true : Boolean(data.sexo),
              data_nascimento: data.data_nascimento ? new Date(data.data_nascimento) : new Date(),
              cpf: cpfClean,
              rg: data.rg || null,
              telefone: data.telefone || '',
              email: data.email,
              id_pessoa: pessoa.id_pessoa
            }
          });

          return pessoa;
        });
        id_pessoa = result.id_pessoa;
      }

      // Hash password using md5 to match legacy DB trigger & login validation
      const hashedPassword = crypto.createHash('md5').update(data.senha).digest('hex');

      const newUser = await prisma.tb_usuario.create({
        data: {
          email: data.email,
          senha: hashedPassword,
          status: data.status !== undefined ? Number(data.status) : 1,
          id_role: BigInt(data.id_role),
          id_pessoa: id_pessoa
        }
      });

      return {
        message: 'Usuário cadastrado com sucesso!',
        id_usuario: newUser.id_usuario.toString()
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao cadastrar usuário.' });
    }
  });

  // PUT /api/usuarios/:id - Update user status, role, email and optionally password
  fastify.put('/api/usuarios/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = request.body as any;

      const user = await prisma.tb_usuario.findUnique({
        where: { id_usuario: BigInt(id) }
      });

      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado.' });
      }

      const updateData: any = {};
      if (data.email) {
        // Verify unique email
        const dupUser = await prisma.tb_usuario.findFirst({
          where: {
            email: data.email,
            id_usuario: { not: BigInt(id) }
          }
        });
        if (dupUser) {
          return reply.status(400).send({ error: 'Este e-mail já está em uso por outro usuário.' });
        }
        updateData.email = data.email;
      }

      if (data.status !== undefined) {
        updateData.status = Number(data.status);
      }

      if (data.id_role) {
        updateData.id_role = BigInt(data.id_role);
      }

      if (data.senha) {
        updateData.senha = crypto.createHash('md5').update(data.senha).digest('hex');
      }

      await prisma.tb_usuario.update({
        where: { id_usuario: BigInt(id) },
        data: updateData
      });

      return { message: 'Usuário atualizado com sucesso!' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar usuário.' });
    }
  });
}
