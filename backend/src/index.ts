import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import crypto from 'crypto';
import 'dotenv/config';
import prisma from './db';

const fastify = Fastify({ logger: true });

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-otium-token-key-change-in-production';

// Enable CORS so the Next.js frontend on port 3001 can communicate with the backend on port 3000
fastify.register(cors, {
  origin: '*', // In development, allow all origins
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
});

// Configure JWT plugin
fastify.register(jwt, {
  secret: JWT_SECRET
});

// Health check route
fastify.get('/api/health', async () => {
  return { status: 'OK', system: 'Otium' };
});

// POST /api/login route
fastify.post('/api/login', async (request, reply) => {
  try {
    const { email, password } = request.body as any;

    if (!email || !password) {
      return reply.status(400).send({ error: 'E-mail e senha são obrigatórios' });
    }

    // Compute MD5 hash of the password to match legacy database trigger
    const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

    // Query database using Prisma with joins
    const user = await prisma.tb_usuario.findFirst({
      where: {
        email: email,
        senha: hashedPassword,
        status: 1
      },
      include: {
        tb_role: true,
        tb_pessoa: {
          include: {
            tb_pessoa_fisica: true,
            tb_pessoa_juridica: true
          }
        }
      }
    });

    if (!user) {
      return reply.status(401).send({ error: 'E-mail ou senha incorretos' });
    }

    // Verify role authorization level (legacy restriction: level >= 4)
    if (user.tb_role.level < 4) {
      return reply.status(403).send({ error: 'Nível de acesso insuficiente para este portal' });
    }

    // Determine user display name based on person type (physical or legal person)
    let nomeUsuario = 'Usuário';
    if (user.tb_pessoa) {
      if (user.tb_pessoa.pessoa_juridica && user.tb_pessoa.tb_pessoa_juridica) {
        nomeUsuario = user.tb_pessoa.tb_pessoa_juridica.nome_fantasia;
      } else if (user.tb_pessoa.tb_pessoa_fisica && user.tb_pessoa.tb_pessoa_fisica.length > 0) {
        nomeUsuario = user.tb_pessoa.tb_pessoa_fisica[0].nome;
      }
    }

    let idParceiro: string | null = null;
    if (user.tb_role.level < 50) {
      const partner = await prisma.tb_parceiro.findFirst({
        where: { id_pessoa: user.id_pessoa || 0 }
      });
      if (partner) {
        idParceiro = partner.id_parceiro.toString();
      }
    }

    // Sign JWT token
    const token = fastify.jwt.sign({
      id_usuario: user.id_usuario.toString(),
      email: user.email,
      nome_usuario: nomeUsuario,
      id_parceiro: idParceiro,
      id_pessoa: user.id_pessoa?.toString() || null,
      role: {
        id_role: user.tb_role.id_role.toString(),
        nome: user.tb_role.nome,
        level: user.tb_role.level
      }
    }, {
      expiresIn: '7d' // Token expires in 7 days
    });

    return {
      message: 'Login realizado com sucesso!',
      token,
      user: {
        id_usuario: user.id_usuario.toString(),
        email: user.email,
        nome_usuario: nomeUsuario,
        id_parceiro: idParceiro,
        role: {
          nome: user.tb_role.nome,
          level: user.tb_role.level
        }
      }
    };
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Ocorreu um erro interno no servidor.' });
  }
});

import agendamentoRoutes from './routes/agendamentos.js';
import financeiroRoutes from './routes/financeiro.js';
import procedimentoRoutes from './routes/procedimentos.js';
import meusDadosRoutes from './routes/meus-dados.js';
import clienteRoutes from './routes/clientes.js';
import partnerRoutes from './routes/parceiros.js';
import caixaRoutes from './routes/caixa.js';
import funcionarioRoutes from './routes/funcionarios.js';
import relatorioRoutes from './routes/relatorios.js';
import representanteRoutes from './routes/representantes.js';
import usuarioRoutes from './routes/usuarios.js';
import parceiroPortalRoutes from './routes/parceiro-portal.js';
import unitsRoutes from './routes/unidades.js';

fastify.register(agendamentoRoutes);
fastify.register(financeiroRoutes);
fastify.register(procedimentoRoutes);
fastify.register(meusDadosRoutes);
fastify.register(clienteRoutes);
fastify.register(partnerRoutes);
fastify.register(caixaRoutes);
fastify.register(funcionarioRoutes);
fastify.register(relatorioRoutes);
fastify.register(representanteRoutes);
fastify.register(usuarioRoutes);
fastify.register(parceiroPortalRoutes);
fastify.register(unitsRoutes);

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Otium API listening on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
