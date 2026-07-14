import { FastifyInstance } from 'fastify';
import prisma from '../db';

export default async function relatorioRoutes(fastify: FastifyInstance) {
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

  // GET /api/relatorios/agendamento
  fastify.get('/api/relatorios/agendamento', async (request, reply) => {
    try {
      const { data_inicial, data_final, status, parceiro } = request.query as any;
      const activeUnitIdHeader = request.headers['x-active-unit-id'];

      let unitJoin = '';
      let unitWhere = '';
      if (activeUnitIdHeader) {
        const activeUnitId = Number(activeUnitIdHeader);
        unitJoin = `
          INNER JOIN tb_usuario u_unit ON a.created_by = u_unit.id_usuario
          INNER JOIN tb_pessoa_fisica pf_unit ON u_unit.id_pessoa = pf_unit.id_pessoa
          INNER JOIN tb_funcionario f_unit ON pf_unit.id_pessoa_fisica = f_unit.id_pessoa_fisica
        `;
        unitWhere = ` AND (f_unit.id_unidade = ${activeUnitId} OR EXISTS (
          SELECT 1 FROM tb_funcionario_unidade fu_check 
          WHERE fu_check.id_funcionario = f_unit.id_funcionario 
            AND fu_check.id_unidade = ${activeUnitId}
        ))`;
      }

      let sql = `
        SELECT 
          a.id_agendamento,
          a.codigo,
          a.status,
          UPPER(p.nome) AS nome, 
          p.id_parceiro,
          SUM(pp.valor_parceiro * ap.quantidade) AS valor_parceiro,
          SUM(((pp.valor_total - pp.valor_parceiro) * ap.quantidade) - ap.desconto) - COALESCE(MAX(apg.valor_representante), 0) AS valor_cf, 
          SUM((pp.valor_total * ap.quantidade) - ap.desconto) AS total,
          COALESCE(MAX(apg.valor_representante), 0) AS valor_representante,
          a.data_criacao
        FROM tb_agendamento a
          INNER JOIN tb_parceiro p ON p.id_parceiro = a.id_parceiro
          INNER JOIN tb_agendamento_procedimento ap ON ap.id_agendamento = a.id_agendamento
          LEFT JOIN tb_parceiro_procedimento pp ON pp.id_parceiro_procedimento = ap.id_parceiro_procedimento
          LEFT JOIN tb_agendamento_pagamento apg ON apg.id_agendamento_pagamento = a.id_agendamento_pagamento
          ${unitJoin}
        WHERE a.status != 'cancelado' ${unitWhere}
      `;

      if (parceiro) {
        sql += ` AND p.id_parceiro = ${Number(parceiro)}`;
      }

      if (data_inicial) {
        sql += ` AND DATE(a.data_criacao) >= '${data_inicial}'`;
      }

      if (data_final) {
        sql += ` AND DATE(a.data_criacao) <= '${data_final}'`;
      }

      if (status && ['pendente', 'realizado', 'pago'].includes(status)) {
        sql += ` AND a.status = '${status}'`;
      }

      sql += ' GROUP BY a.id_agendamento ORDER BY a.id_agendamento DESC';

      const results = await prisma.$queryRawUnsafe<any[]>(sql);

      return results.map((r) => ({
        id_agendamento: r.id_agendamento.toString(),
        codigo: r.codigo,
        status: r.status,
        nome_parceiro: r.nome,
        id_parceiro: r.id_parceiro.toString(),
        valor_parceiro: Number(r.valor_parceiro || 0).toFixed(2),
        valor_cf: Number(r.valor_cf || 0).toFixed(2),
        valor_representante: Number(r.valor_representante || 0).toFixed(2),
        total: Number(r.total || 0).toFixed(2),
        data_criacao: r.data_criacao
      }));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao gerar relatório de agendamentos.' });
    }
  });

  // GET /api/relatorios/financeiro
  fastify.get('/api/relatorios/financeiro', async (request, reply) => {
    try {
      const { data_inicial, data_final } = request.query as any;
      const activeUnitIdHeader = request.headers['x-active-unit-id'];

      let unitJoin = '';
      let unitWhere = '';
      if (activeUnitIdHeader) {
        const activeUnitId = Number(activeUnitIdHeader);
        unitJoin = `
          INNER JOIN tb_usuario u_unit ON a.created_by = u_unit.id_usuario
          INNER JOIN tb_pessoa_fisica pf_unit ON u_unit.id_pessoa = pf_unit.id_pessoa
          INNER JOIN tb_funcionario f_unit ON pf_unit.id_pessoa_fisica = f_unit.id_pessoa_fisica
        `;
        unitWhere = ` AND (f_unit.id_unidade = ${activeUnitId} OR EXISTS (
          SELECT 1 FROM tb_funcionario_unidade fu_check 
          WHERE fu_check.id_funcionario = f_unit.id_funcionario 
            AND fu_check.id_unidade = ${activeUnitId}
        ))`;
      }

      let sql = `
        SELECT 
          UPPER(p.nome) AS nome, 
          SUM(CASE WHEN a.id_financeiro IS NULL THEN pp.valor_parceiro * ap.quantidade ELSE 0 END) AS procedimentos_pendentes,
          SUM(CASE WHEN a.id_financeiro IS NOT NULL THEN pp.valor_parceiro * ap.quantidade ELSE 0 END) AS financeiros_pendentes,
          p.id_parceiro
        FROM tb_agendamento a
          INNER JOIN tb_parceiro p ON p.id_parceiro = a.id_parceiro
          INNER JOIN tb_agendamento_procedimento ap ON ap.id_agendamento = a.id_agendamento
          LEFT JOIN tb_parceiro_procedimento pp ON pp.id_parceiro_procedimento = ap.id_parceiro_procedimento
          LEFT JOIN tb_financeiro f ON f.id_financeiro = a.id_financeiro
          ${unitJoin}
        WHERE a.status = 'realizado' ${unitWhere}
      `;

      if (data_inicial) {
        sql += ` AND DATE(a.data_criacao) >= '${data_inicial}'`;
      }

      if (data_final) {
        sql += ` AND DATE(a.data_criacao) <= '${data_final}'`;
      }

      sql += ' GROUP BY a.id_parceiro ORDER BY financeiros_pendentes DESC, procedimentos_pendentes DESC';

      const results = await prisma.$queryRawUnsafe<any[]>(sql);

      return results.map((r) => ({
        nome_parceiro: r.nome,
        id_parceiro: r.id_parceiro.toString(),
        procedimentos_pendentes: Number(r.procedimentos_pendentes || 0).toFixed(2),
        financeiros_pendentes: Number(r.financeiros_pendentes || 0).toFixed(2)
      }));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao gerar relatório financeiro.' });
    }
  });

  fastify.get('/api/relatorios/parceiro', async (request, reply) => {
    try {
      const { data_inicial, data_final, status, parceiro } = request.query as any;
      const activeUnitIdHeader = request.headers['x-active-unit-id'];

      let unitJoin = '';
      let unitWhere = '';
      if (activeUnitIdHeader) {
        const activeUnitId = Number(activeUnitIdHeader);
        unitJoin = `
          INNER JOIN tb_usuario u_unit ON a.created_by = u_unit.id_usuario
          INNER JOIN tb_pessoa_fisica pf_unit ON u_unit.id_pessoa = pf_unit.id_pessoa
          INNER JOIN tb_funcionario f_unit ON pf_unit.id_pessoa_fisica = f_unit.id_pessoa_fisica
        `;
        unitWhere = ` AND (f_unit.id_unidade = ${activeUnitId} OR EXISTS (
          SELECT 1 FROM tb_funcionario_unidade fu_check 
          WHERE fu_check.id_funcionario = f_unit.id_funcionario 
            AND fu_check.id_unidade = ${activeUnitId}
        ))`;
      }

      let sql = `
        SELECT 
          p.id_parceiro,
          UPPER(p.nome) AS nome, 
          COUNT(DISTINCT a.id_agendamento) AS qnt_agendamentos,
          COUNT(1 * ap.quantidade) AS qnt_procedimentos,
          SUM(CASE WHEN a.status = 'pago' THEN pp.valor_parceiro * ap.quantidade ELSE 0 END) AS valor_parceiro_pago,
          SUM(CASE WHEN a.status = 'realizado' THEN pp.valor_parceiro * ap.quantidade ELSE 0 END) AS valor_parceiro_pendente, 
          SUM(CASE WHEN a.status = 'pendente' THEN pp.valor_parceiro * ap.quantidade ELSE 0 END) AS valor_parceiro_previsto, 
          SUM(pp.valor_parceiro * ap.quantidade) AS valor_parceiro_total,
          SUM(CASE WHEN a.status = 'pago' THEN (((pp.valor_total - pp.valor_parceiro) * ap.quantidade) - ap.desconto) - (COALESCE(apg.valor_representante, 0) / (SELECT COUNT(1) FROM tb_agendamento_procedimento WHERE id_agendamento = a.id_agendamento)) ELSE 0 END) AS valor_cf_pago,
          SUM(CASE WHEN a.status = 'realizado' THEN (((pp.valor_total - pp.valor_parceiro) * ap.quantidade) - ap.desconto) - (COALESCE(apg.valor_representante, 0) / (SELECT COUNT(1) FROM tb_agendamento_procedimento WHERE id_agendamento = a.id_agendamento)) ELSE 0 END) AS valor_cf_pendente, 
          SUM(CASE WHEN a.status = 'pendente' THEN (((pp.valor_total - pp.valor_parceiro) * ap.quantidade) - ap.desconto) - (COALESCE(apg.valor_representante, 0) / (SELECT COUNT(1) FROM tb_agendamento_procedimento WHERE id_agendamento = a.id_agendamento)) ELSE 0 END) AS valor_cf_previsto, 
          SUM(((pp.valor_total - pp.valor_parceiro) * ap.quantidade) - (COALESCE(apg.valor_representante, 0) / (SELECT COUNT(1) FROM tb_agendamento_procedimento WHERE id_agendamento = a.id_agendamento))) AS valor_cf_total,
          SUM(COALESCE(apg.valor_representante, 0) / (SELECT COUNT(1) FROM tb_agendamento_procedimento WHERE id_agendamento = a.id_agendamento)) AS valor_representante_total
        FROM tb_agendamento a
          INNER JOIN tb_parceiro p ON p.id_parceiro = a.id_parceiro
          INNER JOIN tb_agendamento_procedimento ap ON ap.id_agendamento = a.id_agendamento
          LEFT JOIN tb_parceiro_procedimento pp ON pp.id_parceiro_procedimento = ap.id_parceiro_procedimento
          LEFT JOIN tb_agendamento_pagamento apg ON apg.id_agendamento_pagamento = a.id_agendamento_pagamento
          ${unitJoin}
        WHERE a.status != 'cancelado' ${unitWhere}
      `;

      if (parceiro) {
        sql += ` AND p.id_parceiro = ${Number(parceiro)}`;
      }

      if (status && ['pendente', 'realizado', 'pago'].includes(status)) {
        sql += ` AND a.status = '${status}'`;
      }

      if (data_inicial) {
        sql += ` AND DATE(a.data_criacao) >= '${data_inicial}'`;
      }

      if (data_final) {
        sql += ` AND DATE(a.data_criacao) <= '${data_final}'`;
      }

      sql += ' GROUP BY a.id_parceiro ORDER BY valor_parceiro_total DESC';

      const results = await prisma.$queryRawUnsafe<any[]>(sql);

      return results.map((r) => ({
        id_parceiro: r.id_parceiro.toString(),
        nome_parceiro: r.nome,
        qnt_agendamentos: Number(r.qnt_agendamentos),
        qnt_procedimentos: Number(r.qnt_procedimentos),
        valor_parceiro_pago: Number(r.valor_parceiro_pago || 0).toFixed(2),
        valor_parceiro_pendente: Number(r.valor_parceiro_pendente || 0).toFixed(2),
        valor_parceiro_previsto: Number(r.valor_parceiro_previsto || 0).toFixed(2),
        valor_parceiro_total: Number(r.valor_parceiro_total || 0).toFixed(2),
        valor_cf_pago: Number(r.valor_cf_pago || 0).toFixed(2),
        valor_cf_pendente: Number(r.valor_cf_pendente || 0).toFixed(2),
        valor_cf_previsto: Number(r.valor_cf_previsto || 0).toFixed(2),
        valor_cf_total: Number(r.valor_cf_total || 0).toFixed(2),
        valor_representante_total: Number(r.valor_representante_total || 0).toFixed(2)
      }));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao gerar relatório de parceiros.' });
    }
  });

  fastify.get('/api/relatorios/procedimento', async (request, reply) => {
    try {
      const { data_inicial, data_final, status, tipo, parceiro } = request.query as any;
      const activeUnitIdHeader = request.headers['x-active-unit-id'];

      let unitJoin = '';
      let unitWhere = '';
      if (activeUnitIdHeader) {
        const activeUnitId = Number(activeUnitIdHeader);
        unitJoin = `
          INNER JOIN tb_usuario u_unit ON a.created_by = u_unit.id_usuario
          INNER JOIN tb_pessoa_fisica pf_unit ON u_unit.id_pessoa = pf_unit.id_pessoa
          INNER JOIN tb_funcionario f_unit ON pf_unit.id_pessoa_fisica = f_unit.id_pessoa_fisica
        `;
        unitWhere = ` AND (f_unit.id_unidade = ${activeUnitId} OR EXISTS (
          SELECT 1 FROM tb_funcionario_unidade fu_check 
          WHERE fu_check.id_funcionario = f_unit.id_funcionario 
            AND fu_check.id_unidade = ${activeUnitId}
        ))`;
      }

      let sql = `
        SELECT 
          UPPER(p.nome) AS procedimento,
          SUM(ap.quantidade) AS quantidade,
          SUM(CASE WHEN a.status = 'pago' THEN pp.valor_parceiro * ap.quantidade ELSE 0 END) AS valor_parceiro_pago,
          SUM(CASE WHEN a.status = 'realizado' THEN pp.valor_parceiro * ap.quantidade ELSE 0 END) AS valor_parceiro_pendente,
          SUM(CASE WHEN a.status = 'pendente' THEN pp.valor_parceiro * ap.quantidade ELSE 0 END) AS valor_parceiro_previsto,
          SUM(pp.valor_parceiro * ap.quantidade) AS valor_parceiro_total,
          SUM(CASE WHEN a.status = 'pago' THEN (((pp.valor_total - pp.valor_parceiro) * ap.quantidade) - ap.desconto) - (COALESCE(apg.valor_representante, 0) / (SELECT COUNT(1) FROM tb_agendamento_procedimento WHERE id_agendamento = a.id_agendamento)) ELSE 0 END) AS valor_cf_pago,
          SUM(CASE WHEN a.status = 'realizado' THEN (((pp.valor_total - pp.valor_parceiro) * ap.quantidade) - ap.desconto) - (COALESCE(apg.valor_representante, 0) / (SELECT COUNT(1) FROM tb_agendamento_procedimento WHERE id_agendamento = a.id_agendamento)) ELSE 0 END) AS valor_cf_pendente,
          SUM(CASE WHEN a.status = 'pendente' THEN (((pp.valor_total - pp.valor_parceiro) * ap.quantidade) - ap.desconto) - (COALESCE(apg.valor_representante, 0) / (SELECT COUNT(1) FROM tb_agendamento_procedimento WHERE id_agendamento = a.id_agendamento)) ELSE 0 END) AS valor_cf_previsto,
          SUM((((pp.valor_total - pp.valor_parceiro) * ap.quantidade) - ap.desconto) - (COALESCE(apg.valor_representante, 0) / (SELECT COUNT(1) FROM tb_agendamento_procedimento WHERE id_agendamento = a.id_agendamento))) AS valor_cf_total,
          SUM(COALESCE(apg.valor_representante, 0) / (SELECT COUNT(1) FROM tb_agendamento_procedimento WHERE id_agendamento = a.id_agendamento)) AS valor_representante_total
        FROM tb_procedimento p
          INNER JOIN tb_parceiro_procedimento pp ON pp.id_procedimento = p.id_procedimento
          INNER JOIN tb_agendamento_procedimento ap ON ap.id_parceiro_procedimento = pp.id_parceiro_procedimento
          INNER JOIN tb_agendamento a ON a.id_agendamento = ap.id_agendamento 
          LEFT JOIN tb_agendamento_pagamento apg ON apg.id_agendamento_pagamento = a.id_agendamento_pagamento
          ${unitJoin}
        WHERE a.status != 'cancelado' ${unitWhere}
      `;

      if (parceiro) {
        sql += ` AND a.id_parceiro = ${Number(parceiro)}`;
      }

      if (status && ['pendente', 'realizado', 'pago'].includes(status)) {
        sql += ` AND a.status = '${status}'`;
      }

      if (data_inicial) {
        sql += ` AND DATE(a.data_criacao) >= '${data_inicial}'`;
      }

      if (data_final) {
        sql += ` AND DATE(a.data_criacao) <= '${data_final}'`;
      }

      if (tipo) {
        sql += ` AND p.tipo = '${tipo}'`;
      }

      sql += ' GROUP BY p.id_procedimento ORDER BY valor_cf_total DESC';

      const results = await prisma.$queryRawUnsafe<any[]>(sql);

      return results.map((r) => ({
        procedimento: r.procedimento,
        quantidade: Number(r.quantidade),
        valor_parceiro_pago: Number(r.valor_parceiro_pago || 0).toFixed(2),
        valor_parceiro_pendente: Number(r.valor_parceiro_pendente || 0).toFixed(2),
        valor_parceiro_previsto: Number(r.valor_parceiro_previsto || 0).toFixed(2),
        valor_parceiro_total: Number(r.valor_parceiro_total || 0).toFixed(2),
        valor_cf_pago: Number(r.valor_cf_pago || 0).toFixed(2),
        valor_cf_pendente: Number(r.valor_cf_pendente || 0).toFixed(2),
        valor_cf_previsto: Number(r.valor_cf_previsto || 0).toFixed(2),
        valor_cf_total: Number(r.valor_cf_total || 0).toFixed(2),
        valor_representante_total: Number(r.valor_representante_total || 0).toFixed(2)
      }));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao gerar relatório de procedimentos.' });
    }
  });
}
