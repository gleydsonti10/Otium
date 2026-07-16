import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import prisma from '../db';
import crypto from 'crypto';

export default async function clientePortalRoutes(fastify: FastifyInstance) {
  // Public Endpoint: Client Sign-up
  fastify.post('/api/register-cliente', async (request, reply) => {
    try {
      const data = request.body as any;
      const {
        nome,
        sexo, // boolean or 'M'/'F'
        data_nascimento,
        cpf,
        rg,
        telefone,
        telefone2,
        email,
        senha,
        // Address
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        id_cidade,
        // Covenant details
        convenio,
        plano,
        matricula
      } = data;

      if (!nome || !cpf || !data_nascimento || !telefone || !email || !senha || !id_cidade) {
        return reply.status(400).send({ error: 'Preencha todos os campos obrigatórios.' });
      }

      // Check if email already exists
      const existingUser = await prisma.tb_usuario.findUnique({
        where: { email }
      });
      if (existingUser) {
        return reply.status(400).send({ error: 'Este e-mail já está em uso.' });
      }

      // Check if CPF already exists
      const cleanCpf = cpf.replace(/[.-]/g, '');
      const existingPF = await prisma.tb_pessoa_fisica.findUnique({
        where: { cpf: cleanCpf }
      });
      if (existingPF) {
        return reply.status(400).send({ error: 'Este CPF já está cadastrado.' });
      }

      // Hash password using MD5 to match database standards
      const md5Password = crypto.createHash('md5').update(senha).digest('hex');

      // Create all records inside a transaction
      const client = await prisma.$transaction(async (tx) => {
        // 1. Create tb_pessoa
        const pessoa = await tx.tb_pessoa.create({
          data: {
            pessoa_juridica: false
          }
        });

        // 2. Create tb_pessoa_fisica
        const pf = await tx.tb_pessoa_fisica.create({
          data: {
            nome,
            sexo: typeof sexo === 'boolean' ? sexo : (sexo === 'M' || sexo === 'masculino'),
            data_nascimento: new Date(data_nascimento),
            cpf: cleanCpf,
            rg: rg || null,
            telefone,
            telefone2: telefone2 || null,
            email,
            id_pessoa: pessoa.id_pessoa
          }
        });

        // 3. Create tb_endereco
        const endereco = await tx.tb_endereco.create({
          data: {
            nome: 'Residencial',
            cep: cep || '',
            logradouro: logradouro || '',
            numero: numero || '',
            complemento: complemento || '',
            bairro: bairro || '',
            id_cidade: Number(id_cidade)
          }
        });

        // 4. Create tb_usuario (Role Cliente level 1, id_role = 5)
        const usuario = await tx.tb_usuario.create({
          data: {
            email,
            senha: md5Password,
            status: 1,
            id_role: BigInt(5), // Cliente role
            id_pessoa: pessoa.id_pessoa
          }
        });

        // 5. Create tb_cliente
        const createdClient = await tx.tb_cliente.create({
          data: {
            convenio: convenio || 'Particular',
            plano: plano || 'Básico',
            matricula: matricula || `OT-${Math.floor(100000 + Math.random() * 900000)}`,
            validade: new Date(new Date().setFullYear(new Date().getFullYear() + 2)), // 2 years validation
            id_pessoa_fisica: pf.id_pessoa_fisica,
            id_endereco: endereco.id_endereco,
            created_by: usuario.id_usuario
          }
        });

        return { id_usuario: usuario.id_usuario, id_cliente: createdClient.id_cliente };
      });

      return {
        message: 'Cadastro realizado com sucesso!',
        id_usuario: client.id_usuario.toString(),
        id_cliente: client.id_cliente.toString()
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao realizar cadastro do cliente.' });
    }
  });

  // Public Endpoint: List cities for sign-up form
  fastify.get('/api/public/cidades', async (request, reply) => {
    try {
      const cidades = await prisma.tb_cidade.findMany({
        orderBy: { nome: 'asc' }
      });
      return cidades.map((c) => ({
        id_cidade: c.id_cidade,
        nome: c.nome,
        uf: c.uf
      }));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar cidades.' });
    }
  });

  // Public Endpoint: List units for location details
  fastify.get('/api/public/unidades', async (request, reply) => {
    try {
      const units = await prisma.tb_unidade.findMany({
        include: {
          tb_endereco: {
            include: {
              tb_cidade: true
            }
          }
        },
        orderBy: { label: 'asc' }
      });

      return units.map((u) => ({
        id_unidade: u.id_unidade.toString(),
        nome: u.label,
        cidade: u.tb_endereco.tb_cidade.nome,
        uf: u.tb_endereco.tb_cidade.uf
      }));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar unidades.' });
    }
  });

  // ----------------------------------------------------
  // Protected Routes Group
  // ----------------------------------------------------

  // JWT Verification Hook for client routes
  const verifyClientJWT = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
      const user = request.user as any;
      if (user.role.level !== 1) {
        return reply.status(403).send({ error: 'Acesso restrito ao portal do cliente.' });
      }
    } catch (err) {
      return reply.status(401).send({ error: 'Token de autenticação inválido ou expirado.' });
    }
  };

  // GET /api/cliente/perfil - Client Profile
  fastify.get('/api/cliente/perfil', { preHandler: verifyClientJWT }, async (request, reply) => {
    try {
      const user = request.user as any;
      const idCliente = user.id_cliente;

      if (!idCliente) {
        return reply.status(400).send({ error: 'ID do cliente não encontrado no token.' });
      }

      const client = await prisma.tb_cliente.findUnique({
        where: { id_cliente: BigInt(idCliente) },
        include: {
          tb_pessoa_fisica: true,
          tb_endereco: {
            include: {
              tb_cidade: true
            }
          }
        }
      });

      if (!client) {
        return reply.status(404).send({ error: 'Cadastro do cliente não encontrado.' });
      }

      return {
        id_cliente: client.id_cliente.toString(),
        foto: client.foto,
        convenio: client.convenio,
        plano: client.plano,
        matricula: client.matricula,
        validade: client.validade,
        pf: {
          nome: client.tb_pessoa_fisica.nome,
          nome_social: client.tb_pessoa_fisica.nome_social,
          sexo: client.tb_pessoa_fisica.sexo,
          data_nascimento: client.tb_pessoa_fisica.data_nascimento,
          cpf: client.tb_pessoa_fisica.cpf,
          rg: client.tb_pessoa_fisica.rg,
          telefone: client.tb_pessoa_fisica.telefone,
          telefone2: client.tb_pessoa_fisica.telefone2,
          email: client.tb_pessoa_fisica.email
        },
        endereco: {
          id_endereco: client.tb_endereco.id_endereco.toString(),
          nome: client.tb_endereco.nome,
          cep: client.tb_endereco.cep,
          logradouro: client.tb_endereco.logradouro,
          numero: client.tb_endereco.numero,
          complemento: client.tb_endereco.complemento,
          bairro: client.tb_endereco.bairro,
          id_cidade: client.tb_endereco.id_cidade,
          cidade: client.tb_endereco.tb_cidade.nome,
          uf: client.tb_endereco.tb_cidade.uf
        }
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar perfil do cliente.' });
    }
  });

  // PUT /api/cliente/perfil - Update Profile
  fastify.put('/api/cliente/perfil', { preHandler: verifyClientJWT }, async (request, reply) => {
    try {
      const user = request.user as any;
      const idCliente = user.id_cliente;
      const data = request.body as any;

      if (!idCliente) {
        return reply.status(400).send({ error: 'ID do cliente não encontrado.' });
      }

      const client = await prisma.tb_cliente.findUnique({
        where: { id_cliente: BigInt(idCliente) }
      });

      if (!client) {
        return reply.status(404).send({ error: 'Cliente não encontrado.' });
      }

      await prisma.$transaction(async (tx) => {
        // Update tb_pessoa_fisica
        await tx.tb_pessoa_fisica.update({
          where: { id_pessoa_fisica: client.id_pessoa_fisica },
          data: {
            nome: data.nome,
            nome_social: data.nome_social || null,
            sexo: typeof data.sexo === 'boolean' ? data.sexo : data.sexo === 'M',
            data_nascimento: data.data_nascimento ? new Date(data.data_nascimento) : undefined,
            telefone: data.telefone,
            telefone2: data.telefone2 || null
          }
        });

        // Update tb_endereco
        await tx.tb_endereco.update({
          where: { id_endereco: client.id_endereco },
          data: {
            cep: data.cep || '',
            logradouro: data.logradouro || '',
            numero: data.numero || '',
            complemento: data.complemento || '',
            bairro: data.bairro || '',
            id_cidade: data.id_cidade ? Number(data.id_cidade) : undefined
          }
        });

        // Update tb_cliente attributes
        await tx.tb_cliente.update({
          where: { id_cliente: client.id_cliente },
          data: {
            convenio: data.convenio,
            plano: data.plano,
            foto: data.foto
          }
        });
      });

      return { message: 'Perfil atualizado com sucesso!' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar perfil.' });
    }
  });

  // GET /api/cliente/carteirinha - Member card details
  fastify.get('/api/cliente/carteirinha', { preHandler: verifyClientJWT }, async (request, reply) => {
    try {
      const user = request.user as any;
      const idCliente = user.id_cliente;

      const client = await prisma.tb_cliente.findUnique({
        where: { id_cliente: BigInt(idCliente) },
        include: {
          tb_pessoa_fisica: true
        }
      });

      if (!client) {
        return reply.status(404).send({ error: 'Cliente não encontrado.' });
      }

      return {
        nome: client.tb_pessoa_fisica.nome,
        cpf: client.tb_pessoa_fisica.cpf,
        matricula: client.matricula,
        convenio: client.convenio,
        plano: client.plano,
        validade: client.validade,
        qr_code: `OTIUM-CARD-${client.matricula}-${client.tb_pessoa_fisica.cpf}`
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar dados da carteirinha.' });
    }
  });

  // GET /api/cliente/procedimentos - List procedures for selection
  fastify.get('/api/cliente/procedimentos', { preHandler: verifyClientJWT }, async (request, reply) => {
    try {
      const procs = await prisma.tb_procedimento.findMany({
        orderBy: { nome: 'asc' },
        include: {
          tb_especialidade: true
        }
      });

      return procs.map((p) => ({
        id_procedimento: p.id_procedimento.toString(),
        nome: p.nome,
        tipo: p.tipo,
        codigo_tuss: p.codigo_tuss,
        especialidade: p.tb_especialidade?.nome || 'Geral'
      }));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar procedimentos.' });
    }
  });

  // GET /api/cliente/parceiros-por-procedimento/:id - List clinics/doctors offering a procedure
  fastify.get('/api/cliente/parceiros-por-procedimento/:id', { preHandler: verifyClientJWT }, async (request, reply) => {
    try {
      const { id } = request.params as any;

      const partnerProcs = await prisma.tb_parceiro_procedimento.findMany({
        where: {
          id_procedimento: Number(id),
          status: 1
        },
        include: {
          tb_parceiro: {
            include: {
              tb_endereco: {
                include: {
                  tb_cidade: true
                }
              }
            }
          }
        }
      });

      return partnerProcs.map((pp) => ({
        id_parceiro_procedimento: pp.id_parceiro_procedimento.toString(),
        id_parceiro: pp.tb_parceiro.id_parceiro.toString(),
        nome_parceiro: pp.tb_parceiro.nome,
        telefone: pp.tb_parceiro.telefone,
        valor_total: pp.valor_total.toString(),
        horario_atendimento: pp.horario_atendimento,
        observacao: pp.observacao,
        endereco: {
          logradouro: pp.tb_parceiro.tb_endereco.logradouro,
          numero: pp.tb_parceiro.tb_endereco.numero,
          bairro: pp.tb_parceiro.tb_endereco.bairro,
          cidade: pp.tb_parceiro.tb_endereco.tb_cidade.nome,
          uf: pp.tb_parceiro.tb_endereco.tb_cidade.uf
        }
      }));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar parceiros por procedimento.' });
    }
  });

  // GET /api/cliente/agendamentos - Client's own appointments
  fastify.get('/api/cliente/agendamentos', { preHandler: verifyClientJWT }, async (request, reply) => {
    try {
      const user = request.user as any;
      const idCliente = user.id_cliente;

      const agendamentos = await prisma.tb_agendamento.findMany({
        where: {
          id_cliente: BigInt(idCliente)
        },
        include: {
          tb_parceiro: true,
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
        },
        orderBy: {
          data_criacao: 'desc'
        }
      });

      return agendamentos.map((ag) => {
        // Build mock clinical results / laudos if status is realizado
        let laudo = null;
        if (ag.status === 'realizado') {
          laudo = {
            medico_responsavel: ag.tb_parceiro.nome,
            data_laudo: ag.data_modificacao || ag.data_realizacao || ag.data_criacao,
            conclusao: 'Os resultados dos exames clínico-laboratoriais e as avaliações estruturais demonstram estabilidade fisiológica dentro dos limites de referência habituais. Sem alterações patológicas agudas evidenciadas.',
            observacoes: 'Recomenda-se acompanhamento de rotina conforme prescrição clínica.',
            pdf_mock_url: `/api/cliente/agendamentos/${ag.id_agendamento}/pdf`
          };
        }

        return {
          id_agendamento: ag.id_agendamento.toString(),
          codigo: ag.codigo,
          status: ag.status,
          data_realizacao: ag.data_realizacao,
          data_criacao: ag.data_criacao,
          parceiro: {
            id_parceiro: ag.tb_parceiro.id_parceiro.toString(),
            nome: ag.tb_parceiro.nome,
            telefone: ag.tb_parceiro.telefone
          },
          pagamento: ag.tb_agendamento_pagamento ? {
            id_agendamento_pagamento: ag.tb_agendamento_pagamento.id_agendamento_pagamento.toString(),
            valor_pago_cartao: ag.tb_agendamento_pagamento.valor_pago_cartao.toString(),
            valor_pago_pix: ag.tb_agendamento_pagamento.valor_pago_pix.toString(),
            data_criacao: ag.tb_agendamento_pagamento.data_criacao
          } : null,
          procedimentos: ag.tb_agendamento_procedimento.map((ap) => ({
            nome: ap.tb_parceiro_procedimento.tb_procedimento.nome,
            tipo: ap.tb_parceiro_procedimento.tb_procedimento.tipo,
            valor_total: ap.tb_parceiro_procedimento.valor_total.toString(),
            quantidade: ap.quantidade
          })),
          laudo
        };
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar agendamentos do cliente.' });
    }
  });

  // POST /api/cliente/agendamentos - Book a new appointment
  fastify.post('/api/cliente/agendamentos', { preHandler: verifyClientJWT }, async (request, reply) => {
    try {
      const user = request.user as any;
      const idCliente = user.id_cliente;
      const { id_parceiro, id_parceiro_procedimento, data_agendamento } = request.body as any;

      if (!id_parceiro || !id_parceiro_procedimento || !data_agendamento) {
        return reply.status(400).send({ error: 'Campos obrigatórios ausentes.' });
      }

      const createdAgendamento = await prisma.$transaction(async (tx) => {
        // Create the booking entry (starts as 'aguardando_pagamento')
        const ag = await tx.tb_agendamento.create({
          data: {
            status: 'aguardando_pagamento',
            id_cliente: BigInt(idCliente),
            id_parceiro: BigInt(id_parceiro),
            data_realizacao: new Date(data_agendamento),
            created_by: BigInt(user.id_usuario)
          }
        });

        // Set padded code
        const code = ag.id_agendamento.toString().padStart(9, '0');
        const updatedAg = await tx.tb_agendamento.update({
          where: { id_agendamento: ag.id_agendamento },
          data: { codigo: code }
        });

        // Link the procedure
        await tx.tb_agendamento_procedimento.create({
          data: {
            id_agendamento: ag.id_agendamento,
            id_parceiro_procedimento: BigInt(id_parceiro_procedimento),
            quantidade: 1
          }
        });

        return updatedAg;
      });

      return {
        message: 'Agendamento pré-reservado com sucesso! Proceda para o pagamento.',
        id_agendamento: createdAgendamento.id_agendamento.toString(),
        codigo: createdAgendamento.codigo
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar agendamento.' });
    }
  });

  // POST /api/cliente/trocar-senha - Change password
  fastify.post('/api/cliente/trocar-senha', { preHandler: verifyClientJWT }, async (request, reply) => {
    try {
      const user = request.user as any;
      const { senha_atual, nova_senha } = request.body as any;

      if (!senha_atual || !nova_senha) {
        return reply.status(400).send({ error: 'Senha atual e nova senha são obrigatórias.' });
      }
      if (nova_senha.length < 6) {
        return reply.status(400).send({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
      }

      const md5Atual = crypto.createHash('md5').update(senha_atual).digest('hex');

      const usuario = await prisma.tb_usuario.findFirst({
        where: { id_usuario: BigInt(user.id_usuario), senha: md5Atual }
      });

      if (!usuario) {
        return reply.status(400).send({ error: 'A senha atual está incorreta.' });
      }

      const md5Nova = crypto.createHash('md5').update(nova_senha).digest('hex');

      await prisma.tb_usuario.update({
        where: { id_usuario: BigInt(user.id_usuario) },
        data: { senha: md5Nova }
      });

      return { message: 'Senha alterada com sucesso!' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao alterar a senha.' });
    }
  });

  // POST /api/cliente/agendamentos/:id/pagar - Simulate online payment
  fastify.post('/api/cliente/agendamentos/:id/pagar', { preHandler: verifyClientJWT }, async (request, reply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as any;
      const { metodo_pagamento, valor } = request.body as any; // PIX, CARTAO

      if (!metodo_pagamento || !valor) {
        return reply.status(400).send({ error: 'Método de pagamento e valor são obrigatórios.' });
      }

      const ag = await prisma.tb_agendamento.findUnique({
        where: { id_agendamento: BigInt(id) }
      });

      if (!ag) {
        return reply.status(404).send({ error: 'Agendamento não encontrado.' });
      }

      // Check if already paid
      if (ag.status === 'pago' || ag.status === 'realizado') {
        return reply.status(400).send({ error: 'Este agendamento já está pago.' });
      }

      // Find or open a default system cashier
      let caixa = await prisma.tb_caixa.findFirst({
        where: { data_fechamento: null }
      });

      if (!caixa) {
        // Fallback: Open a new cash drawer for administrator/default user
        caixa = await prisma.tb_caixa.create({
          data: {
            valor_abertura: 0,
            id_usuario: BigInt(user.id_usuario)
          }
        });
      }

      await prisma.$transaction(async (tx) => {
        // 1. Create the payment record
        const payment = await tx.tb_agendamento_pagamento.create({
          data: {
            tipo: 'entrada',
            descricao: `Pagamento Online (${metodo_pagamento})`,
            valor_pago_pix: metodo_pagamento === 'PIX' ? Number(valor) : 0,
            valor_pago_cartao: metodo_pagamento === 'CARTAO' ? Number(valor) : 0,
            id_caixa: caixa!.id_caixa
          }
        });

        // 2. Update the booking status to paid and reference payment
        await tx.tb_agendamento.update({
          where: { id_agendamento: BigInt(id) },
          data: {
            status: 'pago',
            id_agendamento_pagamento: payment.id_agendamento_pagamento
          }
        });
      });

      return { message: 'Pagamento recebido e agendamento confirmado com sucesso!' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao processar pagamento do agendamento.' });
    }
  });

  // DELETE /api/cliente/agendamentos/:id - Cancel an appointment
  fastify.delete('/api/cliente/agendamentos/:id', { preHandler: verifyClientJWT }, async (request, reply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as any;

      const ag = await prisma.tb_agendamento.findUnique({
        where: { id_agendamento: BigInt(id) }
      });

      if (!ag) {
        return reply.status(404).send({ error: 'Agendamento não encontrado.' });
      }

      // Ensure the appointment belongs to this client
      if (ag.id_cliente.toString() !== user.id_cliente) {
        return reply.status(403).send({ error: 'Você não tem permissão para cancelar este agendamento.' });
      }

      // Only allow cancellation of appointments that are still awaiting payment
      const cancellable = ['aguardando_pagamento', 'pendente'];
      if (!cancellable.includes(ag.status)) {
        return reply.status(400).send({ error: `Não é possível cancelar um agendamento com status "${ag.status}". Somente agendamentos aguardando pagamento podem ser cancelados.` });
      }

      await prisma.tb_agendamento.update({
        where: { id_agendamento: BigInt(id) },
        data: { status: 'cancelado' }
      });

      return { message: 'Agendamento cancelado com sucesso.' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao cancelar agendamento.' });
    }
  });
}
